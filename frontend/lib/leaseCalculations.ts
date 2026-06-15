export type LeaseQuoteInput = {
  downPayment: number;
  monthlyPayment: number;
  termMonths: number;
  annualMileage: number;
  dealerFees: number;
  leaseEndFee: number;
};

export type LeaseAnalysisResult = LeaseQuoteInput & {
  totalCost: number;
  trueMonthlyCost: number;
  totalAllowedKm: number;
  costPerKm: number;
  upfrontRatio: number;
};

export type LeaseComparisonResult = {
  results: LeaseAnalysisResult[];
  lowestTotalCost: LeaseAnalysisResult;
  lowestTrueMonthlyCost: LeaseAnalysisResult;
  lowestCostPerKm: LeaseAnalysisResult;
};

function validateLeaseQuote(input: LeaseQuoteInput) {
  if (input.termMonths <= 0) {
    throw new Error("termMonths must be greater than 0.");
  }

  if (input.annualMileage <= 0) {
    throw new Error("annualMileage must be greater than 0.");
  }

  if (input.downPayment < 0) {
    throw new Error("downPayment cannot be negative.");
  }

  if (input.monthlyPayment < 0) {
    throw new Error("monthlyPayment cannot be negative.");
  }

  if (input.dealerFees < 0) {
    throw new Error("dealerFees cannot be negative.");
  }

  if (input.leaseEndFee < 0) {
    throw new Error("leaseEndFee cannot be negative.");
  }
}

function findLowestResult(
  results: LeaseAnalysisResult[],
  field: "totalCost" | "trueMonthlyCost" | "costPerKm",
) {
  return results.reduce((lowest, current) => {
    return current[field] < lowest[field] ? current : lowest;
  });
}

export function analyzeLeaseQuote(input: LeaseQuoteInput): LeaseAnalysisResult {
  validateLeaseQuote(input);

  const totalCost =
    input.downPayment +
    input.monthlyPayment * input.termMonths +
    input.dealerFees +
    input.leaseEndFee;

  if (totalCost <= 0) {
    throw new Error("totalCost must be greater than 0.");
  }

  const trueMonthlyCost = totalCost / input.termMonths;
  const totalAllowedKm = (input.annualMileage * input.termMonths) / 12;
  const costPerKm = totalCost / totalAllowedKm;
  const upfrontRatio = (input.downPayment / totalCost) * 100;

  return {
    ...input,
    totalCost,
    trueMonthlyCost,
    totalAllowedKm,
    costPerKm,
    upfrontRatio,
  };
}

export function compareLeaseQuotes(
  inputs: LeaseQuoteInput[],
): LeaseComparisonResult {
  if (inputs.length === 0) {
    throw new Error("At least one lease quote is required.");
  }

  const results = inputs.map(analyzeLeaseQuote);

  return {
    results,
    lowestTotalCost: findLowestResult(results, "totalCost"),
    lowestTrueMonthlyCost: findLowestResult(results, "trueMonthlyCost"),
    lowestCostPerKm: findLowestResult(results, "costPerKm"),
  };
}
