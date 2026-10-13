import { analyzeSingleLease, type SingleLeaseAnalysisInput } from "@/lib/singleLeaseAnalysis";

export const SINGLE_LEASE_SESSION_KEY = "autolease-iq:single-lease-analysis:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StorageAccess = Pick<Storage, "getItem" | "setItem">;
export type SingleLeaseSession = {
  version: 1;
  savedAt: number;
  input: SingleLeaseAnalysisInput;
  formValues: Record<string, string>;
};
export type SessionRead =
  | { status: "ready"; session: SingleLeaseSession }
  | { status: "missing" | "invalid" | "stale" | "blocked" };

type Rule = (value: unknown) => boolean;
const number: Rule = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const boolean: Rule = (v) => typeof v === "boolean";
const string: Rule = (v) => typeof v === "string";
const choice = (...values: unknown[]): Rule => (v) => values.includes(v);
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const shape = (required: Record<string, Rule>, optional: Record<string, Rule> = {}): Rule => (v) =>
  record(v) && Object.entries(required).every(([key, rule]) => rule(v[key])) &&
  Object.entries(optional).every(([key, rule]) => v[key] === undefined || rule(v[key])) &&
  Object.keys(v).every((key) => key in required || key in optional);
const array = (rule: Rule): Rule => (v) => Array.isArray(v) && v.every(rule);
const upfront = choice("included-in-due-at-signing", "paid-separately");
const inputShape = shape({
  payment: shape({
    amount: number,
    frequency: choice("monthly", "weekly", "biweekly"),
    tax: (v) => shape({ status: choice("included", "unknown") })(v) ||
      shape({ status: choice("excluded") }, { applicableRate: number })(v),
  }, {
    paymentCount: number,
    schedule: shape({ paymentCount: number, source: choice("lease-contract", "lender-schedule"), validated: choice(true) }),
  }),
  termMonths: number,
  annualKilometres: number,
}, {
  dueAtSigning: shape({ totalAmount: number, breakdownComplete: boolean }),
  firstPaymentAtSigning: choice("included-in-due-at-signing", "paid-separately", "unknown"),
  cashDown: shape({ amount: number, paymentTreatment: upfront }),
  upfrontFees: array(shape({ name: string, amount: number, category: choice("acquisition", "dealer", "registration", "other"), paymentTreatment: choice("included-in-due-at-signing", "paid-separately", "capitalized", "included-in-payments") })),
  refundableDeposits: array(shape({ name: string, amount: number, paymentTreatment: upfront })),
  upfrontAmountsComplete: boolean,
  msrp: number,
  sellingPrice: number,
  residualValue: number,
  dealerDiscount: number,
  rebatesAndIncentives: array(shape({ name: string, amount: number, source: choice("manufacturer", "government", "other"), application: choice("capitalized-cost-reduction", "cash", "unknown") })),
  capitalizedItemsComplete: boolean,
  financing: (v) => shape({ methodology: choice("unknown") })(v) ||
    shape({ methodology: choice("apr"), aprPercent: number })(v) ||
    shape({ methodology: choice("standard-money-factor"), moneyFactor: number, compatibleWithStandardFormula: boolean })(v),
  leaseEndFees: array(shape({ name: string, amount: number, applicability: choice("all-end-scenarios", "return-only", "buyout-only", "unknown") })),
  leaseEndFeesComplete: boolean,
  leaseEndScenario: choice("return", "buyout", "unknown"),
  conditionalLeaseEndCosts: array((v) =>
    shape({ type: choice("excess-kilometres"), ratePerKilometre: number }, { includedKilometres: number })(v) ||
    shape({ type: choice("excess-wear") }, { estimatedAmount: number })(v) ||
    shape({ type: choice("other"), name: string }, { estimatedAmount: number })(v)),
});

export function parseSingleLeaseSession(raw: string | null, now = Date.now()): SessionRead {
  if (raw === null) return { status: "missing" };
  try {
    const value: unknown = JSON.parse(raw);
    if (!shape({ version: choice(1), savedAt: number, input: inputShape,
      formValues: (v) => record(v) && Object.values(v).every(string),
    })(value)) return { status: "invalid" };
    const session = value as SingleLeaseSession;
    if (session.savedAt > now || now - session.savedAt > MAX_AGE_MS) return { status: "stale" };
    // The engine owns numeric and cross-field validation; the schema protects its typed boundary.
    analyzeSingleLease(session.input);
    return { status: "ready", session };
  } catch {
    return { status: "invalid" };
  }
}

export function readSingleLeaseSession(storage?: StorageAccess): SessionRead {
  try {
    return parseSingleLeaseSession((storage ?? window.sessionStorage).getItem(SINGLE_LEASE_SESSION_KEY));
  } catch {
    return { status: "blocked" };
  }
}

export function saveSingleLeaseSession(input: SingleLeaseAnalysisInput, formValues: Record<string, string>, storage?: StorageAccess): boolean {
  try {
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), input, formValues });
    if (parseSingleLeaseSession(raw).status !== "ready") return false;
    const target = storage ?? window.sessionStorage;
    target.setItem(SINGLE_LEASE_SESSION_KEY, raw);
    return target.getItem(SINGLE_LEASE_SESSION_KEY) === raw;
  } catch {
    return false;
  }
}
