export type PaymentFrequency = "monthly" | "biweekly" | "weekly";

export type PaymentTaxTreatment =
  | { status: "included" }
  | { status: "excluded"; applicableRate?: number }
  | { status: "unknown" };

export type ValidatedPaymentSchedule = {
  paymentCount: number;
  source: "lease-contract" | "lender-schedule";
  validated: true;
};

export type LeasePayment = {
  amount: number;
  frequency: PaymentFrequency;
  paymentCount?: number;
  schedule?: ValidatedPaymentSchedule;
  tax: PaymentTaxTreatment;
};

export type FirstPaymentAtSigning =
  | "included-in-due-at-signing"
  | "paid-separately"
  | "unknown";

export type UpfrontPaymentTreatment =
  | "included-in-due-at-signing"
  | "paid-separately";

export type FeePaymentTreatment =
  | UpfrontPaymentTreatment
  | "capitalized"
  | "included-in-payments";

export type CashDown = {
  amount: number;
  paymentTreatment: UpfrontPaymentTreatment;
};

export type LeaseFee = {
  name: string;
  amount: number;
  category: "acquisition" | "dealer" | "registration" | "other";
  paymentTreatment: FeePaymentTreatment;
};

export type RefundableDeposit = {
  name: string;
  amount: number;
  paymentTreatment: UpfrontPaymentTreatment;
};

export type DueAtSigning = {
  totalAmount: number;
  breakdownComplete: boolean;
};

export type RebateOrIncentive = {
  name: string;
  amount: number;
  source: "manufacturer" | "government" | "other";
  application: "capitalized-cost-reduction" | "cash" | "unknown";
};

export type LeaseEndScenario = "return" | "buyout" | "unknown";

/**
 * A fixed amount written into the lease contract. Applicability still matters:
 * a disposition fee can be fixed but payable only when the vehicle is returned.
 * Usage-dependent mileage and wear amounts belong in ConditionalLeaseEndCost.
 */
export type ContractualLeaseEndFee = {
  name: string;
  amount: number;
  applicability:
    | "all-end-scenarios"
    | "return-only"
    | "buyout-only"
    | "unknown";
};

/**
 * A usage- or condition-dependent amount. These values are disclosed but never
 * automatically included in the non-refundable lease cost.
 */
export type ConditionalLeaseEndCost =
  | {
      type: "excess-kilometres";
      ratePerKilometre: number;
      includedKilometres?: number;
    }
  | { type: "excess-wear"; estimatedAmount?: number }
  | { type: "other"; name: string; estimatedAmount?: number };

export type LeaseFinancing =
  | {
      methodology: "standard-money-factor";
      moneyFactor: number;
      compatibleWithStandardFormula: boolean;
    }
  | { methodology: "apr"; aprPercent: number }
  | { methodology: "unknown" };

export type SingleLeaseAnalysisInput = {
  payment: LeasePayment;
  termMonths: number;
  annualKilometres: number;

  dueAtSigning?: DueAtSigning;
  firstPaymentAtSigning?: FirstPaymentAtSigning;
  cashDown?: CashDown;
  upfrontFees?: readonly LeaseFee[];
  refundableDeposits?: readonly RefundableDeposit[];
  upfrontAmountsComplete?: boolean;

  msrp?: number;
  sellingPrice?: number;
  residualValue?: number;
  dealerDiscount?: number;
  rebatesAndIncentives?: readonly RebateOrIncentive[];
  capitalizedItemsComplete?: boolean;
  financing?: LeaseFinancing;

  leaseEndFees?: readonly ContractualLeaseEndFee[];
  leaseEndFeesComplete?: boolean;
  leaseEndScenario?: LeaseEndScenario;
  conditionalLeaseEndCosts?: readonly ConditionalLeaseEndCost[];
};

export type CalculationStatus = "confirmed" | "estimated" | "unavailable";

export type CalculationQuality = {
  status: CalculationStatus;
  missingFields: string[];
  assumptions: string[];
  warnings: string[];
};

export type PaymentBasedCalculation = {
  quality: CalculationQuality;
  dealerAdvertisedPayment: number;
  paymentFrequency: PaymentFrequency;
  paymentAmountUsedForCalculation?: number;
  paymentCount?: number;
  scheduledPaymentsTotal?: number;
  separatelyPaidNonRefundableTotal?: number;
  totalKnownNonRefundableLeaseCost?: number;
  effectiveMonthlyCost?: number;
  cashRequiredAtDelivery?: number;
  refundableCashTiedUp: number;
  /** Fixed contractual fees applicable to the entered lease-end scenario. */
  contractualLeaseEndFeesTotal: number;
  /** Known fixed fees that do not apply to the entered lease-end scenario. */
  excludedContractualLeaseEndFeesTotal: number;
  /** Fixed fees omitted from cost because their applicability is unresolved. */
  unresolvedContractualLeaseEndFeesTotal: number;
  totalAllowedKilometres: number;
  conditionalLeaseEndCosts: readonly ConditionalLeaseEndCost[];
};

export type PricingBreakdown = {
  msrp?: number;
  sellingPrice?: number;
  msrpToSellingPriceDifference?: number;
  dealerDiscount?: number;
  manufacturerRebatesTotal?: number;
  otherIncentivesTotal?: number;
  residualValue?: number;
  residualPercentage?: number;
};

export type AdvancedFinanceCalculation = {
  quality: CalculationQuality;
  grossCapitalizedCost?: number;
  adjustedCapitalizedCost?: number;
  residualValue?: number;
  totalDepreciationCharge?: number;
  monthlyDepreciationCharge?: number;
  monthlyFinanceCharge?: number;
  totalFinanceCharge?: number;
  reconstructedBaseMonthlyPayment?: number;
  approximateAprEquivalentPercent?: number;
};

export type SingleLeaseAnalysisResult = {
  paymentBased: PaymentBasedCalculation;
  pricing: PricingBreakdown;
  advancedFinance: AdvancedFinanceCalculation;
};

const MONEY_TOLERANCE = 0.01;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function requireFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite, non-negative amount.`);
  }
}

function validateInput(input: SingleLeaseAnalysisInput): void {
  if (!Number.isFinite(input.termMonths) || input.termMonths <= 0) {
    throw new Error("termMonths must be greater than 0.");
  }
  if (!Number.isFinite(input.annualKilometres) || input.annualKilometres <= 0) {
    throw new Error("annualKilometres must be greater than 0.");
  }

  requireFiniteNonNegative(input.payment.amount, "payment.amount");

  if (input.payment.paymentCount !== undefined) {
    if (
      !Number.isInteger(input.payment.paymentCount) ||
      input.payment.paymentCount <= 0
    ) {
      throw new Error("payment.paymentCount must be a positive integer.");
    }
  }
  if (input.payment.schedule !== undefined) {
    if (
      !Number.isInteger(input.payment.schedule.paymentCount) ||
      input.payment.schedule.paymentCount <= 0
    ) {
      throw new Error("payment.schedule.paymentCount must be a positive integer.");
    }
  }
  if (
    input.payment.paymentCount !== undefined &&
    input.payment.schedule !== undefined &&
    input.payment.paymentCount !== input.payment.schedule.paymentCount
  ) {
    throw new Error(
      "payment.paymentCount must match payment.schedule.paymentCount.",
    );
  }

  if (
    input.payment.tax.status === "excluded" &&
    input.payment.tax.applicableRate !== undefined
  ) {
    const rate = input.payment.tax.applicableRate;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new Error("payment.tax.applicableRate must be between 0 and 1.");
    }
  }

  if (input.dueAtSigning !== undefined) {
    requireFiniteNonNegative(
      input.dueAtSigning.totalAmount,
      "dueAtSigning.totalAmount",
    );
  }
  if (input.cashDown !== undefined) {
    requireFiniteNonNegative(input.cashDown.amount, "cashDown.amount");
  }

  for (const [index, fee] of (input.upfrontFees ?? []).entries()) {
    requireFiniteNonNegative(fee.amount, `upfrontFees[${index}].amount`);
  }
  for (const [index, deposit] of (
    input.refundableDeposits ?? []
  ).entries()) {
    requireFiniteNonNegative(
      deposit.amount,
      `refundableDeposits[${index}].amount`,
    );
  }
  for (const field of [
    "msrp",
    "sellingPrice",
    "residualValue",
    "dealerDiscount",
  ] as const) {
    const value = input[field];
    if (value !== undefined) {
      requireFiniteNonNegative(value, field);
    }
  }
  for (const [index, incentive] of (
    input.rebatesAndIncentives ?? []
  ).entries()) {
    requireFiniteNonNegative(
      incentive.amount,
      `rebatesAndIncentives[${index}].amount`,
    );
  }
  for (const [index, fee] of (input.leaseEndFees ?? []).entries()) {
    requireFiniteNonNegative(fee.amount, `leaseEndFees[${index}].amount`);
  }
  for (const [index, cost] of (
    input.conditionalLeaseEndCosts ?? []
  ).entries()) {
    if (cost.type === "excess-kilometres") {
      requireFiniteNonNegative(
        cost.ratePerKilometre,
        `conditionalLeaseEndCosts[${index}].ratePerKilometre`,
      );
      if (cost.includedKilometres !== undefined) {
        requireFiniteNonNegative(
          cost.includedKilometres,
          `conditionalLeaseEndCosts[${index}].includedKilometres`,
        );
      }
    } else if (cost.estimatedAmount !== undefined) {
      requireFiniteNonNegative(
        cost.estimatedAmount,
        `conditionalLeaseEndCosts[${index}].estimatedAmount`,
      );
    }
  }

  if (input.financing?.methodology === "standard-money-factor") {
    requireFiniteNonNegative(input.financing.moneyFactor, "financing.moneyFactor");
  } else if (input.financing?.methodology === "apr") {
    requireFiniteNonNegative(input.financing.aprPercent, "financing.aprPercent");
  }
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function sum(values: readonly number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function getPaymentCount(
  input: SingleLeaseAnalysisInput,
  quality: CalculationQuality,
): number | undefined {
  if (input.payment.paymentCount !== undefined) {
    return input.payment.paymentCount;
  }
  if (input.payment.schedule !== undefined) {
    quality.assumptions.push(
      `Used the validated ${input.payment.schedule.source} payment schedule.`,
    );
    return input.payment.schedule.paymentCount;
  }
  if (
    input.payment.frequency === "monthly" &&
    Number.isInteger(input.termMonths)
  ) {
    quality.assumptions.push(
      "Assumed one scheduled monthly payment for each whole lease-term month.",
    );
    return input.termMonths;
  }

  quality.status = "unavailable";
  quality.missingFields.push("payment.paymentCountOrValidatedSchedule");
  quality.warnings.push(
    "Weekly and biweekly payment counts are not inferred from a month-based term.",
  );
  return undefined;
}

function getPaymentWithTax(
  input: SingleLeaseAnalysisInput,
  quality: CalculationQuality,
): number | undefined {
  if (input.payment.tax.status === "included") {
    return roundMoney(input.payment.amount);
  }
  if (input.payment.tax.status === "excluded") {
    if (input.payment.tax.applicableRate === undefined) {
      quality.status = "unavailable";
      quality.missingFields.push("payment.tax.applicableRate");
      quality.warnings.push(
        "The payment excludes tax, but no applicable tax rate was entered.",
      );
      return undefined;
    }
    return roundMoney(
      input.payment.amount * (1 + input.payment.tax.applicableRate),
    );
  }

  if (quality.status !== "unavailable") {
    quality.status = "estimated";
  }
  quality.missingFields.push("payment.tax.status");
  quality.assumptions.push(
    "Treated the advertised payment amount as the amount payable because tax inclusion is unknown.",
  );
  quality.warnings.push(
    "The scheduled-payment total may exclude applicable payment tax.",
  );
  return roundMoney(input.payment.amount);
}

function classifyContractualLeaseEndFees(
  input: SingleLeaseAnalysisInput,
  quality: CalculationQuality,
): {
  applicableTotal: number;
  excludedTotal: number;
  unresolvedTotal: number;
} {
  const applicable: number[] = [];
  const excluded: number[] = [];
  const unresolved: number[] = [];
  const scenario = input.leaseEndScenario ?? "unknown";

  for (const [index, fee] of (input.leaseEndFees ?? []).entries()) {
    if (fee.applicability === "all-end-scenarios") {
      applicable.push(fee.amount);
      continue;
    }
    if (fee.applicability === "unknown") {
      unresolved.push(fee.amount);
      pushUnique(
        quality.missingFields,
        `leaseEndFees[${index}].applicability`,
      );
      continue;
    }
    if (scenario === "unknown") {
      unresolved.push(fee.amount);
      pushUnique(quality.missingFields, "leaseEndScenario");
      continue;
    }

    const applies =
      (fee.applicability === "return-only" && scenario === "return") ||
      (fee.applicability === "buyout-only" && scenario === "buyout");
    (applies ? applicable : excluded).push(fee.amount);
  }

  if (unresolved.length > 0) {
    if (quality.status !== "unavailable") {
      quality.status = "estimated";
    }
    quality.warnings.push(
      "Lease-end fees with unresolved applicability are reported separately and excluded from lease cost.",
    );
  }

  return {
    applicableTotal: sum(applicable),
    excludedTotal: sum(excluded),
    unresolvedTotal: sum(unresolved),
  };
}

function calculatePaymentBased(
  input: SingleLeaseAnalysisInput,
): PaymentBasedCalculation {
  const quality: CalculationQuality = {
    status: "confirmed",
    missingFields: [],
    assumptions: [],
    warnings: [],
  };
  const fees = input.upfrontFees ?? [];
  const deposits = input.refundableDeposits ?? [];
  const paymentCount = getPaymentCount(input, quality);
  const paymentWithTax = getPaymentWithTax(input, quality);
  const firstPayment = input.firstPaymentAtSigning ?? "unknown";

  if (firstPayment === "unknown") {
    if (quality.status !== "unavailable") {
      quality.status = "estimated";
    }
    pushUnique(quality.missingFields, "firstPaymentAtSigning");
    quality.warnings.push(
      "First-payment treatment is unresolved; the estimate does not make that treatment confirmed.",
    );
  }

  if (input.upfrontAmountsComplete !== true) {
    if (quality.status !== "unavailable") {
      quality.status = "estimated";
    }
    quality.missingFields.push("upfrontAmountsComplete");
    quality.assumptions.push(
      "Assumed no unentered upfront amounts exist beyond the supplied values.",
    );
  }
  if (input.leaseEndFeesComplete !== true) {
    if (quality.status !== "unavailable") {
      quality.status = "estimated";
    }
    quality.missingFields.push("leaseEndFeesComplete");
    quality.assumptions.push(
      "Assumed no unentered applicable contractual lease-end fees exist.",
    );
  }

  const refundableCashTiedUp = sum(deposits.map(({ amount }) => amount));
  const leaseEndFeeClassification = classifyContractualLeaseEndFees(
    input,
    quality,
  );
  const contractualLeaseEndFeesTotal =
    leaseEndFeeClassification.applicableTotal;
  const dueCashDown =
    input.cashDown?.paymentTreatment === "included-in-due-at-signing"
      ? input.cashDown.amount
      : 0;
  const separateCashDown =
    input.cashDown?.paymentTreatment === "paid-separately"
      ? input.cashDown.amount
      : 0;
  const dueFees = sum(
    fees
      .filter(
        ({ paymentTreatment }) =>
          paymentTreatment === "included-in-due-at-signing",
      )
      .map(({ amount }) => amount),
  );
  const separateFees = sum(
    fees
      .filter(
        ({ paymentTreatment }) => paymentTreatment === "paid-separately",
      )
      .map(({ amount }) => amount),
  );
  const dueDeposits = sum(
    deposits
      .filter(
        ({ paymentTreatment }) =>
          paymentTreatment === "included-in-due-at-signing",
      )
      .map(({ amount }) => amount),
  );
  const separateDeposits = sum(
    deposits
      .filter(
        ({ paymentTreatment }) => paymentTreatment === "paid-separately",
      )
      .map(({ amount }) => amount),
  );

  const knownDueBreakdownWithoutFirst = sum([
    dueCashDown,
    dueFees,
    dueDeposits,
  ]);
  const confirmedKnownDueBreakdown = sum([
    knownDueBreakdownWithoutFirst,
    firstPayment === "included-in-due-at-signing"
      ? (paymentWithTax ?? 0)
      : 0,
  ]);

  let firstPaymentTreatedAsIncluded =
    firstPayment === "included-in-due-at-signing";
  if (firstPayment === "unknown") {
    const canFitWithinEnteredDue =
      input.dueAtSigning === undefined ||
      (paymentWithTax !== undefined &&
        knownDueBreakdownWithoutFirst + paymentWithTax -
          input.dueAtSigning.totalAmount <=
          MONEY_TOLERANCE);

    firstPaymentTreatedAsIncluded = canFitWithinEnteredDue;
    if (paymentWithTax === undefined) {
      quality.assumptions.push(
        "Could not provisionally classify the first payment because the all-in payment amount is unavailable.",
      );
    } else if (canFitWithinEnteredDue) {
      quality.assumptions.push(
        "Provisionally treated the first payment as included in due-at-signing because it fits within the entered amount; this is not confirmation of its contractual treatment.",
      );
    } else {
      quality.assumptions.push(
        "Provisionally treated the first payment as paid separately because including it would exceed the entered due-at-signing amount; this is not confirmation of its contractual treatment.",
      );
    }
  }

  const estimatedDueBreakdown = sum([
    knownDueBreakdownWithoutFirst,
    firstPaymentTreatedAsIncluded ? (paymentWithTax ?? 0) : 0,
  ]);

  if (input.dueAtSigning !== undefined) {
    if (
      confirmedKnownDueBreakdown - input.dueAtSigning.totalAmount >
      MONEY_TOLERANCE
    ) {
      throw new Error(
        "Known due-at-signing components exceed dueAtSigning.totalAmount.",
      );
    }
    if (
      input.dueAtSigning.breakdownComplete &&
      firstPayment !== "unknown" &&
      (firstPayment !== "included-in-due-at-signing" ||
        paymentWithTax !== undefined) &&
      Math.abs(confirmedKnownDueBreakdown - input.dueAtSigning.totalAmount) >
        MONEY_TOLERANCE
    ) {
      throw new Error(
        "A complete due-at-signing breakdown must equal dueAtSigning.totalAmount.",
      );
    }
    if (!input.dueAtSigning.breakdownComplete) {
      if (quality.status !== "unavailable") {
        quality.status = "estimated";
      }
      quality.missingFields.push("dueAtSigning.completeBreakdown");
      quality.assumptions.push(
        "Treated the unexplained due-at-signing remainder as non-refundable; unlisted refundable amounts cannot be inferred.",
      );
    }
  }

  let dueNonRefundable: number;
  let dueAtSigningCash: number;
  if (input.dueAtSigning !== undefined) {
    dueAtSigningCash = input.dueAtSigning.totalAmount;
    dueNonRefundable = roundMoney(
      input.dueAtSigning.totalAmount -
        dueDeposits -
        (firstPaymentTreatedAsIncluded ? (paymentWithTax ?? 0) : 0),
    );
  } else {
    dueAtSigningCash = estimatedDueBreakdown;
    dueNonRefundable = sum([dueCashDown, dueFees]);
  }

  if (dueNonRefundable < -MONEY_TOLERANCE) {
    throw new Error(
      "Refundable deposits and the included first payment exceed dueAtSigning.totalAmount.",
    );
  }
  dueNonRefundable = Math.max(0, dueNonRefundable);

  const separatelyPaidNonRefundableTotal = sum([
    dueNonRefundable,
    separateCashDown,
    separateFees,
    contractualLeaseEndFeesTotal,
  ]);
  const separatelyPaidDeliveryCash = sum([
    separateCashDown,
    separateFees,
    separateDeposits,
    firstPayment === "paid-separately" ||
    (firstPayment === "unknown" && !firstPaymentTreatedAsIncluded)
      ? (paymentWithTax ?? 0)
      : 0,
  ]);
  const firstPaymentRequiresSeparateCash =
    firstPayment === "paid-separately" ||
    (firstPayment === "unknown" && !firstPaymentTreatedAsIncluded);
  const cashRequiredAtDelivery =
    paymentWithTax === undefined && firstPaymentRequiresSeparateCash
      ? undefined
      : sum([dueAtSigningCash, separatelyPaidDeliveryCash]);

  const scheduledPaymentsTotal =
    paymentCount !== undefined && paymentWithTax !== undefined
      ? roundMoney(paymentCount * paymentWithTax)
      : undefined;
  const totalKnownNonRefundableLeaseCost =
    scheduledPaymentsTotal === undefined
      ? undefined
      : sum([scheduledPaymentsTotal, separatelyPaidNonRefundableTotal]);
  const effectiveMonthlyCost =
    totalKnownNonRefundableLeaseCost === undefined
      ? undefined
      : roundMoney(totalKnownNonRefundableLeaseCost / input.termMonths);

  return {
    quality,
    dealerAdvertisedPayment: input.payment.amount,
    paymentFrequency: input.payment.frequency,
    paymentAmountUsedForCalculation: paymentWithTax,
    paymentCount,
    scheduledPaymentsTotal,
    separatelyPaidNonRefundableTotal,
    totalKnownNonRefundableLeaseCost,
    effectiveMonthlyCost,
    cashRequiredAtDelivery,
    refundableCashTiedUp,
    contractualLeaseEndFeesTotal,
    excludedContractualLeaseEndFeesTotal:
      leaseEndFeeClassification.excludedTotal,
    unresolvedContractualLeaseEndFeesTotal:
      leaseEndFeeClassification.unresolvedTotal,
    totalAllowedKilometres: roundMoney(
      (input.annualKilometres * input.termMonths) / 12,
    ),
    conditionalLeaseEndCosts: input.conditionalLeaseEndCosts ?? [],
  };
}

function calculatePricing(input: SingleLeaseAnalysisInput): PricingBreakdown {
  const manufacturerRebatesTotal =
    input.rebatesAndIncentives === undefined
      ? undefined
      : sum(
          input.rebatesAndIncentives
            .filter(({ source }) => source === "manufacturer")
            .map(({ amount }) => amount),
        );
  const otherIncentivesTotal =
    input.rebatesAndIncentives === undefined
      ? undefined
      : sum(
          input.rebatesAndIncentives
            .filter(({ source }) => source !== "manufacturer")
            .map(({ amount }) => amount),
        );
  const msrpToSellingPriceDifference =
    input.msrp !== undefined && input.sellingPrice !== undefined
      ? roundMoney(input.msrp - input.sellingPrice)
      : undefined;
  const residualPercentage =
    input.msrp !== undefined && input.msrp > 0 && input.residualValue !== undefined
      ? (input.residualValue / input.msrp) * 100
      : undefined;

  return {
    msrp: input.msrp,
    sellingPrice: input.sellingPrice,
    msrpToSellingPriceDifference,
    dealerDiscount: input.dealerDiscount,
    manufacturerRebatesTotal,
    otherIncentivesTotal,
    residualValue: input.residualValue,
    residualPercentage,
  };
}

function calculateAdvancedFinance(
  input: SingleLeaseAnalysisInput,
): AdvancedFinanceCalculation {
  const quality: CalculationQuality = {
    status: "unavailable",
    missingFields: [],
    assumptions: [],
    warnings: [
      "Reconstructed finance charges are informational and are never added to payment-based lease cost.",
    ],
  };

  if (input.sellingPrice === undefined) {
    quality.missingFields.push("sellingPrice");
  }
  if (input.residualValue === undefined) {
    quality.missingFields.push("residualValue");
  }
  if (input.cashDown === undefined) {
    quality.missingFields.push("cashDown");
  }
  if (input.rebatesAndIncentives === undefined) {
    quality.missingFields.push("rebatesAndIncentives");
  } else if (
    input.rebatesAndIncentives.some(
      ({ application }) => application === "unknown",
    )
  ) {
    quality.missingFields.push("rebatesAndIncentives.application");
    quality.warnings.push(
      "An incentive with unknown application cannot be used in adjusted capitalized cost.",
    );
  }
  if (input.capitalizedItemsComplete !== true) {
    quality.missingFields.push("capitalizedItemsComplete");
  }
  if (input.financing === undefined) {
    quality.missingFields.push("financing");
  } else if (input.financing.methodology === "unknown") {
    quality.missingFields.push("financing.methodology");
  } else if (input.financing.methodology === "apr") {
    quality.warnings.push(
      "APR-based rent reconstruction is unavailable without the lessor's compatible calculation methodology.",
    );
  } else if (!input.financing.compatibleWithStandardFormula) {
    quality.warnings.push(
      "The entered money factor is not confirmed compatible with the standard money-factor formula.",
    );
  }

  const financing = input.financing;
  if (
    input.sellingPrice === undefined ||
    input.residualValue === undefined ||
    input.cashDown === undefined ||
    input.rebatesAndIncentives === undefined ||
    input.rebatesAndIncentives.some(
      ({ application }) => application === "unknown",
    ) ||
    input.capitalizedItemsComplete !== true ||
    financing?.methodology !== "standard-money-factor" ||
    !financing.compatibleWithStandardFormula
  ) {
    return { quality };
  }

  const capitalizedFees = sum(
    (input.upfrontFees ?? [])
      .filter(({ paymentTreatment }) => paymentTreatment === "capitalized")
      .map(({ amount }) => amount),
  );
  const capCostIncentives = sum(
    input.rebatesAndIncentives
      .filter(
        ({ application }) => application === "capitalized-cost-reduction",
      )
      .map(({ amount }) => amount),
  );
  const grossCapitalizedCost = sum([input.sellingPrice, capitalizedFees]);
  const adjustedCapitalizedCost = roundMoney(
    grossCapitalizedCost - input.cashDown.amount - capCostIncentives,
  );

  if (adjustedCapitalizedCost < 0) {
    throw new Error("Adjusted capitalized cost cannot be negative.");
  }
  if (adjustedCapitalizedCost < input.residualValue) {
    throw new Error("Adjusted capitalized cost cannot be less than residualValue.");
  }

  const totalDepreciationCharge = roundMoney(
    adjustedCapitalizedCost - input.residualValue,
  );
  const monthlyDepreciationCharge = roundMoney(
    totalDepreciationCharge / input.termMonths,
  );
  const monthlyFinanceCharge = roundMoney(
    (adjustedCapitalizedCost + input.residualValue) *
      financing.moneyFactor,
  );
  const totalFinanceCharge = roundMoney(
    monthlyFinanceCharge * input.termMonths,
  );

  quality.status = "confirmed";
  quality.assumptions.push(
    "Used the standard lease money-factor formula supplied as compatible by the caller.",
  );
  quality.warnings.push(
    "Money factor multiplied by 2400 is only an approximate APR equivalent, not a universal legal APR calculation.",
  );

  return {
    quality,
    grossCapitalizedCost,
    adjustedCapitalizedCost,
    residualValue: input.residualValue,
    totalDepreciationCharge,
    monthlyDepreciationCharge,
    monthlyFinanceCharge,
    totalFinanceCharge,
    reconstructedBaseMonthlyPayment: roundMoney(
      monthlyDepreciationCharge + monthlyFinanceCharge,
    ),
    approximateAprEquivalentPercent: roundMoney(
      financing.moneyFactor * 2400,
    ),
  };
}

export function analyzeSingleLease(
  input: SingleLeaseAnalysisInput,
): SingleLeaseAnalysisResult {
  validateInput(input);

  return {
    paymentBased: calculatePaymentBased(input),
    pricing: calculatePricing(input),
    advancedFinance: calculateAdvancedFinance(input),
  };
}
