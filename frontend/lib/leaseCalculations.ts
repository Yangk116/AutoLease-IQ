export type LeaseQuoteInput = {
  vehicleName?: string;
  vehicleMsrp?: number;
  sellingPrice?: number;
  residualMsrp?: number;
  residualValue?: number;
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
  discountFromMsrp?: number;
  discountPercentage?: number;
  residualPercentage?: number;
  depreciationAmount?: number;
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

  if (input.vehicleMsrp !== undefined && input.vehicleMsrp < 0) {
    throw new Error("vehicleMsrp cannot be negative.");
  }

  if (input.sellingPrice !== undefined && input.sellingPrice < 0) {
    throw new Error("sellingPrice cannot be negative.");
  }

  if (input.residualMsrp !== undefined && input.residualMsrp < 0) {
    throw new Error("residualMsrp cannot be negative.");
  }

  if (input.residualValue !== undefined && input.residualValue < 0) {
    throw new Error("residualValue cannot be negative.");
  }

  if (
    input.vehicleMsrp !== undefined &&
    input.vehicleMsrp <= 0 &&
    (input.sellingPrice !== undefined ||
      (input.residualMsrp === undefined && input.residualValue !== undefined))
  ) {
    throw new Error("vehicleMsrp must be greater than 0.");
  }

  if (
    input.residualMsrp !== undefined &&
    input.residualValue !== undefined &&
    input.residualMsrp <= 0
  ) {
    throw new Error("residualMsrp must be greater than 0.");
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
  // Some quotes only show one MSRP; use vehicle MSRP as the residual basis fallback.
  const residualPercentageMsrp = input.residualMsrp ?? input.vehicleMsrp;
  const discountFromMsrp =
    input.vehicleMsrp !== undefined &&
    input.sellingPrice !== undefined &&
    input.vehicleMsrp > 0
      ? input.vehicleMsrp - input.sellingPrice
      : undefined;
  const discountPercentage =
    discountFromMsrp !== undefined && input.vehicleMsrp !== undefined
      ? (discountFromMsrp / input.vehicleMsrp) * 100
      : undefined;
  const residualPercentage =
    residualPercentageMsrp !== undefined &&
    input.residualValue !== undefined &&
    residualPercentageMsrp > 0
      ? (input.residualValue / residualPercentageMsrp) * 100
      : undefined;
  const depreciationAmount =
    input.sellingPrice !== undefined && input.residualValue !== undefined
      ? input.sellingPrice - input.residualValue
      : undefined;

  return {
    ...input,
    totalCost,
    trueMonthlyCost,
    totalAllowedKm,
    costPerKm,
    upfrontRatio,
    discountFromMsrp,
    discountPercentage,
    residualPercentage,
    depreciationAmount,
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
