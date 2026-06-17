"use client";

import { useState } from "react";

import {
  analyzeLeaseQuote,
  compareLeaseQuotes,
  type LeaseComparisonResult,
  type LeaseAnalysisResult,
  type LeaseQuoteInput,
} from "@/lib/leaseCalculations";

import { InsightSummary, type DealInsight } from "./components/InsightSummary";
import { ComparisonResults } from "./components/ComparisonResults";
import { ComparisonQuoteCard } from "./components/ComparisonQuoteCard";
import type { ComparisonQuoteForm } from "./components/ComparisonQuoteCard";
import { MetricCard } from "./components/MetricCard";

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
              <ComparisonQuoteCard
                key={comparisonQuote.id}
                quote={comparisonQuote}
                onQuoteNameChange={updateComparisonTextQuote}
                onVehicleNameChange={updateComparisonVehicleName}
                onNumericChange={updateComparisonNumericQuote}
                onOptionalNumericChange={updateComparisonOptionalNumericQuote}
                onTaxToggleChange={updateComparisonTaxToggle}
              />
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
            <ComparisonResults
              comparisonResult={comparisonResult}
              comparisonPaymentSummaries={comparisonPaymentSummaries}
              selectedDecisionMode={selectedDecisionMode}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
