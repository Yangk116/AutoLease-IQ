"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  type SavedComparison,
  type SavedComparisonStatus,
  readSavedComparisons,
  SavedComparisonsPanel,
  writeSavedComparisons,
} from "../components/SavedComparisonsPanel";
import { SiteHeader } from "../components/SiteHeader";
import { writeCurrentComparison } from "../components/comparisonStorage";

export default function SavedPage() {
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>(
    [],
  );
  const [status, setStatus] = useState<SavedComparisonStatus | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSavedComparisons(readSavedComparisons());
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  function loadSavedComparison(savedComparison: SavedComparison): void {
    if (
      !writeCurrentComparison({
        decisionMode: savedComparison.decisionMode,
        quotes: savedComparison.quotes,
      })
    ) {
      setStatus({
        tone: "error",
        message:
          "The saved comparison could not be loaded. This browser may have blocked local storage.",
      });
      return;
    }

    setStatus({
      tone: "success",
      message: "Saved comparison loaded as the active comparison.",
    });
  }

  function openSavedComparisonReview(savedComparison: SavedComparison): void {
    if (
      !writeCurrentComparison({
        decisionMode: savedComparison.decisionMode,
        quotes: savedComparison.quotes,
      })
    ) {
      setStatus({
        tone: "error",
        message:
          "The saved comparison could not be opened. This browser may have blocked local storage.",
      });
      return;
    }

    window.location.href = "/review";
  }

  function deleteSavedComparison(comparisonId: string): void {
    const nextComparisons = savedComparisons.filter(
      (comparison) => comparison.id !== comparisonId,
    );

    if (!writeSavedComparisons(nextComparisons)) {
      setStatus({
        tone: "error",
        message:
          "The saved comparison could not be deleted. This browser may have blocked local storage.",
      });
      return;
    }

    setSavedComparisons(nextComparisons);
    setStatus({
      tone: "success",
      message: "Saved comparison deleted.",
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="saved" />

      <section className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.1),transparent_30%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-4 py-9 sm:px-8 sm:py-11">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Local saved work
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Saved comparisons
          </h1>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Reopen, load, or remove comparison history saved locally in this browser.
            </p>
            <Link
              href="/compare"
              className="inline-flex h-11 shrink-0 items-center justify-center self-start rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 sm:self-auto"
            >
              Compare new offers
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-6xl">
          <SavedComparisonsPanel
            comparisons={savedComparisons}
            status={status}
            onLoad={loadSavedComparison}
            onDelete={deleteSavedComparison}
            onOpenReview={openSavedComparisonReview}
          />
        </div>
      </section>
    </main>
  );
}
