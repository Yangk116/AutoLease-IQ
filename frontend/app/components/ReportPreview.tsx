import type {
  LeaseAnalysisResult,
  LeaseComparisonResult,
} from "@/lib/leaseCalculations";

import type {
  ComparisonPaymentSummary,
  ComparisonReportMetadata,
  DealerNegotiationItem,
  DecisionMode,
  FinalVerdict,
} from "./ComparisonResults";

type ReportPreviewProps = {
  comparisonResult: LeaseComparisonResult;
  comparisonPaymentSummaries: ComparisonPaymentSummary[];
  selectedDecisionMode: DecisionMode;
  metadata: ComparisonReportMetadata;
  finalVerdict: FinalVerdict | null;
  keyTakeaways: string[];
  negotiationItems: DealerNegotiationItem[];
};

type ComparisonMetric = {
  label: string;
  formatValue: (quote: LeaseAnalysisResult) => string;
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

const decisionModeLabels: Record<DecisionMode, string> = {
  "lowest-total-cost": "Lowest total cost",
  "lowest-monthly-budget": "Lowest monthly budget",
  "lowest-upfront-cash": "Lowest upfront cash",
  "best-mileage-value": "Best mileage value",
  "possible-future-buyout": "Possible future buyout",
};

const costSnapshotMetrics: ComparisonMetric[] = [
  {
    label: "True monthly cost",
    formatValue: (quote) => formatCurrency(quote.trueMonthlyCost),
  },
  {
    label: "Total lease cost",
    formatValue: (quote) => formatCurrency(quote.totalCost),
  },
  {
    label: "Cost per kilometre",
    formatValue: (quote) => `${formatCurrency(quote.costPerKm)} / km`,
  },
  {
    label: "Upfront cost ratio",
    formatValue: (quote) => formatPercentage(quote.upfrontRatio),
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

function getQuoteLabel(index: number) {
  return `Quote ${String.fromCharCode(65 + index)}`;
}

function getQuoteName(
  quote: LeaseAnalysisResult,
  index: number,
  paymentSummaries: ComparisonPaymentSummary[],
) {
  return (
    paymentSummaries[index]?.quoteName ||
    quote.vehicleName?.trim() ||
    getQuoteLabel(index)
  );
}

function getBestFitLabel(
  comparison: LeaseComparisonResult,
  finalVerdict: FinalVerdict | null,
) {
  if (!finalVerdict) {
    return "Not available";
  }

  if (!finalVerdict.winningQuote) {
    return finalVerdict.kind === "needs-data"
      ? "More data needed"
      : "Mixed result";
  }

  const quoteIndex = comparison.results.indexOf(finalVerdict.winningQuote);

  return quoteIndex >= 0 ? getQuoteLabel(quoteIndex) : "Winning quote";
}

function ReportSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-teal-700">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

export function ReportPreview({
  comparisonResult,
  comparisonPaymentSummaries,
  selectedDecisionMode,
  metadata,
  finalVerdict,
  keyTakeaways,
  negotiationItems,
}: ReportPreviewProps) {
  const hasVehicleContext = comparisonResult.results.some(
    (quote) =>
      quote.discountPercentage !== undefined ||
      quote.residualPercentage !== undefined ||
      quote.depreciationAmount !== undefined ||
      quote.residualValue !== undefined,
  );
  const hasBuyoutContext = comparisonResult.results.some(
    (quote) =>
      quote.residualPercentage !== undefined ||
      quote.residualValue !== undefined,
  );
  const bestFitLabel = getBestFitLabel(comparisonResult, finalVerdict);
  const offerComparisonRows = [
    {
      label: "Monthly payment used",
      getValue: (quote: LeaseAnalysisResult, index: number) =>
        formatCurrency(
          comparisonPaymentSummaries[index]?.monthlyPaymentUsed ??
            quote.monthlyPayment,
        ),
    },
    {
      label: "Down payment / due at signing",
      getValue: (quote: LeaseAnalysisResult) =>
        formatCurrency(quote.downPayment),
    },
    {
      label: "Term",
      getValue: (quote: LeaseAnalysisResult) =>
        `${quote.termMonths} months`,
    },
    {
      label: "Annual mileage",
      getValue: (quote: LeaseAnalysisResult) =>
        formatKilometres(quote.annualMileage),
    },
    {
      label: "Total allowed kilometres",
      getValue: (quote: LeaseAnalysisResult) =>
        formatKilometres(quote.totalAllowedKm),
    },
    {
      label: "Dealer fees",
      getValue: (quote: LeaseAnalysisResult) =>
        formatCurrency(quote.dealerFees),
    },
    {
      label: "Lease-end fee",
      getValue: (quote: LeaseAnalysisResult) =>
        formatCurrency(quote.leaseEndFee),
    },
  ];

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.75)] sm:rounded-[1.75rem]">
      <header className="report-print-header border-b border-slate-200 bg-slate-950 px-4 py-6 text-white sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400 font-black text-slate-950 shadow-lg shadow-teal-950/20 print:bg-white print:ring-1 print:ring-slate-300">
                IQ
              </span>
              <span className="text-sm font-semibold tracking-wide text-teal-100">
                AutoLease IQ
              </span>
            </div>
            <h2 className="mt-5 max-w-xl text-2xl font-bold tracking-tight sm:mt-6 sm:text-4xl">
              Lease Comparison Report
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Generated from the numbers entered by the user.
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[30rem]">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3">
              <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-teal-200">
                Generated
              </dt>
              <dd className="mt-1 font-semibold text-white">
                {metadata.generatedAtLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3">
              <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-teal-200">
                Report ID
              </dt>
              <dd className="mt-1 font-semibold text-white">
                {metadata.reportId}
              </dd>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3">
              <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-teal-200">
                Decision mode
              </dt>
              <dd className="mt-1 font-semibold text-white">
                {decisionModeLabels[selectedDecisionMode]}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="space-y-4 p-3 sm:space-y-6 sm:p-6 lg:p-8">
        <section className="report-print-card overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-[0_18px_45px_-34px_rgba(13,148,136,0.8)]">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="bg-gradient-to-br from-teal-700 to-teal-900 p-5 text-white sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">
                Executive summary
              </p>
              <p className="mt-5 text-sm text-teal-100">
                Best fit for your selected goal
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {bestFitLabel}
              </p>
              <span className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Goal: {decisionModeLabels[selectedDecisionMode]}
              </span>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-lg font-bold leading-7 text-slate-950">
                {finalVerdict?.headline ??
                  "A final verdict is not available for this comparison."}
              </p>
              {finalVerdict?.reasons.length ? (
                <ul className="mt-4 space-y-2.5">
                  {finalVerdict.reasons.slice(0, 3).map((reason) => (
                    <li
                      key={reason}
                      className="flex gap-2.5 text-sm leading-6 text-slate-600"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600"
                      />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        <section className="report-print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.65)] sm:p-6">
          <ReportSectionHeading
            eyebrow="Financial overview"
            title="Cost Snapshot"
            description="The four metrics that best expose the full lease structure."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {costSnapshotMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-slate-200">
                  {comparisonResult.results.slice(0, 2).map((quote, index) => (
                    <div
                      key={`${metric.label}-${getQuoteLabel(index)}`}
                      className={
                        index === 0
                          ? "border-b border-slate-200 pb-3 sm:border-b-0 sm:pb-0 sm:pr-3"
                          : "sm:pl-3"
                      }
                    >
                      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-teal-700">
                        {getQuoteLabel(index)}
                      </p>
                      <p className="mt-1 break-words text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                        {metric.formatValue(quote)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="report-print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.65)] sm:p-6">
          <ReportSectionHeading
            eyebrow="Offer details"
            title="Offer Comparison"
          />
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-2 bg-slate-950 text-white sm:grid-cols-[0.9fr_1fr_1fr]">
              <div className="hidden p-3 text-xs font-semibold uppercase tracking-wide text-slate-300 sm:block sm:p-4">
                Detail
              </div>
              {comparisonResult.results.slice(0, 2).map((quote, index) => (
                <div
                  key={`offer-heading-${getQuoteLabel(index)}`}
                  className="border-l border-white/10 p-3 sm:p-4"
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-teal-300">
                    {getQuoteLabel(index)}
                  </p>
                  <p className="mt-1 break-words text-xs font-semibold sm:text-sm">
                    {getQuoteName(
                      quote,
                      index,
                      comparisonPaymentSummaries,
                    )}
                  </p>
                </div>
              ))}
            </div>
            {offerComparisonRows.map((row, rowIndex) => (
              <div
                key={row.label}
                className={`grid grid-cols-2 sm:grid-cols-[0.9fr_1fr_1fr] ${
                  rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/80"
                }`}
              >
                <div className="col-span-2 border-t border-slate-200 px-3 pb-1 pt-3 text-xs font-medium leading-5 text-slate-500 sm:col-span-1 sm:p-4 sm:text-sm">
                  {row.label}
                </div>
                {comparisonResult.results.slice(0, 2).map((quote, index) => (
                  <div
                    key={`${row.label}-${getQuoteLabel(index)}`}
                    className={`min-w-0 break-words border-t border-slate-200 p-3 pt-1 text-xs font-semibold leading-5 text-slate-900 sm:border-l sm:p-4 sm:text-sm ${
                      index === 0 ? "border-r sm:border-r-0" : ""
                    }`}
                  >
                    <span className="mb-0.5 block text-[0.625rem] font-bold uppercase tracking-wider text-teal-700 sm:hidden">
                      {getQuoteLabel(index)}
                    </span>
                    {row.getValue(quote, index)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {hasVehicleContext ? (
          <section className="report-print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.65)] sm:p-6">
            <ReportSectionHeading
              eyebrow="Vehicle economics"
              title="Vehicle / Buyout Context"
              description="Optional vehicle details that can explain payment and future purchase trade-offs."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {comparisonResult.results.slice(0, 2).map((quote, index) => (
                <div
                  key={`vehicle-context-${getQuoteLabel(index)}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    {getQuoteLabel(index)}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {getQuoteName(
                      quote,
                      index,
                      comparisonPaymentSummaries,
                    )}
                  </p>
                  <dl className="mt-4 space-y-2.5 text-sm">
                    {quote.discountPercentage !== undefined ? (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">Discount percentage</dt>
                        <dd className="font-semibold text-slate-900">
                          {formatPercentage(quote.discountPercentage)}
                        </dd>
                      </div>
                    ) : null}
                    {quote.residualPercentage !== undefined ? (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">Residual percentage</dt>
                        <dd className="font-semibold text-slate-900">
                          {formatPercentage(quote.residualPercentage)}
                        </dd>
                      </div>
                    ) : null}
                    {quote.residualValue !== undefined ? (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">Residual value</dt>
                        <dd className="font-semibold text-slate-900">
                          {formatCurrency(quote.residualValue)}
                        </dd>
                      </div>
                    ) : null}
                    {quote.depreciationAmount !== undefined ? (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-slate-500">Depreciation amount</dt>
                        <dd className="font-semibold text-slate-900">
                          {formatCurrency(quote.depreciationAmount)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ))}
            </div>
            {hasBuyoutContext ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-black text-amber-900"
                >
                  !
                </span>
                <p className="text-sm leading-6 text-amber-950">
                  A higher residual may lower lease payments but can increase
                  the future purchase price. Confirm the exact buyout amount,
                  taxes, and lease-end fees with the dealer.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="report-print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.65)] sm:p-6">
            <ReportSectionHeading
              eyebrow="Decision summary"
              title="Key Takeaways"
            />
            <ul className="mt-5 space-y-3">
              {keyTakeaways.slice(0, 5).map((takeaway, index) => (
                <li key={takeaway} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-slate-600">
                    {takeaway}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="report-print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.65)] sm:p-6">
            <ReportSectionHeading
              eyebrow="Dealer conversation"
              title="Negotiation Assistant"
              description="The highest-priority questions for these offers."
            />
            <div className="mt-5 space-y-3">
              {negotiationItems.slice(0, 4).map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <h4 className="text-sm font-bold text-slate-950">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.whyItMatters}
                  </p>
                  <p className="mt-3 border-l-2 border-teal-500 pl-3 text-sm font-medium leading-6 text-slate-800">
                    {item.suggestedQuestion}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="report-print-card border-t border-slate-200 px-1 pt-5 text-center text-xs leading-5 text-slate-400">
          Disclaimer: this report is based only on the numbers entered in this
          browser. It is not financial advice, a lender quote, or a guarantee of
          dealer pricing. Confirm taxes, fees, incentives, buyout terms, and
          contract language before signing.
        </footer>
      </div>
    </article>
  );
}
