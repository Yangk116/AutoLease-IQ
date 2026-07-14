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

      <section className="border-b border-slate-200/80 bg-white px-4 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Lease comparison workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Compare lease offers
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Enter quotes, load a preset if useful, compare the offers, then
            continue to review, report, or saved work.
          </p>
        </div>
      </section>

      <LeaseQuoteCalculator />
    </main>
  );
}
