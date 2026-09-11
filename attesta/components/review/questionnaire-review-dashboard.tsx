"use client";

// Human-in-the-loop review dashboard.
// Renders one row per questionnaire item: the original question, the AI's
// proposed answer (editable), its cited source excerpts, and an approve/edit
// flow. Status changes are pushed up via onApprove / onSaveEdit — this
// component doesn't own persistence, so wire those to your API routes.
//
// Depends on shadcn/ui (Button, Textarea) and lucide-react, both standard
// in a shadcn-initialized Next.js project.

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionnaireItem, ConfidenceLevel } from "@/types/questionnaire";

interface QuestionnaireReviewDashboardProps {
  questionnaireName: string;
  items: QuestionnaireItem[];
  onApprove: (itemId: string) => Promise<void> | void;
  onSaveEdit: (itemId: string, newAnswer: string) => Promise<void> | void;
  onExport: () => Promise<void> | void;
  isExporting?: boolean;
}

const STATUS_STYLES: Record<
  QuestionnaireItem["status"],
  { border: string; label: string; dot: string }
> = {
  pending: { border: "border-l-slate-300", label: "Not yet processed", dot: "bg-slate-300" },
  answered: { border: "border-l-blue-400", label: "Awaiting review", dot: "bg-blue-500" },
  approved: { border: "border-l-emerald-400", label: "Approved", dot: "bg-emerald-500" },
  edited: { border: "border-l-amber-400", label: "Edited and approved", dot: "bg-amber-500" },
  failed: { border: "border-l-red-400", label: "Could not generate an answer", dot: "bg-red-500" },
};

const CONFIDENCE_COPY: Record<ConfidenceLevel, string> = {
  high: "strong match in your policies",
  medium: "partial match in your policies",
  low: "weak match, check this one",
};

export function QuestionnaireReviewDashboard({
  questionnaireName,
  items,
  onApprove,
  onSaveEdit,
  onExport,
  isExporting = false,
}: QuestionnaireReviewDashboardProps) {
  const approvedCount = useMemo(
    () => items.filter((i) => i.status === "approved" || i.status === "edited").length,
    [items]
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Header: progress + export */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-900">{questionnaireName}</h1>
          <span className="whitespace-nowrap text-sm text-slate-500">
            {approvedCount} of {items.length} approved
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${items.length ? (approvedCount / items.length) * 100 : 0}%` }}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onExport()} disabled={isExporting || approvedCount === 0} className="gap-2">
            {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
            Export completed questionnaire
          </Button>
        </div>
      </div>

      {/* Question list */}
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <QuestionRow key={item.id} item={item} onApprove={onApprove} onSaveEdit={onSaveEdit} />
        ))}
      </div>
    </div>
  );
}

function QuestionRow({
  item,
  onApprove,
  onSaveEdit,
}: {
  item: QuestionnaireItem;
  onApprove: (itemId: string) => Promise<void> | void;
  onSaveEdit: (itemId: string, newAnswer: string) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.finalAnswer ?? item.aiAnswer ?? "");
  const [showSources, setShowSources] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const style = STATUS_STYLES[item.status];
  const displayedAnswer = item.finalAnswer ?? item.aiAnswer;
  const canApprove = item.status === "answered" || item.status === "edited";

  async function handleApprove() {
    setIsApproving(true);
    try {
      await onApprove(item.id);
    } finally {
      setIsApproving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSaveEdit(item.id, draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={cn("rounded-md border border-l-4 border-slate-200 bg-white p-4", style.border)}>
      {/* Status line */}
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
        <span>{style.label}</span>
        {item.confidence && !canApprove && item.status !== "approved" && item.status !== "edited" && (
          <span>({CONFIDENCE_COPY[item.confidence]})</span>
        )}
      </div>

      {/* Question */}
      <p className="mb-3 font-medium text-slate-900">{item.question}</p>

      {/* Answer: read-only, editable, or failed state */}
      {item.status === "failed" ? (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          This question needs a manual answer — no supporting policy was found.
        </p>
      ) : isEditing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving || !draft.trim()}>
              {isSaving ? "Saving…" : "Save answer"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(displayedAnswer ?? "");
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {displayedAnswer || "No answer generated yet."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {canApprove && (
              <Button size="sm" onClick={handleApprove} disabled={isApproving}>
                {isApproving ? "Approving…" : "Approve"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit answer
            </Button>

            {item.sources.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSources((v) => !v)}
                className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <FileText className="h-3.5 w-3.5" />
                {item.sources.length} source{item.sources.length > 1 ? "s" : ""}
                {showSources ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {showSources && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              {item.sources.map((source, i) => (
                <div key={source.id} className="rounded bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="mb-1 font-medium text-slate-500">
                    Source {i + 1}
                    {source.documentName ? ` from ${source.documentName}` : ""}, {Math.round(source.similarity * 100)}% match
                  </div>
                  <p className="whitespace-pre-wrap">{source.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
