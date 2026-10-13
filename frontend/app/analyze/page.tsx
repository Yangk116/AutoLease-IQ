import type { Metadata } from "next";

import { SingleLeaseQuoteForm } from "../components/SingleLeaseQuoteForm";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Analyze One Lease Quote | AutoLease IQ",
  description:
    "Enter the lease quote details you have and check them for a future single-quote analysis.",
};

export default function AnalyzePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="analyze" />

      <section className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_32%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Single quote check
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Analyze one lease quote
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Enter what you have. You don&apos;t need to know every lease term.
          </p>
        </div>
      </section>

      <SingleLeaseQuoteForm />
    </main>
  );
}
