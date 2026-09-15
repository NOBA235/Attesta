import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-slate-900">Attesta</span>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
            <Button asChild size="sm"><Link href="/knowledge-base">Go to app</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Answer security questionnaires in minutes, not days.
          </h1>
          <p className="max-w-md text-lg text-slate-600">
            Upload your company&apos;s security policies once. Attesta drafts every answer to a SOC 2 or
            ISO 27001 questionnaire from them, with the source cited — you just review and approve.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><Link href="/knowledge-base">Upload your first policy</Link></Button>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">See how it works</a>
          </div>
        </div>
        <div className="rounded-md border border-l-4 border-slate-200 border-l-emerald-400 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Approved</div>
          <p className="mb-3 font-medium text-slate-900">Do you encrypt customer data at rest?</p>
          <p className="mb-3 text-sm leading-relaxed text-slate-700">Yes. All customer data at rest is encrypted using AES-256, managed through our cloud provider&apos;s key management service.</p>
          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Source 1 from Encryption_Policy.pdf, 94% match</div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-200 bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-2xl font-semibold text-slate-900 md:text-3xl">How it works</h2>
          <div className="grid gap-10 md:grid-cols-3">
            <div><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">1</div><h3 className="mb-2 font-medium text-slate-900">Upload your policies</h3><p className="text-sm leading-relaxed text-slate-600">Add the security policy PDFs you already have. No reformatting needed.</p></div>
            <div><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">2</div><h3 className="mb-2 font-medium text-slate-900">Upload the questionnaire</h3><p className="text-sm leading-relaxed text-slate-600">Drop in the blank .xlsx a prospect or auditor sent you.</p></div>
            <div><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">3</div><h3 className="mb-2 font-medium text-slate-900">Review and export</h3><p className="text-sm leading-relaxed text-slate-600">Approve each answer or edit it in place, then export the completed file.</p></div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-900 px-4 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Stop copy-pasting policy PDFs into spreadsheets.</h2>
          <Button asChild size="lg" className="bg-emerald-500 text-white hover:bg-emerald-500/90"><Link href="/knowledge-base">Upload your first policy</Link></Button>
        </div>
      </section>
    </div>
  );
}
