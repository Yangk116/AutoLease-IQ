import { compareLeaseQuotes, type LeaseComparisonResult } from "@/lib/leaseCalculations";

import type { ComparisonQuoteForm } from "./ComparisonQuoteCard";
import {
  buildFinalVerdict,
  type ComparisonPaymentSummary,
  type DecisionMode,
} from "./ComparisonResults";
import type { SavedComparison } from "./SavedComparisonsPanel";

export const CURRENT_COMPARISON_STORAGE_KEY =
  "autolease-iq:current-comparison";

export type CurrentComparison = {
  updatedAt: string;
  decisionMode: DecisionMode;
  quotes: [ComparisonQuoteForm, ComparisonQuoteForm];
};

export type CurrentComparisonAnalysis = {
  currentComparison: CurrentComparison;
  comparisonResult: LeaseComparisonResult;
  paymentSummaries: ComparisonPaymentSummary[];
};

const decisionModes: readonly DecisionMode[] = [
  "lowest-total-cost",
  "lowest-monthly-budget",
  "lowest-upfront-cash",
  "best-mileage-value",
  "possible-future-buyout",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDecisionMode(value: unknown): value is DecisionMode {
  return (
    typeof value === "string" &&
    decisionModes.includes(value as DecisionMode)
  );
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];

  return isFiniteNumber(value) ? value : undefined;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function parseComparisonQuote(value: unknown): ComparisonQuoteForm | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const label = value.label;
  const quoteName = value.quoteName;
  const vehicleName = value.vehicleName;
  const addTaxToMonthlyPayment = value.addTaxToMonthlyPayment;
  const taxRate = value.taxRate;
  const downPayment = value.downPayment;
  const monthlyPayment = value.monthlyPayment;
  const termMonths = value.termMonths;
  const annualMileage = value.annualMileage;
  const dealerFees = value.dealerFees;
  const leaseEndFee = value.leaseEndFee;

  if (
    (id !== "quote-a" && id !== "quote-b") ||
    typeof label !== "string" ||
    typeof quoteName !== "string" ||
    (vehicleName !== undefined && typeof vehicleName !== "string") ||
    typeof addTaxToMonthlyPayment !== "boolean" ||
    !isFiniteNumber(taxRate) ||
    !isFiniteNumber(downPayment) ||
    !isFiniteNumber(monthlyPayment) ||
    !isFiniteNumber(termMonths) ||
    !isFiniteNumber(annualMileage) ||
    !isFiniteNumber(dealerFees) ||
    !isFiniteNumber(leaseEndFee)
  ) {
    return null;
  }

  return {
    id,
    label,
    quoteName,
    vehicleName,
    addTaxToMonthlyPayment,
    taxRate,
    downPayment,
    monthlyPayment,
    termMonths,
    annualMileage,
    dealerFees,
    leaseEndFee,
    vehicleMsrp: readOptionalNumber(value, "vehicleMsrp"),
    sellingPrice: readOptionalNumber(value, "sellingPrice"),
    residualMsrp: readOptionalNumber(value, "residualMsrp"),
    residualValue: readOptionalNumber(value, "residualValue"),
    dueOnDelivery: readOptionalNumber(value, "dueOnDelivery"),
    apr: readOptionalNumber(value, "apr"),
    moneyFactor: readOptionalNumber(value, "moneyFactor"),
    dealerNotes: readOptionalString(value, "dealerNotes") ?? "",
  };
}

function parseCurrentComparison(value: unknown): CurrentComparison | null {
  if (
    !isRecord(value) ||
    typeof value.updatedAt !== "string" ||
    Number.isNaN(Date.parse(value.updatedAt)) ||
    !isDecisionMode(value.decisionMode) ||
    !Array.isArray(value.quotes) ||
    value.quotes.length !== 2
  ) {
    return null;
  }

  const quoteA = parseComparisonQuote(value.quotes[0]);
  const quoteB = parseComparisonQuote(value.quotes[1]);

  if (!quoteA || !quoteB || quoteA.id !== "quote-a" || quoteB.id !== "quote-b") {
    return null;
  }

  return {
    updatedAt: value.updatedAt,
    decisionMode: value.decisionMode,
    quotes: [quoteA, quoteB],
  };
}

export function readCurrentComparison(): CurrentComparison | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(
      CURRENT_COMPARISON_STORAGE_KEY,
    );

    if (!storedValue) {
      return null;
    }

    return parseCurrentComparison(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

export function writeCurrentComparison(
  comparison: Pick<CurrentComparison, "decisionMode" | "quotes">,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const currentComparison: CurrentComparison = {
    ...comparison,
    updatedAt: new Date().toISOString(),
    quotes: [{ ...comparison.quotes[0] }, { ...comparison.quotes[1] }],
  };

  try {
    window.localStorage.setItem(
      CURRENT_COMPARISON_STORAGE_KEY,
      JSON.stringify(currentComparison),
    );
    return true;
  } catch {
    return false;
  }
}

export function buildCurrentComparisonAnalysis(
  currentComparison: CurrentComparison,
): CurrentComparisonAnalysis {
  const paymentSummaries: ComparisonPaymentSummary[] = [];
  const cleanQuotes = currentComparison.quotes.map((comparisonQuote) => {
    const quoteName = comparisonQuote.quoteName.trim() || comparisonQuote.label;
    const vehicleName = comparisonQuote.vehicleName?.trim() || quoteName;

    if (comparisonQuote.addTaxToMonthlyPayment && comparisonQuote.taxRate < 0) {
      throw new Error(`${quoteName}: Tax rate cannot be negative.`);
    }

    const monthlyPaymentUsed = comparisonQuote.addTaxToMonthlyPayment
      ? comparisonQuote.monthlyPayment * (1 + comparisonQuote.taxRate / 100)
      : comparisonQuote.monthlyPayment;

    paymentSummaries.push({
      quoteName,
      enteredMonthlyPayment: comparisonQuote.monthlyPayment,
      monthlyPaymentUsed,
      taxIncludedInMonthlyPayment: !comparisonQuote.addTaxToMonthlyPayment,
      taxRate: comparisonQuote.addTaxToMonthlyPayment
        ? comparisonQuote.taxRate
        : undefined,
      dueOnDelivery: comparisonQuote.dueOnDelivery,
      apr: comparisonQuote.apr,
      moneyFactor: comparisonQuote.moneyFactor,
      dealerNotes:
        comparisonQuote.dealerNotes.trim() === ""
          ? undefined
          : comparisonQuote.dealerNotes.trim(),
    });

    return {
      vehicleName,
      downPayment: comparisonQuote.downPayment,
      monthlyPayment: monthlyPaymentUsed,
      termMonths: comparisonQuote.termMonths,
      annualMileage: comparisonQuote.annualMileage,
      dealerFees: comparisonQuote.dealerFees,
      leaseEndFee: comparisonQuote.leaseEndFee,
      vehicleMsrp: comparisonQuote.vehicleMsrp,
      sellingPrice: comparisonQuote.sellingPrice,
      residualMsrp: comparisonQuote.residualMsrp,
      residualValue: comparisonQuote.residualValue,
    };
  });

  return {
    currentComparison,
    comparisonResult: compareLeaseQuotes(cleanQuotes),
    paymentSummaries,
  };
}

function getComparisonQuoteName(
  currentComparison: CurrentComparison,
  index: number,
): string {
  const comparisonQuote = currentComparison.quotes[index];

  return (
    comparisonQuote?.quoteName.trim() || comparisonQuote?.label || "Quote"
  );
}

export function createSavedComparisonFromCurrent(
  currentComparison: CurrentComparison,
  comparisonResult: LeaseComparisonResult,
): SavedComparison | null {
  const quoteA = currentComparison.quotes[0];
  const quoteB = currentComparison.quotes[1];
  const resultA = comparisonResult.results[0];
  const resultB = comparisonResult.results[1];

  if (!quoteA || !quoteB || !resultA || !resultB) {
    return null;
  }

  const quoteAName = getComparisonQuoteName(currentComparison, 0);
  const quoteBName = getComparisonQuoteName(currentComparison, 1);
  const finalVerdict = buildFinalVerdict(
    comparisonResult,
    currentComparison.decisionMode,
  );
  const winnerIndex = finalVerdict?.winningQuote
    ? comparisonResult.results.indexOf(finalVerdict.winningQuote)
    : -1;
  const savedAt = new Date().toISOString();

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    savedAt,
    title: `${quoteAName} vs ${quoteBName}`,
    decisionMode: currentComparison.decisionMode,
    quotes: [{ ...quoteA }, { ...quoteB }],
    summary: {
      finalWinner:
        winnerIndex === 0 ? quoteAName : winnerIndex === 1 ? quoteBName : null,
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
}
