import type { ComparisonQuoteForm } from "./ComparisonQuoteCard";
import type { DecisionMode } from "./ComparisonResults";

export const SAVED_COMPARISONS_STORAGE_KEY =
  "autolease-iq:saved-comparisons";
export const MAX_SAVED_COMPARISONS = 10;

export type SavedComparisonStatus = {
  tone: "success" | "info" | "error";
  message: string;
};

export type SavedComparisonSummary = {
  finalWinner: string | null;
  verdictKind: "winner" | "mixed" | "needs-data" | null;
  trueMonthlyCosts: [
    {
      quoteName: string;
      value: number;
    },
    {
      quoteName: string;
      value: number;
    },
  ];
};

export type SavedComparison = {
  id: string;
  savedAt: string;
  title: string;
  decisionMode: DecisionMode;
  quotes: [ComparisonQuoteForm, ComparisonQuoteForm];
  summary: SavedComparisonSummary;
};

type SavedComparisonsPanelProps = {
  comparisons: SavedComparison[];
  status: SavedComparisonStatus | null;
  onLoad: (comparison: SavedComparison) => void;
  onDelete: (comparisonId: string) => void;
  onOpenReview?: (comparison: SavedComparison) => void;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const decisionModes: readonly DecisionMode[] = [
  "lowest-total-cost",
  "lowest-monthly-budget",
  "lowest-upfront-cash",
  "best-mileage-value",
  "possible-future-buyout",
];

const decisionModeLabels: Record<DecisionMode, string> = {
  "lowest-total-cost": "Lowest total cost",
  "lowest-monthly-budget": "Lowest monthly budget",
  "lowest-upfront-cash": "Lowest upfront cash",
  "best-mileage-value": "Best mileage value",
  "possible-future-buyout": "Possible future buyout",
};

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

function parseTrueMonthlyCost(
  value: unknown,
): SavedComparisonSummary["trueMonthlyCosts"][number] | null {
  if (
    !isRecord(value) ||
    typeof value.quoteName !== "string" ||
    !isFiniteNumber(value.value)
  ) {
    return null;
  }

  return {
    quoteName: value.quoteName,
    value: value.value,
  };
}

function parseSavedComparison(value: unknown): SavedComparison | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.savedAt !== "string" ||
    Number.isNaN(Date.parse(value.savedAt)) ||
    typeof value.title !== "string" ||
    !isDecisionMode(value.decisionMode) ||
    !Array.isArray(value.quotes) ||
    value.quotes.length !== 2 ||
    !isRecord(value.summary)
  ) {
    return null;
  }

  const quoteA = parseComparisonQuote(value.quotes[0]);
  const quoteB = parseComparisonQuote(value.quotes[1]);
  const trueMonthlyCosts = value.summary.trueMonthlyCosts;

  if (
    !quoteA ||
    !quoteB ||
    quoteA.id !== "quote-a" ||
    quoteB.id !== "quote-b" ||
    !Array.isArray(trueMonthlyCosts) ||
    trueMonthlyCosts.length !== 2
  ) {
    return null;
  }

  const quoteACost = parseTrueMonthlyCost(trueMonthlyCosts[0]);
  const quoteBCost = parseTrueMonthlyCost(trueMonthlyCosts[1]);
  const finalWinner = value.summary.finalWinner;
  const verdictKind = value.summary.verdictKind;

  if (
    !quoteACost ||
    !quoteBCost ||
    (finalWinner !== null && typeof finalWinner !== "string") ||
    (verdictKind !== null &&
      verdictKind !== "winner" &&
      verdictKind !== "mixed" &&
      verdictKind !== "needs-data")
  ) {
    return null;
  }

  return {
    id: value.id,
    savedAt: value.savedAt,
    title: value.title,
    decisionMode: value.decisionMode,
    quotes: [quoteA, quoteB],
    summary: {
      finalWinner,
      verdictKind,
      trueMonthlyCosts: [quoteACost, quoteBCost],
    },
  };
}

export function readSavedComparisons(): SavedComparison[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(
      SAVED_COMPARISONS_STORAGE_KEY,
    );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .flatMap((item) => {
        const comparison = parseSavedComparison(item);

        return comparison ? [comparison] : [];
      })
      .slice(0, MAX_SAVED_COMPARISONS);
  } catch {
    return [];
  }
}

export function writeSavedComparisons(
  comparisons: SavedComparison[],
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      SAVED_COMPARISONS_STORAGE_KEY,
      JSON.stringify(comparisons),
    );
    return true;
  } catch {
    return false;
  }
}

function formatSavedAt(savedAt: string): string {
  return dateTimeFormatter.format(new Date(savedAt));
}

function getVerdictLabel(comparison: SavedComparison): string {
  if (comparison.summary.finalWinner) {
    return `Winner: ${comparison.summary.finalWinner}`;
  }

  if (comparison.summary.verdictKind === "needs-data") {
    return "More data needed";
  }

  return "Mixed result";
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

export function SavedComparisonsPanel({
  comparisons,
  status,
  onLoad,
  onDelete,
  onOpenReview,
}: SavedComparisonsPanelProps) {
  return (
    <section
      id="saved-comparisons"
      className="scroll-mt-32 border-t border-slate-200 pt-10 sm:scroll-mt-24"
      aria-labelledby="saved-comparisons-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
            Local to this browser
          </p>
          <h2
            id="saved-comparisons-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          >
            Saved comparisons
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Keep up to {MAX_SAVED_COMPARISONS} saved offers on this device and
          open any item in the review dashboard. Nothing is uploaded or synced.
        </p>
      </div>

      {status ? (
        <p
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${getStatusClasses(
            status.tone,
          )}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      ) : null}

      {comparisons.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
          <p className="text-sm leading-6 text-slate-500">
            Saved comparisons will appear here after you compare and save an
            offer. Saved items stay only in this browser.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {comparisons.map((comparison) => (
            <article
              key={comparison.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)] sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-950">
                    {comparison.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Saved {formatSavedAt(comparison.savedAt)}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-teal-700">
                    {decisionModeLabels[comparison.decisionMode]}
                  </p>
                </div>
                {comparison.summary.finalWinner ? (
                  <span className="inline-flex w-fit max-w-full shrink-0 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                    {getVerdictLabel(comparison)}
                  </span>
                ) : (
                  <span className="inline-flex w-fit max-w-full shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {getVerdictLabel(comparison)}
                  </span>
                )}
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {comparison.summary.trueMonthlyCosts.map((cost, index) => (
                  <div
                    key={`${comparison.id}-${index}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <dt className="truncate text-xs font-medium text-slate-500">
                      {index === 0 ? "Quote A" : "Quote B"} - {cost.quoteName}
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-950">
                      {currencyFormatter.format(cost.value)} true monthly
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {onOpenReview ? (
                  <button
                    type="button"
                    onClick={() => onOpenReview(comparison)}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                  >
                    Open review
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onLoad(comparison)}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comparison.id)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
