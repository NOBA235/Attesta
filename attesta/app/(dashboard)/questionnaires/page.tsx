"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDemoOrgId } from "@/lib/demoOrg";

interface QuestionnaireRow {
  id: string;
  file_name: string;
  status: "processing" | "ready" | "completed" | "failed";
  created_at: string;
}

export default function QuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/questionnaires?orgId=${getDemoOrgId()}`)
      .then((res) => res.json())
      .then((body) => setQuestionnaires(body.questionnaires ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Questionnaires</h1>
        <Button asChild>
          <Link href="/questionnaires/new">Upload questionnaire</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : questionnaires.length === 0 ? (
        <p className="text-sm text-slate-500">No questionnaires yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {questionnaires.map((q) => (
            <li key={q.id}>
              <Link
                href={`/questionnaires/${q.id}`}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
              >
                <span className="text-sm font-medium text-slate-900">{q.file_name}</span>
                <span className="text-xs text-slate-500">{q.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
