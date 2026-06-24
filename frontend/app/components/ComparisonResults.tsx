import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  type LeaseAnalysisResult,
  type LeaseComparisonResult,
} from "@/lib/leaseCalculations";

import { InsightSummary, type DealInsight } from "./InsightSummary";
import { MetricCard } from "./MetricCard";
import { ReportPreview } from "./ReportPreview";

export type ComparisonPaymentSummary = {
  quoteName: string;
  enteredMonthlyPayment: number;
  monthlyPaymentUsed: number;
};

export type DecisionMode =
  | "lowest-total-cost"
  | "lowest-monthly-budget"
  | "lowest-upfront-cash"
  | "best-mileage-value"
  | "possible-future-buyout";

type GoalRecommendation = {
  title: string;
  body: string;
  winningQuote: LeaseAnalysisResult | null;
};

type FinalVerdictKind = "winner" | "mixed" | "needs-data";

export type FinalVerdict = {
  kind: FinalVerdictKind;
  headline: string;
  reasons: string[];
  winningQuote: LeaseAnalysisResult | null;
};

type ComparisonResultsProps = {
  comparisonResult: LeaseComparisonResult;
  comparisonPaymentSummaries: ComparisonPaymentSummary[];
  selectedDecisionMode: DecisionMode;
};

type CopyStatus = "idle" | "copied" | "failed";

export type ComparisonReportMetadata = {
  generatedAt: Date;
  generatedAtLabel: string;
  reportId: string;
};

export type DealerNegotiationItem = {
  title: string;
  whyItMatters: string;
  suggestedQuestion: string;
};

const baselineDealerNegotiationItems: readonly DealerNegotiationItem[] = [
  {
    title: "Tax clarity",
    whyItMatters:
      "A payment shown before tax can make an offer look cheaper than the amount you will actually pay.",
    suggestedQuestion:
      "Is the monthly payment fully tax-included, and can you show the before-tax and after-tax amounts separately?",
  },
  {
    title: "Due-at-signing breakdown",
    whyItMatters:
      "The total cash needed on delivery can include more than the stated down payment.",
    suggestedQuestion:
      "Can you itemize the exact amount due at signing, including the first payment, security deposit, fees, taxes, and any down payment?",
  },
  {
    title: "Fee breakdown",
    whyItMatters:
      "Separating required charges from dealer-added fees makes offers easier to compare and can reveal room to negotiate.",
    suggestedQuestion:
      "Can you provide an itemized list of every fee and identify which charges are government, manufacturer, or dealer-added?",
  },
  {
    title: "Mandatory add-ons",
    whyItMatters:
      "Protection packages and accessories can raise the lease cost even when they are not prominent in the advertised payment.",
    suggestedQuestion:
      "Are any protection packages, accessories, warranties, or other add-ons required, and can they be removed?",
  },
  {
    title: "Lease-end fee",
    whyItMatters:
      "Disposition and return charges affect the full lease cost and may be due even if they are absent from the monthly payment.",
    suggestedQuestion:
      "What lease-end or disposition fees would I owe if I return the vehicle, and are any of them waived if I lease another vehicle?",
  },
];

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

const reportDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildReportId(generatedAt: Date): string {
  const year = generatedAt.getFullYear();
  const month = padDatePart(generatedAt.getMonth() + 1);
  const day = padDatePart(generatedAt.getDate());
  const hour = padDatePart(generatedAt.getHours());
  const minute = padDatePart(generatedAt.getMinutes());

  return `ALIQ-${year}${month}${day}-${hour}${minute}`;
}

function buildComparisonReportMetadata(
  generatedAt: Date,
): ComparisonReportMetadata {
  return {
    generatedAt,
    generatedAtLabel: reportDateTimeFormatter.format(generatedAt),
    reportId: buildReportId(generatedAt),
  };
}

const decisionModeLabels: Record<DecisionMode, string> = {
  "lowest-total-cost": "Lowest total cost",
  "lowest-monthly-budget": "Lowest monthly budget",
  "lowest-upfront-cash": "Lowest upfront cash",
  "best-mileage-value": "Best mileage value",
  "possible-future-buyout": "Possible future buyout",
};

function getQuoteDisplayName(
  quote: Pick<LeaseAnalysisResult, "vehicleName">,
  fallback: string,
) {
  return quote.vehicleName?.trim() || fallback;
}

function isCloseMetric(firstValue: number, secondValue: number) {
  const difference = Math.abs(firstValue - secondValue);
  const referenceValue = Math.min(Math.abs(firstValue), Math.abs(secondValue));

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

function getStrictLowerMetricWinner(
  firstQuote: LeaseAnalysisResult,
  secondQuote: LeaseAnalysisResult,
  metric: keyof Pick<
    LeaseAnalysisResult,
    "totalCost" | "trueMonthlyCost" | "costPerKm" | "upfrontRatio"
  >,
) {
  if (firstQuote[metric] === secondQuote[metric]) {
    return null;
  }

  return firstQuote[metric] < secondQuote[metric] ? firstQuote : secondQuote;
}

function getQuoteLetter(
  comparison: LeaseComparisonResult,
  quote: LeaseAnalysisResult,
) {
  const quoteIndex = comparison.results.indexOf(quote);

  return quoteIndex >= 0 ? `Quote ${String.fromCharCode(65 + quoteIndex)}` : "Quote";
}

function getVerdictQuoteName(
  comparison: LeaseComparisonResult,
  quote: LeaseAnalysisResult,
) {
  const quoteLetter = getQuoteLetter(comparison, quote);
  const displayName = getQuoteDisplayName(quote, quoteLetter);

  return displayName === quoteLetter
    ? quoteLetter
    : `${quoteLetter} (${displayName})`;
}

function getMixedMetricSummary(comparison: LeaseComparisonResult) {
  const [firstQuote, secondQuote] = comparison.results;

  if (!firstQuote || !secondQuote) {
    return "The quotes need more information before they can be compared.";
  }

  const metricWinners = [
    {
      label: "total cost",
      quote: getStrictLowerMetricWinner(firstQuote, secondQuote, "totalCost"),
    },
    {
      label: "true monthly cost",
      quote: getStrictLowerMetricWinner(
        firstQuote,
        secondQuote,
        "trueMonthlyCost",
      ),
    },
    {
      label: "upfront cash",
      quote: getStrictLowerMetricWinner(firstQuote, secondQuote, "upfrontRatio"),
    },
    {
      label: "mileage value",
      quote: getStrictLowerMetricWinner(firstQuote, secondQuote, "costPerKm"),
    },
  ];
  const firstQuoteWin = metricWinners.find(
    (metricWinner) => metricWinner.quote === firstQuote,
  );
  const secondQuoteWin = metricWinners.find(
    (metricWinner) => metricWinner.quote === secondQuote,
  );

  if (firstQuoteWin && secondQuoteWin) {
    return `${getQuoteLetter(comparison, firstQuote)} wins on ${firstQuoteWin.label}, but ${getQuoteLetter(comparison, secondQuote)} wins on ${secondQuoteWin.label}.`;
  }

  return "The quotes are tied on the selected goal, so the supporting cost metrics should decide the better fit.";
}

export function buildFinalVerdict(
  comparison: LeaseComparisonResult,
  decisionMode: DecisionMode,
): FinalVerdict | null {
  const [firstQuote, secondQuote] = comparison.results;

  if (!firstQuote || !secondQuote) {
    return null;
  }

  if (decisionMode === "possible-future-buyout") {
    const quotesWithResidualDetails = comparison.results.filter(
      (quote) =>
        quote.residualValue !== undefined ||
        quote.residualPercentage !== undefined ||
        quote.depreciationAmount !== undefined,
    );

    if (quotesWithResidualDetails.length === 0) {
      return {
        kind: "needs-data",
        headline:
          "Residual details are needed for a stronger future buyout verdict.",
        reasons: [
          "The lease-end purchase price is not available.",
          "Residual value and lease-end fees drive future buyout cost.",
        ],
        winningQuote: null,
      };
    }

    const residualValues = comparison.results.filter(
      (
        quote,
      ): quote is LeaseAnalysisResult & {
        residualValue: number;
      } => quote.residualValue !== undefined,
    );
    const lowerResidualQuote =
      residualValues.length === 2 &&
      residualValues[0].residualValue !== residualValues[1].residualValue
        ? residualValues[0].residualValue < residualValues[1].residualValue
          ? residualValues[0]
          : residualValues[1]
        : null;
    const headline = lowerResidualQuote
      ? `Mixed result: ${getQuoteLetter(
          comparison,
          lowerResidualQuote,
        )} has the lower residual, but that does not guarantee the better lease.`
      : "Mixed result: residual strength affects lease payments and future buyout cost differently.";
    const reasons = lowerResidualQuote
      ? [
          `${getVerdictQuoteName(
            comparison,
            lowerResidualQuote,
          )} has the lower entered residual value at ${formatCurrency(
            lowerResidualQuote.residualValue,
          )}.`,
          "A lower residual may reduce the future purchase price.",
          "A higher residual may lower lease payments but raise buyout cost.",
        ]
      : [
          "A higher residual may lower lease payments.",
          "That same residual can make a future buyout more expensive.",
          "Confirm the exact purchase-option price and lease-end fees.",
        ];

    return {
      kind: "mixed",
      headline,
      reasons,
      winningQuote: null,
    };
  }

  const verdictConfig: Record<
    Exclude<DecisionMode, "possible-future-buyout">,
    {
      metric: "totalCost" | "trueMonthlyCost" | "upfrontRatio" | "costPerKm";
      reasons: (winningQuote: LeaseAnalysisResult) => string[];
    }
  > = {
    "lowest-total-cost": {
      metric: "totalCost",
      reasons: (winningQuote) => [
        `Lower total lease cost at ${formatCurrency(winningQuote.totalCost)}.`,
        "Includes upfront cash, monthly payments, fees, and lease-end cost.",
      ],
    },
    "lowest-monthly-budget": {
      metric: "trueMonthlyCost",
      reasons: (winningQuote) => [
        `Lower true monthly cost at ${formatCurrency(
          winningQuote.trueMonthlyCost,
        )}.`,
        "Spreads upfront cash and fees across the full lease term.",
      ],
    },
    "lowest-upfront-cash": {
      metric: "upfrontRatio",
      reasons: (winningQuote) => [
        `Lower upfront cost ratio at ${formatPercentage(
          winningQuote.upfrontRatio,
        )}.`,
        "Less of the total lease cost is tied up at signing.",
      ],
    },
    "best-mileage-value": {
      metric: "costPerKm",
      reasons: (winningQuote) => [
        `Lower cost per kilometre at ${formatCostPerKilometre(
          winningQuote.costPerKm,
        )}.`,
        "Better value for the mileage allowance entered.",
      ],
    },
  };
  const config = verdictConfig[decisionMode];
  const winningQuote = getStrictLowerMetricWinner(
    firstQuote,
    secondQuote,
    config.metric,
  );

  if (!winningQuote) {
    return {
      kind: "mixed",
      headline: `Mixed result: ${getMixedMetricSummary(comparison)}`,
      reasons: [
        `The quotes are tied on ${decisionModeLabels[
          decisionMode
        ].toLowerCase()}.`,
        "Use the supporting cost metrics and lease structure to break the tie.",
      ],
      winningQuote: null,
    };
  }

  return {
    kind: "winner",
    headline: `${getVerdictQuoteName(
      comparison,
      winningQuote,
    )} looks stronger for ${decisionModeLabels[decisionMode].toLowerCase()}.`,
    reasons: config.reasons(winningQuote),
    winningQuote,
  };
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
    const winningQuote = getStrictLowerMetricWinner(
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
    const winningQuote = getStrictLowerMetricWinner(
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
    const winningQuote = getStrictLowerMetricWinner(
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
    const winningQuote = getStrictLowerMetricWinner(
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

function buildComparisonInsights(
  comparison: LeaseComparisonResult,
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
  const hasVehicleDetailMetrics = comparison.results.some(
    (comparisonQuote) =>
      comparisonQuote.discountFromMsrp !== undefined ||
      comparisonQuote.discountPercentage !== undefined ||
      comparisonQuote.residualPercentage !== undefined ||
      comparisonQuote.depreciationAmount !== undefined,
  );

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

function getReportQuoteName(
  comparison: LeaseComparisonResult,
  paymentSummaries: ComparisonPaymentSummary[],
  quote: LeaseAnalysisResult,
) {
  const quoteIndex = comparison.results.indexOf(quote);

  return (
    paymentSummaries[quoteIndex]?.quoteName ||
    getQuoteDisplayName(quote, `Quote ${quoteIndex + 1}`)
  );
}

export function buildDealerNegotiationItems(
  comparison: LeaseComparisonResult,
  decisionMode: DecisionMode,
): DealerNegotiationItem[] {
  const [firstQuote, secondQuote] = comparison.results;
  const conditionalItems: DealerNegotiationItem[] = [];
  const hasResidualMetrics = comparison.results.some(
    (quote) =>
      quote.residualValue !== undefined ||
      quote.residualPercentage !== undefined,
  );
  const hasHighUpfrontRatio = comparison.results.some(
    (quote) => quote.upfrontRatio > 25,
  );
  const hasEnteredFees = comparison.results.some(
    (quote) => quote.dealerFees > 0 || quote.leaseEndFee > 0,
  );
  const hasMeaningfulCostPerKmDifference =
    firstQuote !== undefined &&
    secondQuote !== undefined &&
    !isCloseMetric(firstQuote.costPerKm, secondQuote.costPerKm);
  const monthlyPaymentWinner =
    firstQuote && secondQuote && firstQuote.monthlyPayment !== secondQuote.monthlyPayment
      ? firstQuote.monthlyPayment < secondQuote.monthlyPayment
        ? firstQuote
        : secondQuote
      : null;
  const otherQuote =
    monthlyPaymentWinner && firstQuote && secondQuote
      ? monthlyPaymentWinner === firstQuote
        ? secondQuote
        : firstQuote
      : null;
  const hasLowMonthlyPaymentTradeOff =
    monthlyPaymentWinner !== null &&
    otherQuote !== null &&
    monthlyPaymentWinner.trueMonthlyCost >= otherQuote.trueMonthlyCost;

  if (hasHighUpfrontRatio) {
    conditionalItems.push({
      title: "Upfront cash pressure",
      whyItMatters:
        "The lease may be using a larger upfront payment to make the monthly payment look lower.",
      suggestedQuestion:
        "Can you show this same lease with less money due upfront, such as $2,000 down, so I can compare the true monthly cost?",
    });
  }

  if (hasLowMonthlyPaymentTradeOff) {
    conditionalItems.push({
      title: "Low monthly payment trade-off",
      whyItMatters:
        "The lower advertised monthly payment may not be the cheaper deal after upfront cash and fees.",
      suggestedQuestion:
        "Can you match the other offer's due-at-signing amount so I can compare the monthly payment fairly?",
    });
  }

  if (hasEnteredFees) {
    conditionalItems.push({
      title: "Fee negotiation angle",
      whyItMatters:
        "Some fees may be mandatory, but dealer/admin items or add-ons may sometimes be reduced or removed.",
      suggestedQuestion:
        "Can you separate mandatory government/manufacturer fees from dealer-added fees, and tell me which ones are negotiable?",
    });
  }

  if (hasResidualMetrics) {
    conditionalItems.push({
      title: "Residual and buyout risk",
      whyItMatters:
        "A high residual can lower lease payments, but it can also make a future buyout more expensive.",
      suggestedQuestion:
        "If I want to buy the vehicle at lease end, what exact buyout amount would I owe including taxes and fees?",
    });
  }

  if (decisionMode === "possible-future-buyout") {
    conditionalItems.push({
      title: "Buyout-focused confirmation",
      whyItMatters:
        "Since you may buy out later, the residual value and lease-end charges matter more.",
      suggestedQuestion:
        "Can you provide the lease-end purchase option price and all extra fees I would pay if I buy the vehicle later?",
    });
  }

  if (hasMeaningfulCostPerKmDifference) {
    conditionalItems.push({
      title: "Mileage value check",
      whyItMatters:
        "The cheaper-looking quote may offer less value if mileage allowance or excess kilometre charges differ.",
      suggestedQuestion:
        "What is the annual kilometre allowance and what is the exact charge for each extra kilometre?",
    });
  }

  return [...conditionalItems, ...baselineDealerNegotiationItems];
}

export function buildReportKeyTakeaways(
  comparison: LeaseComparisonResult,
  paymentSummaries: ComparisonPaymentSummary[],
  decisionMode: DecisionMode,
  finalVerdict: FinalVerdict | null,
) {
  const [firstQuote, secondQuote] = comparison.results;

  if (!firstQuote || !secondQuote) {
    return ["More quote information is needed to generate comparison takeaways."];
  }

  const getName = (quote: LeaseAnalysisResult) =>
    getReportQuoteName(comparison, paymentSummaries, quote);
  const takeaways: string[] = [];

  if (finalVerdict?.winningQuote) {
    takeaways.push(
      `${getName(finalVerdict.winningQuote)} is stronger for ${decisionModeLabels[
        decisionMode
      ].toLowerCase()} based on the entered numbers.`,
    );
  } else if (finalVerdict?.kind === "needs-data") {
    takeaways.push(
      "More residual and lease-end information is needed for a stronger buyout verdict.",
    );
  } else {
    takeaways.push(
      "No single quote wins the selected goal; the supporting metrics show a trade-off.",
    );
  }

  const quotesWithPaymentGap = comparison.results.filter((quote, index) => {
    const monthlyPaymentUsed =
      paymentSummaries[index]?.monthlyPaymentUsed ?? quote.monthlyPayment;

    return !isCloseMetric(monthlyPaymentUsed, quote.trueMonthlyCost);
  });

  if (quotesWithPaymentGap.length > 0) {
    const quoteLabels = quotesWithPaymentGap
      .map((quote) => getName(quote))
      .join(" and ");

    takeaways.push(
      `The payment used and true monthly cost differ for ${quoteLabels}, so upfront cash and fees affect the monthly picture.`,
    );
  } else {
    takeaways.push(
      "The payment used and true monthly cost are close for both quotes.",
    );
  }

  const upfrontWinner = getStrictLowerMetricWinner(
    firstQuote,
    secondQuote,
    "upfrontRatio",
  );

  takeaways.push(
    upfrontWinner
      ? `${getName(upfrontWinner)} puts less of the total lease cost upfront at ${formatPercentage(upfrontWinner.upfrontRatio)}.`
      : "Both quotes place the same share of total lease cost upfront.",
  );

  const mileageWinner = getStrictLowerMetricWinner(
    firstQuote,
    secondQuote,
    "costPerKm",
  );

  takeaways.push(
    mileageWinner
      ? `${getName(mileageWinner)} offers the stronger mileage value at ${formatCostPerKilometre(mileageWinner.costPerKm)}.`
      : "Both quotes provide the same cost per kilometre based on the entered allowances.",
  );

  const hasResidualContext = comparison.results.some(
    (quote) =>
      quote.residualValue !== undefined ||
      quote.residualPercentage !== undefined ||
      quote.depreciationAmount !== undefined,
  );

  if (hasResidualContext) {
    takeaways.push(
      "Residual and depreciation figures add buyout context: a higher residual can lower lease payments but increase the future purchase price.",
    );
  }

  return takeaways;
}

export function buildComparisonReport(
  comparison: LeaseComparisonResult,
  paymentSummaries: ComparisonPaymentSummary[],
  decisionMode: DecisionMode,
  metadata: ComparisonReportMetadata = buildComparisonReportMetadata(
    new Date(),
  ),
) {
  const quoteNames = comparison.results.map((quote, index) => {
    const quoteLabel = `Quote ${String.fromCharCode(65 + index)}`;

    return (
      paymentSummaries[index]?.quoteName ||
      getQuoteDisplayName(quote, quoteLabel)
    );
  });
  const quoteSections = comparison.results.map((quote, index) => {
    const paymentSummary = paymentSummaries[index];
    const quoteLabel = `Quote ${String.fromCharCode(65 + index)}`;
    return [
      `${quoteLabel.toUpperCase()} - ${quoteNames[index]}`,
      "",
      `* True monthly cost: ${formatCurrency(quote.trueMonthlyCost)}`,
      `* Total lease cost: ${formatCurrency(quote.totalCost)}`,
      `* Monthly payment used: ${formatCurrency(
        paymentSummary?.monthlyPaymentUsed ?? quote.monthlyPayment,
      )}`,
      `* Cost per kilometre: ${formatCostPerKilometre(quote.costPerKm)}`,
      `* Upfront cost ratio: ${formatPercentage(quote.upfrontRatio)}`,
      `* Total allowed kilometres: ${formatKilometres(quote.totalAllowedKm)}`,
    ].join("\n");
  });
  const costSnapshotLines = comparison.results.slice(0, 2).flatMap(
    (quote, index) => {
      const quoteLabel = `Quote ${String.fromCharCode(65 + index)}`;

      return [
        `* ${quoteLabel} true monthly cost: ${formatCurrency(
          quote.trueMonthlyCost,
        )}`,
        `* ${quoteLabel} total lease cost: ${formatCurrency(quote.totalCost)}`,
      ];
    },
  );
  const finalVerdict = buildFinalVerdict(comparison, decisionMode);
  const dealerNegotiationItems = buildDealerNegotiationItems(
    comparison,
    decisionMode,
  );
  const verdictFit = finalVerdict?.winningQuote
    ? `${getQuoteLetter(comparison, finalVerdict.winningQuote)} - ${getReportQuoteName(
        comparison,
        paymentSummaries,
        finalVerdict.winningQuote,
      )}`
    : finalVerdict?.kind === "needs-data"
      ? "More data needed"
      : finalVerdict
        ? "Mixed result"
        : "Not available";
  const vehicleContextSections = comparison.results.flatMap((quote, index) => {
    const metrics: string[] = [];

    if (quote.discountPercentage !== undefined) {
      metrics.push(
        `* Discount percentage: ${formatPercentage(quote.discountPercentage)}`,
      );
    }

    if (quote.residualPercentage !== undefined) {
      metrics.push(
        `* Residual percentage: ${formatPercentage(quote.residualPercentage)}`,
      );
    }

    if (quote.residualValue !== undefined) {
      metrics.push(
        `* Residual value: ${formatCurrency(quote.residualValue)}`,
      );
    }

    if (quote.depreciationAmount !== undefined) {
      metrics.push(
        `* Depreciation amount: ${formatCurrency(quote.depreciationAmount)}`,
      );
    }

    if (metrics.length === 0) {
      return [];
    }

    const quoteLabel = `Quote ${String.fromCharCode(65 + index)}`;

    return [
      [
        `${quoteLabel.toUpperCase()} - ${quoteNames[index]}`,
        "",
        ...metrics,
      ].join("\n"),
    ];
  });
  const hasBuyoutContext = comparison.results.some(
    (quote) =>
      quote.residualValue !== undefined ||
      quote.residualPercentage !== undefined,
  );
  const vehicleContextLines =
    vehicleContextSections.length > 0
      ? [
          vehicleContextSections.join("\n\n"),
          ...(hasBuyoutContext
            ? [
                "",
                "* Buyout warning: A higher residual may lower lease payments but can increase the future purchase price. Confirm the exact purchase-option amount and lease-end fees with the dealer.",
              ]
            : []),
        ]
      : [
          "Optional MSRP, selling price, residual value, and depreciation details were not entered for this report.",
        ];
  const keyTakeaways = buildReportKeyTakeaways(
    comparison,
    paymentSummaries,
    decisionMode,
    finalVerdict,
  );

  return [
    "AutoLease IQ Comparison Report",
    `Generated: ${metadata.generatedAtLabel}`,
    `Report ID: ${metadata.reportId}`,
    `Selected goal: ${decisionModeLabels[decisionMode]}`,
    "Generated from the numbers entered by the user.",
    "Prepared for decision review. This report summarizes the numbers entered by the user and does not replace dealer, lender, tax, insurance, or legal advice.",
    "",
    "1. EXECUTIVE SUMMARY",
    "",
    `Best fit for selected goal: ${verdictFit}`,
    finalVerdict?.headline ?? "A final verdict is not available.",
    ...(finalVerdict?.reasons.slice(0, 1).map((reason) => `* ${reason}`) ?? []),
    "",
    "2. COST SNAPSHOT",
    "",
    ...costSnapshotLines,
    "",
    "3. QUOTE COMPARISON",
    "",
    quoteSections.join("\n\n"),
    "",
    "4. BUYOUT / VEHICLE CONTEXT",
    "",
    ...vehicleContextLines,
    "",
    "KEY TAKEAWAYS",
    "",
    ...keyTakeaways.map((takeaway) => `* ${takeaway}`),
    "",
    "5. NEGOTIATION NOTES",
    "",
    ...dealerNegotiationItems.flatMap((item, index) => [
      `${index + 1}. ${item.title}`,
      `   Why it matters: ${item.whyItMatters}`,
      `   Ask the dealer: "${item.suggestedQuestion}"`,
      "",
    ]),
    "6. DISCLAIMER",
    "",
    "This report is based only on the numbers entered in this browser. It is not financial advice, a lender quote, or a guarantee of dealer pricing. Confirm taxes, fees, incentives, buyout terms, and contract language before signing.",
  ].join("\n");
}

export function ComparisonResults({
  comparisonResult,
  comparisonPaymentSummaries,
  selectedDecisionMode,
}: ComparisonResultsProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [isAssistantMounted, setIsAssistantMounted] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const copyStatusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const assistantTriggerRef = useRef<HTMLButtonElement | null>(null);
  const assistantCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const [reportMetadata] = useState<ComparisonReportMetadata>(() =>
    buildComparisonReportMetadata(new Date()),
  );
  const selectedGoalRecommendation = getDecisionModeRecommendation(
    comparisonResult,
    selectedDecisionMode,
  );
  const finalVerdict = buildFinalVerdict(
    comparisonResult,
    selectedDecisionMode,
  );
  const dealerNegotiationItems = buildDealerNegotiationItems(
    comparisonResult,
    selectedDecisionMode,
  );
  const reportKeyTakeaways = buildReportKeyTakeaways(
    comparisonResult,
    comparisonPaymentSummaries,
    selectedDecisionMode,
    finalVerdict,
  );

  useEffect(() => {
    return () => {
      if (copyStatusTimeout.current) {
        clearTimeout(copyStatusTimeout.current);
      }

      if (assistantCloseTimeout.current) {
        clearTimeout(assistantCloseTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAssistantMounted) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAssistant();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = document.getElementById("negotiation-assistant-dialog");
      const focusableElements = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements?.length) {
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastFocusableElement
      ) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAssistantMounted]);

  function openAssistant() {
    if (assistantCloseTimeout.current) {
      clearTimeout(assistantCloseTimeout.current);
      assistantCloseTimeout.current = null;
    }

    setIsAssistantMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAssistantOpen(true);
        assistantCloseButtonRef.current?.focus();
      });
    });
  }

  function closeAssistant() {
    setIsAssistantOpen(false);

    if (assistantCloseTimeout.current) {
      clearTimeout(assistantCloseTimeout.current);
    }

    assistantCloseTimeout.current = setTimeout(() => {
      setIsAssistantMounted(false);
      assistantTriggerRef.current?.focus();
      assistantCloseTimeout.current = null;
    }, 300);
  }

  function printReport(): void {
    window.print();
  }

  function resetCopyStatusAfterDelay() {
    if (copyStatusTimeout.current) {
      clearTimeout(copyStatusTimeout.current);
    }

    copyStatusTimeout.current = setTimeout(() => {
      setCopyStatus("idle");
    }, 2_000);
  }

  async function copyReport() {
    try {
      const reportText = buildComparisonReport(
        comparisonResult,
        comparisonPaymentSummaries,
        selectedDecisionMode,
        reportMetadata,
      );

      await navigator.clipboard.writeText(reportText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }

    resetCopyStatusAfterDelay();
  }

  const quoteResultCards = (
    <div className="mb-5 grid gap-4 xl:grid-cols-2">
      {comparisonResult.results.map((comparisonAnalysis, index) => {
        const paymentSummaryForQuote = comparisonPaymentSummaries[index];
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
          finalVerdict?.winningQuote === comparisonAnalysis;
        const quoteLabel = `Quote ${String.fromCharCode(65 + index)}`;

        return (
          <article
            key={`${comparisonAnalysis.vehicleName ?? "quote"}-${index}`}
            className={`rounded-2xl border p-4 transition-all duration-300 sm:p-5 ${
              isBestFitForSelectedGoal
                ? "border-teal-300 bg-gradient-to-br from-teal-50 via-white to-white shadow-[0_20px_45px_-30px_rgba(13,148,136,0.75)] ring-1 ring-teal-100"
                : "border-slate-200/80 bg-slate-50/70 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            }`}
          >
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {quoteLabel}
                </p>
                <h4 className="mt-1 text-xl font-bold text-slate-950">
                  {getQuoteDisplayName(comparisonAnalysis, quoteLabel)}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {isBestFitForSelectedGoal ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-700 bg-teal-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <span aria-hidden="true">★</span>
                    Best option
                  </span>
                ) : null}
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
              </div>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="True monthly cost"
                value={formatCurrency(comparisonAnalysis.trueMonthlyCost)}
                prominent
              />
              <MetricCard
                label="Total lease cost"
                value={formatCurrency(comparisonAnalysis.totalCost)}
                prominent
              />
              <MetricCard
                label="Cost per kilometre"
                value={formatCostPerKilometre(comparisonAnalysis.costPerKm)}
                prominent
              />
              <MetricCard
                label="Upfront cost ratio"
                value={formatPercentage(comparisonAnalysis.upfrontRatio)}
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
                value={formatKilometres(comparisonAnalysis.totalAllowedKm)}
              />
              {comparisonAnalysis.discountFromMsrp !== undefined ? (
                <MetricCard
                  label="Discount from vehicle MSRP"
                  value={formatCurrency(comparisonAnalysis.discountFromMsrp)}
                />
              ) : null}
              {comparisonAnalysis.discountPercentage !== undefined ? (
                <MetricCard
                  label="Discount percentage"
                  value={formatPercentage(
                    comparisonAnalysis.discountPercentage,
                  )}
                />
              ) : null}
              {comparisonAnalysis.residualPercentage !== undefined ? (
                <MetricCard
                  label="Residual percentage"
                  value={formatPercentage(
                    comparisonAnalysis.residualPercentage,
                  )}
                />
              ) : null}
              {comparisonAnalysis.depreciationAmount !== undefined ? (
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
  );

  return (
    <>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.55)] sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M5 12.5 9 16l10-10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">
              Comparison results
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Start with the verdict, then review the metrics and trade-offs.
            </p>
          </div>
        </div>

      {finalVerdict ? (
        <section
          className={`mb-5 overflow-hidden rounded-2xl border p-5 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.5)] sm:p-6 ${
            finalVerdict.kind === "winner"
              ? "border-teal-200 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_42%),linear-gradient(to_bottom_right,#f0fdfa,#ffffff)]"
              : "border-amber-200 bg-gradient-to-br from-amber-50/80 to-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                Best fit for your selected goal
              </p>
              <h4 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                Final Verdict
              </h4>
            </div>
            {finalVerdict.kind !== "winner" ? (
              <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                {finalVerdict.kind === "mixed"
                  ? "Trade-off"
                  : "More data needed"}
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-lg font-semibold leading-7 text-slate-950">
            {finalVerdict.headline}
          </p>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why this matters
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {finalVerdict.reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span aria-hidden="true" className="font-bold text-teal-700">
                    &bull;
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {quoteResultCards}

      {selectedGoalRecommendation ? (
        <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            Goal-based recommendation
          </p>
          <h4 className="mt-1 text-base font-semibold text-slate-950">
            {selectedGoalRecommendation.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {selectedGoalRecommendation.body} This is based on the numbers
            entered, not a guaranteed best offer.
          </p>
        </div>
      ) : null}

      <InsightSummary
        title="Comparison summary"
        insights={buildComparisonInsights(comparisonResult)}
      />

      <div className="mb-5">
        <button
          id="lease-report-preview-toggle"
          type="button"
          onClick={() => setIsReportPreviewOpen((isOpen) => !isOpen)}
          aria-expanded={isReportPreviewOpen}
          aria-controls="lease-report-preview"
          className="group flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.2),transparent_40%),linear-gradient(to_bottom_right,#0f172a,#172554)] p-3.5 text-left text-white shadow-[0_22px_55px_-32px_rgba(15,23,42,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-500/70 hover:shadow-[0_26px_60px_-30px_rgba(15,118,110,0.65)] focus:outline-none focus:ring-2 focus:ring-teal-600/50 focus:ring-offset-2 active:translate-y-0 active:scale-[0.995] sm:gap-4 sm:p-5"
        >
          <span className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-lg shadow-slate-950/30 transition-transform duration-300 group-hover:scale-105">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M7 3.75h7l3 3V20.25H7V3.75Z"
                  strokeLinejoin="round"
                />
                <path d="M14 3.75v3h3M9.5 11h5M9.5 14.5h5" strokeLinecap="round" />
              </svg>
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-widest text-teal-300">
                Report preview
              </span>
              <span className="mt-1 block text-base font-semibold">
                {isReportPreviewOpen
                  ? "Hide report preview"
                  : "Preview report"}
              </span>
              <span className="mt-1 hidden text-sm leading-6 text-slate-300 sm:block">
                Review a polished, share-ready view of the verdict, costs, and
                negotiation plan.
              </span>
            </span>
          </span>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-teal-100 transition-transform duration-300 ${
              isReportPreviewOpen ? "rotate-180" : ""
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m4 7 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div
          id="lease-report-preview"
          aria-hidden={!isReportPreviewOpen}
          className={`grid transition-all duration-500 ease-out ${
            isReportPreviewOpen
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="print-report-controls mb-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Preview, copy, or use your browser&apos;s Save as PDF option.
              </p>
              <div className="grid gap-2 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={copyReport}
                  aria-live="polite"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:w-auto"
                >
                  {copyStatus === "copied"
                    ? "Copied"
                    : copyStatus === "failed"
                      ? "Copy failed"
                      : "Copy report"}
                </button>
                <button
                  type="button"
                  onClick={printReport}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:w-auto"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M7 9V4h10v5M7 17H5.5A2.5 2.5 0 0 1 3 14.5v-3A2.5 2.5 0 0 1 5.5 9h13a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-2.5 2.5H17"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M7 14h10v6H7z" strokeLinejoin="round" />
                  </svg>
                  Print / Save as PDF
                </button>
              </div>
            </div>
            <div className="print-report-area">
              <ReportPreview
                comparisonResult={comparisonResult}
                comparisonPaymentSummaries={comparisonPaymentSummaries}
                selectedDecisionMode={selectedDecisionMode}
                metadata={reportMetadata}
                finalVerdict={finalVerdict}
                keyTakeaways={reportKeyTakeaways}
                negotiationItems={dealerNegotiationItems}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        id="negotiation-assistant-trigger"
        ref={assistantTriggerRef}
        type="button"
        onClick={openAssistant}
            className="negotiation-teaser-reveal group mb-5 flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-teal-200 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.16),transparent_40%),linear-gradient(to_bottom_right,#f0fdfa,#ffffff)] p-3.5 text-left shadow-[0_18px_45px_-32px_rgba(13,148,136,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_22px_50px_-30px_rgba(13,148,136,0.65)] focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.995] sm:gap-4 sm:p-5"
        aria-haspopup="dialog"
      >
        <span className="flex min-w-0 items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M8 10h8M8 14h5" strokeLinecap="round" />
              <path d="M5 19l1.2-3.1A7 7 0 1 1 19 12a7 7 0 0 1-10.6 6Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-widest text-teal-700">
              Before you sign
            </span>
            <span className="mt-1 block text-base font-semibold text-slate-950">
              Open your Negotiation Assistant
            </span>
            <span className="mt-1 hidden text-sm leading-6 text-slate-600 sm:block">
              Get {dealerNegotiationItems.length} tailored questions to clarify
              fees and negotiate a cleaner deal.
            </span>
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-white text-teal-800 shadow-sm transition-all duration-200 group-hover:translate-x-0.5 group-hover:border-teal-300">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m7 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Save or share the full comparison
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Includes the final verdict, all report metrics, and the Dealer
            Negotiation Assistant.
          </p>
        </div>
        <button
          type="button"
          onClick={copyReport}
          aria-live="polite"
          className="mt-3 w-full rounded-xl border border-teal-700 bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-800 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:mt-0 sm:w-auto"
        >
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "failed"
              ? "Copy failed"
              : "Copy report"}
        </button>
      </div>
      </div>

      {isAssistantMounted
        ? createPortal(
            <>
              <div
                className={`fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 ${
                  isAssistantOpen ? "opacity-100" : "opacity-0"
                }`}
                onMouseDown={closeAssistant}
                aria-hidden="true"
              />
          <aside
            id="negotiation-assistant-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="negotiation-assistant-title"
            className={`fixed inset-x-0 bottom-0 z-50 flex h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] min-h-0 w-full flex-col overflow-hidden rounded-t-[1.5rem] border border-slate-200/80 bg-slate-50 shadow-[0_-24px_70px_-25px_rgba(15,23,42,0.35)] transition-transform duration-300 ease-out sm:h-[90dvh] sm:max-h-[90dvh] sm:rounded-t-[1.75rem] md:inset-y-0 md:left-auto md:right-0 md:h-[100dvh] md:max-h-[100dvh] md:w-full md:max-w-xl md:rounded-none md:rounded-l-[1.75rem] md:shadow-[-24px_0_70px_-30px_rgba(15,23,42,0.35)] ${
              isAssistantOpen
                ? "translate-y-0 md:translate-x-0"
                : "translate-y-full md:translate-x-full md:translate-y-0"
            }`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 md:hidden" />
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                  Personalized to this comparison
                </p>
                <h2
                  id="negotiation-assistant-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl"
                >
                  Negotiation Assistant
                </h2>
                <p className="mt-1 hidden text-sm leading-6 text-slate-500 sm:block">
                  Clear questions you can use with the dealer.
                </p>
              </div>
              <button
                ref={assistantCloseButtonRef}
                type="button"
                onClick={closeAssistant}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/40 active:scale-95"
                aria-label="Close negotiation assistant"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6 sm:pb-10 sm:pt-5">
              <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">
                  Your conversation plan
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Ask for written, itemized answers so you can compare both
                  offers on the same basis.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {dealerNegotiationItems.map((item, index) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.65)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {item.whyItMatters}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                        Ask the dealer
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-800">
                        “{item.suggestedQuestion}”
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-200/80 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4 sm:pt-4">
              <button
                type="button"
                onClick={copyReport}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:scale-[0.98] ${
                  copyStatus === "copied"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : copyStatus === "failed"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-teal-700 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md"
                }`}
                aria-live="polite"
              >
                {copyStatus === "copied" ? (
                  <>
                    <span aria-hidden="true">✓</span>
                    Copied
                  </>
                ) : copyStatus === "failed" ? (
                  "Copy failed - try again"
                ) : (
                  "Copy full report and questions"
                )}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Press Escape or click outside to close.
              </p>
            </footer>
          </aside>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
