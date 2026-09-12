import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-slate-900">Attesta AI</span>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/knowledge-base" className="hover:text-slate-900">
              Knowledge base
            </Link>
            <Link href="/questionnaires" className="hover:text-slate-900">
              Questionnaires
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
