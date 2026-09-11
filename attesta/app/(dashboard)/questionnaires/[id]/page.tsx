"use client";

import { useCallback, useEffect, useState } from "react";
import { QuestionnaireReviewDashboard } from "@/components/review/questionnaire-review-dashboard";
import type { QuestionnaireItem } from "@/types/questionnaire";

// NOTE: if you're on Next.js 15, route params are async (`params: Promise<{ id: string }>`)
// and this needs `use(params)` or an `async` component — this assumes Next.js 14's
// synchronous params. Check your `next` version if this doesn't type-check.
export default function QuestionnaireReviewPage({ params }: { params: { id: string } }) {
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState<QuestionnaireItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/questionnaires/${params.id}`);
    const body = await res.json();
    if (res.ok) {
      setFileName(body.questionnaire.file_name);
      setItems(body.items);
    }
    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleApprove(itemId: string) {
    await fetch(`/api/questionnaires/${params.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    await fetchItems();
  }

  async function handleSaveEdit(itemId: string, newAnswer: string) {
    await fetch(`/api/questionnaires/${params.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", answer: newAnswer }),
    });
    await fetchItems();
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/questionnaires/${params.id}/export`);
      if (!res.ok) throw new Error("Export failed.");

      // Trigger a browser download without navigating away from the review page.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `completed-${fileName || "questionnaire.xlsx"}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">Loading…</p>;
  }

  return (
    <QuestionnaireReviewDashboard
      questionnaireName={fileName}
      items={items}
      onApprove={handleApprove}
      onSaveEdit={handleSaveEdit}
      onExport={handleExport}
      isExporting={isExporting}
    />
  );
}
