"use client";

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

type GuidedProgressStatus = "complete" | "active" | "available" | "locked";

type GuidedProgressStep = {
  number: number;
  label: string;
  href: string;
  status: GuidedProgressStatus;
};

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

  function updateComparisonTextQuote(
    quoteId: ComparisonQuoteForm["id"],
    value: string,
  ) {
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
    if (comparisonTimeout.current) {
      clearTimeout(comparisonTimeout.current);
      comparisonTimeout.current = null;
    }

    setIsComparing(false);
    setComparisonQuotes(preset.quotes.map((presetQuote) => ({ ...presetQuote })));
    setSelectedDecisionMode(preset.decisionMode);
    setComparisonResult(null);
    setComparisonErrorMessage("");
    setIsCurrentComparisonStored(false);
    setSavedComparisonStatus(null);
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

  function reviewVerdict(): void {
    window.location.href = "/review";
  }

  function previewReport(): void {
    window.location.href = "/report";
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

  const hasComparisonResult = comparisonResult !== null && !isComparing;
  const guidedProgressSteps: GuidedProgressStep[] = [
    {
      number: 1,
      label: "Enter numbers",
      href: "#compare",
      status: "complete",
    },
    {
      number: 2,
      label: "Compare offers",
      href: "#comparison-offers-inputs",
      status: hasComparisonResult ? "complete" : "active",
    },
    {
      number: 3,
      label: "Review verdict",
      href: "/review",
      status: hasComparisonResult ? "active" : "locked",
    },
    {
      number: 4,
      label: "Open report",
      href: "/report",
      status: hasComparisonResult ? "available" : "locked",
    },
    {
      number: 5,
      label: "Save work",
      href: "/saved",
      status: hasComparisonResult ? "available" : "locked",
    },
  ];

  return (
    <section
      id="compare"
      className="scroll-mt-32 bg-slate-50 px-4 py-8 sm:scroll-mt-24 sm:px-8 sm:py-12"
    >
      <div className="mx-auto w-full max-w-6xl rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.65)] sm:rounded-[2rem] sm:p-7 lg:p-8">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Offer workspace
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Two quotes, one consistent comparison
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500 sm:text-right">
            Enter the figures as shown. Optional context stays separate from
            calculated costs.
          </p>
        </div>

        <nav
          className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)]"
          aria-label="Lease comparison progress"
        >
          <div className="overscroll-x-contain overflow-x-auto px-3 pb-4 pt-5 [scrollbar-width:thin] sm:px-6 sm:pb-5">
            <ol className="flex w-max min-w-full snap-x snap-proximity items-start sm:min-w-[680px] lg:w-full lg:min-w-0">
              {guidedProgressSteps.map((step, index) => {
                const isLocked = step.status === "locked";
                const isComplete = step.status === "complete";
                const isActive = step.status === "active";
                const stepClasses = `group relative z-10 flex min-w-0 flex-col items-center rounded-xl px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2 ${
                  isLocked
                    ? "cursor-not-allowed text-slate-400"
                    : "text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-teal-800"
                }`;
                const stepContent = (
                  <>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition-colors ${
                        isComplete
                          ? "border-teal-700 bg-teal-700 text-white"
                          : isActive
                            ? "border-teal-700 bg-teal-50 text-teal-800 ring-4 ring-teal-100"
                            : isLocked
                              ? "border-slate-200 bg-slate-100 text-slate-400"
                              : "border-teal-200 bg-white text-teal-800 group-hover:border-teal-400 group-hover:bg-teal-50"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-4 w-4"
                          stroke="currentColor"
                          strokeWidth="2.25"
                        >
                          <path
                            d="m4.5 10.5 3.25 3.25 7.75-8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </span>
                    <span
                      className={`mt-3 text-xs font-semibold sm:text-sm ${
                        isActive ? "text-teal-900" : ""
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="sr-only">
                      {isComplete
                        ? " completed"
                        : isActive
                          ? " current step"
                          : isLocked
                            ? " locked until offers are compared"
                            : " available"}
                    </span>
                  </>
                );

                return (
                  <li
                    key={step.label}
                    className="relative flex w-28 flex-none snap-start justify-center sm:w-auto sm:min-w-0 sm:flex-1"
                  >
                    {index < guidedProgressSteps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-[1.4rem] h-px ${
                          isComplete ? "bg-teal-300" : "bg-slate-200"
                        }`}
                      />
                    ) : null}
                    {isLocked ? (
                      <div className={stepClasses} aria-disabled="true">
                        {stepContent}
                      </div>
                    ) : (
                      <a
                        href={step.href}
                        className={stepClasses}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {stepContent}
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="border-t border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500 sm:px-6">
            Review, report, and saved history unlock after the comparison is ready.
          </p>
        </nav>

        <div className="mt-6 space-y-5">
          <div
            id="examples"
            className="scroll-mt-32 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:scroll-mt-24 sm:p-5"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Try an example
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Load sample offers to see how AutoLease IQ compares more than
                  the advertised monthly payment.
                </p>
              </div>
              <span className="mt-1 shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                Samples only — not recommendations
              </span>
            </div>

            <div
              className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Example lease comparisons"
            >
              {comparisonPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadComparisonPreset(preset)}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_10px_28px_-24px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/70 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
                >
                  <span className="block text-sm font-semibold text-teal-800 transition-colors group-hover:text-teal-900">
                    {preset.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {preset.purpose}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)] sm:p-5">
            <h3 className="text-sm font-semibold text-white">
              I have a dealer quote
            </h3>
            <ul className="mt-3 grid gap-x-5 gap-y-2 text-xs leading-5 text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
              <li>Use the dealer&apos;s monthly payment exactly as shown.</li>
              <li>
                If payment includes tax, keep &quot;Tax included in monthly
                payment&quot; on.
              </li>
              <li>Put only actual cash down in &quot;Cash down.&quot;</li>
              <li>
                Put the full amount due at signing or due on delivery in
                &quot;Due on delivery&quot; for review context.
              </li>
              <li>Do not enter the same fee twice.</li>
              <li>
                APR and money factor are saved for context only in this version.
              </li>
            </ul>
          </aside>

          {savedComparisonStatus ? (
            <p
              id="saved-comparison-status"
              className={`scroll-mt-32 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm sm:scroll-mt-24 ${getSavedComparisonStatusClasses(
                savedComparisonStatus.tone,
              )}`}
              role="status"
              aria-live="polite"
            >
              {savedComparisonStatus.message}
            </p>
          ) : null}

          <div
            id="comparison-offers-inputs"
            className="grid scroll-mt-32 gap-5 sm:scroll-mt-24 lg:grid-cols-2"
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-950">
              What matters most to you?
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              This sets the recommendation lens; it does not change the calculations.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {decisionModeOptions.map((option) => {
                const isSelected = selectedDecisionMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDecisionMode(option.value)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:ring-offset-2 active:scale-[0.97] ${
                      isSelected
                        ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 hover:shadow-sm"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-[linear-gradient(to_bottom_right,#f0fdfa,#ffffff)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Ready to compare?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Next: open the decision dashboard, then generate or save the report.
              </p>
            </div>
            <button
            type="button"
            onClick={compareOffers}
            disabled={isComparing}
            className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 text-base font-semibold text-white shadow-[0_10px_25px_-12px_rgba(13,148,136,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-[0_14px_30px_-12px_rgba(13,148,136,0.8)] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 sm:w-auto"
          >
            {isComparing ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                />
                Comparing offers…
              </>
            ) : (
              "Compare offers"
            )}
            </button>
          </div>

          {comparisonErrorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {comparisonErrorMessage}
            </p>
          ) : null}

          <aside
            className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 rounded-2xl border border-slate-700/90 bg-slate-950/95 p-2.5 text-white shadow-[0_22px_60px_-24px_rgba(15,23,42,0.75)] backdrop-blur-md sm:bottom-4 sm:p-4"
            aria-label="Next step"
            aria-live="polite"
          >
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 sm:flex">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M4 10h12M11 5l5 5-5 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-teal-700 sm:text-xs">
                    Next step
                  </p>
                  <p className="mt-1 hidden text-sm leading-5 text-slate-300 sm:block">
                    {isComparing
                      ? "Comparing your offers and preparing the final verdict."
                      : hasComparisonResult
                        ? "Review the final verdict and key trade-offs, then prepare your dealer conversation."
                        : "Compare your offers to see the true cost and final verdict."}
                  </p>
                </div>
              </div>

              <div
                className={`grid gap-2 sm:flex sm:flex-wrap lg:shrink-0 lg:justify-end ${
                  hasComparisonResult ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {!hasComparisonResult ? (
                  <button
                    type="button"
                    onClick={compareOffers}
                    disabled={isComparing}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0 sm:h-10 sm:flex-none"
                  >
                    {isComparing ? "Comparing offers..." : "Compare offers"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={reviewVerdict}
                      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-teal-400 px-2 text-xs font-semibold text-slate-950 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0 active:scale-[0.98] sm:h-10 sm:flex-none sm:px-3.5 sm:text-sm"
                    >
                      <span className="sm:hidden">Verdict</span>
                      <span className="hidden sm:inline">Review verdict</span>
                    </button>
                    <button
                      type="button"
                      onClick={previewReport}
                      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/50 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-teal-300/60 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0 active:scale-[0.98] sm:h-10 sm:flex-none sm:px-3.5 sm:text-sm"
                    >
                      <span className="sm:hidden">Report</span>
                      <span className="hidden sm:inline">Preview report</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>

          {isComparing ? (
            <div
              className="comparison-loading rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.5)] sm:p-6"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal-100 border-t-teal-700" />
                <div>
                  <p className="font-semibold text-slate-950">
                    Comparing the full lease cost
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Normalizing payments, upfront cash, mileage, and fees.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {comparisonResult && !isComparing ? (
            <section
              id="comparison-results"
              className="comparison-results-reveal scroll-mt-32 space-y-5 sm:scroll-mt-24"
              aria-labelledby="comparison-ready-title"
            >
              <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/90 to-white p-5 shadow-[0_22px_55px_-36px_rgba(13,148,136,0.7)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                      Comparison ready
                    </p>
                    <h3
                      id="comparison-ready-title"
                      className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
                    >
                      Open the focused review dashboard next.
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {isCurrentComparisonStored
                        ? "The latest comparison has been saved as the active browser comparison. Review the verdict, generate a report, or save it to your local saved list."
                        : "The comparison is available below, but this browser did not store it for the review and report pages."}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:flex lg:shrink-0">
                    <a
                      href="/review"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                    >
                      Open review dashboard
                    </a>
                    <a
                      href="/report"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                    >
                      Open report
                    </a>
                    <button
                      type="button"
                      onClick={saveComparison}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                    >
                      Save comparison
                    </button>
                  </div>
                </div>
              </div>

            </section>
          ) : null}

          <a
            href="/saved"
            className="block rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2 sm:p-5"
          >
            <span className="font-semibold text-slate-950">
              Saved comparisons
            </span>
            <span className="mt-1 block text-slate-500">
              Open your locally saved comparison list on the dedicated saved
              page.
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
