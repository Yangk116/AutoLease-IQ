"use client";

import { useState } from "react";

import {
  analyzeLeaseQuote,
  compareLeaseQuotes,
  type LeaseComparisonResult,
  type LeaseAnalysisResult,
  type LeaseQuoteInput,
} from "@/lib/leaseCalculations";

const defaultQuote: LeaseQuoteInput = {
  downPayment: 8_000,
  monthlyPayment: 362.02,
  termMonths: 24,
  annualMileage: 20_000,
  dealerFees: 0,
  leaseEndFee: 0,
};

const defaultTaxRate = 13;

const mainFields: {
  name: keyof Pick<
    LeaseQuoteInput,
    "downPayment" | "monthlyPayment" | "termMonths" | "annualMileage"
  >;
  label: string;
  min: number;
  step: number;
}[] = [
  {
    name: "downPayment",
    label: "Down payment / due at signing",
    min: 0,
    step: 100,
  },
  {
    name: "monthlyPayment",
    label: "Monthly payment",
    min: 0,
    step: 0.01,
  },
  {
    name: "termMonths",
    label: "Lease term in months",
    min: 1,
    step: 1,
  },
  {
    name: "annualMileage",
    label: "Annual mileage",
    min: 1,
    step: 1_000,
  },
];

const vehicleDealFields: {
  name: keyof Pick<
    LeaseQuoteInput,
    "vehicleMsrp" | "sellingPrice" | "residualMsrp" | "residualValue"
  >;
  label: string;
  helperText?: string;
}[] = [
  {
    name: "vehicleMsrp",
    label: "Vehicle MSRP / retail price",
    helperText:
      "Use the vehicle MSRP or retail price shown on the quote. This is used to estimate dealer discount.",
  },
  {
    name: "sellingPrice",
    label: "Selling price",
  },
  {
    name: "residualMsrp",
    label: "Residual MSRP",
    helperText:
      "Use this if your quote shows a separate residual MSRP. It is used to calculate the residual percentage.",
  },
  {
    name: "residualValue",
    label: "Residual value",
    helperText:
      "This is the estimated lease-end value or buyout-related value shown on the quote.",
  },
];

const advancedFeeFields: {
  name: "dealerFees" | "leaseEndFee";
  label: string;
  helperText: string;
}[] = [
  {
    name: "dealerFees",
    label: "Optional extra upfront fees",
    helperText:
      "Use this only for separate fees you pay outside the monthly payment and due-at-signing amount.",
  },
  {
    name: "leaseEndFee",
    label: "Optional lease-end / disposition fee",
    helperText:
      "Leave this as 0 unless the quote clearly shows a separate lease-end or disposition fee.",
  },
];

const taxHelperText =
  "Turn this on only if the monthly payment you entered is before tax. If your quote already shows payment with tax, leave this off.";

const insightBasisText =
  "This analysis is based on the numbers entered. A detailed quote audit can review itemized fees later.";

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const kilometreFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

type PaymentSummary = {
  enteredMonthlyPayment: number;
  monthlyPaymentUsed: number;
};

type ComparisonQuoteForm = LeaseQuoteInput & {
  id: "quote-a" | "quote-b";
  label: string;
  quoteName: string;
  addTaxToMonthlyPayment: boolean;
  taxRate: number;
};

type ComparisonPaymentSummary = {
  quoteName: string;
  enteredMonthlyPayment: number;
  monthlyPaymentUsed: number;
};

type DecisionMode =
  | "lowest-total-cost"
  | "lowest-monthly-budget"
  | "lowest-upfront-cash"
  | "best-mileage-value"
  | "possible-future-buyout";

type DealInsight = {
  title: string;
  body: string;
};

type GoalRecommendation = {
  title: string;
  body: string;
  winningQuote: LeaseAnalysisResult | null;
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
  },
];

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatKilometres(value: number) {
  return `${kilometreFormatter.format(value)} km`;
}

function formatPercentage(value: number) {
  return `${percentageFormatter.format(value)}%`;
}

function formatCostPerKilometre(value: number) {
  return `${formatCurrency(value)} / km`;
}

function getQuoteDisplayName(
  quote: Pick<LeaseAnalysisResult, "vehicleName">,
  fallback: string,
) {
  return quote.vehicleName?.trim() || fallback;
}

function isCloseMetric(firstValue: number, secondValue: number) {
  const difference = Math.abs(firstValue - secondValue);
  const referenceValue = Math.min(
    Math.abs(firstValue),
    Math.abs(secondValue),
  );

  if (referenceValue === 0) {
    return difference === 0;
  }

  return difference / referenceValue < 0.02;
}

function getLowerMetricWinner(
  firstQuote: LeaseAnalysisResult,
  secondQuote: LeaseAnalysisResult,
  metric: keyof Pick<
    LeaseAnalysisResult,
    | "totalCost"
    | "trueMonthlyCost"
    | "costPerKm"
    | "monthlyPayment"
    | "upfrontRatio"
  >,
) {
  if (isCloseMetric(firstQuote[metric], secondQuote[metric])) {
    return null;
  }

  return firstQuote[metric] < secondQuote[metric] ? firstQuote : secondQuote;
}

function getDecisionModeRecommendation(
  comparison: LeaseComparisonResult,
  decisionMode: DecisionMode,
): GoalRecommendation | null {
  const [firstQuote, secondQuote] = comparison.results;

  if (!firstQuote || !secondQuote) {
    return null;
  }

  if (decisionMode === "lowest-total-cost") {
    const winningQuote = getLowerMetricWinner(
      firstQuote,
      secondQuote,
      "totalCost",
    );

    return {
      title: "Best fit for your goal",
      body: winningQuote
        ? `Since you selected lowest total cost, ${getQuoteDisplayName(
            winningQuote,
            "one quote",
          )} looks more aligned based on the lowest total lease cost after upfront, monthly, and lease-end amounts.`
        : "Since you selected lowest total cost, focus on total lease cost. These offers are close on that metric based on the numbers entered.",
      winningQuote,
    };
  }

  if (decisionMode === "lowest-monthly-budget") {
    const winningQuote = getLowerMetricWinner(
      firstQuote,
      secondQuote,
      "trueMonthlyCost",
    );

    return {
      title: "Best fit for your goal",
      body: winningQuote
        ? `Since you selected lowest monthly budget, ${getQuoteDisplayName(
            winningQuote,
            "one quote",
          )} may be stronger because it has the lower true monthly cost. This is more useful than the advertised monthly payment alone.`
        : "Since you selected lowest monthly budget, focus on true monthly cost rather than advertised monthly payment alone. These offers are close on that metric.",
      winningQuote,
    };
  }

  if (decisionMode === "lowest-upfront-cash") {
    const winningQuote = getLowerMetricWinner(
      firstQuote,
      secondQuote,
      "upfrontRatio",
    );

    return {
      title: "Best fit for your goal",
      body: winningQuote
        ? `Since you selected lowest upfront cash, ${getQuoteDisplayName(
            winningQuote,
            "one quote",
          )} looks more aligned because its upfront cost ratio is lower. Due-at-signing cash still matters alongside the monthly payment.`
        : "Since you selected lowest upfront cash, upfront cost ratio and due-at-signing amount matter more. These offers are close on upfront cost ratio.",
      winningQuote,
    };
  }

  if (decisionMode === "best-mileage-value") {
    const winningQuote = getLowerMetricWinner(
      firstQuote,
      secondQuote,
      "costPerKm",
    );

    return {
      title: "Best fit for your goal",
      body: winningQuote
        ? `Since you selected best mileage value, ${getQuoteDisplayName(
            winningQuote,
            "one quote",
          )} may be stronger because it has the lower cost per kilometre.`
        : "Since you selected best mileage value, cost per kilometre is especially important. These offers are close on kilometre value.",
      winningQuote,
    };
  }

  const quotesWithResidualDetails = comparison.results.filter(
    (quote) =>
      quote.residualValue !== undefined ||
      quote.residualPercentage !== undefined ||
      quote.depreciationAmount !== undefined,
  );

  if (quotesWithResidualDetails.length === 0) {
    return {
      title: "Best fit for your goal",
      body: "Since you selected possible future buyout, residual value and residual percentage become important context. Add optional vehicle details to improve this analysis.",
      winningQuote: null,
    };
  }

  return {
    title: "Best fit for your goal",
    body: "Since you selected possible future buyout, residual value and residual percentage become more important context. A high residual can lower lease payments but may make a future buyout more expensive, so this mode is best read as a trade-off rather than a guaranteed winner.",
    winningQuote: null,
  };
}

function describeUpfrontPressure(upfrontRatio: number) {
  if (upfrontRatio < 10) {
    return {
      level: "low",
      body: "This points to low upfront pressure, so less of the lease cost is being paid before the monthly payments begin.",
    };
  }

  if (upfrontRatio <= 25) {
    return {
      level: "moderate",
      body: "This points to moderate upfront pressure. It can make sense, but it is worth comparing against a lower upfront structure.",
    };
  }

  return {
    level: "high",
    body: "This points to high upfront pressure. A larger due-at-signing amount can make the monthly payment look lower than the full lease cost feels.",
  };
}

function buildSingleQuoteInsights(
  analysis: LeaseAnalysisResult,
): DealInsight[] {
  const insights: DealInsight[] = [];
  const upfrontPressure = describeUpfrontPressure(analysis.upfrontRatio);

  if (
    analysis.monthlyPayment > 0 &&
    analysis.trueMonthlyCost > analysis.monthlyPayment * 1.15
  ) {
    insights.push({
      title: "True monthly cost is higher",
      body: `${formatCurrency(
        analysis.trueMonthlyCost,
      )} is materially above the monthly payment of ${formatCurrency(
        analysis.monthlyPayment,
      )}. This may indicate upfront or end-of-lease costs are increasing the real monthly cost.`,
    });
  } else {
    insights.push({
      title: "Monthly cost is close",
      body: `${formatCurrency(
        analysis.trueMonthlyCost,
      )} is close to the monthly payment used in the calculation. Upfront costs do not appear to be heavily shifting the payment picture.`,
    });
  }

  insights.push({
    title: `${upfrontPressure.level} upfront pressure`,
    body: `${formatPercentage(analysis.upfrontRatio)} of the total lease cost is paid upfront. ${upfrontPressure.body}`,
  });

  if (analysis.discountPercentage !== undefined) {
    insights.push({
      title: "Discount from MSRP",
      body:
        analysis.discountPercentage > 0
          ? `${formatPercentage(
              analysis.discountPercentage,
            )} below MSRP may indicate some dealer discount before the lease math is applied.`
          : `${formatPercentage(
              analysis.discountPercentage,
            )} does not show a discount from MSRP. This may be worth asking about if the quote has room to move.`,
    });
  } else {
    insights.push({
      title: "Discount not shown",
      body: "Enter MSRP and selling price to see whether the quote includes a visible discount before the lease math is applied.",
    });
  }

  if (analysis.residualPercentage !== undefined) {
    insights.push({
      title: "Residual value context",
      body: `${formatPercentage(
        analysis.residualPercentage,
      )} is the estimated lease-end value as a share of MSRP. If you plan to buy out the car later, this number is useful context.`,
    });
  } else {
    insights.push({
      title: "Residual percentage not shown",
      body: "Enter residual value and MSRP details to see how much value the quote expects the vehicle to retain by lease end.",
    });
  }

  insights.push({
    title: "Kilometre value",
    body: `${formatCostPerKilometre(
      analysis.costPerKm,
    )} is useful to compare against another quote with a different payment, term, or mileage allowance.`,
  });

  if (analysis.depreciationAmount !== undefined) {
    insights.push({
      title: "Estimated depreciation",
      body: `${formatCurrency(
        analysis.depreciationAmount,
      )} represents the estimated value lost during the lease based on selling price and residual value.`,
    });
  }

  return insights;
}

function buildComparisonInsights(
  comparison: LeaseComparisonResult,
  decisionMode: DecisionMode,
): DealInsight[] {
  const [firstQuote, secondQuote] = comparison.results;

  if (!firstQuote || !secondQuote) {
    return [];
  }

  const firstName = getQuoteDisplayName(firstQuote, "Quote A");
  const secondName = getQuoteDisplayName(secondQuote, "Quote B");
  const totalCostWinner = getLowerMetricWinner(
    firstQuote,
    secondQuote,
    "totalCost",
  );
  const trueMonthlyWinner = getLowerMetricWinner(
    firstQuote,
    secondQuote,
    "trueMonthlyCost",
  );
  const costPerKmWinner = getLowerMetricWinner(
    firstQuote,
    secondQuote,
    "costPerKm",
  );
  const monthlyPaymentWinner = getLowerMetricWinner(
    firstQuote,
    secondQuote,
    "monthlyPayment",
  );
  const upfrontRatioWinner = getLowerMetricWinner(
    firstQuote,
    secondQuote,
    "upfrontRatio",
  );
  const insights: DealInsight[] = [];
  const goalRecommendation = getDecisionModeRecommendation(
    comparison,
    decisionMode,
  );
  const hasVehicleDetailMetrics = comparison.results.some(
    (comparisonQuote) =>
      comparisonQuote.discountFromMsrp !== undefined ||
      comparisonQuote.discountPercentage !== undefined ||
      comparisonQuote.residualPercentage !== undefined ||
      comparisonQuote.depreciationAmount !== undefined,
  );

  if (goalRecommendation) {
    insights.push({
      title: "Goal-based recommendation",
      body: `${goalRecommendation.body} This is based on the numbers entered, not a guaranteed best offer.`,
    });
  }

  insights.push({
    title: hasVehicleDetailMetrics
      ? "Vehicle details included"
      : "Basic comparison only",
    body: hasVehicleDetailMetrics
      ? "Vehicle MSRP and residual details help explain discount, residual strength, and estimated depreciation alongside the payment comparison."
      : "This comparison is focused on payment, upfront cost, term, and mileage. Add optional vehicle details when you want discount, residual, and depreciation context.",
  });

  insights.push({
    title: totalCostWinner ? "Lowest total cost" : "Total cost is close",
    body: totalCostWinner
      ? `${getQuoteDisplayName(
          totalCostWinner,
          "One quote",
        )} has the lowest total lease cost at ${formatCurrency(
          totalCostWinner.totalCost,
        )}. This is the broadest cost view after upfront, monthly, and lease-end amounts.`
      : `${firstName} and ${secondName} are within 2% on total lease cost, so this category is close.`,
  });

  insights.push({
    title: trueMonthlyWinner
      ? "Lowest true monthly cost"
      : "True monthly cost is close",
    body: trueMonthlyWinner
      ? `${getQuoteDisplayName(
          trueMonthlyWinner,
          "One quote",
        )} has the lower true monthly cost at ${formatCurrency(
          trueMonthlyWinner.trueMonthlyCost,
        )}. This can be easier to compare than the advertised monthly payment alone.`
      : `${firstName} and ${secondName} are within 2% on true monthly cost after upfront costs are spread across the term.`,
  });

  insights.push({
    title: costPerKmWinner
      ? "Lowest cost per kilometre"
      : "Cost per kilometre is close",
    body: costPerKmWinner
      ? `${getQuoteDisplayName(
          costPerKmWinner,
          "One quote",
        )} has the lower cost per kilometre at ${formatCostPerKilometre(
          costPerKmWinner.costPerKm,
        )}. This is useful when the offers have different mileage allowances.`
      : `${firstName} and ${secondName} are within 2% on cost per kilometre, so the driving allowance value looks similar.`,
  });

  if (
    monthlyPaymentWinner &&
    totalCostWinner &&
    totalCostWinner !== monthlyPaymentWinner
  ) {
    insights.push({
      title: "Monthly payment can be misleading",
      body: `${getQuoteDisplayName(
        monthlyPaymentWinner,
        "One quote",
      )} has the lower monthly payment, but ${getQuoteDisplayName(
        totalCostWinner,
        "the other quote",
      )} has the lower total cost after upfront and lease-end amounts are included.`,
    });
  } else if (monthlyPaymentWinner && !totalCostWinner) {
    insights.push({
      title: "Monthly payment does not decide it",
      body: `${getQuoteDisplayName(
        monthlyPaymentWinner,
        "One quote",
      )} has the lower monthly payment, but total lease cost is within 2%. This may indicate the upfront costs are balancing out the monthly difference.`,
    });
  } else if (monthlyPaymentWinner) {
    insights.push({
      title: "Monthly and total cost align",
      body: `${getQuoteDisplayName(
        monthlyPaymentWinner,
        "One quote",
      )} has the lower monthly payment and also leads on total lease cost. The upfront structure still matters when comparing cash needed today.`,
    });
  }

  if (upfrontRatioWinner) {
    const higherUpfrontQuote =
      upfrontRatioWinner === firstQuote ? secondQuote : firstQuote;
    const upfrontDifference = Math.abs(
      firstQuote.upfrontRatio - secondQuote.upfrontRatio,
    );

    insights.push({
      title:
        upfrontDifference >= 10
          ? "Upfront cost gap is large"
          : "Upfront cost ratio differs",
      body: `${getQuoteDisplayName(
        higherUpfrontQuote,
        "One quote",
      )} has the higher upfront cost ratio at ${formatPercentage(
        higherUpfrontQuote.upfrontRatio,
      )}, while ${getQuoteDisplayName(
        upfrontRatioWinner,
        "the other quote",
      )} is lower at ${formatPercentage(
        upfrontRatioWinner.upfrontRatio,
      )}. This can affect cash flow even when monthly payments look attractive.`,
    });
  } else {
    insights.push({
      title: "Upfront ratios are close",
      body: `${firstName} and ${secondName} are within 2% on upfront cost ratio, so neither quote shifts much more of the cost into due-at-signing amounts.`,
    });
  }

  const meaningfulWinners = [
    totalCostWinner,
    trueMonthlyWinner,
    costPerKmWinner,
  ].filter((winner): winner is LeaseAnalysisResult => winner !== null);
  const winningQuoteNames = new Set(
    meaningfulWinners.map((winner) => getQuoteDisplayName(winner, "One quote")),
  );

  if (winningQuoteNames.size > 1) {
    insights.push({
      title: "Trade-off to consider",
      body: "Different quotes lead in different categories, so the better fit depends on whether total cash cost, monthly budgeting, or mileage value matters most to you.",
    });
  }

  return insights;
}

function InsightSummary({
  title,
  insights,
}: {
  title: string;
  insights: DealInsight[];
}) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section className="my-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            Analysis
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {title}
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
            {insightBasisText}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <li
            key={`${title}-${insight.title}`}
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-sm font-semibold text-slate-900">
              {insight.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {insight.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helperText,
  prominent = false,
}: {
  label: string;
  value: string;
  helperText?: string;
  prominent?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        prominent
          ? "border-teal-200 bg-teal-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-2 font-semibold text-slate-950 ${
          prominent ? "text-2xl" : "text-lg"
        }`}
      >
        {value}
      </dd>
      {helperText ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export default function LeaseQuoteCalculator() {
  const [quote, setQuote] = useState<LeaseQuoteInput>(defaultQuote);
  const [addTaxToMonthlyPayment, setAddTaxToMonthlyPayment] = useState(false);
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [result, setResult] = useState<LeaseAnalysisResult | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [comparisonQuotes, setComparisonQuotes] = useState<
    ComparisonQuoteForm[]
  >(defaultComparisonQuotes);
  const [comparisonResult, setComparisonResult] =
    useState<LeaseComparisonResult | null>(null);
  const [comparisonPaymentSummaries, setComparisonPaymentSummaries] = useState<
    ComparisonPaymentSummary[]
  >([]);
  const [comparisonErrorMessage, setComparisonErrorMessage] = useState("");
  const [selectedDecisionMode, setSelectedDecisionMode] =
    useState<DecisionMode>("lowest-total-cost");

  function updateNumericQuote(field: keyof LeaseQuoteInput, value: string) {
    setQuote((currentQuote) => ({
      ...currentQuote,
      [field]: Number(value),
    }));
  }

  function updateOptionalNumericQuote(
    field: keyof Pick<
      LeaseQuoteInput,
      "vehicleMsrp" | "sellingPrice" | "residualMsrp" | "residualValue"
    >,
    value: string,
  ) {
    setQuote((currentQuote) => ({
      ...currentQuote,
      [field]: value === "" ? undefined : Number(value),
    }));
  }

  function updateVehicleName(value: string) {
    setQuote((currentQuote) => ({
      ...currentQuote,
      vehicleName: value,
    }));
  }

  function calculateLeaseQuote() {
    try {
      if (addTaxToMonthlyPayment && taxRate < 0) {
        throw new Error("Tax rate cannot be negative.");
      }

      const monthlyPaymentUsed = addTaxToMonthlyPayment
        ? quote.monthlyPayment * (1 + taxRate / 100)
        : quote.monthlyPayment;

      const analysis = analyzeLeaseQuote({
        ...quote,
        vehicleName: quote.vehicleName?.trim() || undefined,
        monthlyPayment: monthlyPaymentUsed,
      });

      setResult(analysis);
      setPaymentSummary({
        enteredMonthlyPayment: quote.monthlyPayment,
        monthlyPaymentUsed,
      });
      setErrorMessage("");
    } catch (error) {
      setResult(null);
      setPaymentSummary(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Please check the lease details and try again.",
      );
    }
  }

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
    field: keyof Pick<
      ComparisonQuoteForm,
      "vehicleMsrp" | "sellingPrice" | "residualMsrp" | "residualValue"
    >,
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
              addTaxToMonthlyPayment: checked,
            }
          : currentQuote,
      ),
    );
  }

  function compareOffers() {
    try {
      const paymentSummaries: ComparisonPaymentSummary[] = [];
      const cleanQuotes = comparisonQuotes.map((comparisonQuote) => {
        const quoteName =
          comparisonQuote.quoteName.trim() || comparisonQuote.label;
        const vehicleName = comparisonQuote.vehicleName?.trim() || quoteName;

        if (
          comparisonQuote.addTaxToMonthlyPayment &&
          comparisonQuote.taxRate < 0
        ) {
          throw new Error(`${quoteName}: Tax rate cannot be negative.`);
        }

        const monthlyPaymentUsed = comparisonQuote.addTaxToMonthlyPayment
          ? comparisonQuote.monthlyPayment * (1 + comparisonQuote.taxRate / 100)
          : comparisonQuote.monthlyPayment;

        paymentSummaries.push({
          quoteName,
          enteredMonthlyPayment: comparisonQuote.monthlyPayment,
          monthlyPaymentUsed,
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

      const analysis = compareLeaseQuotes(cleanQuotes);

      setComparisonResult(analysis);
      setComparisonPaymentSummaries(paymentSummaries);
      setComparisonErrorMessage("");
    } catch (error) {
      setComparisonResult(null);
      setComparisonPaymentSummaries([]);
      setComparisonErrorMessage(
        error instanceof Error
          ? error.message
          : "Please check both offers and try again.",
      );
    }
  }

  const selectedGoalRecommendation = comparisonResult
    ? getDecisionModeRecommendation(comparisonResult, selectedDecisionMode)
    : null;

  return (
    <section
      id="lease-calculator"
      className="border-t border-slate-200 bg-white px-6 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)] lg:items-start">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Lease Quote Calculator
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Turn one lease quote into a clear cost breakdown.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Enter the offer details from your quote, then calculate the full
            lease cost, true monthly cost, mileage allowance, kilometre rate,
            and upfront cost ratio.
          </p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Start with the numbers you know
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You can compare offers with monthly payment, down payment, term,
                and mileage. MSRP, selling price, and residual values are
                optional, but they improve the analysis when available.
              </p>
            </div>
            <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Detailed quote audit coming later
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                When you have a dealer quote, screenshot, or contract, AutoLease
                IQ will be able to extract fees, classify them, and check for
                possible double counting or confusing charges.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {mainFields.map((field) => (
              <label
                key={field.name}
                className="flex flex-col gap-2 text-sm font-medium text-slate-700"
              >
                {field.label}
                <input
                  type="number"
                  min={field.min}
                  step={field.step}
                  value={quote[field.name]}
                  onChange={(event) =>
                    updateNumericQuote(field.name, event.target.value)
                  }
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                />
              </label>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Vehicle and deal details
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Optional, but useful if your quote shows vehicle pricing or
                residual values.
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Vehicle name
                <input
                  type="text"
                  value={quote.vehicleName ?? ""}
                  onChange={(event) => updateVehicleName(event.target.value)}
                  placeholder="2026 Toyota RAV4 XLE"
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                />
              </label>

              {vehicleDealFields.map((field) => (
                <label
                  key={field.name}
                  className="flex flex-col gap-2 text-sm font-medium text-slate-700"
                >
                  {field.label}
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={quote[field.name] ?? ""}
                    onChange={(event) =>
                      updateOptionalNumericQuote(
                        field.name,
                        event.target.value,
                      )
                    }
                    className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                  />
                  {field.helperText ? (
                    <span className="text-xs leading-5 text-slate-500">
                      {field.helperText}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                role="switch"
                checked={addTaxToMonthlyPayment}
                onChange={(event) =>
                  setAddTaxToMonthlyPayment(event.target.checked)
                }
                className="peer sr-only"
              />
              <span className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 p-1 transition-colors after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-teal-700 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-700" />
              <span className="text-sm font-semibold text-slate-800">
                Add tax to monthly payment
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  {taxHelperText}
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Tax rate (%)
              <input
                type="number"
                min={0}
                step={0.1}
                value={taxRate}
                onChange={(event) => setTaxRate(Number(event.target.value))}
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              />
            </label>
          </div>

          <details className="mt-5 rounded-md border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Advanced optional fees
            </summary>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Optional. Add these only when they are paid separately and are not
              already included in the quote numbers above.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {advancedFeeFields.map((field) => (
                <label
                  key={field.name}
                  className="flex flex-col gap-2 text-sm font-medium text-slate-700"
                >
                  {field.label}
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={quote[field.name]}
                    onChange={(event) =>
                      updateNumericQuote(field.name, event.target.value)
                    }
                    className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {field.helperText}
                  </span>
                </label>
              ))}
            </div>
          </details>

          <button
            type="button"
            onClick={calculateLeaseQuote}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-teal-700 px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 sm:w-auto"
          >
            Calculate
          </button>

          {errorMessage ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {result && paymentSummary ? (
            <>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="True monthly cost"
                  value={formatCurrency(result.trueMonthlyCost)}
                  prominent
                />
                <MetricCard
                  label="Total lease cost"
                  value={formatCurrency(result.totalCost)}
                  prominent
                />
                <MetricCard
                  label="Cost per kilometre"
                  value={formatCostPerKilometre(result.costPerKm)}
                  prominent
                />
                <MetricCard
                  label="Upfront cost ratio"
                  value={formatPercentage(result.upfrontRatio)}
                  prominent
                />
                <MetricCard
                  label="Monthly payment used"
                  value={formatCurrency(paymentSummary.monthlyPaymentUsed)}
                  helperText={`Entered payment: ${formatCurrency(
                    paymentSummary.enteredMonthlyPayment,
                  )}`}
                />
                <MetricCard
                  label="Total allowed kilometres"
                  value={formatKilometres(result.totalAllowedKm)}
                />
                {result.vehicleName ? (
                  <MetricCard label="Vehicle" value={result.vehicleName} />
                ) : null}
                {result.discountFromMsrp !== undefined ? (
                  <MetricCard
                    label="Discount from vehicle MSRP"
                    value={formatCurrency(result.discountFromMsrp)}
                  />
                ) : null}
                {result.discountPercentage !== undefined ? (
                  <MetricCard
                    label="Discount percentage"
                    value={formatPercentage(result.discountPercentage)}
                  />
                ) : null}
                {result.residualPercentage !== undefined ? (
                  <MetricCard
                    label="Residual percentage"
                    value={formatPercentage(result.residualPercentage)}
                  />
                ) : null}
                {result.depreciationAmount !== undefined ? (
                  <MetricCard
                    label="Depreciation amount"
                    value={formatCurrency(result.depreciationAmount)}
                  />
                ) : null}
              </dl>

              <InsightSummary
                title="Deal quality summary"
                insights={buildSingleQuoteInsights(result)}
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-16 w-full max-w-6xl border-t border-slate-200 pt-12">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Multiple Offers
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Compare multiple lease offers
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
            Enter the main numbers from two offers to compare total lease cost,
            true monthly cost, kilometre value, and how much of the deal is paid
            upfront.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {comparisonQuotes.map((comparisonQuote) => (
              <article
                key={comparisonQuote.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">
                    {comparisonQuote.label}
                  </h3>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    Offer
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Quote name
                    <input
                      type="text"
                      value={comparisonQuote.quoteName}
                      onChange={(event) =>
                        updateComparisonTextQuote(
                          comparisonQuote.id,
                          event.target.value,
                        )
                      }
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                    />
                  </label>

                  {mainFields.map((field) => (
                    <label
                      key={field.name}
                      className="flex flex-col gap-2 text-sm font-medium text-slate-700"
                    >
                      {field.label}
                      <input
                        type="number"
                        min={field.min}
                        step={field.step}
                        value={comparisonQuote[field.name]}
                        onChange={(event) =>
                          updateComparisonNumericQuote(
                            comparisonQuote.id,
                            field.name,
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={comparisonQuote.addTaxToMonthlyPayment}
                      onChange={(event) =>
                        updateComparisonTaxToggle(
                          comparisonQuote.id,
                          event.target.checked,
                        )
                      }
                      className="peer sr-only"
                    />
                    <span className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 p-1 transition-colors after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-teal-700 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-700" />
                    <span className="text-sm font-semibold text-slate-800">
                      Add tax to monthly payment
                      <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                        {taxHelperText}
                      </span>
                    </span>
                  </label>

                  <label className="mt-4 flex max-w-40 flex-col gap-2 text-sm font-medium text-slate-700">
                    Tax rate (%)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={comparisonQuote.taxRate}
                      onChange={(event) =>
                        updateComparisonNumericQuote(
                          comparisonQuote.id,
                          "taxRate",
                          event.target.value,
                        )
                      }
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                    />
                  </label>
                </div>

                <details className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    Optional vehicle details
                  </summary>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Add these when comparing different vehicles or when a quote
                    shows MSRP, selling price, or residual values.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                      Vehicle / trim name
                      <input
                        type="text"
                        value={comparisonQuote.vehicleName ?? ""}
                        onChange={(event) =>
                          updateComparisonVehicleName(
                            comparisonQuote.id,
                            event.target.value,
                          )
                        }
                        placeholder="2026 Toyota RAV4 XLE"
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                      />
                    </label>

                    {vehicleDealFields.map((field) => (
                      <label
                        key={field.name}
                        className="flex flex-col gap-2 text-sm font-medium text-slate-700"
                      >
                        {field.label}
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={comparisonQuote[field.name] ?? ""}
                          onChange={(event) =>
                            updateComparisonOptionalNumericQuote(
                              comparisonQuote.id,
                              field.name,
                              event.target.value,
                            )
                          }
                          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                        />
                        {field.helperText ? (
                          <span className="text-xs leading-5 text-slate-500">
                            {field.helperText}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </details>

                <details className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    Advanced optional fees
                  </summary>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Optional. Add these only when they are paid separately and
                    are not already included in this offer.
                  </p>
                  <div className="mt-4 grid gap-4">
                    {advancedFeeFields.map((field) => (
                      <label
                        key={field.name}
                        className="flex flex-col gap-2 text-sm font-medium text-slate-700"
                      >
                        {field.label}
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={comparisonQuote[field.name]}
                          onChange={(event) =>
                            updateComparisonNumericQuote(
                              comparisonQuote.id,
                              field.name,
                              event.target.value,
                            )
                          }
                          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                        />
                        <span className="text-xs leading-5 text-slate-500">
                          {field.helperText}
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              What matters most to you?
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {decisionModeOptions.map((option) => {
                const isSelected = selectedDecisionMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDecisionMode(option.value)}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={compareOffers}
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-teal-700 px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 sm:w-auto"
          >
            Compare offers
          </button>

          {comparisonErrorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {comparisonErrorMessage}
            </p>
          ) : null}

          {comparisonResult ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-950">
                  Comparison results
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Best badges mark the lowest cost in each category.
                </p>
              </div>

              {selectedGoalRecommendation ? (
                <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                    Goal-based recommendation
                  </p>
                  <h4 className="mt-1 text-base font-semibold text-slate-950">
                    {selectedGoalRecommendation.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedGoalRecommendation.body} This is based on the
                    numbers entered, not a guaranteed best offer.
                  </p>
                </div>
              ) : null}

              <InsightSummary
                title="Comparison summary"
                insights={buildComparisonInsights(
                  comparisonResult,
                  selectedDecisionMode,
                )}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                {comparisonResult.results.map((comparisonAnalysis, index) => {
                    const paymentSummaryForQuote =
                      comparisonPaymentSummaries[index];
                    const isBestTotalCost =
                      comparisonAnalysis.totalCost ===
                      comparisonResult.lowestTotalCost.totalCost;
                    const isBestTrueMonthlyCost =
                      comparisonAnalysis.trueMonthlyCost ===
                      comparisonResult.lowestTrueMonthlyCost.trueMonthlyCost;
                    const isBestCostPerKm =
                      comparisonAnalysis.costPerKm ===
                      comparisonResult.lowestCostPerKm.costPerKm;
                    const isBestFitForSelectedGoal =
                      selectedGoalRecommendation?.winningQuote ===
                      comparisonAnalysis;

                    return (
                      <article
                        key={`${comparisonAnalysis.vehicleName ?? "quote"}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
                      >
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-slate-950">
                            {getQuoteDisplayName(
                              comparisonAnalysis,
                              `Quote ${index + 1}`,
                            )}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {isBestTotalCost ? (
                              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                                Best total cost
                              </span>
                            ) : null}
                            {isBestTrueMonthlyCost ? (
                              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                                Best true monthly cost
                              </span>
                            ) : null}
                            {isBestCostPerKm ? (
                              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                                Best cost per kilometre
                              </span>
                            ) : null}
                            {isBestFitForSelectedGoal ? (
                              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                Best fit for selected goal
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          <MetricCard
                            label="True monthly cost"
                            value={formatCurrency(
                              comparisonAnalysis.trueMonthlyCost,
                            )}
                            prominent
                          />
                          <MetricCard
                            label="Total lease cost"
                            value={formatCurrency(comparisonAnalysis.totalCost)}
                            prominent
                          />
                          <MetricCard
                            label="Cost per kilometre"
                            value={formatCostPerKilometre(
                              comparisonAnalysis.costPerKm,
                            )}
                            prominent
                          />
                          <MetricCard
                            label="Upfront cost ratio"
                            value={formatPercentage(
                              comparisonAnalysis.upfrontRatio,
                            )}
                            prominent
                          />
                          <MetricCard
                            label="Monthly payment used"
                            value={formatCurrency(
                              paymentSummaryForQuote?.monthlyPaymentUsed ??
                                comparisonAnalysis.monthlyPayment,
                            )}
                            helperText={
                              paymentSummaryForQuote
                                ? `Entered payment: ${formatCurrency(
                                    paymentSummaryForQuote.enteredMonthlyPayment,
                                  )}`
                                : undefined
                            }
                          />
                          <MetricCard
                            label="Total allowed kilometres"
                            value={formatKilometres(
                              comparisonAnalysis.totalAllowedKm,
                            )}
                          />
                          {comparisonAnalysis.discountFromMsrp !==
                          undefined ? (
                            <MetricCard
                              label="Discount from vehicle MSRP"
                              value={formatCurrency(
                                comparisonAnalysis.discountFromMsrp,
                              )}
                            />
                          ) : null}
                          {comparisonAnalysis.discountPercentage !==
                          undefined ? (
                            <MetricCard
                              label="Discount percentage"
                              value={formatPercentage(
                                comparisonAnalysis.discountPercentage,
                              )}
                            />
                          ) : null}
                          {comparisonAnalysis.residualPercentage !==
                          undefined ? (
                            <MetricCard
                              label="Residual percentage"
                              value={formatPercentage(
                                comparisonAnalysis.residualPercentage,
                              )}
                            />
                          ) : null}
                          {comparisonAnalysis.depreciationAmount !==
                          undefined ? (
                            <MetricCard
                              label="Depreciation amount"
                              value={formatCurrency(
                                comparisonAnalysis.depreciationAmount,
                              )}
                            />
                          ) : null}
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
        </div>
      </div>
    </section>
  );
}
