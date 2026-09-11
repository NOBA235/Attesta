import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * PATCH body:
 *   { "action": "approve" }                  -> copies ai_answer into final_answer, status "approved"
 *   { "action": "edit", "answer": "..." }     -> sets final_answer to the edited text, status "edited"
 *
 * Backs the review dashboard's "Approve" and "Save answer" buttons
 * (see components/review/questionnaire-review-dashboard.tsx).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: "Missing `action` in request body." }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  // Defensive check: make sure the item actually belongs to the questionnaire
  // in the URL, so one org can't nudge another org's row by guessing an id.
  const { data: item, error: fetchError } = await supabase
    .from("questionnaire_items")
    .select("id, ai_answer, questionnaire_id")
    .eq("id", params.itemId)
    .eq("questionnaire_id", params.id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  if (body.action === "approve") {
    const { error } = await supabase
      .from("questionnaire_items")
      .update({ final_answer: item.ai_answer, status: "approved" })
      .eq("id", item.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "approved" });
  }

  if (body.action === "edit") {
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!answer) return NextResponse.json({ error: "Answer cannot be empty." }, { status: 400 });

    const { error } = await supabase
      .from("questionnaire_items")
      .update({ final_answer: answer, status: "edited" })
      .eq("id", item.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "edited" });
  }

  return NextResponse.json({ error: `Unknown action "${body.action}".` }, { status: 400 });
}
