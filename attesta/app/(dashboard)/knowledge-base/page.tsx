"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentList } from "@/components/knowledge-base/document-list";
import { DocumentUploader } from "@/components/knowledge-base/document-uploader";
import { getDemoOrgId } from "@/lib/demoOrg";

interface DocumentRow {
  id: string;
  file_name: string;
  status: "processing" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    const response = await fetch(`/api/documents?orgId=${getDemoOrgId()}`);
    const body = await response.json();
    if (response.ok) setDocuments(body.documents ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Knowledge base</h1>
        <p className="mt-1 text-sm text-slate-500">Upload the policy PDFs Attesta should use to draft questionnaire answers.</p>
      </div>
      <DocumentUploader onUploaded={loadDocuments} />
      {isLoading ? <p className="text-sm text-slate-500">Loading policies…</p> : <DocumentList documents={documents} />}
    </div>
  );
}