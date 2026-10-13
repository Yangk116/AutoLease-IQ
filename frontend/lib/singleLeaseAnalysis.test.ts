import { describe, expect, it } from "vitest";

import {
  analyzeSingleLease,
  type LeasePayment,
  type SingleLeaseAnalysisInput,
} from "./singleLeaseAnalysis";

type InputOverrides = Omit<Partial<SingleLeaseAnalysisInput>, "payment"> & {
  payment?: Partial<LeasePayment>;
};

function completeQuote(overrides: InputOverrides = {}): SingleLeaseAnalysisInput {
  const base: SingleLeaseAnalysisInput = {
    payment: {
      amount: 500,
      frequency: "monthly",
      tax: { status: "included" },
    },
    termMonths: 36,
    annualKilometres: 20_000,
    dueAtSigning: { totalAmount: 500, breakdownComplete: true },
    firstPaymentAtSigning: "included-in-due-at-signing",
    cashDown: {
      amount: 0,
      paymentTreatment: "included-in-due-at-signing",
    },
    upfrontFees: [],
    refundableDeposits: [],
    upfrontAmountsComplete: true,
    leaseEndFees: [],
    leaseEndFeesComplete: true,
    conditionalLeaseEndCosts: [],
  };

  return {
    ...base,
    ...overrides,
    payment: { ...base.payment, ...overrides.payment },
  };
}

describe("payment-based lease cost", () => {
  it("calculates standard monthly payments and effective monthly cost", () => {
    const result = analyzeSingleLease(completeQuote()).paymentBased;

    expect(result.quality.status).toBe("confirmed");
    expect(result.paymentCount).toBe(36);
    expect(result.scheduledPaymentsTotal).toBe(18_000);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_000);
    expect(result.effectiveMonthlyCost).toBe(500);
    expect(result.cashRequiredAtDelivery).toBe(500);
    expect(result.totalAllowedKilometres).toBe(60_000);
  });

  it("does not count a first payment included in due-at-signing twice", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 2_500, breakdownComplete: true },
        cashDown: {
          amount: 2_000,
          paymentTreatment: "included-in-due-at-signing",
        },
      }),
    ).paymentBased;

    expect(result.scheduledPaymentsTotal).toBe(18_000);
    expect(result.separatelyPaidNonRefundableTotal).toBe(2_000);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(20_000);
    expect(result.cashRequiredAtDelivery).toBe(2_500);
  });

  it("adds a first payment paid separately to delivery cash but not lease cost", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 2_000, breakdownComplete: true },
        firstPaymentAtSigning: "paid-separately",
        cashDown: {
          amount: 2_000,
          paymentTreatment: "included-in-due-at-signing",
        },
      }),
    ).paymentBased;

    expect(result.totalKnownNonRefundableLeaseCost).toBe(20_000);
    expect(result.cashRequiredAtDelivery).toBe(2_500);
  });

  it("marks unknown first-payment inclusion as an explicit estimate", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 2_500, breakdownComplete: true },
        firstPaymentAtSigning: "unknown",
        cashDown: {
          amount: 2_000,
          paymentTreatment: "included-in-due-at-signing",
        },
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toContain("firstPaymentAtSigning");
    expect(result.quality.assumptions).toContain(
      "Provisionally treated the first payment as included in due-at-signing because it fits within the entered amount; this is not confirmation of its contractual treatment.",
    );
    expect(result.totalKnownNonRefundableLeaseCost).toBe(20_000);
  });

  it("does not reject zero due-at-signing when first-payment inclusion is unknown", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 0, breakdownComplete: true },
        firstPaymentAtSigning: "unknown",
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toContain("firstPaymentAtSigning");
    expect(result.quality.assumptions).toContain(
      "Provisionally treated the first payment as paid separately because including it would exceed the entered due-at-signing amount; this is not confirmation of its contractual treatment.",
    );
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_000);
    expect(result.cashRequiredAtDelivery).toBe(500);
  });

  it("keeps a partially known upfront breakdown provisional without a false contradiction", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 300, breakdownComplete: false },
        firstPaymentAtSigning: "unknown",
        upfrontFees: [
          {
            name: "Known registration portion",
            amount: 100,
            category: "registration",
            paymentTreatment: "included-in-due-at-signing",
          },
        ],
        upfrontAmountsComplete: false,
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toEqual(
      expect.arrayContaining([
        "firstPaymentAtSigning",
        "upfrontAmountsComplete",
        "dueAtSigning.completeBreakdown",
      ]),
    );
    expect(result.separatelyPaidNonRefundableTotal).toBe(300);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_300);
    expect(result.cashRequiredAtDelivery).toBe(800);
  });

  it("reports a refundable security deposit as tied-up cash, not lease cost", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 1_500, breakdownComplete: true },
        refundableDeposits: [
          {
            name: "Security deposit",
            amount: 1_000,
            paymentTreatment: "included-in-due-at-signing",
          },
        ],
      }),
    ).paymentBased;

    expect(result.cashRequiredAtDelivery).toBe(1_500);
    expect(result.refundableCashTiedUp).toBe(1_000);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_000);
  });

  it("counts an upfront fee already in due-at-signing exactly once", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 800, breakdownComplete: true },
        upfrontFees: [
          {
            name: "Registration",
            amount: 300,
            category: "registration",
            paymentTreatment: "included-in-due-at-signing",
          },
        ],
      }),
    ).paymentBased;

    expect(result.separatelyPaidNonRefundableTotal).toBe(300);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_300);
    expect(result.cashRequiredAtDelivery).toBe(800);
  });

  it("counts a separately paid fee exactly once", () => {
    const result = analyzeSingleLease(
      completeQuote({
        upfrontFees: [
          {
            name: "Registration",
            amount: 300,
            category: "registration",
            paymentTreatment: "paid-separately",
          },
        ],
      }),
    ).paymentBased;

    expect(result.separatelyPaidNonRefundableTotal).toBe(300);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_300);
    expect(result.cashRequiredAtDelivery).toBe(800);
  });

  it("uses a tax-included payment without alteration", () => {
    const result = analyzeSingleLease(
      completeQuote({
        payment: {
          amount: 425,
          paymentCount: 24,
          tax: { status: "included" },
        },
        termMonths: 24,
        dueAtSigning: { totalAmount: 425, breakdownComplete: true },
      }),
    ).paymentBased;

    expect(result.paymentAmountUsedForCalculation).toBe(425);
    expect(result.scheduledPaymentsTotal).toBe(10_200);
  });

  it("adds a known applicable tax rate to a tax-excluded payment", () => {
    const result = analyzeSingleLease(
      completeQuote({
        payment: {
          amount: 400,
          tax: { status: "excluded", applicableRate: 0.13 },
        },
        dueAtSigning: { totalAmount: 452, breakdownComplete: true },
      }),
    ).paymentBased;

    expect(result.paymentAmountUsedForCalculation).toBe(452);
    expect(result.scheduledPaymentsTotal).toBe(16_272);
    expect(result.effectiveMonthlyCost).toBe(452);
    expect(result.quality.status).toBe("confirmed");
  });

  it("marks an unknown payment-tax status as estimated", () => {
    const result = analyzeSingleLease(
      completeQuote({
        payment: { amount: 400, tax: { status: "unknown" } },
        dueAtSigning: { totalAmount: 400, breakdownComplete: true },
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toContain("payment.tax.status");
    expect(result.quality.assumptions).toContain(
      "Treated the advertised payment amount as the amount payable because tax inclusion is unknown.",
    );
    expect(result.quality.warnings).toContain(
      "The scheduled-payment total may exclude applicable payment tax.",
    );
    expect(result.paymentAmountUsedForCalculation).toBe(400);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(14_400);
  });

  it("uses an explicit weekly payment count", () => {
    const result = analyzeSingleLease(
      completeQuote({
        payment: {
          amount: 100,
          frequency: "weekly",
          paymentCount: 52,
        },
        termMonths: 12,
        dueAtSigning: { totalAmount: 100, breakdownComplete: true },
      }),
    ).paymentBased;

    expect(result.paymentCount).toBe(52);
    expect(result.scheduledPaymentsTotal).toBe(5_200);
    expect(result.effectiveMonthlyCost).toBe(433.33);
  });

  it("uses a validated biweekly lender schedule", () => {
    const result = analyzeSingleLease(
      completeQuote({
        payment: {
          amount: 200,
          frequency: "biweekly",
          schedule: {
            paymentCount: 26,
            source: "lender-schedule",
            validated: true,
          },
        },
        termMonths: 12,
        dueAtSigning: { totalAmount: 200, breakdownComplete: true },
      }),
    ).paymentBased;

    expect(result.paymentCount).toBe(26);
    expect(result.scheduledPaymentsTotal).toBe(5_200);
    expect(result.effectiveMonthlyCost).toBe(433.33);
  });

  it("returns unavailable when a weekly or biweekly payment count is missing", () => {
    const result = analyzeSingleLease(
      completeQuote({
        payment: { amount: 100, frequency: "weekly" },
        termMonths: 12,
        dueAtSigning: { totalAmount: 100, breakdownComplete: true },
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("unavailable");
    expect(result.quality.missingFields).toContain(
      "payment.paymentCountOrValidatedSchedule",
    );
    expect(result.scheduledPaymentsTotal).toBeUndefined();
    expect(result.totalKnownNonRefundableLeaseCost).toBeUndefined();
    expect(result.effectiveMonthlyCost).toBeUndefined();
  });

  it("preserves an explicitly entered zero down payment", () => {
    const result = analyzeSingleLease(
      completeQuote({
        cashDown: {
          amount: 0,
          paymentTreatment: "included-in-due-at-signing",
        },
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("confirmed");
    expect(result.separatelyPaidNonRefundableTotal).toBe(0);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_000);
  });
});

describe("pricing and advanced finance calculations", () => {
  it("keeps manufacturer rebates distinct from the dealer discount", () => {
    const result = analyzeSingleLease(
      completeQuote({
        msrp: 50_000,
        sellingPrice: 45_000,
        dealerDiscount: 3_000,
        rebatesAndIncentives: [
          {
            name: "Manufacturer lease cash",
            amount: 1_500,
            source: "manufacturer",
            application: "capitalized-cost-reduction",
          },
          {
            name: "Government incentive",
            amount: 500,
            source: "government",
            application: "cash",
          },
        ],
      }),
    ).pricing;

    expect(result.dealerDiscount).toBe(3_000);
    expect(result.manufacturerRebatesTotal).toBe(1_500);
    expect(result.otherIncentivesTotal).toBe(500);
    expect(result.msrpToSellingPriceDifference).toBe(5_000);
  });

  it("calculates residual percentage from residual value and MSRP", () => {
    const result = analyzeSingleLease(
      completeQuote({ msrp: 50_000, residualValue: 30_000 }),
    ).pricing;

    expect(result.residualPercentage).toBe(60);
  });

  it("does not turn missing incentive information into confirmed zeros", () => {
    const result = analyzeSingleLease(completeQuote()).pricing;

    expect(result.manufacturerRebatesTotal).toBeUndefined();
    expect(result.otherIncentivesTotal).toBeUndefined();
  });

  it("reconstructs compatible standard money-factor finance charges", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 1_500, breakdownComplete: true },
        cashDown: {
          amount: 1_000,
          paymentTreatment: "included-in-due-at-signing",
        },
        sellingPrice: 45_000,
        residualValue: 30_000,
        upfrontFees: [
          {
            name: "Acquisition fee",
            amount: 700,
            category: "acquisition",
            paymentTreatment: "capitalized",
          },
        ],
        rebatesAndIncentives: [
          {
            name: "Manufacturer lease cash",
            amount: 1_000,
            source: "manufacturer",
            application: "capitalized-cost-reduction",
          },
        ],
        capitalizedItemsComplete: true,
        financing: {
          methodology: "standard-money-factor",
          moneyFactor: 0.002,
          compatibleWithStandardFormula: true,
        },
      }),
    ).advancedFinance;

    expect(result.quality.status).toBe("confirmed");
    expect(result.grossCapitalizedCost).toBe(45_700);
    expect(result.adjustedCapitalizedCost).toBe(43_700);
    expect(result.totalDepreciationCharge).toBe(13_700);
    expect(result.monthlyDepreciationCharge).toBe(380.56);
    expect(result.monthlyFinanceCharge).toBe(147.4);
    expect(result.totalFinanceCharge).toBe(5_306.4);
    expect(result.reconstructedBaseMonthlyPayment).toBe(527.96);
    expect(result.approximateAprEquivalentPercent).toBe(4.8);
  });

  it("returns advanced finance as unavailable when inputs are missing", () => {
    const result = analyzeSingleLease(completeQuote()).advancedFinance;

    expect(result.quality.status).toBe("unavailable");
    expect(result.quality.missingFields).toEqual(
      expect.arrayContaining([
        "sellingPrice",
        "residualValue",
        "rebatesAndIncentives",
        "capitalizedItemsComplete",
        "financing",
      ]),
    );
    expect(result.grossCapitalizedCost).toBeUndefined();
  });

  it("returns advanced finance as unavailable for unknown incentive application", () => {
    const result = analyzeSingleLease(
      completeQuote({
        sellingPrice: 45_000,
        residualValue: 30_000,
        rebatesAndIncentives: [
          {
            name: "Unspecified incentive",
            amount: 1_000,
            source: "manufacturer",
            application: "unknown",
          },
        ],
        capitalizedItemsComplete: true,
        financing: {
          methodology: "standard-money-factor",
          moneyFactor: 0.002,
          compatibleWithStandardFormula: true,
        },
      }),
    ).advancedFinance;

    expect(result.quality.status).toBe("unavailable");
    expect(result.quality.missingFields).toContain(
      "rebatesAndIncentives.application",
    );
    expect(result.adjustedCapitalizedCost).toBeUndefined();
  });

  it("does not invent an APR-based rent calculation", () => {
    const result = analyzeSingleLease(
      completeQuote({
        sellingPrice: 45_000,
        residualValue: 30_000,
        rebatesAndIncentives: [],
        capitalizedItemsComplete: true,
        financing: { methodology: "apr", aprPercent: 4.8 },
      }),
    ).advancedFinance;

    expect(result.quality.status).toBe("unavailable");
    expect(result.monthlyFinanceCharge).toBeUndefined();
    expect(result.quality.warnings).toContain(
      "APR-based rent reconstruction is unavailable without the lessor's compatible calculation methodology.",
    );
  });
});

describe("validation, uncertainty, and category boundaries", () => {
  it("rejects negative monetary inputs", () => {
    expect(() =>
      analyzeSingleLease(
        completeQuote({
          upfrontFees: [
            {
              name: "Invalid fee",
              amount: -1,
              category: "other",
              paymentTreatment: "paid-separately",
            },
          ],
        }),
      ),
    ).toThrow("upfrontFees[0].amount must be a finite, non-negative amount.");
  });

  it("rejects a zero lease term", () => {
    expect(() => analyzeSingleLease(completeQuote({ termMonths: 0 }))).toThrow(
      "termMonths must be greater than 0.",
    );
  });

  it("still rejects a confirmed included first payment that exceeds due-at-signing", () => {
    expect(() =>
      analyzeSingleLease(
        completeQuote({
          dueAtSigning: { totalAmount: 0, breakdownComplete: true },
          firstPaymentAtSigning: "included-in-due-at-signing",
        }),
      ),
    ).toThrow(
      "Known due-at-signing components exceed dueAtSigning.totalAmount.",
    );
  });

  it("keeps conditional end costs separate from contractual lease-end fees", () => {
    const result = analyzeSingleLease(
      completeQuote({
        leaseEndFees: [
          {
            name: "Disposition fee",
            amount: 400,
            applicability: "return-only",
          },
        ],
        leaseEndScenario: "return",
        conditionalLeaseEndCosts: [
          { type: "excess-kilometres", ratePerKilometre: 0.25 },
          { type: "excess-wear", estimatedAmount: 800 },
        ],
      }),
    ).paymentBased;

    expect(result.contractualLeaseEndFeesTotal).toBe(400);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_400);
    expect(result.conditionalLeaseEndCosts).toEqual([
      { type: "excess-kilometres", ratePerKilometre: 0.25 },
      { type: "excess-wear", estimatedAmount: 800 },
    ]);
  });

  it("excludes a return-only fee from a buyout while retaining universal fees", () => {
    const result = analyzeSingleLease(
      completeQuote({
        leaseEndScenario: "buyout",
        leaseEndFees: [
          {
            name: "Disposition fee",
            amount: 400,
            applicability: "return-only",
          },
          {
            name: "Contract close fee",
            amount: 100,
            applicability: "all-end-scenarios",
          },
        ],
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("confirmed");
    expect(result.contractualLeaseEndFeesTotal).toBe(100);
    expect(result.excludedContractualLeaseEndFeesTotal).toBe(400);
    expect(result.unresolvedContractualLeaseEndFeesTotal).toBe(0);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_100);
  });

  it("reports a fee with unknown applicability without adding it to cost", () => {
    const result = analyzeSingleLease(
      completeQuote({
        leaseEndScenario: "buyout",
        leaseEndFees: [
          {
            name: "Unclassified termination fee",
            amount: 350,
            applicability: "unknown",
          },
        ],
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toContain(
      "leaseEndFees[0].applicability",
    );
    expect(result.contractualLeaseEndFeesTotal).toBe(0);
    expect(result.unresolvedContractualLeaseEndFeesTotal).toBe(350);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_000);
  });

  it("leaves a return-only fee unresolved when the lease-end scenario is unknown", () => {
    const result = analyzeSingleLease(
      completeQuote({
        leaseEndScenario: "unknown",
        leaseEndFees: [
          {
            name: "Disposition fee",
            amount: 400,
            applicability: "return-only",
          },
        ],
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toContain("leaseEndScenario");
    expect(result.contractualLeaseEndFeesTotal).toBe(0);
    expect(result.unresolvedContractualLeaseEndFeesTotal).toBe(400);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(18_000);
  });

  it("prevents double-counting across due, separate, refundable, and financed categories", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 3_800, breakdownComplete: true },
        cashDown: {
          amount: 2_000,
          paymentTreatment: "included-in-due-at-signing",
        },
        upfrontFees: [
          {
            name: "Registration",
            amount: 300,
            category: "registration",
            paymentTreatment: "included-in-due-at-signing",
          },
          {
            name: "Documentation",
            amount: 200,
            category: "dealer",
            paymentTreatment: "paid-separately",
          },
          {
            name: "Acquisition",
            amount: 700,
            category: "acquisition",
            paymentTreatment: "capitalized",
          },
          {
            name: "Embedded administration",
            amount: 100,
            category: "dealer",
            paymentTreatment: "included-in-payments",
          },
        ],
        refundableDeposits: [
          {
            name: "Security deposit",
            amount: 1_000,
            paymentTreatment: "included-in-due-at-signing",
          },
        ],
        leaseEndFees: [
          {
            name: "Disposition fee",
            amount: 400,
            applicability: "return-only",
          },
        ],
        leaseEndScenario: "return",
      }),
    ).paymentBased;

    expect(result.scheduledPaymentsTotal).toBe(18_000);
    expect(result.separatelyPaidNonRefundableTotal).toBe(2_900);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(20_900);
    expect(result.cashRequiredAtDelivery).toBe(4_000);
    expect(result.refundableCashTiedUp).toBe(1_000);
  });

  it("documents an incomplete due-at-signing breakdown", () => {
    const result = analyzeSingleLease(
      completeQuote({
        dueAtSigning: { totalAmount: 1_800, breakdownComplete: false },
        cashDown: {
          amount: 1_000,
          paymentTreatment: "included-in-due-at-signing",
        },
      }),
    ).paymentBased;

    expect(result.quality.status).toBe("estimated");
    expect(result.quality.missingFields).toContain(
      "dueAtSigning.completeBreakdown",
    );
    expect(result.separatelyPaidNonRefundableTotal).toBe(1_300);
    expect(result.totalKnownNonRefundableLeaseCost).toBe(19_300);
  });
});
