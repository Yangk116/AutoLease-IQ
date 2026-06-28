import type { LeaseAnalysisResult } from "@/lib/leaseCalculations";

type ScorecardPaymentSummary = {
  quoteName?: string;
  taxIncludedInMonthlyPayment: boolean;
  taxRate?: number;
};

type QuoteReviewScorecardProps = {
  quotes: LeaseAnalysisResult[];
  paymentSummaries: ScorecardPaymentSummary[];
};

type QuoteReviewStatus =
  | "Looks efficient"
  | "Worth checking"
  | "Needs attention"
  | "Not enough data";

type ReviewCheck = {
  id:
    | "total-cost"
    | "true-monthly"
    | "upfront-cash"
    | "mileage-value"
    | "fee-tax-clarity"
    | "residual-context";
  title: string;
  status: QuoteReviewStatus;
  metric: string;
  detail: string;
};

type QuoteReview = {
  quoteLabel: string;
  quoteName: string;
  checks: ReviewCheck[];
};

type OptionalNumberMetric = keyof Pick<
  LeaseAnalysisResult,
  "residualPercentage" | "residualValue"
>;

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const percentageFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPercentage(value: number): string {
  return `${percentageFormatter.format(value)}%`;
}

function formatCostPerKilometre(value: number): string {
  return `${formatCurrency(value)} / km`;
}

function getQuoteLabel(index: number): string {
  return `Quote ${String.fromCharCode(65 + index)}`;
}

function getQuoteName(
  quote: LeaseAnalysisResult,
  index: number,
  paymentSummaries: ScorecardPaymentSummary[],
): string {
  return (
    paymentSummaries[index]?.quoteName?.trim() ||
    quote.vehicleName?.trim() ||
    getQuoteLabel(index)
  );
}

function isCloseValue(firstValue: number, secondValue: number): boolean {
  const difference = Math.abs(firstValue - secondValue);
  const referenceValue = Math.min(Math.abs(firstValue), Math.abs(secondValue));

  if (referenceValue === 0) {
    return difference === 0;
  }

  return difference / referenceValue < 0.02;
}

function buildLowerIsEfficientCheck(
  quote: LeaseAnalysisResult,
  otherQuote: LeaseAnalysisResult | undefined,
  metric: keyof Pick<
    LeaseAnalysisResult,
    "costPerKm" | "totalCost" | "trueMonthlyCost"
  >,
  title: string,
  formattedValue: string,
  lowerDetail: string,
  higherDetail: string,
  tiedDetail: string,
): ReviewCheck {
  if (!otherQuote || isCloseValue(quote[metric], otherQuote[metric])) {
    return {
      id:
        metric === "totalCost"
          ? "total-cost"
          : metric === "trueMonthlyCost"
            ? "true-monthly"
            : "mileage-value",
      title,
      status: "Looks efficient",
      metric: formattedValue,
      detail: tiedDetail,
    };
  }

  const isLower = quote[metric] < otherQuote[metric];

  return {
    id:
      metric === "totalCost"
        ? "total-cost"
        : metric === "trueMonthlyCost"
          ? "true-monthly"
          : "mileage-value",
    title,
    status: isLower ? "Looks efficient" : "Worth checking",
    metric: formattedValue,
    detail: isLower ? lowerDetail : higherDetail,
  };
}

function buildUpfrontCashCheck(
  quote: LeaseAnalysisResult,
  otherQuote: LeaseAnalysisResult | undefined,
): ReviewCheck {
  const isMuchHigherThanOther =
    otherQuote !== undefined && quote.upfrontRatio - otherQuote.upfrontRatio >= 10;
  const isHigherThanOther =
    otherQuote !== undefined && quote.upfrontRatio - otherQuote.upfrontRatio >= 5;

  if (quote.upfrontRatio >= 35 || isMuchHigherThanOther) {
    return {
      id: "upfront-cash",
      title: "Upfront cash pressure",
      status: "Needs attention",
      metric: `${formatPercentage(quote.upfrontRatio)} upfront`,
      detail:
        "A large share of the entered total cost is paid upfront. Ask whether the same quote can be shown with less cash due at signing.",
    };
  }

  if (quote.upfrontRatio >= 20 || isHigherThanOther) {
    return {
      id: "upfront-cash",
      title: "Upfront cash pressure",
      status: "Worth checking",
      metric: `${formatPercentage(quote.upfrontRatio)} upfront`,
      detail:
        "This quote uses more upfront cash than a low-cash structure. Compare it with the other quote's due-at-signing amount.",
    };
  }

  return {
    id: "upfront-cash",
    title: "Upfront cash pressure",
    status: "Looks efficient",
    metric: `${formatPercentage(quote.upfrontRatio)} upfront`,
    detail:
      "Upfront cash is a smaller share of the entered total lease cost.",
  };
}

function getFeeClarityReview(quote: LeaseAnalysisResult): ReviewCheck {
  const totalFees = quote.dealerFees + quote.leaseEndFee;
  const feeShare = quote.totalCost > 0 ? (totalFees / quote.totalCost) * 100 : 0;

  if (totalFees === 0) {
    return {
      id: "fee-tax-clarity",
      title: "Fee and tax clarity",
      status: "Not enough data",
      metric: "No fees entered",
      detail:
        "Confirm whether dealer, admin, acquisition, disposition, or lease-end fees are included elsewhere.",
    };
  }

  if (feeShare >= 8) {
    return {
      id: "fee-tax-clarity",
      title: "Fee and tax clarity",
      status: "Worth checking",
      metric: `${formatCurrency(totalFees)} in fees`,
      detail:
        "Entered fees are a meaningful share of total cost. Ask for an itemized fee breakdown.",
    };
  }

  return {
    id: "fee-tax-clarity",
    title: "Fee and tax clarity",
    status: "Looks efficient",
    metric: `${formatCurrency(totalFees)} in fees`,
    detail:
      "Fees are entered and do not dominate the total cost, based only on this quote's numbers.",
  };
}

function getTaxClarityReview(
  paymentSummary: ScorecardPaymentSummary | undefined,
): Pick<ReviewCheck, "detail" | "metric" | "status"> {
  if (!paymentSummary) {
    return {
      status: "Not enough data",
      metric: "Payment basis missing",
      detail: "Payment tax context was not available for this quote.",
    };
  }

  if (paymentSummary.taxIncludedInMonthlyPayment) {
    return {
      status: "Looks efficient",
      metric: "Tax included",
      detail: "Monthly payment is marked as tax included.",
    };
  }

  if (paymentSummary.taxRate !== undefined && paymentSummary.taxRate > 0) {
    return {
      status: "Looks efficient",
      metric: `${formatPercentage(paymentSummary.taxRate)} tax entered`,
      detail: "Payment is before tax, and a tax rate was entered.",
    };
  }

  return {
    status: "Needs attention",
    metric: "Before tax",
    detail:
      "Payment is before tax, but no tax rate was entered. The monthly view may be understated.",
  };
}

function getStatusRank(status: QuoteReviewStatus): number {
  if (status === "Needs attention") {
    return 3;
  }

  if (status === "Worth checking") {
    return 2;
  }

  if (status === "Not enough data") {
    return 1;
  }

  return 0;
}

function buildFeeAndTaxCheck(
  quote: LeaseAnalysisResult,
  paymentSummary: ScorecardPaymentSummary | undefined,
): ReviewCheck {
  const feeReview = getFeeClarityReview(quote);
  const taxReview = getTaxClarityReview(paymentSummary);
  const status =
    getStatusRank(taxReview.status) > getStatusRank(feeReview.status)
      ? taxReview.status
      : feeReview.status;

  return {
    ...feeReview,
    status,
    metric: `${feeReview.metric}; ${taxReview.metric}`,
    detail: `${feeReview.detail} ${taxReview.detail}`,
  };
}

function getResidualMetric(
  quote: LeaseAnalysisResult,
): { metric: OptionalNumberMetric; value: number; label: string } | null {
  if (quote.residualValue !== undefined) {
    return {
      metric: "residualValue",
      value: quote.residualValue,
      label: formatCurrency(quote.residualValue),
    };
  }

  if (quote.residualPercentage !== undefined) {
    return {
      metric: "residualPercentage",
      value: quote.residualPercentage,
      label: formatPercentage(quote.residualPercentage),
    };
  }

  return null;
}

function buildResidualContextCheck(
  quote: LeaseAnalysisResult,
  otherQuote: LeaseAnalysisResult | undefined,
): ReviewCheck {
  const residualMetric = getResidualMetric(quote);

  if (!residualMetric) {
    return {
      id: "residual-context",
      title: "Buyout / residual context",
      status: "Not enough data",
      metric: "Residual missing",
      detail:
        "Add residual value or residual percentage to review lease-end buyout context.",
    };
  }

  const otherResidualValue =
    otherQuote !== undefined ? otherQuote[residualMetric.metric] : undefined;

  if (
    otherResidualValue === undefined ||
    isCloseValue(residualMetric.value, otherResidualValue)
  ) {
    return {
      id: "residual-context",
      title: "Buyout / residual context",
      status: "Worth checking",
      metric: residualMetric.label,
      detail:
        "Residual context is entered. Confirm the exact lease-end purchase amount and any added fees.",
    };
  }

  const isLowerResidual = residualMetric.value < otherResidualValue;

  return {
    id: "residual-context",
    title: "Buyout / residual context",
    status: isLowerResidual ? "Looks efficient" : "Worth checking",
    metric: residualMetric.label,
    detail: isLowerResidual
      ? "Compared with the other quote, this entered residual is lower. That may reduce a future buyout amount but can raise payments."
      : "Compared with the other quote, this entered residual is higher. That may lower payments but can raise a future buyout amount.",
  };
}

function buildQuoteReview(
  quote: LeaseAnalysisResult,
  index: number,
  comparisonQuotes: LeaseAnalysisResult[],
  paymentSummaries: ScorecardPaymentSummary[],
): QuoteReview {
  const otherQuote = comparisonQuotes.find((candidate) => candidate !== quote);

  return {
    quoteLabel: getQuoteLabel(index),
    quoteName: getQuoteName(quote, index, paymentSummaries),
    checks: [
      buildLowerIsEfficientCheck(
        quote,
        otherQuote,
        "totalCost",
        "Total cost pressure",
        formatCurrency(quote.totalCost),
        "Lower total lease cost than the other entered quote.",
        "Higher total lease cost than the other entered quote. Worth reviewing the cost drivers.",
        "Total lease cost is close to the other entered quote.",
      ),
      buildLowerIsEfficientCheck(
        quote,
        otherQuote,
        "trueMonthlyCost",
        "True monthly pressure",
        formatCurrency(quote.trueMonthlyCost),
        "Lower true monthly cost after spreading upfront cash and fees across the term.",
        "Higher true monthly cost after spreading upfront cash and fees across the term.",
        "True monthly cost is close to the other entered quote.",
      ),
      buildUpfrontCashCheck(quote, otherQuote),
      buildLowerIsEfficientCheck(
        quote,
        otherQuote,
        "costPerKm",
        "Mileage value",
        formatCostPerKilometre(quote.costPerKm),
        "Lower cost per kilometre than the other entered quote.",
        "Higher cost per kilometre than the other entered quote.",
        "Cost per kilometre is close to the other entered quote.",
      ),
      buildFeeAndTaxCheck(quote, paymentSummaries[index]),
      buildResidualContextCheck(quote, otherQuote),
    ],
  };
}

function getStatusClasses(status: QuoteReviewStatus): string {
  if (status === "Looks efficient") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "Worth checking") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (status === "Needs attention") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function QuoteReviewScorecard({
  quotes,
  paymentSummaries,
}: QuoteReviewScorecardProps) {
  const comparisonQuotes = quotes.slice(0, 2);
  const quoteReviews = comparisonQuotes.map((quote, index) =>
    buildQuoteReview(quote, index, comparisonQuotes, paymentSummaries),
  );

  if (quoteReviews.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="quote-review-scorecard-title"
      className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.6)] sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            Based on entered numbers
          </p>
          <h4
            id="quote-review-scorecard-title"
            className="mt-1 text-lg font-bold text-slate-950"
          >
            Quote Review Scorecard
          </h4>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Scorecard is based only on entered numbers. It does not use market
          listings, manufacturer programs, or dealer benchmarks.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {quoteReviews.map((review) => (
          <article
            key={review.quoteLabel}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {review.quoteLabel}
              </p>
              <h5 className="mt-1 break-words text-base font-bold text-slate-950">
                {review.quoteName}
              </h5>
            </div>

            <div className="mt-3 grid gap-2.5">
              {review.checks.map((check) => (
                <div
                  key={`${review.quoteLabel}-${check.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {check.title}
                      </p>
                      <p className="mt-0.5 break-words text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {check.metric}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                        check.status,
                      )}`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
