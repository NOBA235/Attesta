interface DocumentRow {
  id: string;
  file_name: string;
  status: "processing" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
}

const STATUS_COPY: Record<DocumentRow["status"], string> = {
  processing: "Processing…",
  ready: "Ready",
  failed: "Failed",
};

const STATUS_COLOR: Record<DocumentRow["status"], string> = {
  processing: "text-blue-600",
  ready: "text-emerald-600",
  failed: "text-red-600",
};

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-slate-500">No policies uploaded yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">{doc.file_name}</p>
            {doc.status === "failed" && doc.error_message && (
              <p className="mt-0.5 text-xs text-red-600">{doc.error_message}</p>
            )}
          </div>
          <span className={`text-xs font-medium ${STATUS_COLOR[doc.status]}`}>{STATUS_COPY[doc.status]}</span>
        </li>
      ))}
    </ul>
  );
}
