"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { getDemoOrgId } from "@/lib/demoOrg";

interface DocumentUploaderProps {
  /** Called after a successful (or partially successful) upload so the parent can refetch the list. */
  onUploaded: () => void;
}

export function DocumentUploader({ onUploaded }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", getDemoOrgId());

      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const body = await res.json();

      // 201 = fully ingested, 207 = file stored but ingestion failed — both
      // mean there's a new row to show; only other statuses are a hard failure.
      if (res.status !== 201 && res.status !== 207) {
        throw new Error(body.error ?? "Upload failed.");
      }
      if (res.status === 207) {
        setError(`"${file.name}" uploaded, but processing failed: ${body.error}`);
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        id="policy-upload"
      />
      <Button asChild disabled={isUploading} className="w-fit gap-2">
        <label htmlFor="policy-upload" className="cursor-pointer">
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? "Uploading and processing…" : "Upload policy PDF"}
        </label>
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
