"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { type LeaseComparisonResult } from "@/lib/leaseCalculations";

import {
  buildFinalVerdict,
  type DecisionMode,
} from "./components/ComparisonResults";
import { ComparisonQuoteCard } from "./components/ComparisonQuoteCard";
import type {
  ComparisonQuoteContextNumericField,
  ComparisonQuoteForm,
  ComparisonQuoteOptionalNumericField,
} from "./components/ComparisonQuoteCard";
import {
  buildCurrentComparisonAnalysis,
  readCurrentComparison,
  writeCurrentComparison,
} from "./components/comparisonStorage";
import {
  MAX_SAVED_COMPARISONS,
  readSavedComparisons,
  type SavedComparison,
  type SavedComparisonStatus,
  writeSavedComparisons,
} from "./components/SavedComparisonsPanel";

const defaultTaxRate = 13;

type ComparisonPreset = {
  id:
    | "real-dealer-quote-example"
    | "low-monthly-vs-low-total"
    | "low-upfront-vs-high-upfront"
    | "buyout";
  name: string;
  purpose: string;
  decisionMode: DecisionMode;
  quotes: [ComparisonQuoteForm, ComparisonQuoteForm];
};

type ComparisonQuoteFingerprint = {
  id: ComparisonQuoteForm["id"];
  label: string;
  quoteName: string;
  vehicleName: string | null;
  addTaxToMonthlyPayment: boolean;
  taxRate: number;
  dueOnDelivery: number | null;
  apr: number | null;
  moneyFactor: number | null;
  dealerNotes: string;
  downPayment: number;
  monthlyPayment: number;
  termMonths: number;
  annualMileage: number;
  dealerFees: number;
  leaseEndFee: number;
  vehicleMsrp: number | null;
  sellingPrice: number | null;
  residualMsrp: number | null;
  residualValue: number | null;
};

type SavedComparisonFingerprint = {
  decisionMode: DecisionMode;
  quotes: [ComparisonQuoteFingerprint, ComparisonQuoteFingerprint];
};

const decisionModeOptions: { value: DecisionMode; label: string }[] = [
  {
    value: "lowest-total-cost",
    label: "Lowest total cost",
  },
  {
    value: "lowest-monthly-budget",
    label: "Lowest monthly budget",
  },
  {
    value: "lowest-upfront-cash",
    label: "Lowest upfront cash",
  },
  {
    value: "best-mileage-value",
    label: "Best mileage value",
  },
  {
    value: "possible-future-buyout",
    label: "Possible future buyout",
  },
];

const defaultComparisonQuotes: ComparisonQuoteForm[] = [
  {
    id: "quote-a",
    label: "Quote A",
    quoteName: "Quote A",
    downPayment: 3_000,
    monthlyPayment: 450,
    termMonths: 36,
    annualMileage: 20_000,
    dealerFees: 0,
    leaseEndFee: 0,
    addTaxToMonthlyPayment: false,
    taxRate: defaultTaxRate,
    dealerNotes: "",
  },
  {
    id: "quote-b",
    label: "Quote B",
    quoteName: "Quote B",
    downPayment: 2_000,
    monthlyPayment: 475,
    termMonths: 36,
    annualMileage: 20_000,
    dealerFees: 0,
    leaseEndFee: 0,
    addTaxToMonthlyPayment: false,
    taxRate: defaultTaxRate,
    dealerNotes: "",
  },
];

const comparisonPresets: ComparisonPreset[] = [
  {
    id: "real-dealer-quote-example",
    name: "Real dealer quote example",
    purpose:
      "Practice mapping a detailed dealer quote into the fields without treating it as a market benchmark.",
    decisionMode: "lowest-total-cost",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "2026 Subaru WRX GT",
        downPayment: 8_000,
        monthlyPayment: 362.02,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 395,
        leaseEndFee: 0,
        vehicleName: "2026 Subaru WRX GT",
        vehicleMsrp: 46_995,
        sellingPrice: 45_023.2,
        residualMsrp: 48_240,
        residualValue: 34_250.4,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dueOnDelivery: 7_961.02,
        apr: 2.99,
        moneyFactor: 0.00125,
        dealerNotes:
          "Example quote for testing field mapping. Due on delivery is stored as context.",
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "Alternative offer",
        downPayment: 3_000,
        monthlyPayment: 598.45,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 395,
        leaseEndFee: 0,
        vehicleName: "2026 Subaru WRX GT alternative offer",
        vehicleMsrp: 46_995,
        sellingPrice: 45_023.2,
        residualMsrp: 48_240,
        residualValue: 34_250.4,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dueOnDelivery: 3_598.45,
        apr: 2.99,
        moneyFactor: 0.00125,
        dealerNotes:
          "Alternative example for UI testing with lower cash down and higher monthly payment.",
      },
    ],
  },
  {
    id: "low-monthly-vs-low-total",
    name: "Low monthly vs low total",
    purpose:
      "See why a lower advertised monthly payment can still cost more after upfront cash and fees.",
    decisionMode: "lowest-total-cost",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "Lower advertised monthly",
        downPayment: 7_000,
        monthlyPayment: 390,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 600,
        leaseEndFee: 500,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dealerNotes: "",
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "Higher monthly, lower upfront",
        downPayment: 2_500,
        monthlyPayment: 520,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 600,
        leaseEndFee: 500,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dealerNotes: "",
      },
    ],
  },
  {
    id: "low-upfront-vs-high-upfront",
    name: "Low upfront vs high upfront",
    purpose:
      "Compare an offer with less due today against one that lowers monthly payments with a bigger down payment.",
    decisionMode: "lowest-upfront-cash",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "Low upfront offer",
        downPayment: 1_500,
        monthlyPayment: 610,
        termMonths: 36,
        annualMileage: 16_000,
        dealerFees: 500,
        leaseEndFee: 450,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dealerNotes: "",
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "High upfront offer",
        downPayment: 8_000,
        monthlyPayment: 420,
        termMonths: 36,
        annualMileage: 16_000,
        dealerFees: 500,
        leaseEndFee: 450,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dealerNotes: "",
      },
    ],
  },
  {
    id: "buyout",
    name: "Buyout-focused example",
    purpose:
      "Explore how residual value can lower lease payments but affect a future buyout decision.",
    decisionMode: "possible-future-buyout",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "Higher residual offer",
        downPayment: 4_000,
        monthlyPayment: 480,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 700,
        leaseEndFee: 500,
        vehicleName: "Sample SUV lease",
        vehicleMsrp: 50_000,
        sellingPrice: 47_500,
        residualMsrp: 50_000,
        residualValue: 35_000,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dealerNotes: "",
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "Lower residual offer",
        downPayment: 4_000,
        monthlyPayment: 560,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 700,
        leaseEndFee: 500,
        vehicleName: "Sample SUV lease",
        vehicleMsrp: 50_000,
        sellingPrice: 47_000,
        residualMsrp: 50_000,
        residualValue: 30_000,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
        dealerNotes: "",
      },
    ],
  },
];

function buildComparisonQuoteFingerprint(
  quote: ComparisonQuoteForm,
): ComparisonQuoteFingerprint {
  return {
    id: quote.id,
    label: quote.label,
    quoteName: quote.quoteName,
    vehicleName: quote.vehicleName ?? null,
    addTaxToMonthlyPayment: quote.addTaxToMonthlyPayment,
    taxRate: quote.taxRate,
    dueOnDelivery: quote.dueOnDelivery ?? null,
    apr: quote.apr ?? null,
    moneyFactor: quote.moneyFactor ?? null,
    dealerNotes: quote.dealerNotes,
    downPayment: quote.downPayment,
    monthlyPayment: quote.monthlyPayment,
    termMonths: quote.termMonths,
    annualMileage: quote.annualMileage,
    dealerFees: quote.dealerFees,
    leaseEndFee: quote.leaseEndFee,
    vehicleMsrp: quote.vehicleMsrp ?? null,
    sellingPrice: quote.sellingPrice ?? null,
    residualMsrp: quote.residualMsrp ?? null,
    residualValue: quote.residualValue ?? null,
  };
}

function buildSavedComparisonFingerprint(
  quotes: [ComparisonQuoteForm, ComparisonQuoteForm],
  decisionMode: DecisionMode,
): string {
  const fingerprint: SavedComparisonFingerprint = {
    decisionMode,
    quotes: [
      buildComparisonQuoteFingerprint(quotes[0]),
      buildComparisonQuoteFingerprint(quotes[1]),
    ],
  };

  return JSON.stringify(fingerprint);
}

function getSavedComparisonStatusClasses(
  tone: SavedComparisonStatus["tone"],
): string {
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  return "border-teal-200 bg-teal-50 text-teal-900";
}

export default function LeaseQuoteCalculator() {
  const [comparisonQuotes, setComparisonQuotes] = useState<
    ComparisonQuoteForm[]
  >(defaultComparisonQuotes);
  const [comparisonResult, setComparisonResult] =
    useState<LeaseComparisonResult | null>(null);
  const [comparisonErrorMessage, setComparisonErrorMessage] = useState("");
  const [isCurrentComparisonStored, setIsCurrentComparisonStored] =
    useState(false);
  const [selectedDecisionMode, setSelectedDecisionMode] =
    useState<DecisionMode>("lowest-total-cost");
  const [isComparing, setIsComparing] = useState(false);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>(
    [],
  );
  const [savedComparisonStatus, setSavedComparisonStatus] =
    useState<SavedComparisonStatus | null>(null);
  const comparisonTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedComparisonsFrame = requestAnimationFrame(() => {
      const currentComparison = readCurrentComparison();

      if (currentComparison) {
        setComparisonQuotes(
          currentComparison.quotes.map((currentQuote) => ({ ...currentQuote })),
        );
        setSelectedDecisionMode(currentComparison.decisionMode);
      }

      setSavedComparisons(readSavedComparisons());
    });

    return () => {
      cancelAnimationFrame(savedComparisonsFrame);

      if (comparisonTimeout.current) {
        clearTimeout(comparisonTimeout.current);
      }
    };
  }, []);

  function invalidateComparison(): void {
    if (comparisonTimeout.current) {
      clearTimeout(comparisonTimeout.current);
      comparisonTimeout.current = null;
    }

    setIsComparing(false);
    setComparisonResult(null);
    setComparisonErrorMessage("");
    setIsCurrentComparisonStored(false);
    setSavedComparisonStatus(null);
  }

  function updateComparisonTextQuote(
    quoteId: ComparisonQuoteForm["id"],
    value: string,
  ) {
    invalidateComparison();
    setComparisonQuotes((currentQuotes) =>
      currentQuotes.map((currentQuote) =>
        currentQuote.id === quoteId
          ? {
              ...currentQuote,
              quoteName: value,
            }
          : currentQuote,
      ),
    );
  }

  function updateComparisonVehicleName(
    quoteId: ComparisonQuoteForm["id"],
    value: string,
  ) {
    invalidateComparison();
    setComparisonQuotes((currentQuotes) =>
      currentQuotes.map((currentQuote) =>
        currentQuote.id === quoteId
          ? {
              ...currentQuote,
              vehicleName: value,
            }
          : currentQuote,
      ),
    );
  }

  function updateComparisonDealerNotes(
    quoteId: ComparisonQuoteForm["id"],
    value: string,
  ) {
    invalidateComparison();
    setComparisonQuotes((currentQuotes) =>
      currentQuotes.map((currentQuote) =>
        currentQuote.id === quoteId
          ? {
              ...currentQuote,
              dealerNotes: value,
            }
          : currentQuote,
      ),
    );
  }

  function updateComparisonNumericQuote(
    quoteId: ComparisonQuoteForm["id"],
    field: keyof Pick<
      ComparisonQuoteForm,
      | "downPayment"
      | "monthlyPayment"
      | "termMonths"
      | "annualMileage"
      | "dealerFees"
      | "leaseEndFee"
      | "taxRate"
    >,
    value: string,
  ) {
    invalidateComparison();
    setComparisonQuotes((currentQuotes) =>
      currentQuotes.map((currentQuote) =>
        currentQuote.id === quoteId
          ? {
              ...currentQuote,
              [field]: Number(value),
            }
          : currentQuote,
      ),
    );
  }

  function updateComparisonOptionalNumericQuote(
    quoteId: ComparisonQuoteForm["id"],
    field: ComparisonQuoteOptionalNumericField | ComparisonQuoteContextNumericField,
    value: string,
  ) {
    invalidateComparison();
    setComparisonQuotes((currentQuotes) =>
      currentQuotes.map((currentQuote) =>
        currentQuote.id === quoteId
          ? {
              ...currentQuote,
              [field]: value === "" ? undefined : Number(value),
            }
          : currentQuote,
      ),
    );
  }

  function updateComparisonTaxToggle(
    quoteId: ComparisonQuoteForm["id"],
    checked: boolean,
  ) {
    invalidateComparison();
    setComparisonQuotes((currentQuotes) =>
      currentQuotes.map((currentQuote) =>
        currentQuote.id === quoteId
          ? {
              ...currentQuote,
              addTaxToMonthlyPayment: !checked,
            }
          : currentQuote,
      ),
    );
  }

  function loadComparisonPreset(preset: ComparisonPreset) {
    invalidateComparison();
    setComparisonQuotes(preset.quotes.map((presetQuote) => ({ ...presetQuote })));
    setSelectedDecisionMode(preset.decisionMode);
  }

  function compareOffers() {
    if (comparisonTimeout.current) {
      clearTimeout(comparisonTimeout.current);
    }

    setIsComparing(true);
    setComparisonResult(null);
    setComparisonErrorMessage("");
    setIsCurrentComparisonStored(false);

    comparisonTimeout.current = setTimeout(() => {
      try {
        const quoteA = comparisonQuotes[0];
        const quoteB = comparisonQuotes[1];

        if (!quoteA || !quoteB) {
          throw new Error("Enter two offers before comparing.");
        }

        const currentComparison = {
          updatedAt: new Date().toISOString(),
          decisionMode: selectedDecisionMode,
          quotes: [
            { ...quoteA },
            { ...quoteB },
          ] as [ComparisonQuoteForm, ComparisonQuoteForm],
        };
        const analysis = buildCurrentComparisonAnalysis(currentComparison);

        const storedCurrentComparison = writeCurrentComparison({
          decisionMode: selectedDecisionMode,
          quotes: currentComparison.quotes,
        });

        setComparisonResult(analysis.comparisonResult);
        setIsCurrentComparisonStored(storedCurrentComparison);

        if (!storedCurrentComparison) {
          setSavedComparisonStatus({
            tone: "error",
            message:
              "Comparison generated, but this browser blocked local storage. Review and report pages may not open this comparison.",
          });
        }
      } catch (error) {
        setComparisonErrorMessage(
          error instanceof Error
            ? error.message
            : "Please check both offers and try again.",
        );
      } finally {
        setIsComparing(false);
        comparisonTimeout.current = null;
      }
    }, 650);
  }

  function updateDecisionMode(decisionMode: DecisionMode): void {
    invalidateComparison();
    setSelectedDecisionMode(decisionMode);
  }

  function getComparisonQuoteName(index: number): string {
    const comparisonQuote = comparisonQuotes[index];

    return (
      comparisonQuote?.quoteName.trim() || comparisonQuote?.label || "Quote"
    );
  }

  function saveComparison(): void {
    if (!comparisonResult) {
      return;
    }

    const quoteA = comparisonQuotes[0];
    const quoteB = comparisonQuotes[1];
    const resultA = comparisonResult.results[0];
    const resultB = comparisonResult.results[1];

    if (!quoteA || !quoteB || !resultA || !resultB) {
      setSavedComparisonStatus({
        tone: "error",
        message: "This comparison could not be saved.",
      });
      return;
    }

    const currentFingerprint = buildSavedComparisonFingerprint(
      [quoteA, quoteB],
      selectedDecisionMode,
    );
    const duplicateComparison = savedComparisons.find(
      (comparison) =>
        buildSavedComparisonFingerprint(
          comparison.quotes,
          comparison.decisionMode,
        ) === currentFingerprint,
    );

    if (duplicateComparison) {
      setSavedComparisonStatus({
        tone: "info",
        message: "This comparison is already saved.",
      });
      return;
    }

    const quoteAName = getComparisonQuoteName(0);
    const quoteBName = getComparisonQuoteName(1);
    const finalVerdict = buildFinalVerdict(
      comparisonResult,
      selectedDecisionMode,
    );
    const winnerIndex = finalVerdict?.winningQuote
      ? comparisonResult.results.indexOf(finalVerdict.winningQuote)
      : -1;
    const savedAt = new Date().toISOString();
    const savedComparison: SavedComparison = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      savedAt,
      title: `${quoteAName} vs ${quoteBName}`,
      decisionMode: selectedDecisionMode,
      quotes: [{ ...quoteA }, { ...quoteB }],
      summary: {
        finalWinner:
          winnerIndex === 0
            ? quoteAName
            : winnerIndex === 1
              ? quoteBName
              : null,
        verdictKind: finalVerdict?.kind ?? null,
        trueMonthlyCosts: [
          {
            quoteName: quoteAName,
            value: resultA.trueMonthlyCost,
          },
          {
            quoteName: quoteBName,
            value: resultB.trueMonthlyCost,
          },
        ],
      },
    };
    const uncappedComparisons = [savedComparison, ...savedComparisons];
    const nextComparisons = uncappedComparisons.slice(
      0,
      MAX_SAVED_COMPARISONS,
    );
    const removedOldest =
      uncappedComparisons.length > MAX_SAVED_COMPARISONS;

    if (!writeSavedComparisons(nextComparisons)) {
      setSavedComparisonStatus({
        tone: "error",
        message:
          "The comparison could not be saved. This browser may have blocked local storage or run out of space.",
      });
      return;
    }

    setSavedComparisons(nextComparisons);
    setSavedComparisonStatus({
      tone: "success",
      message: removedOldest
        ? "Comparison saved. Oldest saved item was removed to keep your list manageable."
        : "Comparison saved.",
    });
  }

  return (
    <section
      id="compare"
      aria-labelledby="offers-title"
      className="scroll-mt-32 bg-slate-50 px-4 py-6 sm:scroll-mt-24 sm:px-8 sm:py-8"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
        <div>
          <h2 id="offers-title" className="text-xl font-semibold text-slate-950">
            Enter your offers
          </h2>
          <div id="examples" className="mt-3 scroll-mt-32">
            <p className="text-sm text-slate-600">Try an example (not a market benchmark):</p>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Example lease comparisons">
              {comparisonPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadComparisonPreset(preset)}
                  title={preset.purpose}
                  className="min-h-11 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 hover:border-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          id="comparison-offers-inputs"
          className="grid scroll-mt-32 items-start gap-5 sm:scroll-mt-24 lg:grid-cols-2"
        >
          {comparisonQuotes.map((comparisonQuote) => (
            <ComparisonQuoteCard
              key={comparisonQuote.id}
              quote={comparisonQuote}
              onQuoteNameChange={updateComparisonTextQuote}
              onVehicleNameChange={updateComparisonVehicleName}
              onDealerNotesChange={updateComparisonDealerNotes}
              onNumericChange={updateComparisonNumericQuote}
              onOptionalNumericChange={updateComparisonOptionalNumericQuote}
              onTaxIncludedChange={updateComparisonTaxToggle}
            />
          ))}
        </div>

        <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <legend className="px-1 text-base font-semibold text-slate-950">
            What matters most to you?
          </legend>
          <p className="text-sm leading-6 text-slate-600">
            Decision mode changes the recommendation lens, not the calculation formulas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {decisionModeOptions.map((option) => {
              const isSelected = selectedDecisionMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => updateDecisionMode(option.value)}
                  className={`min-h-11 max-w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    isSelected
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-teal-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={compareOffers}
          disabled={isComparing}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-80 sm:w-auto"
        >
          {isComparing ? "Comparing offers..." : "Compare offers"}
        </button>

        {comparisonErrorMessage && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {comparisonErrorMessage}
          </p>
        )}

        {comparisonResult && !isComparing && (
          <section
            id="comparison-results"
            aria-labelledby="comparison-ready-title"
            className="scroll-mt-32 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5"
          >
            <h3 id="comparison-ready-title" className="text-lg font-semibold text-slate-950">
              Comparison ready
            </h3>
            <p role="status" className="mt-1 text-sm leading-6 text-slate-600">
              {isCurrentComparisonStored
                ? "Review the trade-offs, open the report, or save this comparison in your browser."
                : "This browser did not store the comparison. Review and report pages may not open it; you can still try saving it here."}
            </p>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <Link
                href="/review"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Review dashboard
              </Link>
              <Link
                href="/report"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Report
              </Link>
              <button
                type="button"
                onClick={saveComparison}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Save comparison
              </button>
            </div>
          </section>
        )}

        {savedComparisonStatus && (
          <p
            id="saved-comparison-status"
            role="status"
            className={`scroll-mt-32 rounded-xl border px-4 py-3 text-sm font-medium ${getSavedComparisonStatusClasses(savedComparisonStatus.tone)}`}
          >
            {savedComparisonStatus.message}
          </p>
        )}
      </div>
    </section>
  );
}
