import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { extractPdfPages, chunkPages } from "@/lib/parsing/pdf";
import { getServiceSupabaseClient } from "@/lib/supabase/server";

// Keep batches small: individual Gemini embedding calls stay fast and any
// single failure only costs a retry of ~20 chunks, not the whole document.
const BATCH_SIZE = 20;

export interface IngestResult {
  documentId: string;
  chunkCount: number;
}

/**
 * Full ingestion pipeline for one uploaded policy PDF:
 * extract text -> chunk -> embed -> store in document_chunks.
 *
 * Updates the parent `documents` row's status to "ready" or "failed" (with
 * error_message) as it goes, so the UI can poll for progress.
 */
export async function chunkAndEmbedDocument(
  documentId: string,
  orgId: string,
  fileBuffer: Buffer
): Promise<IngestResult> {
  const supabase = getServiceSupabaseClient();
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY environment variable.");

  try {
    // 1. Extract + chunk.
    const pages = await extractPdfPages(fileBuffer);
    const chunks = chunkPages(pages, { chunkSize: 1000, chunkOverlap: 150 });

    if (chunks.length === 0) {
      throw new Error("No text chunks were produced from this document.");
    }

    // 2. Embed in batches. RETRIEVAL_DOCUMENT is the correct task type for the
    //    document side of an asymmetric search — the query side (in
    //    answerQuestion.ts) uses RETRIEVAL_QUERY. Mismatching these hurts
    //    retrieval quality even though both still return 768-dim vectors.
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: "text-embedding-004",
      taskType: "RETRIEVAL_DOCUMENT" as never,
    });

    const rows: {
      document_id: string;
      org_id: string;
      chunk_index: number;
      content: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const vectors = await embeddings.embedDocuments(batch.map((c) => c.content));

      batch.forEach((chunk, j) => {
        rows.push({
          document_id: documentId,
          org_id: orgId,
          chunk_index: i + j,
          content: chunk.content,
          embedding: vectors[j],
          metadata: chunk.metadata,
        });
      });
    }

    // 3. Store, also batched so one oversized insert can't fail the whole job.
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("document_chunks").insert(batch);
      if (error) throw new Error(`Failed to store chunks: ${error.message}`);
    }

    await supabase.from("documents").update({ status: "ready" }).eq("id", documentId);

    return { documentId, chunkCount: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Best-effort status update — if this fails too, the original error still
    // propagates below rather than being swallowed.
    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);
    throw new Error(`Ingestion failed for document ${documentId}: ${message}`);
  }
}
