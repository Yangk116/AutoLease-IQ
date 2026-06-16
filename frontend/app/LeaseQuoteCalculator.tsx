"use client";

import { useState } from "react";

import {
  analyzeLeaseQuote,
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
      "Only include fees paid separately and not already included in the monthly payment or due-at-signing amount.",
  },
  {
    name: "leaseEndFee",
    label: "Optional lease-end / disposition fee",
    helperText:
      "Leave this as 0 if your quote does not show a disposition or lease-end return fee.",
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

type PaymentSummary = {
  enteredMonthlyPayment: number;
  monthlyPaymentUsed: number;
};

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

export default function LeaseQuoteCalculator() {
  const [quote, setQuote] = useState<LeaseQuoteInput>(defaultQuote);
  const [addTaxToMonthlyPayment, setAddTaxToMonthlyPayment] = useState(false);
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [result, setResult] = useState<LeaseAnalysisResult | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");

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
                  Turn this on only if the monthly payment you entered does not
                  already include tax.
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
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-medium text-slate-500">
                  Entered monthly payment
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(paymentSummary.enteredMonthlyPayment)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-medium text-slate-500">
                  Monthly payment used in calculation
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(paymentSummary.monthlyPaymentUsed)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-medium text-slate-500">
                  Total lease cost
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(result.totalCost)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-medium text-slate-500">
                  True monthly cost
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(result.trueMonthlyCost)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-medium text-slate-500">
                  Total allowed kilometres
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatKilometres(result.totalAllowedKm)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-medium text-slate-500">
                  Cost per kilometre
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCostPerKilometre(result.costPerKm)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4 sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">
                  Upfront cost ratio
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {formatPercentage(result.upfrontRatio)}
                </dd>
              </div>
              {result.vehicleName ? (
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <dt className="text-sm font-medium text-slate-500">
                    Vehicle
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-950">
                    {result.vehicleName}
                  </dd>
                </div>
              ) : null}
              {result.discountFromMsrp !== undefined ? (
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <dt className="text-sm font-medium text-slate-500">
                    Discount from vehicle MSRP
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-950">
                    {formatCurrency(result.discountFromMsrp)}
                  </dd>
                </div>
              ) : null}
              {result.discountPercentage !== undefined ? (
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <dt className="text-sm font-medium text-slate-500">
                    Discount percentage
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-950">
                    {formatPercentage(result.discountPercentage)}
                  </dd>
                </div>
              ) : null}
              {result.residualPercentage !== undefined ? (
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <dt className="text-sm font-medium text-slate-500">
                    Residual percentage
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-950">
                    {formatPercentage(result.residualPercentage)}
                  </dd>
                </div>
              ) : null}
              {result.depreciationAmount !== undefined ? (
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <dt className="text-sm font-medium text-slate-500">
                    Depreciation amount
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-950">
                    {formatCurrency(result.depreciationAmount)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
