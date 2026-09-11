import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";
import type { QuestionnaireItem } from "@/types/questionnaire";

export const runtime = "nodejs";

/** Shape stored in questionnaire_items.sources (jsonb). */
interface StoredSource {
  chunkId: string;
  similarity: number;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServiceSupabaseClient();

  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaires")
    .select("id, file_name, status")
    .eq("id", params.id)
    .single();

  if (qError || !questionnaire) {
    return NextResponse.json({ error: "Questionnaire not found." }, { status: 404 });
  }

  const { data: rows, error: itemsError } = await supabase
    .from("questionnaire_items")
    .select("id, row_index, question, ai_answer, final_answer, confidence, status, sources")
    .eq("questionnaire_id", params.id)
    .order("row_index", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Resolve every cited chunk's content + parent document name in a single
  // round trip, rather than one query per question.
  const allChunkIds = Array.from(
    new Set((rows ?? []).flatMap((r) => (r.sources as StoredSource[]).map((s) => s.chunkId)))
  );

  const chunksById = new Map<string, { content: string; documentId: string; documentName?: string }>();

  if (allChunkIds.length > 0) {
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, content, document_id, documents(file_name)")
      .in("id", allChunkIds);

    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    for (const c of chunks ?? []) {
      chunksById.set(c.id as string, {
        content: c.content as string,
        documentId: c.document_id as string,
        documentName: (c as unknown as { documents?: { file_name?: string } }).documents?.file_name,
      });
    }
  }

  const items: QuestionnaireItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    rowIndex: r.row_index,
    question: r.question,
    aiAnswer: r.ai_answer,
    finalAnswer: r.final_answer,
    confidence: r.confidence,
    status: r.status,
    sources: (r.sources as StoredSource[])
      .map((s) => {
        const chunk = chunksById.get(s.chunkId);
        if (!chunk) return null; // chunk may have been deleted since this item was answered
        return {
          id: s.chunkId,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          content: chunk.content,
          similarity: s.similarity,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null),
  }));

  return NextResponse.json({ questionnaire, items });
}
