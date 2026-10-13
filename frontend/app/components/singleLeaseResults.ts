import type { PaymentBasedCalculation } from "@/lib/singleLeaseAnalysis";

const missingLabels: Record<string, string> = {
  "payment.paymentCountOrValidatedSchedule": "The exact payment count or a verified payment schedule",
  "payment.tax.applicableRate": "The applicable payment tax rate",
  "payment.tax.status": "Whether the advertised payment includes tax",
  firstPaymentAtSigning: "How the first payment is paid at signing",
  upfrontAmountsComplete: "A complete list of upfront amounts",
  leaseEndFeesComplete: "A complete list of contractual lease-end fees",
  "dueAtSigning.completeBreakdown": "An itemized due-at-signing breakdown",
  leaseEndScenario: "Whether the vehicle will be returned or bought out",
  sellingPrice: "The selling price", residualValue: "The residual value",
  cashDown: "The cash down amount, including zero if none",
  rebatesAndIncentives: "The incentive list, including confirmation if none",
  "rebatesAndIncentives.application": "How each incentive is applied",
  capitalizedItemsComplete: "A complete list of amounts financed in the lease",
  financing: "The financing method", "financing.methodology": "A verified financing method",
};
export function missingRequirement(field: string): string {
  if (field.startsWith("leaseEndFees[")) return "Which contractual lease-end fees apply";
  return missingLabels[field] ?? "Additional verified contract details";
}

export function getLeaseChecks(result: PaymentBasedCalculation): string[] {
  const fields = result.quality.missingFields;
  const checks: string[] = [];
  if (fields.includes("dueAtSigning.completeBreakdown")) checks.push("Could you provide an itemized breakdown of the amount due at signing, including any refundable deposits?");
  if (fields.includes("firstPaymentAtSigning")) checks.push("Is my first lease payment included in the amount due at signing, or do I pay it separately?");
  if (fields.includes("payment.tax.status")) checks.push("Does the advertised payment include tax, and what is the payment after tax?");
  else if (fields.includes("payment.tax.applicableRate")) checks.push("What tax rate applies to my lease payments, and what is the payment after tax?");
  if (fields.includes("payment.paymentCountOrValidatedSchedule")) checks.push("How many payments will I make over the full lease term? Could you provide the payment schedule?");
  if (fields.includes("leaseEndScenario") || fields.some((field) => field.startsWith("leaseEndFees["))) checks.push("Which contractual fees would I pay if I return the vehicle or buy it out?");
  if (fields.includes("upfrontAmountsComplete")) checks.push("Are there any other upfront amounts, and which are paid at signing, paid separately or included in my payments?");
  if (fields.includes("leaseEndFeesComplete")) checks.push("Could you list all lease-end fees and explain any mileage or wear charges I could owe?");
  return checks.slice(0, 3);
}

type MoneyFlowComponent = {
  label: string;
  amount?: number;
  status: "confirmed" | "estimated" | "unavailable" | "known";
  color: string;
};

export function getMoneyFlow(result: PaymentBasedCalculation): {
  proportional: boolean;
  components: MoneyFlowComponent[];
  explanation: string;
} {
  const { status, missingFields } = result.quality;
  const available = status !== "unavailable";
  const proportional = status === "confirmed" && result.scheduledPaymentsTotal !== undefined &&
    result.separatelyPaidNonRefundableTotal !== undefined && result.totalKnownNonRefundableLeaseCost !== undefined;
  const componentStatus = (amount: number | undefined) => amount === undefined ? "unavailable" : available ? status : "known";
  const scheduled = available ? result.scheduledPaymentsTotal : undefined;
  // The engine's separate-cost subtotal already contains applicable lease-end fees.
  // A missing payment count does not invalidate otherwise resolved upfront amounts.
  const signingResolved = !missingFields.some((field) => [
    "payment.tax.status", "payment.tax.applicableRate", "firstPaymentAtSigning",
    "dueAtSigning.completeBreakdown", "upfrontAmountsComplete",
  ].includes(field));
  const separate = (available || signingResolved) && result.separatelyPaidNonRefundableTotal !== undefined
    ? Math.round((result.separatelyPaidNonRefundableTotal - result.contractualLeaseEndFeesTotal) * 100) / 100
    : undefined;
  const explanations: string[] = [];
  if (!proportional) {
    if (missingFields.includes("payment.paymentCountOrValidatedSchedule")) explanations.push("The payment schedule is needed to total your payments.");
    if (missingFields.includes("payment.tax.status") || missingFields.includes("payment.tax.applicableRate")) explanations.push("Payment tax is not yet confirmed.");
    if (missingFields.includes("firstPaymentAtSigning") || missingFields.includes("dueAtSigning.completeBreakdown")) explanations.push("The signing amount cannot yet be fully split into payments, non-refundable costs and deposits.");
    if (missingFields.includes("upfrontAmountsComplete") || missingFields.includes("leaseEndFeesComplete")) explanations.push("Other upfront or lease-end charges may still be missing.");
    if (missingFields.includes("leaseEndScenario") || missingFields.some((field) => field.startsWith("leaseEndFees["))) explanations.push("Some lease-end fees cannot yet be classified as payable.");
  }
  return {
    proportional,
    components: [
      { label: "Scheduled lease payments", amount: scheduled, status: componentStatus(scheduled), color: "bg-teal-700" },
      { label: "Separately paid non-refundable amounts", amount: separate, status: componentStatus(separate), color: "bg-sky-600" },
      { label: "Known applicable contractual lease-end fees", amount: result.contractualLeaseEndFeesTotal, status: available ? status : "known", color: "bg-slate-500" },
    ],
    explanation: proportional
      ? "Each amount is counted once. Fees financed in the lease or included in payments stay within scheduled payments."
      : `${explanations.join(" ") || "More contract details are needed to classify the full cost."} Amounts below are shown without proportions; they do not establish a confirmed cost split.`,
  };
}
