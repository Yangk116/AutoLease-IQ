import type {
  LeaseAnalysisResult,
  LeaseComparisonResult,
} from "@/lib/leaseCalculations";

export type StructureInsightLabel =
  | "Strong"
  | "Reasonable"
  | "Watch"
  | "Ask dealer"
  | "Needs data";

export type QuoteStructureCategory = {
  id:
    | "selling-price"
    | "upfront-cash"
    | "dealer-fees"
    | "residual-risk"
    | "true-monthly-gap"
    | "mileage-value"
    | "lease-end-fee";
  title: string;
  label: StructureInsightLabel;
  metric: string;
  detail: string;
};

export type QuoteStructureReview = {
  quoteLabel: string;
  quoteName: string;
  categories: QuoteStructureCategory[];
};

export type QuoteStructureIntelligenceResult = {
  summary: string[];
  quoteReviews: QuoteStructureReview[];
  dealerQuestions: string[];
  trustNote: string;
};

type QuoteWithIndex = {
  quote: LeaseAnalysisResult;
  index: number;
};

type PaymentSummary = {
  quoteName: string;
  monthlyPaymentUsed: number;
};

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const percentageFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const compactNumberFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 0,
});

export const quoteIntelligenceTrustNote =
  "This is a rule-based review from the numbers entered. It does not use live market data yet and does not replace dealer, lender, tax, insurance, or legal advice.";

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPercentage(value: number): string {
  return `${percentageFormatter.format(value)}%`;
}

function formatCostPerKilometre(value: number): string {
  return `${formatCurrency(value)} / km`;
}

function formatKilometres(value: number): string {
  return `${compactNumberFormatter.format(value)} km`;
}

function getQuoteLabel(index: number): string {
  return `Quote ${String.fromCharCode(65 + index)}`;
}

function getQuoteName(
  quote: LeaseAnalysisResult,
  index: number,
  paymentSummaries: PaymentSummary[],
): string {
  return (
    paymentSummaries[index]?.quoteName ||
    quote.vehicleName?.trim() ||
    getQuoteLabel(index)
  );
}

function getQuoteDisplay(
  quote: LeaseAnalysisResult,
  index: number,
  paymentSummaries: PaymentSummary[],
): string {
  const label = getQuoteLabel(index);
  const name = getQuoteName(quote, index, paymentSummaries);

  return name === label ? label : `${label} (${name})`;
}

function isCloseValue(firstValue: number, secondValue: number): boolean {
  const difference = Math.abs(firstValue - secondValue);
  const referenceValue = Math.min(Math.abs(firstValue), Math.abs(secondValue));

  if (referenceValue === 0) {
    return difference === 0;
  }

  return difference / referenceValue < 0.02;
}

function getLowerWinner(
  quotes: QuoteWithIndex[],
  metric: keyof Pick<
    LeaseAnalysisResult,
    "costPerKm" | "dealerFees" | "residualPercentage" | "residualValue" | "upfrontRatio"
  >,
): QuoteWithIndex | null {
  const [firstQuote, secondQuote] = quotes;

  if (!firstQuote || !secondQuote) {
    return null;
  }

  const firstValue = firstQuote.quote[metric];
  const secondValue = secondQuote.quote[metric];

  if (
    firstValue === undefined ||
    secondValue === undefined ||
    isCloseValue(firstValue, secondValue)
  ) {
    return null;
  }

  return firstValue < secondValue ? firstQuote : secondQuote;
}

function getHigherWinner(
  quotes: QuoteWithIndex[],
  metric: keyof Pick<LeaseAnalysisResult, "discountPercentage">,
): QuoteWithIndex | null {
  const [firstQuote, secondQuote] = quotes;

  if (!firstQuote || !secondQuote) {
    return null;
  }

  const firstValue = firstQuote.quote[metric];
  const secondValue = secondQuote.quote[metric];

  if (
    firstValue === undefined ||
    secondValue === undefined ||
    isCloseValue(firstValue, secondValue)
  ) {
    return null;
  }

  return firstValue > secondValue ? firstQuote : secondQuote;
}

function getPaymentUsed(
  quote: LeaseAnalysisResult,
  index: number,
  paymentSummaries: PaymentSummary[],
): number {
  return paymentSummaries[index]?.monthlyPaymentUsed ?? quote.monthlyPayment;
}

function reviewSellingPrice(quote: LeaseAnalysisResult): QuoteStructureCategory {
  if (quote.vehicleMsrp === undefined || quote.sellingPrice === undefined) {
    return {
      id: "selling-price",
      title: "Selling price / discount",
      label: "Needs data",
      metric: "MSRP and selling price needed",
      detail:
        "Add MSRP and selling price to review the entered discount structure.",
    };
  }

  if (quote.sellingPrice >= quote.vehicleMsrp) {
    return {
      id: "selling-price",
      title: "Selling price / discount",
      label: "Ask dealer",
      metric: `${formatCurrency(quote.sellingPrice)} selling price`,
      detail:
        "Selling price is at or above MSRP based on the numbers entered. Worth confirming whether discounts or add-ons are included before fees.",
    };
  }

  const discountPercentage = quote.discountPercentage ?? 0;
  const discountFromMsrp = quote.discountFromMsrp ?? 0;

  if (discountPercentage > 4) {
    return {
      id: "selling-price",
      title: "Selling price / discount",
      label: "Strong",
      metric: `${formatPercentage(discountPercentage)} off MSRP`,
      detail: `${formatCurrency(discountFromMsrp)} below MSRP based on the numbers entered.`,
    };
  }

  if (discountPercentage >= 1) {
    return {
      id: "selling-price",
      title: "Selling price / discount",
      label: "Reasonable",
      metric: `${formatPercentage(discountPercentage)} off MSRP`,
      detail:
        "The entered selling price shows some discount from MSRP. Confirm whether this includes all available dealer discounts before fees.",
    };
  }

  return {
    id: "selling-price",
    title: "Selling price / discount",
    label: "Watch",
    metric: `${formatPercentage(discountPercentage)} off MSRP`,
    detail:
      "The entered discount is thin. Ask whether add-ons, packages, or dealer adjustments are included in the cap cost.",
  };
}

function reviewUpfrontCash(quote: LeaseAnalysisResult): QuoteStructureCategory {
  if (quote.upfrontRatio > 35) {
    return {
      id: "upfront-cash",
      title: "Upfront cash pressure",
      label: "Ask dealer",
      metric: `${formatPercentage(quote.upfrontRatio)} upfront`,
      detail:
        "A large share of total lease cost is due upfront. Ask whether cash due at signing can be reduced without increasing total cost too much.",
    };
  }

  if (quote.upfrontRatio >= 20) {
    return {
      id: "upfront-cash",
      title: "Upfront cash pressure",
      label: "Watch",
      metric: `${formatPercentage(quote.upfrontRatio)} upfront`,
      detail:
        "This quote shifts a meaningful amount of cost into upfront cash, which can make the monthly payment look cleaner than the full structure.",
    };
  }

  return {
    id: "upfront-cash",
    title: "Upfront cash pressure",
    label: "Reasonable",
    metric: `${formatPercentage(quote.upfrontRatio)} upfront`,
    detail:
      "Upfront cash is a smaller share of the entered total lease cost.",
  };
}

function reviewDealerFees(quote: LeaseAnalysisResult): QuoteStructureCategory {
  if (quote.dealerFees > 1_000) {
    return {
      id: "dealer-fees",
      title: "Dealer fee burden",
      label: "Ask dealer",
      metric: formatCurrency(quote.dealerFees),
      detail:
        "Dealer fees are high based on the entered amount. Ask which fees are mandatory and which are dealer-added.",
    };
  }

  if (quote.dealerFees > 400) {
    return {
      id: "dealer-fees",
      title: "Dealer fee burden",
      label: "Watch",
      metric: formatCurrency(quote.dealerFees),
      detail:
        "Dealer fees are meaningful enough to review line by line before comparing offers.",
    };
  }

  if (quote.dealerFees === 0) {
    return {
      id: "dealer-fees",
      title: "Dealer fee burden",
      label: "Reasonable",
      metric: "No extra dealer fees entered",
      detail:
        "No extra dealer fees were entered here. Confirm the quote does not include separate admin, add-on, or delivery charges elsewhere.",
    };
  }

  return {
    id: "dealer-fees",
    title: "Dealer fee burden",
    label: "Reasonable",
    metric: formatCurrency(quote.dealerFees),
    detail:
      "Entered dealer fees are below the review threshold, but still worth confirming in the itemized quote.",
  };
}

function reviewResidualRisk(
  quote: LeaseAnalysisResult,
  comparisonQuotes: QuoteWithIndex[],
): QuoteStructureCategory {
  if (quote.residualPercentage === undefined) {
    return {
      id: "residual-risk",
      title: "Residual / buyout risk",
      label: "Needs data",
      metric: "Residual details needed",
      detail:
        "Add residual value and residual MSRP to review buyout structure.",
    };
  }

  const lowerResidualQuote = getLowerWinner(
    comparisonQuotes,
    "residualPercentage",
  );

  if (!lowerResidualQuote) {
    const residualValueText =
      quote.residualValue !== undefined
        ? `, ${formatCurrency(quote.residualValue)} residual value`
        : "";

    return {
      id: "residual-risk",
      title: "Residual / buyout risk",
      label: "Watch",
      metric: `${formatPercentage(quote.residualPercentage)} residual${residualValueText}`,
      detail:
        "Residual data is available for this quote, but the buyout trade-off is close or incomplete across the two quotes. Confirm the exact lease-end purchase amount with the dealer.",
    };
  }

  const isHigherResidual =
    lowerResidualQuote.quote !== quote;
  const residualValueText =
    quote.residualValue !== undefined
      ? `, ${formatCurrency(quote.residualValue)} residual value`
      : "";

  return {
    id: "residual-risk",
    title: "Residual / buyout risk",
    label: isHigherResidual ? "Watch" : "Reasonable",
    metric: `${formatPercentage(quote.residualPercentage)} residual${residualValueText}`,
    detail: isHigherResidual
      ? "This residual is higher than the other quote. That may lower monthly payment but can make a future buyout more expensive."
      : "This residual is lower or close to the other quote. That may increase monthly payment but can make a future buyout relatively lower.",
  };
}

function reviewTrueMonthlyGap(
  quote: LeaseAnalysisResult,
  index: number,
  paymentSummaries: PaymentSummary[],
): QuoteStructureCategory {
  const monthlyPaymentUsed = getPaymentUsed(quote, index, paymentSummaries);
  const gap = quote.trueMonthlyCost - monthlyPaymentUsed;
  const gapPercentage =
    monthlyPaymentUsed > 0 ? (gap / monthlyPaymentUsed) * 100 : 0;

  if (gap > 0 && gapPercentage > 20) {
    return {
      id: "true-monthly-gap",
      title: "True monthly gap",
      label: "Ask dealer",
      metric: `${formatCurrency(gap)} higher`,
      detail:
        "True monthly cost is much higher than the payment used after upfront cash and fees are spread across the term.",
    };
  }

  if (gap > 0 && gapPercentage > 8) {
    return {
      id: "true-monthly-gap",
      title: "True monthly gap",
      label: "Watch",
      metric: `${formatCurrency(gap)} higher`,
      detail:
        "Upfront cash or fees make the full monthly picture higher than the payment alone.",
    };
  }

  return {
    id: "true-monthly-gap",
    title: "True monthly gap",
    label: "Reasonable",
    metric: `${formatCurrency(quote.trueMonthlyCost)} true monthly`,
    detail:
      "The entered payment and true monthly cost are relatively close after spreading upfront amounts across the term.",
  };
}

function reviewMileageValue(
  quote: LeaseAnalysisResult,
  comparisonQuotes: QuoteWithIndex[],
): QuoteStructureCategory {
  const lowerMileageCostQuote = getLowerWinner(comparisonQuotes, "costPerKm");

  if (!lowerMileageCostQuote) {
    return {
      id: "mileage-value",
      title: "Mileage value",
      label: "Reasonable",
      metric: formatCostPerKilometre(quote.costPerKm),
      detail: `Cost per kilometre is close between the quotes using ${formatKilometres(
        quote.totalAllowedKm,
      )} entered total allowance.`,
    };
  }

  const isMileageWinner = lowerMileageCostQuote.quote === quote;

  return {
    id: "mileage-value",
    title: "Mileage value",
    label: isMileageWinner ? "Strong" : "Watch",
    metric: formatCostPerKilometre(quote.costPerKm),
    detail: isMileageWinner
      ? "This quote has the lower cost per kilometre compared only with the other entered quote."
      : "This quote has the higher cost per kilometre compared only with the other entered quote.",
  };
}

function reviewLeaseEndFee(quote: LeaseAnalysisResult): QuoteStructureCategory {
  if (quote.leaseEndFee > 0) {
    return {
      id: "lease-end-fee",
      title: "Lease-end fee impact",
      label: "Watch",
      metric: formatCurrency(quote.leaseEndFee),
      detail:
        "Cost to remember. This can affect return or buyout decisions at lease end.",
    };
  }

  return {
    id: "lease-end-fee",
    title: "Lease-end fee impact",
    label: "Reasonable",
    metric: "No lease-end fee entered",
    detail:
      "No lease-end fee was entered here. Confirm whether a disposition or purchase-option fee appears in the contract.",
  };
}

function buildQuoteReview(
  quote: LeaseAnalysisResult,
  index: number,
  comparisonQuotes: QuoteWithIndex[],
  paymentSummaries: PaymentSummary[],
): QuoteStructureReview {
  return {
    quoteLabel: getQuoteLabel(index),
    quoteName: getQuoteName(quote, index, paymentSummaries),
    categories: [
      reviewSellingPrice(quote),
      reviewUpfrontCash(quote),
      reviewDealerFees(quote),
      reviewResidualRisk(quote, comparisonQuotes),
      reviewTrueMonthlyGap(quote, index, paymentSummaries),
      reviewMileageValue(quote, comparisonQuotes),
      reviewLeaseEndFee(quote),
    ],
  };
}

function buildComparisonSummary(
  comparisonQuotes: QuoteWithIndex[],
  paymentSummaries: PaymentSummary[],
): string[] {
  const summary: string[] = [];
  const discountWinner = getHigherWinner(comparisonQuotes, "discountPercentage");
  const upfrontWinner = getLowerWinner(comparisonQuotes, "upfrontRatio");
  const dealerFeeWinner = getLowerWinner(comparisonQuotes, "dealerFees");
  const mileageWinner = getLowerWinner(comparisonQuotes, "costPerKm");
  const residualValueWinner = getLowerWinner(comparisonQuotes, "residualValue");
  const residualPercentageWinner = getLowerWinner(
    comparisonQuotes,
    "residualPercentage",
  );
  const buyoutFriendlyWinner = residualValueWinner ?? residualPercentageWinner;

  if (discountWinner) {
    summary.push(
      `${getQuoteDisplay(
        discountWinner.quote,
        discountWinner.index,
        paymentSummaries,
      )} has the stronger entered discount structure at ${formatPercentage(
        discountWinner.quote.discountPercentage ?? 0,
      )}.`,
    );
  } else {
    summary.push(
      "Discount structure is close or needs MSRP and selling price for both quotes.",
    );
  }

  summary.push(
    upfrontWinner
      ? `${getQuoteDisplay(
          upfrontWinner.quote,
          upfrontWinner.index,
          paymentSummaries,
        )} has lower upfront pressure at ${formatPercentage(
          upfrontWinner.quote.upfrontRatio,
        )}.`
      : "Upfront pressure is close between the quotes based on the entered costs.",
  );

  summary.push(
    dealerFeeWinner
      ? `${getQuoteDisplay(
          dealerFeeWinner.quote,
          dealerFeeWinner.index,
          paymentSummaries,
        )} has the lower entered dealer fee burden at ${formatCurrency(
          dealerFeeWinner.quote.dealerFees,
        )}.`
      : "Dealer fee burden is close or no extra dealer fees were entered for comparison.",
  );

  summary.push(
    mileageWinner
      ? `${getQuoteDisplay(
          mileageWinner.quote,
          mileageWinner.index,
          paymentSummaries,
        )} has the better entered cost per kilometre at ${formatCostPerKilometre(
          mileageWinner.quote.costPerKm,
        )}.`
      : "Mileage value is close between the two entered quotes.",
  );

  if (buyoutFriendlyWinner) {
    summary.push(
      `${getQuoteDisplay(
        buyoutFriendlyWinner.quote,
        buyoutFriendlyWinner.index,
        paymentSummaries,
      )} may be more buyout-friendly because its entered residual is lower than the other quote.`,
    );
  }

  return summary.slice(0, 5);
}

function addUniqueQuestion(questions: string[], question: string): void {
  if (!questions.includes(question)) {
    questions.push(question);
  }
}

function buildDealerQuestions(
  comparisonQuotes: QuoteWithIndex[],
): string[] {
  const questions: string[] = [];
  const hasResidualData = comparisonQuotes.some(
    ({ quote }) =>
      quote.residualValue !== undefined ||
      quote.residualPercentage !== undefined,
  );
  const hasEnteredFees = comparisonQuotes.some(
    ({ quote }) => quote.dealerFees > 0 || quote.leaseEndFee > 0,
  );
  const hasUpfrontPressure = comparisonQuotes.some(
    ({ quote }) => quote.upfrontRatio >= 20,
  );
  const hasSellingPriceData = comparisonQuotes.some(
    ({ quote }) =>
      quote.vehicleMsrp !== undefined || quote.sellingPrice !== undefined,
  );

  if (hasSellingPriceData) {
    addUniqueQuestion(
      questions,
      "Can you confirm whether the selling price includes all available dealer discounts before fees?",
    );
  }

  if (hasUpfrontPressure) {
    addUniqueQuestion(
      questions,
      "Can the upfront cash be reduced without increasing the total cost too much?",
    );
  }

  if (hasEnteredFees) {
    addUniqueQuestion(
      questions,
      "Which fees are mandatory and which are dealer-added?",
    );
  }

  if (hasResidualData) {
    addUniqueQuestion(
      questions,
      "Is the residual based on MSRP or adjusted MSRP?",
    );
    addUniqueQuestion(
      questions,
      "What would the buyout amount be after tax and fees?",
    );
  }

  addUniqueQuestion(
    questions,
    "Are there add-ons included in the cap cost?",
  );
  addUniqueQuestion(
    questions,
    "Can you provide an itemized worksheet showing payment, taxes, fees, residual, and due-at-signing cash?",
  );
  addUniqueQuestion(
    questions,
    "Can you show the same offer with all discounts, rebates, taxes, and fees separated line by line?",
  );

  return questions.slice(0, 5);
}

export function buildQuoteStructureIntelligence(
  comparison: LeaseComparisonResult,
  paymentSummaries: PaymentSummary[],
): QuoteStructureIntelligenceResult {
  const comparisonQuotes = comparison.results
    .slice(0, 2)
    .map((quote, index): QuoteWithIndex => ({ quote, index }));

  return {
    summary: buildComparisonSummary(comparisonQuotes, paymentSummaries),
    quoteReviews: comparisonQuotes.map(({ quote, index }) =>
      buildQuoteReview(quote, index, comparisonQuotes, paymentSummaries),
    ),
    dealerQuestions: buildDealerQuestions(comparisonQuotes),
    trustNote: quoteIntelligenceTrustNote,
  };
}

function getLabelClasses(label: StructureInsightLabel): string {
  if (label === "Strong") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (label === "Reasonable") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  if (label === "Watch") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (label === "Ask dealer") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

type QuoteStructureIntelligencePanelProps = {
  intelligence: QuoteStructureIntelligenceResult;
};

export function QuoteStructureIntelligencePanel({
  intelligence,
}: QuoteStructureIntelligencePanelProps) {
  return (
    <section
      aria-labelledby="quote-intelligence-title"
      className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(to_bottom,#f8fafc,#ffffff)] shadow-[0_18px_55px_-38px_rgba(15,23,42,0.55)]"
    >
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
              Advisor insight layer
            </p>
            <h4
              id="quote-intelligence-title"
              className="mt-1 text-xl font-bold tracking-tight sm:text-2xl"
            >
              AI-style Quote Intelligence
            </h4>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Rule-based structure review using the numbers entered. Market
              benchmark coming soon.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-teal-300/30 bg-teal-400/10 px-3 py-1.5 text-xs font-semibold text-teal-100">
            No live market data
          </span>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {intelligence.summary.length > 0 ? (
          <div>
            <h5 className="text-sm font-semibold text-slate-950">
              Structure observations
            </h5>
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {intelligence.summary.map((observation) => (
                <li
                  key={observation}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.55)]"
                >
                  {observation}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {intelligence.quoteReviews.map((review) => (
            <article
              key={review.quoteLabel}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.6)] sm:p-5"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                  {review.quoteLabel}
                </p>
                <h5 className="mt-1 break-words text-lg font-bold text-slate-950">
                  {review.quoteName}
                </h5>
              </div>
              <div className="mt-4 grid gap-3">
                {review.categories.map((category) => (
                  <div
                    key={`${review.quoteLabel}-${category.id}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {category.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {category.metric}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getLabelClasses(
                          category.label,
                        )}`}
                      >
                        {category.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {category.detail}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
            <h5 className="text-sm font-semibold text-slate-950">
              Smart dealer questions
            </h5>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {intelligence.dealerQuestions.map((question, index) => (
                <li key={question} className="flex gap-2.5">
                  <span className="font-bold text-teal-800">
                    {index + 1}.
                  </span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h5 className="text-sm font-semibold text-slate-950">
              Trust note
            </h5>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {intelligence.trustNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
