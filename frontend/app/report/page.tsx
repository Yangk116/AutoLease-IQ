"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ComparisonResults } from "../components/ComparisonResults";
import {
  buildCurrentComparisonAnalysis,
  readCurrentComparison,
  type CurrentComparisonAnalysis,
} from "../components/comparisonStorage";
import { SiteHeader } from "../components/SiteHeader";

type ReportState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; analysis: CurrentComparisonAnalysis }
  | { status: "error"; message: string };

export default function ReportPage() {
  const [reportState, setReportState] = useState<ReportState>({
    status: "loading",
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const currentComparison = readCurrentComparison();

        if (!currentComparison) {
          setReportState({ status: "empty" });
          return;
        }

        setReportState({
          status: "ready",
          analysis: buildCurrentComparisonAnalysis(currentComparison),
        });
      } catch (error) {
        setReportState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "The current comparison report could not be loaded.",
        });
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <SiteHeader currentPage="report" />

      <section className="border-b border-slate-200/80 bg-white px-4 py-9 sm:px-8 sm:py-11">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Formal report
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Lease comparison report
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            A formal, printable view of the latest comparison with the quote
            context and detailed metrics you entered.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-6xl">
          {reportState.status === "loading" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading report...
            </div>
          ) : null}

          {reportState.status === "empty" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                No report available yet
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Compare two lease offers first. The latest comparison becomes
                the source for this report.
              </p>
              <Link
                href="/compare"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0"
              >
                Start a comparison
              </Link>
            </div>
          ) : null}

          {reportState.status === "error" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-900">
                Report could not be generated
              </h2>
              <p className="mt-2 text-sm leading-6 text-red-800">
                {reportState.message}
              </p>
              <Link
                href="/compare"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-red-800 shadow-sm ring-1 ring-red-200 transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              >
                Back to compare
              </Link>
            </div>
          ) : null}

          {reportState.status === "ready" ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Report workspace
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Use the controls below to copy, print, or save as PDF.
                  </p>
                </div>
                <div className="grid gap-2 sm:flex sm:shrink-0">
                  <Link
                    href="/review"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
                  >
                    Back to review
                  </Link>
                  <Link
                    href="/compare"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  >
                    Edit quotes
                  </Link>
                </div>
              </div>

              <ComparisonResults
                comparisonResult={reportState.analysis.comparisonResult}
                comparisonPaymentSummaries={
                  reportState.analysis.paymentSummaries
                }
                selectedDecisionMode={
                  reportState.analysis.currentComparison.decisionMode
                }
                variant="report"
              />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
