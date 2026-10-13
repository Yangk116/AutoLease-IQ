import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analyzeSingleLease, type SingleLeaseAnalysisInput } from "@/lib/singleLeaseAnalysis";
import { getLeaseChecks, getMoneyFlow } from "./singleLeaseResults";
import { LeaseResultsContent } from "./SingleLeaseAnalysisResults";

const input: SingleLeaseAnalysisInput = {
  payment: { amount: 400, frequency: "monthly", tax: { status: "included" } },
  termMonths: 36, annualKilometres: 16000, firstPaymentAtSigning: "included-in-due-at-signing",
  dueAtSigning: { totalAmount: 1900, breakdownComplete: true },
  cashDown: { amount: 1000, paymentTreatment: "included-in-due-at-signing" },
  refundableDeposits: [{ name: "Deposit", amount: 500, paymentTreatment: "included-in-due-at-signing" }],
  leaseEndFees: [{ name: "Disposition", amount: 300, applicability: "all-end-scenarios" }],
  upfrontAmountsComplete: true, leaseEndFeesComplete: true,
};
describe("single lease result presentation", () => {
  it("uses disjoint components and excludes refundable deposits", () => {
    const result = analyzeSingleLease(input).paymentBased;
    const flow = getMoneyFlow(result);
    expect(flow.proportional).toBe(true);
    expect(flow.components.map(({ amount }) => amount)).toEqual([14400, 1000, 300]);
    expect(flow.components.reduce((total, { amount }) => total + amount!, 0)).toBe(result.totalKnownNonRefundableLeaseCost);
    expect(result.refundableCashTiedUp).toBe(500);
    const html = renderToStaticMarkup(<LeaseResultsContent result={analyzeSingleLease(input)} />);
    expect(html).toContain('style="width:');
  });
  it("labels unknown tax and first-payment assumptions and withholds proportions", () => {
    const result = analyzeSingleLease({ ...input, payment: { ...input.payment, tax: { status: "unknown" } }, firstPaymentAtSigning: "unknown" });
    const flow = getMoneyFlow(result.paymentBased);
    expect(flow.proportional).toBe(false);
    expect(flow.components.map(({ amount }) => amount)).toEqual([14400, 1000, 300]);
    expect(flow.components.every(({ status }) => status === "estimated")).toBe(true);
    expect(getLeaseChecks(result.paymentBased)).toHaveLength(2);
    const html = renderToStaticMarkup(<LeaseResultsContent result={result} />);
    expect(html).toContain("Estimate");
    expect(html).toContain("Provisionally treated");
    expect(html).toContain("tax inclusion is unknown");
    const primary = html.split('<section aria-labelledby="money-title"')[0];
    expect(primary).toContain("Your estimated cost may change");
    expect(primary).not.toContain("Whether the advertised payment includes tax");
    expect(primary).not.toContain("Provisionally treated");
    expect(html).toContain("$14,400.00 CAD total (estimate)");
    expect(html).not.toContain('style="width:');
    expect(html).not.toContain("Confirmed from entered details");
  });
  it.each(["weekly", "biweekly"] as const)("withholds provisional cost values for %s without a count", (frequency) => {
    const result = analyzeSingleLease({ ...input, payment: { ...input.payment, frequency } });
    expect(result.paymentBased.quality.status).toBe("unavailable");
    const html = renderToStaticMarkup(<LeaseResultsContent result={result} />);
    expect(html).toContain("Not available");
    expect(html).toContain("How many payments will I make");
    expect(html).not.toContain("$1,900.00");
    expect(html).not.toContain("$14,400.00");
    expect(html).not.toContain('style="width:');
    expect(getMoneyFlow(result.paymentBased).components.map(({ amount }) => amount)).toEqual([undefined, 1000, 300]);
    expect(html).toContain("$300.00 CAD total (known amount)");
    expect(html).toContain("$1,000.00 CAD total (known amount)");
  });
  it("limits deterministic checks to three and exposes all missing requirements in details", () => {
    const result = analyzeSingleLease({ ...input, dueAtSigning: { totalAmount: 1900, breakdownComplete: false }, firstPaymentAtSigning: "unknown", upfrontAmountsComplete: false, leaseEndFeesComplete: false, payment: { ...input.payment, tax: { status: "unknown" } } });
    expect(getLeaseChecks(result.paymentBased)).toHaveLength(3);
    const html = renderToStaticMarkup(<LeaseResultsContent result={result} />);
    expect(html).toContain("A complete list of contractual lease-end fees");
    expect(html).not.toContain("<details open");
  });
  it.each([
    { firstPaymentAtSigning: "paid-separately" as const, dueAtSigning: { totalAmount: 1500, breakdownComplete: true } },
    { firstPaymentAtSigning: "unknown" as const, dueAtSigning: { totalAmount: 1900, breakdownComplete: false } },
    { firstPaymentAtSigning: "unknown" as const, dueAtSigning: { totalAmount: 1500, breakdownComplete: false } },
    { payment: { ...input.payment, tax: { status: "unknown" as const } } },
    { upfrontFees: [{ name: "Dealer fee", amount: 100, category: "dealer" as const, paymentTreatment: "paid-separately" as const }] },
  ])("keeps components disjoint across signing, tax and fee treatments: %j", (changes) => {
    const result = analyzeSingleLease({ ...input, ...changes }).paymentBased;
    const flow = getMoneyFlow(result);
    expect(flow.components.reduce((total, { amount }) => total + amount!, 0)).toBe(result.totalKnownNonRefundableLeaseCost);
    expect(flow.components[1].amount).toBe(result.separatelyPaidNonRefundableTotal! - result.contractualLeaseEndFeesTotal);
    expect(flow.components.every(({ amount }) => amount !== undefined && amount >= 0)).toBe(true);
  });
  it("does not include unresolved or excluded lease-end fees in the flow", () => {
    const result = analyzeSingleLease({ ...input, leaseEndScenario: "return", leaseEndFees: [
      { name: "Disposition", amount: 300, applicability: "all-end-scenarios" },
      { name: "Unknown fee", amount: 250, applicability: "unknown" },
      { name: "Buyout fee", amount: 150, applicability: "buyout-only" },
    ] });
    const flow = getMoneyFlow(result.paymentBased);
    expect(flow.components.map(({ amount }) => amount)).toEqual([14400, 1000, 300]);
    expect(flow.proportional).toBe(false);
    const html = renderToStaticMarkup(<LeaseResultsContent result={result} />);
    expect(html).toContain("$250.00 CAD in contractual lease-end fees has unresolved applicability");
    expect(flow.explanation).toContain("cannot yet be classified as payable");
  });
  it("withholds payment and signing amounts when an excluded tax rate is missing", () => {
    const result = analyzeSingleLease({ ...input, payment: { ...input.payment, tax: { status: "excluded" } } });
    const flow = getMoneyFlow(result.paymentBased);
    expect(flow.proportional).toBe(false);
    expect(flow.components.slice(0, 2).every(({ amount, status }) => amount === undefined && status === "unavailable")).toBe(true);
    expect(renderToStaticMarkup(<LeaseResultsContent result={result} />)).not.toContain("$14,400.00");
  });
  it.each([
    ["dueAtSigning.completeBreakdown", "Could you provide an itemized breakdown"],
    ["firstPaymentAtSigning", "Is my first lease payment included"],
    ["payment.tax.status", "Does the advertised payment include tax"],
    ["payment.tax.applicableRate", "What tax rate applies"],
    ["payment.paymentCountOrValidatedSchedule", "How many payments will I make"],
    ["leaseEndScenario", "Which contractual fees would I pay"],
    ["leaseEndFees[0].applicability", "Which contractual fees would I pay"],
    ["upfrontAmountsComplete", "Are there any other upfront amounts"],
    ["leaseEndFeesComplete", "Could you list all lease-end fees"],
  ])("asks a relevant question for %s", (field, question) => {
    const result = analyzeSingleLease(input).paymentBased;
    result.quality.missingFields = [field];
    const checks = getLeaseChecks(result);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toContain(question);
    expect(checks[0]).toMatch(/\?$/);
  });
  it("does not create missing-information questions when no fields are missing", () => {
    const result = analyzeSingleLease({ ...input, conditionalLeaseEndCosts: [{ type: "excess-wear", estimatedAmount: 100 }] }).paymentBased;
    expect(getLeaseChecks(result)).toEqual([]);
  });
  it("keeps exactly three primary areas and a collapsed detailed disclosure", () => {
    const html = renderToStaticMarkup(<LeaseResultsContent result={analyzeSingleLease(input)} />);
    expect(html.match(/<section /g)).toHaveLength(3);
    expect(html.match(/<details/g)).toHaveLength(1);
    expect(html).not.toContain("<details open");
  });
});
