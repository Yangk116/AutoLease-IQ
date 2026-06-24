export type DealReviewConnectionStatus =
  | "not-connected"
  | "available"
  | "unavailable";

export type DealReviewRecommendation =
  | "accept"
  | "negotiate"
  | "walk-away"
  | "needs-more-data";

export type DealReviewConfidenceLevel =
  | "low"
  | "medium"
  | "high"
  | "not-available";

export type MarketDataSourceCategory =
  | "listing-marketplace"
  | "manufacturer-program"
  | "valuation-guide"
  | "dealer-fee-benchmark"
  | "user-history";

export type MarketDataSourceStatus =
  | "not-connected"
  | "planned"
  | "connected"
  | "unavailable";

export type MarketDataSource = {
  id: string;
  label: string;
  category: MarketDataSourceCategory;
  status: MarketDataSourceStatus;
  regionSupport: string;
  dataExamples: string[];
  limitations: string[];
};

export type VehicleMarketCondition =
  | "new"
  | "used"
  | "certified-pre-owned"
  | "unknown";

export type VehicleMarketQuery = {
  year: number | null;
  make: string;
  model: string;
  trim: string;
  region: string;
  postalCode: string;
  condition: VehicleMarketCondition | null;
  mileage: number | null;
  leaseTermMonths: number | null;
  annualMileage: number | null;
};

export type MarketBenchmarkFindingStatus =
  | "not-available"
  | "needs-data"
  | "available";

export type MarketBenchmarkFinding = {
  title: string;
  status: MarketBenchmarkFindingStatus;
  valueLabel: string | null;
  explanation: string;
  requiredData: string[];
};

export type DealReviewAmountRange = {
  low: number;
  high: number;
};

export type VehicleIdentity = {
  year: number | null;
  make: string;
  model: string;
  trim: string;
  region: string;
  cityOrPostalCode: string;
};

export type QuoteStructure = {
  msrp: number | null;
  sellingPrice: number | null;
  adjustedCapCost: number | null;
  dueOnDelivery: number | null;
  monthlyPayment: number | null;
  termMonths: number | null;
  annualMileage: number | null;
  apr: number | null;
  moneyFactor: number | null;
  residualValue: number | null;
  residualPercentage: number | null;
  dealerFees: number | null;
  leaseEndFee: number | null;
  rebates: number | null;
  incentives: number | null;
  addOns: string[];
};

export type MarketBenchmark = {
  status: DealReviewConnectionStatus;
  comparableListingCount: number | null;
  lowListingPrice: number | null;
  medianListingPrice: number | null;
  highListingPrice: number | null;
  estimatedMarketDiscountRange: DealReviewAmountRange | null;
  inventoryNotes: string[];
  dataSourceLabel: string | null;
  lastUpdated: string | null;
};

export type LeaseProgramBenchmark = {
  status: DealReviewConnectionStatus;
  advertisedApr: number | null;
  advertisedMoneyFactor: number | null;
  manufacturerIncentives: string[];
  residualAssumption: string | null;
  termMileageNotes: string | null;
  dataSourceLabel: string | null;
  lastUpdated: string | null;
};

export type AIReviewOutput = {
  status: DealReviewConnectionStatus;
  overallRating: string | null;
  strongestPart: string | null;
  weakestPart: string | null;
  negotiationTargets: string[];
  dealerQuestions: string[];
  recommendation: DealReviewRecommendation;
  confidenceLevel: DealReviewConfidenceLevel;
  dataLimitations: string[];
};

export type DealReviewData = {
  vehicle: VehicleIdentity;
  quote: QuoteStructure;
  marketBenchmark: MarketBenchmark;
  leaseProgramBenchmark: LeaseProgramBenchmark;
  aiReview: AIReviewOutput;
};
