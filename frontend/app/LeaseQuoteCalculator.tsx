"use client";

import { useEffect, useRef, useState } from "react";

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

type GuidedProgressStatus = "complete" | "active" | "available" | "locked";

type GuidedProgressStep = {
  number: number;
  label: string;
  href: string;
  status: GuidedProgressStatus;
};

type ComparisonPreset = {
  id: "low-monthly-vs-low-total" | "low-upfront-vs-high-upfront" | "buyout";
  name: string;
  purpose: string;
  decisionMode: DecisionMode;
  quotes: [ComparisonQuoteForm, ComparisonQuoteForm];
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

const comparisonPresets: ComparisonPreset[] = [
  {
    id: "low-monthly-vs-low-total",
    name: "Low monthly vs low total",
    purpose:
      "See why a lower advertised monthly payment can still cost more after upfront cash and fees.",
    decisionMode: "lowest-total-cost",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "Lower advertised monthly",
        downPayment: 7_000,
        monthlyPayment: 390,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 600,
        leaseEndFee: 500,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "Higher monthly, lower upfront",
        downPayment: 2_500,
        monthlyPayment: 520,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 600,
        leaseEndFee: 500,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
      },
    ],
  },
  {
    id: "low-upfront-vs-high-upfront",
    name: "Low upfront vs high upfront",
    purpose:
      "Compare an offer with less due today against one that lowers monthly payments with a bigger down payment.",
    decisionMode: "lowest-upfront-cash",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "Low upfront offer",
        downPayment: 1_500,
        monthlyPayment: 610,
        termMonths: 36,
        annualMileage: 16_000,
        dealerFees: 500,
        leaseEndFee: 450,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "High upfront offer",
        downPayment: 8_000,
        monthlyPayment: 420,
        termMonths: 36,
        annualMileage: 16_000,
        dealerFees: 500,
        leaseEndFee: 450,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
      },
    ],
  },
  {
    id: "buyout",
    name: "Buyout-focused example",
    purpose:
      "Explore how residual value can lower lease payments but affect a future buyout decision.",
    decisionMode: "possible-future-buyout",
    quotes: [
      {
        id: "quote-a",
        label: "Quote A",
        quoteName: "Higher residual offer",
        downPayment: 4_000,
        monthlyPayment: 480,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 700,
        leaseEndFee: 500,
        vehicleName: "Sample SUV lease",
        vehicleMsrp: 50_000,
        sellingPrice: 47_500,
        residualMsrp: 50_000,
        residualValue: 35_000,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
      },
      {
        id: "quote-b",
        label: "Quote B",
        quoteName: "Lower residual offer",
        downPayment: 4_000,
        monthlyPayment: 560,
        termMonths: 24,
        annualMileage: 20_000,
        dealerFees: 700,
        leaseEndFee: 500,
        vehicleName: "Sample SUV lease",
        vehicleMsrp: 50_000,
        sellingPrice: 47_000,
        residualMsrp: 50_000,
        residualValue: 30_000,
        addTaxToMonthlyPayment: false,
        taxRate: defaultTaxRate,
      },
    ],
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
  const [isComparing, setIsComparing] = useState(false);
  const comparisonTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (comparisonTimeout.current) {
        clearTimeout(comparisonTimeout.current);
      }
    };
  }, []);

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

  function loadComparisonPreset(preset: ComparisonPreset) {
    if (comparisonTimeout.current) {
      clearTimeout(comparisonTimeout.current);
      comparisonTimeout.current = null;
    }

    setIsComparing(false);
    setComparisonQuotes(preset.quotes.map((presetQuote) => ({ ...presetQuote })));
    setSelectedDecisionMode(preset.decisionMode);
    setComparisonResult(null);
    setComparisonPaymentSummaries([]);
    setComparisonErrorMessage("");
  }

  function compareOffers() {
    if (comparisonTimeout.current) {
      clearTimeout(comparisonTimeout.current);
    }

    setIsComparing(true);
    setComparisonResult(null);
    setComparisonPaymentSummaries([]);
    setComparisonErrorMessage("");

    comparisonTimeout.current = setTimeout(() => {
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
            ? comparisonQuote.monthlyPayment *
              (1 + comparisonQuote.taxRate / 100)
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
      } catch (error) {
        setComparisonErrorMessage(
          error instanceof Error
            ? error.message
            : "Please check both offers and try again.",
        );
      } finally {
        setIsComparing(false);
        comparisonTimeout.current = null;
      }
    }, 650);
  }

  function scrollToComparisonElement(elementId: string): void {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function reviewVerdict(): void {
    scrollToComparisonElement("comparison-results");
  }

  function openNegotiationAssistant(): void {
    const assistantTrigger = document.getElementById(
      "negotiation-assistant-trigger",
    );

    if (assistantTrigger instanceof HTMLButtonElement) {
      assistantTrigger.click();
    }
  }

  function previewReport(): void {
    const reportToggle = document.getElementById(
      "lease-report-preview-toggle",
    );

    if (!(reportToggle instanceof HTMLButtonElement)) {
      return;
    }

    if (reportToggle.getAttribute("aria-expanded") !== "true") {
      reportToggle.click();
    }

    requestAnimationFrame(() => {
      scrollToComparisonElement("lease-report-preview");
    });
  }

  const hasComparisonResult = comparisonResult !== null && !isComparing;
  const guidedProgressSteps: GuidedProgressStep[] = [
    {
      number: 1,
      label: "Enter numbers",
      href: "#calculator",
      status: "complete",
    },
    {
      number: 2,
      label: "Compare offers",
      href: "#comparison-offers-inputs",
      status: hasComparisonResult ? "complete" : "active",
    },
    {
      number: 3,
      label: "Review verdict",
      href: "#comparison-results",
      status: hasComparisonResult ? "active" : "locked",
    },
    {
      number: 4,
      label: "Negotiate",
      href: "#negotiation-assistant-trigger",
      status: hasComparisonResult ? "available" : "locked",
    },
    {
      number: 5,
      label: "Generate report",
      href: "#lease-report-preview-toggle",
      status: hasComparisonResult ? "available" : "locked",
    },
  ];

  return (
    <section
      id="calculator"
      className="scroll-mt-32 bg-white px-6 py-16 sm:scroll-mt-24 sm:px-8 sm:py-24"
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

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:p-6">
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
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-6 text-base font-semibold text-white shadow-[0_10px_25px_-12px_rgba(13,148,136,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:w-auto"
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

      <div
        id="compare"
        className="mx-auto mt-20 w-full max-w-6xl scroll-mt-32 rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.65)] sm:scroll-mt-24 sm:p-8 lg:p-10"
      >
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

        <nav
          className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)]"
          aria-label="Lease comparison progress"
        >
          <div className="overflow-x-auto px-4 pb-4 pt-5 sm:px-6 sm:pb-5">
            <ol className="flex min-w-[720px] items-start lg:min-w-0">
              {guidedProgressSteps.map((step, index) => {
                const isLocked = step.status === "locked";
                const isComplete = step.status === "complete";
                const isActive = step.status === "active";
                const stepClasses = `group relative z-10 flex min-w-0 flex-col items-center rounded-xl px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2 ${
                  isLocked
                    ? "cursor-not-allowed text-slate-400"
                    : "text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-teal-800"
                }`;
                const stepContent = (
                  <>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition-colors ${
                        isComplete
                          ? "border-teal-700 bg-teal-700 text-white"
                          : isActive
                            ? "border-teal-700 bg-teal-50 text-teal-800 ring-4 ring-teal-100"
                            : isLocked
                              ? "border-slate-200 bg-slate-100 text-slate-400"
                              : "border-teal-200 bg-white text-teal-800 group-hover:border-teal-400 group-hover:bg-teal-50"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-4 w-4"
                          stroke="currentColor"
                          strokeWidth="2.25"
                        >
                          <path
                            d="m4.5 10.5 3.25 3.25 7.75-8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </span>
                    <span
                      className={`mt-3 text-xs font-semibold sm:text-sm ${
                        isActive ? "text-teal-900" : ""
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="sr-only">
                      {isComplete
                        ? " completed"
                        : isActive
                          ? " current step"
                          : isLocked
                            ? " locked until offers are compared"
                            : " available"}
                    </span>
                  </>
                );

                return (
                  <li
                    key={step.label}
                    className="relative flex min-w-0 flex-1 justify-center"
                  >
                    {index < guidedProgressSteps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-[1.4rem] h-px ${
                          isComplete ? "bg-teal-300" : "bg-slate-200"
                        }`}
                      />
                    ) : null}
                    {isLocked ? (
                      <div className={stepClasses} aria-disabled="true">
                        {stepContent}
                      </div>
                    ) : (
                      <a
                        href={step.href}
                        className={stepClasses}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {stepContent}
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-sm leading-6 text-slate-600 sm:px-6">
            Follow the flow from raw lease numbers to a final verdict,
            negotiation strategy, and shareable report.
          </p>
        </nav>

        <div className="mt-8 space-y-6">
          <div
            id="examples"
            className="scroll-mt-32 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-[0_12px_35px_-28px_rgba(13,148,136,0.8)] sm:scroll-mt-24 sm:p-5"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Try an example
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Load sample offers to see how AutoLease IQ compares more than
                  the advertised monthly payment.
                </p>
              </div>
              <span className="mt-1 shrink-0 text-xs font-medium text-slate-500">
                Samples only — not recommendations
              </span>
            </div>

            <div
              className="mt-4 grid gap-3 md:grid-cols-3"
              aria-label="Example lease comparisons"
            >
              {comparisonPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadComparisonPreset(preset)}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
                >
                  <span className="block text-sm font-semibold text-teal-800 transition-colors group-hover:text-teal-900">
                    {preset.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {preset.purpose}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            id="comparison-offers-inputs"
            className="grid scroll-mt-32 gap-5 sm:scroll-mt-24 lg:grid-cols-2"
          >
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

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.45)]">
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
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:ring-offset-2 active:scale-[0.97] ${
                      isSelected
                        ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 hover:shadow-sm"
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
            disabled={isComparing}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 text-base font-semibold text-white shadow-[0_10px_25px_-12px_rgba(13,148,136,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-[0_14px_30px_-12px_rgba(13,148,136,0.8)] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 sm:w-auto"
          >
            {isComparing ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                />
                Comparing offers…
              </>
            ) : (
              "Compare offers"
            )}
          </button>

          {comparisonErrorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {comparisonErrorMessage}
            </p>
          ) : null}

          <aside
            className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-2xl border border-teal-200/90 bg-white/95 p-3.5 shadow-[0_20px_55px_-25px_rgba(15,118,110,0.45)] backdrop-blur-md sm:bottom-4 sm:p-4"
            aria-label="Next step"
            aria-live="polite"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M4 10h12M11 5l5 5-5 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                    Next step
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {isComparing
                      ? "Comparing your offers and preparing the final verdict."
                      : hasComparisonResult
                        ? "Review the final verdict and key trade-offs, then prepare your dealer conversation."
                        : "Compare your offers to see the true cost and final verdict."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
                {!hasComparisonResult ? (
                  <button
                    type="button"
                    onClick={compareOffers}
                    disabled={isComparing}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0 sm:flex-none"
                  >
                    {isComparing ? "Comparing offers..." : "Compare offers"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={reviewVerdict}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-teal-700 px-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:flex-none"
                    >
                      Review verdict
                    </button>
                    <button
                      type="button"
                      onClick={openNegotiationAssistant}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-3.5 text-sm font-semibold text-teal-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:flex-none"
                    >
                      Open assistant
                    </button>
                    <button
                      type="button"
                      onClick={previewReport}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:flex-none"
                    >
                      Preview report
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>

          <section
            id="report"
            className="scroll-mt-32 border-t border-slate-200 pt-10 sm:scroll-mt-24"
            aria-labelledby="report-section-title"
          >
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
                  Report
                </p>
                <h2
                  id="report-section-title"
                  className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
                >
                  Your decision summary
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-500">
                Compare offers to unlock the final verdict, negotiation
                questions, and premium report preview.
              </p>
            </div>

            {isComparing ? (
              <div
                className="comparison-loading rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.5)] sm:p-6"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal-100 border-t-teal-700" />
                  <div>
                    <p className="font-semibold text-slate-950">
                      Comparing the full lease cost
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Normalizing payments, upfront cash, mileage, and fees.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-100/80"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {comparisonResult && !isComparing ? (
              <div
                id="comparison-results"
                className="comparison-results-reveal scroll-mt-32 sm:scroll-mt-24"
              >
                <ComparisonResults
                  comparisonResult={comparisonResult}
                  comparisonPaymentSummaries={comparisonPaymentSummaries}
                  selectedDecisionMode={selectedDecisionMode}
                />
              </div>
            ) : null}

            {!comparisonResult && !isComparing ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center sm:p-8">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
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
                    <path
                      d="M14 3.75v3h3M9.5 11h5M9.5 14.5h5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-950">
                  Your report will appear here
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Enter both offers, select what matters most, and choose
                  Compare offers to generate the full decision report.
                </p>
                <a
                  href="#examples"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2"
                >
                  View sample offers
                </a>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}
