import Link from "next/link";
import { Button } from "@/components/ui/button";

// Real landing page for "/". Previously this just redirected straight into
// the dashboard — the app itself (routes under app/(dashboard)/) is
// untouched; this only changes what a visitor sees at the root URL before
// they go there.
export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-slate-900">Attesta</span>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900">
              How it works
            </a>
            <Button asChild size="sm">
              <Link href="/knowledge-base">Go to app</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
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
            <Button asChild size="lg">
              <Link href="/knowledge-base">Upload your first policy</Link>
            </Button>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              See how it works
            </a>
          </div>
        </div>

        {/* Hero visual: an actual question row from the review dashboard,
            reusing its real classes and copy pattern rather than invented art. */}
        <div className="rounded-md border border-l-4 border-slate-200 border-l-emerald-400 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Approved</span>
          </div>
          <p className="mb-3 font-medium text-slate-900">Do you encrypt customer data at rest?</p>
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            Yes. All customer data at rest is encrypted using AES-256, managed through our cloud
            provider&apos;s key management service.
          </p>
          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Source 1 from Encryption_Policy.pdf, 94% match
          </div>
        </div>
      </section>

      {/* How it works — a real 3-step sequence, so numbering it is earned */}
      <section id="how-it-works" className="border-t border-slate-200 bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-2xl font-semibold text-slate-900 md:text-3xl">How it works</h2>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
                1
              </div>
              <h3 className="font-medium text-slate-900">Upload your policies</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Add the security policy PDFs you already have — access control, incident response,
                encryption, whatever you&apos;ve written. No reformatting needed.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
                2
              </div>
              <h3 className="font-medium text-slate-900">Upload the questionnaire</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Drop in the blank .xlsx a prospect or auditor sent you. Attesta reads every question and
                drafts an answer from your policies.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
                3
              </div>
              <h3 className="font-medium text-slate-900">Review and export</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Approve each answer or edit it in place, with the exact policy excerpt shown next to it.
                Export the completed file when you&apos;re done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why trust it */}
      <section className="px-4 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="mb-3 text-2xl font-semibold text-slate-900 md:text-3xl">
              Every answer shows its source.
            </h2>
            <p className="text-slate-600">
              Attesta never invents a policy detail. Each drafted answer is generated only from the
              excerpts it retrieved, and shows you exactly which document it came from and how strong the
              match was — so you can trust it before you approve it, and check it when you can&apos;t.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-2xl font-semibold text-slate-900 md:text-3xl">
              A human always signs off.
            </h2>
            <p className="text-slate-600">
              Nothing goes into an exported questionnaire without someone approving it first. If a
              question doesn&apos;t match anything in your policies, Attesta says so instead of guessing —
              so you know exactly which ones still need a person.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-slate-900 px-4 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Stop copy-pasting policy PDFs into spreadsheets.
          </h2>
          <Button asChild size="lg" className="bg-emerald-500 text-white hover:bg-emerald-500/90">
            <Link href="/knowledge-base">Upload your first policy</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8">
        <div className="mx-auto max-w-5xl text-sm text-slate-500">Attesta</div>
      </footer>
    </div>
  );
}