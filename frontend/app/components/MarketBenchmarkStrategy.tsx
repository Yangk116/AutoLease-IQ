import type {
  MarketBenchmarkFinding,
  MarketDataSource,
  MarketDataSourceCategory,
  MarketDataSourceStatus,
} from "./dealReviewTypes";

const categoryLabels: Record<MarketDataSourceCategory, string> = {
  "listing-marketplace": "Listing marketplaces",
  "manufacturer-program": "Manufacturer lease programs",
  "valuation-guide": "Vehicle valuation guides",
  "dealer-fee-benchmark": "Dealer fee benchmarks",
  "user-history": "User saved comparison history",
};

const statusLabels: Record<MarketDataSourceStatus, string> = {
  "not-connected": "Not connected yet",
  planned: "Planned",
  connected: "Connected",
  unavailable: "Unavailable",
};

const plannedMarketDataSources: readonly MarketDataSource[] = [
  {
    id: "listing-marketplaces",
    label: "Listing marketplaces",
    category: "listing-marketplace",
    status: "planned",
    regionSupport: "Future source-specific regional coverage",
    dataExamples: [
      "Comparable vehicle listings",
      "Advertised selling prices",
      "Inventory availability",
    ],
    limitations: [
      "Market data not connected yet.",
      "This version does not use live market listings.",
    ],
  },
  {
    id: "manufacturer-lease-programs",
    label: "Manufacturer lease programs",
    category: "manufacturer-program",
    status: "planned",
    regionSupport: "Future brand and region coverage",
    dataExamples: [
      "Lease program terms",
      "Incentives and rebates",
      "Residual and money factor context",
    ],
    limitations: [
      "Manufacturer program data not connected yet.",
      "Current recommendations are based on entered numbers only.",
    ],
  },
  {
    id: "vehicle-valuation-guides",
    label: "Vehicle valuation guides",
    category: "valuation-guide",
    status: "planned",
    regionSupport: "Future guide and region coverage",
    dataExamples: [
      "Vehicle value context",
      "Residual and buyout context",
      "Trim and condition signals",
    ],
    limitations: [
      "Valuation guide data not connected yet.",
      "No vehicle value benchmark is calculated in this version.",
    ],
  },
  {
    id: "dealer-fee-benchmarks",
    label: "Dealer fee benchmarks",
    category: "dealer-fee-benchmark",
    status: "planned",
    regionSupport: "Future regional fee coverage",
    dataExamples: [
      "Common dealer fee categories",
      "Required charge separation",
      "Add-on and documentation fee context",
    ],
    limitations: [
      "Dealer fee benchmark data not connected yet.",
      "No regional fee range is calculated in this version.",
    ],
  },
  {
    id: "saved-comparison-history",
    label: "User saved comparison history",
    category: "user-history",
    status: "planned",
    regionSupport: "Future user-authorized comparison history",
    dataExamples: [
      "Past saved quote structures",
      "Previously reviewed negotiation targets",
      "User-entered offer history",
    ],
    limitations: [
      "Saved comparison benchmarks are not connected yet.",
      "This version does not compare against prior saved offers.",
    ],
  },
];

const benchmarkFindings: readonly MarketBenchmarkFinding[] = [
  {
    title: "Comparable listing position",
    status: "needs-data",
    valueLabel: null,
    explanation:
      "Market data not connected yet. Future version can compare this quote against verified listing sources.",
    requiredData: ["vehicle identity", "region", "verified listing source"],
  },
  {
    title: "Lease program alignment",
    status: "needs-data",
    valueLabel: null,
    explanation:
      "Manufacturer lease program data is not connected yet. Current recommendations are based on entered numbers only.",
    requiredData: ["manufacturer program", "term", "annual mileage"],
  },
  {
    title: "Fee benchmark context",
    status: "needs-data",
    valueLabel: null,
    explanation:
      "Dealer fee benchmark data is not connected yet. Future version can compare fees against verified sources.",
    requiredData: ["region", "itemized fees", "verified fee benchmark"],
  },
];

const commercialReviewFlow: readonly string[] = [
  "Parse quote",
  "Identify vehicle and region",
  "Compare against market and lease programs",
  "Generate AI deal score and negotiation plan",
];

function getSourceStatusClasses(status: MarketDataSourceStatus): string {
  if (status === "connected") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "unavailable") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (status === "planned") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-slate-200 bg-white text-slate-600";
}

export function MarketBenchmarkStrategy() {
  return (
    <section
      aria-labelledby="market-benchmark-strategy-title"
      className="rounded-lg border border-slate-200 bg-white p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Benchmark architecture
          </p>
          <h5
            id="market-benchmark-strategy-title"
            className="mt-1 text-sm font-bold text-slate-950"
          >
            Market Benchmark Strategy
          </h5>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            Future layer for comparing a dealer quote against listings, lease
            programs, incentives, and fee benchmarks.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[0.68rem] font-semibold text-slate-600">
          Not connected yet
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
        <p className="text-xs font-semibold text-amber-950">
          Market data not connected yet
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-900">
          This version does not use live market listings. Current
          recommendations are based on entered numbers only.
        </p>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-5">
        {plannedMarketDataSources.map((source) => (
          <article
            key={source.id}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex items-start justify-between gap-2 lg:block">
              <h6 className="text-xs font-semibold leading-5 text-slate-950">
                {categoryLabels[source.category]}
              </h6>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold lg:mt-2 lg:inline-flex ${getSourceStatusClasses(
                  source.status,
                )}`}
              >
                {statusLabels[source.status]}
              </span>
            </div>
            <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
              Not connected yet
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {source.regionSupport}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Future findings
          </p>
          <div className="mt-2 grid gap-2">
            {benchmarkFindings.map((finding) => (
              <div
                key={finding.title}
                className="rounded-md border border-slate-200 bg-white p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-950">
                    {finding.title}
                  </p>
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                    {finding.valueLabel ?? "Not connected"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {finding.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Future commercial review flow
          </p>
          <ol className="mt-2 grid gap-2">
            {commercialReviewFlow.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[0.65rem] font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-xs font-medium text-slate-800">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
