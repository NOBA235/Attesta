"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { getDemoOrgId } from "@/lib/demoOrg";

type Step = "idle" | "uploading" | "processing";

export default function NewQuestionnairePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStep("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", getDemoOrgId());

      const uploadRes = await fetch("/api/questionnaires/upload", { method: "POST", body: formData });
      const uploadBody = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadBody.error ?? "Upload failed.");

      const questionnaireId = uploadBody.questionnaire.id;

      // Kick off AI processing right away, then send the user to the review
      // dashboard. For a large questionnaire this call may still be running
      // when the redirect happens — the dashboard will just show "not yet
      // processed" for any rows still in flight; refreshing picks them up.
      setStep("processing");
      await fetch(`/api/questionnaires/${questionnaireId}/process`, { method: "POST" });

      router.push(`/questionnaires/${questionnaireId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("idle");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Upload a questionnaire</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a blank security questionnaire (.xlsx). TrustAgent AI will draft answers from your
          knowledge base for you to review.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        className="hidden"
        id="questionnaire-upload"
      />
      <Button asChild disabled={step !== "idle"} className="w-fit gap-2">
        <label htmlFor="questionnaire-upload" className="cursor-pointer">
          {step === "idle" ? <Upload className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {step === "idle" && "Choose file"}
          {step === "uploading" && "Uploading…"}
          {step === "processing" && "Generating answers…"}
        </label>
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
