// Shared types for the questionnaire review workflow.
// Used by both lib/ai/rag/answerQuestion.ts and components/review/questionnaire-review-dashboard.tsx
// so the two layers never drift out of sync on field names.

export type QuestionnaireItemStatus =
  | "pending" // not yet processed by AI
  | "answered" // AI generated an answer, awaiting human review
  | "approved" // human approved the AI answer as-is
  | "edited" // human edited the answer, treated as approved
  | "failed"; // AI processing failed (e.g. no relevant policy found)

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SourceChunk {
  id: string;
  documentId: string;
  documentName?: string;
  content: string;
  similarity: number; // 0..1 cosine similarity
}

export interface QuestionnaireItem {
  id: string;
  rowIndex: number;
  question: string;
  aiAnswer: string | null;
  finalAnswer: string | null;
  confidence: ConfidenceLevel | null;
  sources: SourceChunk[];
  status: QuestionnaireItemStatus;
}
