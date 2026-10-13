import { describe, expect, it } from "vitest";
import type { SingleLeaseAnalysisInput } from "@/lib/singleLeaseAnalysis";
import { parseSingleLeaseSession, readSingleLeaseSession, saveSingleLeaseSession, SINGLE_LEASE_SESSION_KEY } from "./singleLeaseSession";

const input: SingleLeaseAnalysisInput = {
  payment: { amount: 400, frequency: "monthly", tax: { status: "included" } },
  termMonths: 36, annualKilometres: 16000,
  firstPaymentAtSigning: "paid-separately", upfrontAmountsComplete: true, leaseEndFeesComplete: true,
};
const now = 100000000;
const raw = (quote: unknown = input, extra = {}) => JSON.stringify({ version: 1, savedAt: now, input: quote, formValues: {}, ...extra });

describe("single lease session", () => {
  it("round trips normalized input and form values without saving a calculation", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveSingleLeaseSession(input, { paymentAmount: "400" }, storage)).toBe(true);
    expect(readSingleLeaseSession(storage)).toMatchObject({ status: "ready", session: { input, formValues: { paymentAmount: "400" } } });
    expect([...data.keys()]).toEqual([SINGLE_LEASE_SESSION_KEY]);
    expect(JSON.parse(data.get(SINGLE_LEASE_SESSION_KEY)!)).not.toHaveProperty("result");
  });
  it("handles absent, malformed, obsolete and expired sessions", () => {
    expect(parseSingleLeaseSession(null, now).status).toBe("missing");
    for (const value of ["{", "null", "[]", raw(input, { version: 2 }), raw(input, { formValues: { bad: 5 } })]) expect(parseSingleLeaseSession(value, now).status).toBe("invalid");
    expect(parseSingleLeaseSession(raw(), now + 86400001).status).toBe("stale");
    expect(parseSingleLeaseSession(raw(), now - 1).status).toBe("stale");
  });
  it("rejects invalid nested types, enums and cross-field amounts", () => {
    for (const quote of [
      { ...input, payment: { ...input.payment, frequency: "daily" } },
      { ...input, payment: { ...input.payment, tax: { status: "maybe" } } },
      { ...input, upfrontAmountsComplete: "true" },
      { ...input, upfrontFees: [{ name: "Fee", amount: 10, category: "dealer", paymentTreatment: "mystery" }] },
      { ...input, financing: { methodology: "standard-money-factor", moneyFactor: .001, compatibleWithStandardFormula: "yes" } },
      { ...input, payment: { ...input.payment, schedule: { paymentCount: 36, source: "lease-contract", validated: false } } },
      { ...input, dueAtSigning: { totalAmount: 0, breakdownComplete: true }, cashDown: { amount: 100, paymentTreatment: "included-in-due-at-signing" } },
    ]) expect(parseSingleLeaseSession(raw(quote), now).status).toBe("invalid");
  });
  it("allows incomplete but typed quotes so results can explain unavailable totals", () => {
    expect(parseSingleLeaseSession(raw({ ...input, payment: { amount: 100, frequency: "weekly", tax: { status: "unknown" } } }), now).status).toBe("ready");
  });
  it("handles storage exceptions and failed writes", () => {
    const storage = { getItem: () => { throw new Error("Blocked"); }, setItem: () => { throw new Error("Quota"); } };
    expect(readSingleLeaseSession(storage).status).toBe("blocked");
    expect(saveSingleLeaseSession(input, {}, storage)).toBe(false);
    expect(saveSingleLeaseSession(input, {}, { getItem: () => null, setItem: () => {} })).toBe(false);
  });
});
