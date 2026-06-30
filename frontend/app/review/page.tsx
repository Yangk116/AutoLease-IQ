"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ComparisonResults } from "../components/ComparisonResults";
import {
  buildCurrentComparisonAnalysis,
  createSavedComparisonFromCurrent,
  readCurrentComparison,
  type CurrentComparisonAnalysis,
} from "../components/comparisonStorage";
import {
  MAX_SAVED_COMPARISONS,
  readSavedComparisons,
  type SavedComparisonStatus,
  writeSavedComparisons,
} from "../components/SavedComparisonsPanel";
import { SiteHeader } from "../components/SiteHeader";

type ReviewState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; analysis: CurrentComparisonAnalysis }
  | { status: "error"; message: string };

function buildSavedComparisonFingerprint(
  comparison: Pick<
    CurrentComparisonAnalysis["currentComparison"],
    "decisionMode" | "quotes"
  >,
): string {
  return JSON.stringify({
    decisionMode: comparison.decisionMode,
    quotes: comparison.quotes,
  });
}

function getStatusClasses(tone: SavedComparisonStatus["tone"]): string {
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  return "border-teal-200 bg-teal-50 text-teal-900";
}

export default function ReviewPage() {
  const [reviewState, setReviewState] = useState<ReviewState>({
    status: "loading",
  });
  const [saveStatus, setSaveStatus] = useState<SavedComparisonStatus | null>(
    null,
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const currentComparison = readCurrentComparison();

        if (!currentComparison) {
          setReviewState({ status: "empty" });
          return;
        }

        setReviewState({
          status: "ready",
          analysis: buildCurrentComparisonAnalysis(currentComparison),
        });
      } catch (error) {
        setReviewState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "The current comparison could not be loaded.",
        });
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  function saveComparison(): void {
    if (reviewState.status !== "ready") {
      return;
    }

    const savedComparison = createSavedComparisonFromCurrent(
      reviewState.analysis.currentComparison,
      reviewState.analysis.comparisonResult,
    );

    if (!savedComparison) {
      setSaveStatus({
        tone: "error",
        message: "This comparison could not be saved.",
      });
      return;
    }

    const savedComparisons = readSavedComparisons();
    const currentFingerprint = buildSavedComparisonFingerprint(
      reviewState.analysis.currentComparison,
    );
    const duplicateComparison = savedComparisons.find(
      (comparison) =>
        buildSavedComparisonFingerprint(comparison) === currentFingerprint,
    );

    if (duplicateComparison) {
      setSaveStatus({
        tone: "info",
        message: "This comparison is already saved.",
      });
      return;
    }

    const uncappedComparisons = [savedComparison, ...savedComparisons];
    const nextComparisons = uncappedComparisons.slice(
      0,
      MAX_SAVED_COMPARISONS,
    );
    const removedOldest =
      uncappedComparisons.length > MAX_SAVED_COMPARISONS;

    if (!writeSavedComparisons(nextComparisons)) {
      setSaveStatus({
        tone: "error",
        message:
          "The comparison could not be saved. This browser may have blocked local storage.",
      });
      return;
    }

    setSaveStatus({
      tone: "success",
      message: removedOldest
        ? "Comparison saved. Oldest saved item was removed."
        : "Comparison saved.",
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="review" />

      <section className="border-b border-slate-200/80 bg-white px-4 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Decision dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Review your comparison
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Start with the final verdict, then check recommendation reasons,
            negotiation targets, scorecard signals, and compact quote metrics.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-6xl">
          {reviewState.status === "loading" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading comparison...
            </div>
          ) : null}

          {reviewState.status === "empty" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                No active comparison yet
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Compare two lease offers first. The latest comparison stays in
                this browser and opens here for review.
              </p>
              <Link
                href="/compare"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0"
              >
                Back to compare
              </Link>
            </div>
          ) : null}

          {reviewState.status === "error" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-900">
                Comparison could not be reviewed
              </h2>
              <p className="mt-2 text-sm leading-6 text-red-800">
                {reviewState.message}
              </p>
              <Link
                href="/compare"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-red-800 shadow-sm ring-1 ring-red-200 transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              >
                Back to compare
              </Link>
            </div>
          ) : null}

          {reviewState.status === "ready" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-[0_18px_45px_-35px_rgba(13,148,136,0.65)] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Comparison ready
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Use this dashboard for the decision, or open the formal
                    report when you are ready to copy or print it.
                  </p>
                </div>
                <div className="mt-3 grid gap-2 sm:mt-0 sm:flex">
                  <Link
                    href="/report"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0"
                  >
                    View full report
                  </Link>
                  <button
                    type="button"
                    onClick={saveComparison}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0"
                  >
                    Save comparison
                  </button>
                  <Link
                    href="/compare"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:translate-y-0"
                  >
                    Back to edit quotes
                  </Link>
                </div>
              </div>

              {saveStatus ? (
                <p
                  className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${getStatusClasses(
                    saveStatus.tone,
                  )}`}
                  role="status"
                  aria-live="polite"
                >
                  {saveStatus.message}
                </p>
              ) : null}

              <ComparisonResults
                comparisonResult={reviewState.analysis.comparisonResult}
                comparisonPaymentSummaries={reviewState.analysis.paymentSummaries}
                selectedDecisionMode={
                  reviewState.analysis.currentComparison.decisionMode
                }
                variant="review"
              />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
