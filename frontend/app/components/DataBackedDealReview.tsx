import type { DealReviewData, DealReviewConnectionStatus } from "./dealReviewTypes";
import { MarketBenchmarkStrategy } from "./MarketBenchmarkStrategy";

type ReviewLayer = {
  label: string;
  statusText: string;
  detail: string;
  status: DealReviewConnectionStatus | "available-from-inputs" | "planned";
};

const placeholderDealReviewData: DealReviewData = {
  vehicle: {
    year: null,
    make: "",
    model: "",
    trim: "",
    region: "",
    cityOrPostalCode: "",
  },
  quote: {
    msrp: null,
    sellingPrice: null,
    adjustedCapCost: null,
    dueOnDelivery: null,
    monthlyPayment: null,
    termMonths: null,
    annualMileage: null,
    apr: null,
    moneyFactor: null,
    residualValue: null,
    residualPercentage: null,
    dealerFees: null,
    leaseEndFee: null,
    rebates: null,
    incentives: null,
    addOns: [],
  },
  marketBenchmark: {
    status: "not-connected",
    comparableListingCount: null,
    lowListingPrice: null,
    medianListingPrice: null,
    highListingPrice: null,
    estimatedMarketDiscountRange: null,
    inventoryNotes: [],
    dataSourceLabel: null,
    lastUpdated: null,
  },
  leaseProgramBenchmark: {
    status: "not-connected",
    advertisedApr: null,
    advertisedMoneyFactor: null,
    manufacturerIncentives: [],
    residualAssumption: null,
    termMileageNotes: null,
    dataSourceLabel: null,
    lastUpdated: null,
  },
  aiReview: {
    status: "not-connected",
    overallRating: null,
    strongestPart: null,
    weakestPart: null,
    negotiationTargets: [],
    dealerQuestions: [],
    recommendation: "needs-more-data",
    confidenceLevel: "not-available",
    dataLimitations: [
      "Current analysis is based on numbers entered by the user.",
      "Market benchmark not connected yet.",
    ],
  },
};

const reviewLayers: ReviewLayer[] = [
  {
    label: "Quote data entered",
    statusText: "Available from your inputs",
    detail:
      "Current analysis is based on numbers entered by the user in this browser.",
    status: "available-from-inputs",
  },
  {
    label: "Market benchmark",
    statusText: "Not connected yet",
    detail:
      "This version does not use live market listings. Future version can compare this quote against verified sources.",
    status: placeholderDealReviewData.marketBenchmark.status,
  },
  {
    label: "Lease program benchmark",
    statusText: "Not connected yet",
    detail:
      "Future version can compare APR, money factor, incentives, and residual assumptions against lease programs.",
    status: placeholderDealReviewData.leaseProgramBenchmark.status,
  },
  {
    label: "AI advisor review",
    statusText: "Planned advisor layer",
    detail:
      "AI reasoning is not connected yet. Future review can turn verified data into negotiation guidance.",
    status: "planned",
  },
];

function getStatusClasses(status: ReviewLayer["status"]): string {
  if (status === "available-from-inputs") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  if (status === "planned") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (status === "available") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "unavailable") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-slate-200 bg-white text-slate-600";
}

export function DataBackedDealReview() {
  return (
    <section
      aria-labelledby="data-backed-deal-review-title"
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            Coming soon
          </p>
          <h4
            id="data-backed-deal-review-title"
            className="mt-1 text-base font-bold text-slate-950"
          >
            Data-backed Deal Review
          </h4>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Planned data-backed review for market listings, lease programs,
            quote parsing, and AI negotiation guidance.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          Future premium layer
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-teal-100 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          Current scope
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          Market data not connected yet. This version does not use live market
          listings, and current recommendations are based on entered numbers
          only.
        </p>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {reviewLayers.map((layer) => (
          <div
            key={layer.label}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">
                {layer.label}
              </p>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${getStatusClasses(
                  layer.status,
                )}`}
              >
                {layer.statusText}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {layer.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <MarketBenchmarkStrategy />
      </div>
    </section>
  );
}
