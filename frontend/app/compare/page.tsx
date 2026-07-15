import type { Metadata } from "next";

import LeaseQuoteCalculator from "../LeaseQuoteCalculator";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Compare Lease Offers | AutoLease IQ",
  description:
    "Enter two lease quotes, load presets, compare offers, then open review, report, or saved work.",
};

export default function ComparePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="compare" />

      <section className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.1),transparent_30%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-4 py-9 sm:px-8 sm:py-11">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Lease comparison workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Compare lease offers
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Enter two quotes and choose what matters most. Review and report
            become available after you compare.
          </p>
        </div>
      </section>

      <LeaseQuoteCalculator />
    </main>
  );
}
