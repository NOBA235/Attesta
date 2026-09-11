import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";
import { answerQuestionFromKnowledgeBase } from "@/lib/ai/rag/answerQuestion";

export const runtime = "nodejs";

/**
 * Runs answerQuestionFromKnowledgeBase over every "pending" item in a
 * questionnaire, moving each to "answered" or "failed". Processes
 * sequentially to stay comfortably within Gemini rate limits for a hackathon
 * demo; if you need it faster, parallelize with a small concurrency limiter
 * (e.g. p-limit at 3-5 concurrent) rather than firing all requests at once.
 *
 * NOTE: on Vercel, serverless functions have a execution time limit (10s on
 * Hobby, up to 60s+ on Pro). A 50-question questionnaire will likely exceed
 * that. For the demo, either raise `maxDuration` below (Pro plan) or process
 * in small batches from the client, calling this route once per batch.
 */
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const questionnaireId = params.id;
  const supabase = getServiceSupabaseClient();

  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaires")
    .select("id, org_id")
    .eq("id", questionnaireId)
    .single();

  if (qError || !questionnaire) {
    return NextResponse.json({ error: "Questionnaire not found." }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("questionnaire_items")
    .select("id, question")
    .eq("questionnaire_id", questionnaireId)
    .eq("status", "pending");

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const results = { succeeded: 0, failed: 0 };

  for (const item of items ?? []) {
    try {
      const { answer, confidence, sources } = await answerQuestionFromKnowledgeBase(
        item.question,
        questionnaire.org_id
      );

      await supabase
        .from("questionnaire_items")
        .update({
          ai_answer: answer,
          confidence,
          sources: sources.map((s) => ({ chunkId: s.id, similarity: s.similarity })),
          status: "answered",
        })
        .eq("id", item.id);

      results.succeeded++;
    } catch (err) {
      // Record the failure on the row itself so the reviewer sees exactly
      // which questions need a manual answer, instead of a silent gap.
      await supabase
        .from("questionnaire_items")
        .update({
          status: "failed",
          ai_answer: err instanceof Error ? err.message : "AI processing failed.",
        })
        .eq("id", item.id);

      results.failed++;
    }
  }

  return NextResponse.json({ processed: (items ?? []).length, ...results });
}
