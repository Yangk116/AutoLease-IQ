import {
  type LeaseAnalysisResult,
  type LeaseComparisonResult,
} from "@/lib/leaseCalculations";

import { InsightSummary, type DealInsight } from "./InsightSummary";
import { MetricCard } from "./MetricCard";

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

type GoalRecommendation = {
  title: string;
  body: string;
  winningQuote: LeaseAnalysisResult | null;
};

type ComparisonResultsProps = {
  comparisonResult: LeaseComparisonResult;
  comparisonPaymentSummaries: ComparisonPaymentSummary[];
  selectedDecisionMode: DecisionMode;
};

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

export function ComparisonResults({
  comparisonResult,
  comparisonPaymentSummaries,
  selectedDecisionMode,
}: ComparisonResultsProps) {
  const selectedGoalRecommendation = getDecisionModeRecommendation(
    comparisonResult,
    selectedDecisionMode,
  );

  return (
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
            {selectedGoalRecommendation.body} This is based on the numbers
            entered, not a guaranteed best offer.
          </p>
        </div>
      ) : null}

      <InsightSummary
        title="Comparison summary"
        insights={buildComparisonInsights(comparisonResult, selectedDecisionMode)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
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
            selectedGoalRecommendation?.winningQuote === comparisonAnalysis;

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
    </div>
  );
}
