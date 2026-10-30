import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonQuoteForm } from "./ComparisonQuoteCard";
import {
  buildCurrentComparisonAnalysis,
  CURRENT_COMPARISON_STORAGE_KEY,
  readCurrentComparison,
  saveComparisonAnalysis,
  writeCurrentComparison,
  type CurrentComparison,
} from "./comparisonStorage";
import {
  MAX_SAVED_COMPARISONS,
  readSavedComparisons,
  SAVED_COMPARISONS_STORAGE_KEY,
  writeSavedComparisons,
} from "./SavedComparisonsPanel";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const quoteA: ComparisonQuoteForm = {
  id: "quote-a",
  label: "Quote A",
  quoteName: "Dealer A",
  vehicleName: "Test vehicle A",
  downPayment: 2_000,
  monthlyPayment: 400,
  termMonths: 24,
  annualMileage: 20_000,
  dealerFees: 300,
  leaseEndFee: 400,
  addTaxToMonthlyPayment: false,
  taxRate: 13,
  dueOnDelivery: 9_999,
  apr: 2.99,
  moneyFactor: 0.00125,
  dealerNotes: "Context only",
};

const quoteB: ComparisonQuoteForm = {
  ...quoteA,
  id: "quote-b",
  label: "Quote B",
  quoteName: "Dealer B",
  vehicleName: "Test vehicle B",
  downPayment: 1_000,
  monthlyPayment: 450,
  dueOnDelivery: 1_450,
};

function makeCurrentComparison(): CurrentComparison {
  return {
    updatedAt: "2026-09-07T12:00:00.000Z",
    decisionMode: "lowest-total-cost",
    quotes: [{ ...quoteA }, { ...quoteB }],
  };
}

function makeSavedComparison(index: number): Record<string, unknown> {
  const currentComparison = makeCurrentComparison();

  return {
    id: `saved-${index}`,
    savedAt: `2026-09-07T12:${String(index).padStart(2, "0")}:00.000Z`,
    title: `Dealer A vs Dealer B ${index}`,
    decisionMode: currentComparison.decisionMode,
    quotes: currentComparison.quotes,
    summary: {
      finalWinner: "Dealer A",
      verdictKind: "winner",
      trueMonthlyCosts: [
        { quoteName: "Dealer A", value: 512.5 },
        { quoteName: "Dealer B", value: 508.33 },
      ],
    },
  };
}

describe("comparison local storage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips the active comparison", () => {
    const currentComparison = makeCurrentComparison();

    expect(writeCurrentComparison(currentComparison)).toBe(true);
    expect(readCurrentComparison()).toMatchObject({
      decisionMode: currentComparison.decisionMode,
      quotes: currentComparison.quotes,
    });
  });

  it("treats malformed active-comparison JSON as empty", () => {
    storage.setItem(CURRENT_COMPARISON_STORAGE_KEY, "{not-json");

    expect(readCurrentComparison()).toBeNull();
  });

  it("restores older active comparisons without optional context fields", () => {
    const currentComparison = makeCurrentComparison();
    const olderQuotes = currentComparison.quotes.map((quote) => {
      const olderQuote: Partial<ComparisonQuoteForm> = { ...quote };

      delete olderQuote.apr;
      delete olderQuote.dealerNotes;
      delete olderQuote.dueOnDelivery;
      delete olderQuote.moneyFactor;

      return olderQuote;
    });

    storage.setItem(
      CURRENT_COMPARISON_STORAGE_KEY,
      JSON.stringify({ ...currentComparison, quotes: olderQuotes }),
    );

    const restored = readCurrentComparison();

    expect(restored?.quotes[0]).toMatchObject({
      id: "quote-a",
      dealerNotes: "",
    });
    expect(restored?.quotes[0].dueOnDelivery).toBeUndefined();
  });

  it("keeps due on delivery and finance fields out of lease cost", () => {
    const analysis = buildCurrentComparisonAnalysis(makeCurrentComparison());

    expect(analysis.comparisonResult.results[0]?.totalCost).toBe(12_300);
    expect(analysis.paymentSummaries[0]).toMatchObject({
      dueOnDelivery: 9_999,
      apr: 2.99,
      moneyFactor: 0.00125,
    });
  });

  it("adds tax only when the entered payment excludes tax", () => {
    const currentComparison = makeCurrentComparison();
    currentComparison.quotes[0].addTaxToMonthlyPayment = true;

    const analysis = buildCurrentComparisonAnalysis(currentComparison);

    expect(analysis.paymentSummaries[0]?.monthlyPaymentUsed).toBeCloseTo(452);
    expect(analysis.comparisonResult.results[0]?.totalCost).toBeCloseTo(13_548);
  });

  it("saves the loaded analysis and preserves existing records", () => {
    storage.setItem(
      SAVED_COMPARISONS_STORAGE_KEY,
      JSON.stringify([{ ...makeSavedComparison(0), decisionMode: "lowest-upfront-cash" }]),
    );
    const previous = readSavedComparisons();
    const analysis = buildCurrentComparisonAnalysis(makeCurrentComparison());

    expect(saveComparisonAnalysis(analysis)).toEqual({
      tone: "success",
      message: "Comparison saved.",
    });
    const saved = readSavedComparisons();
    expect(saved).toHaveLength(2);
    expect(saved[0].quotes).toEqual(analysis.currentComparison.quotes);
    expect(saved[0].decisionMode).toBe(analysis.currentComparison.decisionMode);
    expect(saved.slice(1)).toEqual(previous);
  });

  it("does not rewrite or duplicate a comparison saved from either page", () => {
    writeCurrentComparison(makeCurrentComparison());
    const analysis = buildCurrentComparisonAnalysis(readCurrentComparison()!);
    saveComparisonAnalysis(analysis);
    const stored = storage.getItem(SAVED_COMPARISONS_STORAGE_KEY);

    const reloaded = buildCurrentComparisonAnalysis({
      ...analysis.currentComparison,
      updatedAt: "2026-10-29T12:00:00.000Z",
    });
    expect(saveComparisonAnalysis(reloaded)).toEqual({
      tone: "info",
      message: "This comparison is already saved.",
    });
    expect(storage.getItem(SAVED_COMPARISONS_STORAGE_KEY)).toBe(stored);
  });

  it("retains the save limit and reports removal of the oldest item", () => {
    storage.setItem(
      SAVED_COMPARISONS_STORAGE_KEY,
      JSON.stringify(Array.from({ length: MAX_SAVED_COMPARISONS }, (_, index) => ({
        ...makeSavedComparison(index),
        decisionMode: "lowest-upfront-cash",
      }))),
    );
    const previous = readSavedComparisons();

    expect(saveComparisonAnalysis(buildCurrentComparisonAnalysis(makeCurrentComparison()))).toEqual({
      tone: "success",
      message: "Comparison saved. Oldest saved item was removed.",
    });
    const saved = readSavedComparisons();
    expect(saved).toHaveLength(MAX_SAVED_COMPARISONS);
    expect(saved.slice(1)).toEqual(previous.slice(0, -1));
  });

  it("reports a failed save without changing existing records", () => {
    storage.setItem(SAVED_COMPARISONS_STORAGE_KEY, JSON.stringify([{
      ...makeSavedComparison(0),
      decisionMode: "lowest-upfront-cash",
    }]));
    const stored = storage.getItem(SAVED_COMPARISONS_STORAGE_KEY);
    const spy = vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    try {
      expect(saveComparisonAnalysis(buildCurrentComparisonAnalysis(makeCurrentComparison()))).toEqual({
        tone: "error",
        message: "The comparison could not be saved. This browser may have blocked local storage.",
      });
      expect(storage.getItem(SAVED_COMPARISONS_STORAGE_KEY)).toBe(stored);
    } finally {
      spy.mockRestore();
    }
  });

  it("filters malformed saved entries, reads older entries, and enforces the cap", () => {
    const savedComparisons = Array.from(
      { length: MAX_SAVED_COMPARISONS + 2 },
      (_, index) => makeSavedComparison(index),
    );
    const firstQuotes = savedComparisons[0]?.quotes;

    if (Array.isArray(firstQuotes)) {
      firstQuotes.forEach((quote) => {
        if (typeof quote === "object" && quote !== null) {
          delete quote.dueOnDelivery;
          delete quote.apr;
          delete quote.moneyFactor;
          delete quote.dealerNotes;
        }
      });
    }

    storage.setItem(
      SAVED_COMPARISONS_STORAGE_KEY,
      JSON.stringify([{ incomplete: true }, ...savedComparisons]),
    );

    const restored = readSavedComparisons();

    expect(restored).toHaveLength(MAX_SAVED_COMPARISONS);
    expect(restored[0]?.id).toBe("saved-0");
    expect(restored[0]?.quotes[0].dealerNotes).toBe("");
    expect(restored.at(-1)?.id).toBe(`saved-${MAX_SAVED_COMPARISONS - 1}`);
  });

  it("treats malformed saved-comparison JSON and empty arrays as empty", () => {
    storage.setItem(SAVED_COMPARISONS_STORAGE_KEY, "{not-json");
    expect(readSavedComparisons()).toEqual([]);

    storage.setItem(SAVED_COMPARISONS_STORAGE_KEY, "[]");
    expect(readSavedComparisons()).toEqual([]);
  });

  it("fails safely when browser storage access is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("Storage blocked");
      },
    });

    expect(readCurrentComparison()).toBeNull();
    expect(readSavedComparisons()).toEqual([]);
    expect(writeCurrentComparison(makeCurrentComparison())).toBe(false);
    expect(writeSavedComparisons([])).toBe(false);
  });
});
