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

      <section className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.1),transparent_30%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-4 py-9 sm:px-8 sm:py-11">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Decision dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Review your comparison
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Start with the recommendation, then check the reasons, negotiation
            targets, and compact scorecard.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 sm:py-12">
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
                Start a comparison
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
              <div className="rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.15),transparent_38%),linear-gradient(145deg,#0f172a,#111827)] p-4 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                    Decision workspace
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Comparison ready for review
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Based only on entered numbers.
                  </p>
                </div>
                <div className="mt-3 grid gap-2 sm:mt-0 sm:flex">
                  <Link
                    href="/report"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-400 px-4 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0"
                  >
                    View full report
                  </Link>
                  <Link
                    href="/compare"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0"
                  >
                    Back to edit quotes
                  </Link>
                  <button
                    type="button"
                    onClick={saveComparison}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-4 text-sm font-semibold text-teal-200 transition-all hover:-translate-y-0.5 hover:border-teal-300/50 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0"
                  >
                    Save comparison
                  </button>
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
