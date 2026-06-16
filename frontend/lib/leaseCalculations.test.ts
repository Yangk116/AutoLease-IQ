import { describe, expect, it } from "vitest";

import {
  analyzeLeaseQuote,
  compareLeaseQuotes,
  type LeaseQuoteInput,
} from "./leaseCalculations";

const validQuote: LeaseQuoteInput = {
  downPayment: 2_000,
  monthlyPayment: 450,
  termMonths: 36,
  annualMileage: 20_000,
  dealerFees: 900,
  leaseEndFee: 500,
};

describe("analyzeLeaseQuote", () => {
  it("calculates the core lease analysis values", () => {
    const result = analyzeLeaseQuote(validQuote);

    expect(result.totalCost).toBe(19_600);
    expect(result.trueMonthlyCost).toBeCloseTo(544.4444);
    expect(result.totalAllowedKm).toBe(60_000);
    expect(result.costPerKm).toBeCloseTo(0.3267);
    expect(result.upfrontRatio).toBeCloseTo(10.2041);
  });

  it("calculates vehicle and deal analysis values when provided", () => {
    const result = analyzeLeaseQuote({
      ...validQuote,
      msrp: 50_000,
      sellingPrice: 46_000,
      residualValue: 31_000,
    });

    expect(result.discountFromMsrp).toBe(4_000);
    expect(result.discountPercentage).toBeCloseTo(8);
    expect(result.residualPercentage).toBeCloseTo(62);
    expect(result.depreciationAmount).toBe(15_000);
  });

  it.each([
    ["termMonths", 0, "termMonths must be greater than 0."],
    ["termMonths", -1, "termMonths must be greater than 0."],
    ["annualMileage", 0, "annualMileage must be greater than 0."],
    ["annualMileage", -1, "annualMileage must be greater than 0."],
    ["downPayment", -1, "downPayment cannot be negative."],
    ["monthlyPayment", -1, "monthlyPayment cannot be negative."],
    ["dealerFees", -1, "dealerFees cannot be negative."],
    ["leaseEndFee", -1, "leaseEndFee cannot be negative."],
    ["msrp", -1, "msrp cannot be negative."],
    ["sellingPrice", -1, "sellingPrice cannot be negative."],
    ["residualValue", -1, "residualValue cannot be negative."],
  ] as const)(
    "throws a clear error when %s is %d",
    (field, value, expectedMessage) => {
      expect(() =>
        analyzeLeaseQuote({
          ...validQuote,
          [field]: value,
        }),
      ).toThrow(expectedMessage);
    },
  );

  it("requires totalCost to be greater than 0", () => {
    expect(() =>
      analyzeLeaseQuote({
        downPayment: 0,
        monthlyPayment: 0,
        termMonths: 36,
        annualMileage: 20_000,
        dealerFees: 0,
        leaseEndFee: 0,
      }),
    ).toThrow("totalCost must be greater than 0.");
  });
});

describe("compareLeaseQuotes", () => {
  it("identifies the lowest total, true monthly, and per-kilometer costs", () => {
    const lowestTotalCost: LeaseQuoteInput = {
      downPayment: 1_000,
      monthlyPayment: 300,
      termMonths: 24,
      annualMileage: 12_000,
      dealerFees: 500,
      leaseEndFee: 300,
    };
    const lowestTrueMonthlyCost: LeaseQuoteInput = {
      downPayment: 1_000,
      monthlyPayment: 215,
      termMonths: 60,
      annualMileage: 12_000,
      dealerFees: 700,
      leaseEndFee: 400,
    };
    const lowestCostPerKm: LeaseQuoteInput = {
      downPayment: 1_500,
      monthlyPayment: 400,
      termMonths: 36,
      annualMileage: 30_000,
      dealerFees: 1_200,
      leaseEndFee: 900,
    };

    const comparison = compareLeaseQuotes([
      lowestTotalCost,
      lowestTrueMonthlyCost,
      lowestCostPerKm,
    ]);

    expect(comparison.results).toHaveLength(3);
    expect(comparison.lowestTotalCost).toMatchObject(lowestTotalCost);
    expect(comparison.lowestTotalCost.totalCost).toBe(9_000);
    expect(comparison.lowestTrueMonthlyCost).toMatchObject(
      lowestTrueMonthlyCost,
    );
    expect(comparison.lowestTrueMonthlyCost.trueMonthlyCost).toBeCloseTo(250);
    expect(comparison.lowestCostPerKm).toMatchObject(lowestCostPerKm);
    expect(comparison.lowestCostPerKm.costPerKm).toBeCloseTo(0.2);
  });
});
