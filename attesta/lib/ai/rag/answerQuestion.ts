import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { SourceChunk, ConfidenceLevel } from "@/types/questionnaire";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnswerResult {
  answer: string;
  confidence: ConfidenceLevel;
  sources: SourceChunk[];
}

interface AnswerQuestionOptions {
  /** How many policy chunks to retrieve. Default 3. */
  matchCount?: number;
  /** Use "gemini-1.5-pro" for harder questions; defaults to flash for speed. */
  model?: "gemini-1.5-flash" | "gemini-1.5-pro";
  /** Pass a request-scoped Supabase client if you already have one (e.g. in a route handler). */
  supabaseClient?: SupabaseClient;
}

// The JSON contract we ask Gemini to fill in. Using a schema + withStructuredOutput
// avoids brittle regex/string-parsing of the model's reply.
const answerSchema = z.object({
  answer: z
    .string()
    .describe(
      "A precise, professional answer to the security questionnaire question, written in " +
        "the third person as the vendor. If the excerpts don't contain enough information, " +
        "say so explicitly instead of guessing."
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How well the provided excerpts support this answer."),
  citedSourceNumbers: z
    .array(z.number())
    .describe(
      "Which numbered source excerpts (1-indexed) were actually used to write the answer. " +
        "Empty array if none were usable."
    ),
});

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

function getSupabaseClient(existing?: SupabaseClient): SupabaseClient {
  if (existing) return existing;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  // Service role key: this runs server-side and needs to read chunks across
  // the org without a per-request user session (RLS is the client-side guard).
  return createClient(url, serviceKey);
}

// ---------------------------------------------------------------------------
// Core RAG function
// ---------------------------------------------------------------------------

/**
 * Answers a single security-questionnaire question using the org's uploaded
 * policy documents as the source of truth.
 *
 * Flow: embed question -> vector search in Supabase -> build a grounded,
 * numbered-source prompt -> Gemini returns a structured, cited answer.
 */
export async function answerQuestionFromKnowledgeBase(
  question: string,
  orgId: string,
  options: AnswerQuestionOptions = {}
): Promise<AnswerResult> {
  const { matchCount = 3, model = "gemini-1.5-flash", supabaseClient } = options;

  if (!question?.trim()) {
    throw new Error("answerQuestionFromKnowledgeBase: `question` is required.");
  }
  if (!orgId) {
    throw new Error("answerQuestionFromKnowledgeBase: `orgId` is required.");
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY environment variable.");
  }

  const supabase = getSupabaseClient(supabaseClient);

  // 1. Embed the question. text-embedding-004 outputs 768 dims, matching the
  //    `vector(768)` column on document_chunks. RETRIEVAL_QUERY is the correct
  //    task type for the query side of an asymmetric search (vs. RETRIEVAL_DOCUMENT
  //    used when embedding the policy chunks themselves during ingestion).
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: "text-embedding-004",
    taskType: "RETRIEVAL_QUERY" as never,
  });

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embeddings.embedQuery(question);
  } catch (err) {
    throw new Error(`Failed to embed question: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Retrieve the top-N most similar policy chunks, scoped to this org.
  const { data: matches, error: matchError } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_org_id: orgId,
    match_count: matchCount,
  });

  if (matchError) {
    throw new Error(`Vector search failed: ${matchError.message}`);
  }

  const chunks: SourceChunk[] = (matches ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    documentId: m.document_id as string,
    content: m.content as string,
    similarity: m.similarity as number,
  }));

  // No relevant policy content at all — don't let the model hallucinate an answer.
  if (chunks.length === 0) {
    return {
      answer:
        "We could not find a relevant policy excerpt to answer this question. Please review " +
        "and answer manually, or upload a policy document that covers this topic.",
      confidence: "low",
      sources: [],
    };
  }

  // 3. Build a numbered context block so the model can cite sources by number.
  const contextBlock = chunks
    .map((c, i) => `[Source ${i + 1}] (similarity: ${c.similarity.toFixed(2)})\n${c.content}`)
    .join("\n\n---\n\n");

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a compliance analyst assistant that answers enterprise security questionnaires " +
        "(e.g. SOC 2, ISO 27001) on behalf of a vendor.\n" +
        "Rules:\n" +
        "- Answer only using the provided source excerpts. Do not invent policy details that aren't present.\n" +
        "- Write in a professional, factual tone appropriate for a formal security review.\n" +
        "- Keep answers concise: 2-4 sentences, unless the question requires a list.\n" +
        "- If the excerpts partially answer the question, answer what you can and note the gap.\n" +
        "- If the excerpts don't answer the question at all, say so and set confidence to \"low\".",
    ],
    [
      "human",
      "Question: {question}\n\nPolicy excerpts:\n{context}\n\nProvide your answer as structured output.",
    ],
  ]);

  // 4. Generate a structured, cited answer with Gemini.
  const chatModel = new ChatGoogleGenerativeAI({
    apiKey,
    model,
    temperature: 0, // deterministic, factual answers for a compliance use case
  });

  const structuredModel = chatModel.withStructuredOutput(answerSchema, {
    name: "questionnaire_answer",
  });

  const chain = prompt.pipe(structuredModel);

  try {
    const result = await chain.invoke({ question, context: contextBlock });

    const citedSources = chunks.filter((_, i) => result.citedSourceNumbers.includes(i + 1));

    return {
      answer: result.answer,
      confidence: result.confidence,
      // Fall back to all retrieved chunks if the model didn't cite any specific
      // ones, so the human reviewer can still see what was retrieved.
      sources: citedSources.length > 0 ? citedSources : chunks,
    };
  } catch (err) {
    throw new Error(`Gemini generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
