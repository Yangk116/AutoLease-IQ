"use client";

import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

import {
  analyzeSingleLease,
  type ConditionalLeaseEndCost,
  type ContractualLeaseEndFee,
  type FeePaymentTreatment,
  type LeaseFee,
  type LeaseFinancing,
  type PaymentFrequency,
  type PaymentTaxTreatment,
  type RebateOrIncentive,
  type RefundableDeposit,
  type SingleLeaseAnalysisInput,
  type UpfrontPaymentTreatment,
} from "@/lib/singleLeaseAnalysis";

type FormErrors = Record<string, string>;

type SubmissionFeedback = {
  tone: "ready" | "estimate" | "needs-information";
  title: string;
  message: string;
  details: string[];
};

type NumberFieldProps = {
  name: string;
  label: string;
  errors: FormErrors;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
  prefix?: string;
  suffix?: string;
  description?: string;
  placeholder?: string;
  help?: ReactNode;
};

type SelectFieldProps = {
  name: string;
  label: string;
  errors: FormErrors;
  children: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  description?: string;
  required?: boolean;
};

type HelpDisclosureProps = {
  subject: string;
  what: string;
  where: string;
  why: string;
};

const fieldClassName =
  "mt-2 h-12 w-full border border-slate-300 bg-white px-3.5 text-base text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 disabled:cursor-not-allowed disabled:bg-slate-100";

const selectClassName =
  "mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-950 shadow-sm outline-none transition hover:border-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10";

const treatmentOptions: Array<{
  value: FeePaymentTreatment;
  label: string;
}> = [
  { value: "included-in-due-at-signing", label: "Included in due at signing" },
  { value: "paid-separately", label: "Paid separately" },
  { value: "capitalized", label: "Financed in the lease" },
  { value: "included-in-payments", label: "Already included in payments" },
];

const feeDefinitions: Array<{
  name: string;
  label: string;
  category: LeaseFee["category"];
}> = [
  { name: "acquisitionFee", label: "Acquisition fee", category: "acquisition" },
  { name: "dealerFee", label: "Dealer or documentation fee", category: "dealer" },
  { name: "registrationFee", label: "Registration fee", category: "registration" },
];

function FieldError({ name, errors }: { name: string; errors: FormErrors }) {
  const error = errors[name];

  return error ? (
    <p id={`${name}-error`} className="mt-2 text-sm font-medium text-red-700">
      {error}
    </p>
  ) : null;
}

function HelpDisclosure({ subject, what, where, why }: HelpDisclosureProps) {
  return (
    <details className="mt-3 border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700/30">
        Help with {subject}
      </summary>
      <dl className="mt-3 grid gap-2.5 leading-6 text-slate-600">
        <div>
          <dt className="font-semibold text-slate-800">What is this?</dt>
          <dd>{what}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Where do I find it?</dt>
          <dd>{where}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Why does it matter?</dt>
          <dd>{why}</dd>
        </div>
      </dl>
    </details>
  );
}

function NumberField({
  name,
  label,
  errors,
  required = false,
  step = "0.01",
  min = "0",
  max,
  prefix,
  suffix,
  description,
  placeholder,
  help,
}: NumberFieldProps) {
  const descriptionId = description ? `${name}-description` : undefined;
  const describedBy = [descriptionId, errors[name] ? `${name}-error` : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      {description ? (
        <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-2 left-3.5 flex items-center text-slate-500">
            {prefix}
          </span>
        ) : null}
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          required={required}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={describedBy || undefined}
          className={`${fieldClassName} ${prefix ? "pl-8" : ""} ${suffix ? "pr-16" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-2 right-3.5 flex items-center text-sm text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
      <FieldError name={name} errors={errors} />
      {help}
    </div>
  );
}

function SelectField({
  name,
  label,
  errors,
  children,
  value,
  onChange,
  description,
  required = false,
}: SelectFieldProps) {
  const descriptionId = description ? `${name}-description` : undefined;
  const describedBy = [descriptionId, errors[name] ? `${name}-error` : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      {description ? (
        <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
      <select
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={describedBy || undefined}
        className={selectClassName}
      >
        {children}
      </select>
      <FieldError name={name} errors={errors} />
    </div>
  );
}

function AdvancedSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="border border-slate-200 bg-white shadow-sm">
      <summary className="min-h-14 cursor-pointer list-none px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-700/30 sm:px-5">
        <span className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              {title}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {description}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg text-teal-800"
          >
            +
          </span>
        </span>
      </summary>
      <div className="border-t border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
        {children}
      </div>
    </details>
  );
}

function getText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function readNumber(
  formData: FormData,
  errors: FormErrors,
  name: string,
  label: string,
  options: {
    required?: boolean;
    greaterThanZero?: boolean;
    integer?: boolean;
    max?: number;
  } = {},
): number | undefined {
  const rawValue = getText(formData, name);

  if (rawValue === "") {
    if (options.required) {
      errors[name] = `${label} is required.`;
    }
    return undefined;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    errors[name] = `Enter a valid ${label.toLowerCase()}.`;
  } else if (value < 0 || (options.greaterThanZero && value <= 0)) {
    errors[name] = options.greaterThanZero
      ? `${label} must be greater than zero.`
      : `${label} cannot be negative.`;
  } else if (options.integer && !Number.isInteger(value)) {
    errors[name] = `${label} must be a whole number.`;
  } else if (options.max !== undefined && value > options.max) {
    errors[name] = `${label} cannot be more than ${options.max}.`;
  }

  return value;
}

function requireSelection(
  formData: FormData,
  errors: FormErrors,
  name: string,
  label: string,
  allowedValues: readonly string[],
): string | undefined {
  const value = getText(formData, name);
  if (!allowedValues.includes(value)) {
    errors[name] = `Choose how the ${label.toLowerCase()} is paid.`;
    return undefined;
  }
  return value;
}

function adaptFormToEngineInput(formData: FormData): {
  input: SingleLeaseAnalysisInput;
  vehicleName?: string;
} {
  const errors: FormErrors = {};
  const vehicleName = getText(formData, "vehicleName") || undefined;
  const paymentAmount = readNumber(
    formData,
    errors,
    "paymentAmount",
    "Payment amount",
    { required: true },
  );
  const termMonths = readNumber(
    formData,
    errors,
    "termMonths",
    "Lease term",
    { required: true, greaterThanZero: true, integer: true },
  );
  const annualKilometres = readNumber(
    formData,
    errors,
    "annualKilometres",
    "Annual kilometres",
    { required: true, greaterThanZero: true, integer: true },
  );
  const paymentFrequency = getText(
    formData,
    "paymentFrequency",
  ) as PaymentFrequency;
  const paymentCount = readNumber(
    formData,
    errors,
    "paymentCount",
    "Payment count",
    {
      required: paymentFrequency !== "monthly",
      greaterThanZero: true,
      integer: true,
    },
  );
  const dueAtSigningAmount = readNumber(
    formData,
    errors,
    "dueAtSigning",
    "Due at signing",
  );

  const taxChoice = getText(formData, "taxStatus");
  let paymentTax: PaymentTaxTreatment;
  if (taxChoice === "yes") {
    paymentTax = { status: "included" };
  } else if (taxChoice === "no") {
    const taxPercent = readNumber(
      formData,
      errors,
      "taxRatePercent",
      "Applicable tax rate",
      { required: true, max: 100 },
    );
    paymentTax = {
      status: "excluded",
      applicableRate:
        taxPercent === undefined ? undefined : taxPercent / 100,
    };
  } else {
    paymentTax = { status: "unknown" };
  }

  const firstPaymentChoice = getText(formData, "firstPaymentAtSigning");
  const firstPaymentAtSigning =
    firstPaymentChoice === "included" || firstPaymentChoice === "separate"
      ? firstPaymentChoice === "included"
        ? "included-in-due-at-signing"
        : "paid-separately"
      : "unknown";

  const upfrontCompleteness = getText(formData, "upfrontCompleteness");
  const upfrontAmountsComplete = upfrontCompleteness === "complete";

  const cashDownAmount = readNumber(
    formData,
    errors,
    "cashDown",
    "Cash down",
  );
  let cashDown: SingleLeaseAnalysisInput["cashDown"];
  if (cashDownAmount !== undefined) {
    const treatment = requireSelection(
      formData,
      errors,
      "cashDownTreatment",
      "Cash down",
      ["included-in-due-at-signing", "paid-separately"],
    ) as UpfrontPaymentTreatment | undefined;
    if (treatment) {
      cashDown = { amount: cashDownAmount, paymentTreatment: treatment };
    }
  }

  const upfrontFees: LeaseFee[] = [];
  for (const definition of feeDefinitions) {
    const amount = readNumber(
      formData,
      errors,
      definition.name,
      definition.label,
    );
    if (amount === undefined) {
      continue;
    }
    const treatment = requireSelection(
      formData,
      errors,
      `${definition.name}Treatment`,
      definition.label,
      treatmentOptions.map(({ value }) => value),
    ) as FeePaymentTreatment | undefined;
    if (treatment) {
      upfrontFees.push({
        name: definition.label,
        amount,
        category: definition.category,
        paymentTreatment: treatment,
      });
    }
  }

  const securityDepositAmount = readNumber(
    formData,
    errors,
    "securityDeposit",
    "Refundable security deposit",
  );
  const refundableDeposits: RefundableDeposit[] = [];
  if (securityDepositAmount !== undefined) {
    const treatment = requireSelection(
      formData,
      errors,
      "securityDepositTreatment",
      "Security deposit",
      ["included-in-due-at-signing", "paid-separately"],
    ) as UpfrontPaymentTreatment | undefined;
    if (treatment) {
      refundableDeposits.push({
        name: "Security deposit",
        amount: securityDepositAmount,
        paymentTreatment: treatment,
      });
    }
  }

  const msrp = readNumber(formData, errors, "msrp", "MSRP");
  const sellingPrice = readNumber(
    formData,
    errors,
    "sellingPrice",
    "Selling price",
  );
  const residualValue = readNumber(
    formData,
    errors,
    "residualValue",
    "Residual value",
  );
  const dealerDiscount = readNumber(
    formData,
    errors,
    "dealerDiscount",
    "Dealer discount",
  );

  const manufacturerIncentiveAmount = readNumber(
    formData,
    errors,
    "manufacturerIncentive",
    "Manufacturer incentive",
  );
  let rebatesAndIncentives: RebateOrIncentive[] | undefined;
  if (manufacturerIncentiveAmount !== undefined) {
    const application = getText(formData, "manufacturerIncentiveApplication");
    rebatesAndIncentives = [
      {
        name: "Manufacturer incentive",
        amount: manufacturerIncentiveAmount,
        source: "manufacturer",
        application:
          application === "capitalized-cost-reduction" || application === "cash"
            ? application
            : "unknown",
      },
    ];
  } else if (getText(formData, "capitalizedItemsComplete") === "complete") {
    rebatesAndIncentives = [];
  }

  const financingChoice = getText(formData, "financingMethod");
  let financing: LeaseFinancing | undefined;
  if (financingChoice === "apr") {
    const aprPercent = readNumber(
      formData,
      errors,
      "aprPercent",
      "APR",
      { required: true },
    );
    if (aprPercent !== undefined) {
      financing = { methodology: "apr", aprPercent };
    }
  } else if (financingChoice === "money-factor") {
    const moneyFactor = readNumber(
      formData,
      errors,
      "moneyFactor",
      "Money factor",
      { required: true },
    );
    if (moneyFactor !== undefined) {
      financing = {
        methodology: "standard-money-factor",
        moneyFactor,
        compatibleWithStandardFormula:
          formData.get("moneyFactorVerified") === "on",
      };
    }
  } else if (financingChoice === "unknown") {
    financing = { methodology: "unknown" };
  }

  const leaseEndScenarioValue = getText(formData, "leaseEndScenario");
  const leaseEndScenario =
    leaseEndScenarioValue === "return" || leaseEndScenarioValue === "buyout"
      ? leaseEndScenarioValue
      : "unknown";
  const leaseEndFeeAmount = readNumber(
    formData,
    errors,
    "leaseEndFeeAmount",
    "Contractual lease-end fee",
  );
  const leaseEndFees: ContractualLeaseEndFee[] = [];
  if (leaseEndFeeAmount !== undefined) {
    const feeName = getText(formData, "leaseEndFeeName");
    if (!feeName) {
      errors.leaseEndFeeName = "Enter the fee name shown on the contract.";
    }
    const applicabilityValue = getText(
      formData,
      "leaseEndFeeApplicability",
    );
    leaseEndFees.push({
      name: feeName || "Unclassified contractual fee",
      amount: leaseEndFeeAmount,
      applicability:
        applicabilityValue === "all-end-scenarios" ||
        applicabilityValue === "return-only" ||
        applicabilityValue === "buyout-only"
          ? applicabilityValue
          : "unknown",
    });
  }

  const excessKilometreRate = readNumber(
    formData,
    errors,
    "excessKilometreRate",
    "Excess-kilometre rate",
  );
  const includedKilometres = readNumber(
    formData,
    errors,
    "includedKilometres",
    "Included kilometres",
  );
  const wearEstimate = readNumber(
    formData,
    errors,
    "wearEstimate",
    "Wear estimate",
  );
  const conditionalLeaseEndCosts: ConditionalLeaseEndCost[] = [];
  if (excessKilometreRate !== undefined) {
    conditionalLeaseEndCosts.push({
      type: "excess-kilometres",
      ratePerKilometre: excessKilometreRate,
      includedKilometres,
    });
  }
  if (wearEstimate !== undefined) {
    conditionalLeaseEndCosts.push({
      type: "excess-wear",
      estimatedAmount: wearEstimate,
    });
  }

  if (Object.keys(errors).length > 0) {
    throw new FormInputError(errors);
  }

  return {
    vehicleName,
    input: {
      payment: {
        amount: paymentAmount as number,
        frequency: paymentFrequency,
        paymentCount,
        tax: paymentTax,
      },
      termMonths: termMonths as number,
      annualKilometres: annualKilometres as number,
      dueAtSigning:
        dueAtSigningAmount === undefined
          ? undefined
          : {
              totalAmount: dueAtSigningAmount,
              breakdownComplete: upfrontAmountsComplete,
            },
      firstPaymentAtSigning,
      cashDown,
      upfrontFees:
        upfrontFees.length > 0
          ? upfrontFees
          : upfrontAmountsComplete
            ? []
            : undefined,
      refundableDeposits:
        refundableDeposits.length > 0
          ? refundableDeposits
          : upfrontAmountsComplete
            ? []
            : undefined,
      upfrontAmountsComplete,
      msrp,
      sellingPrice,
      residualValue,
      dealerDiscount,
      rebatesAndIncentives,
      capitalizedItemsComplete:
        getText(formData, "capitalizedItemsComplete") === "complete",
      financing,
      leaseEndFees:
        leaseEndFees.length > 0
          ? leaseEndFees
          : getText(formData, "leaseEndFeesComplete") === "complete"
            ? []
            : undefined,
      leaseEndFeesComplete:
        getText(formData, "leaseEndFeesComplete") === "complete",
      leaseEndScenario,
      conditionalLeaseEndCosts:
        conditionalLeaseEndCosts.length > 0
          ? conditionalLeaseEndCosts
          : undefined,
    },
  };
}

class FormInputError extends Error {
  constructor(readonly fields: FormErrors) {
    super("Please correct the highlighted fields.");
  }
}

function friendlyEngineError(error: Error): string {
  if (error.message.includes("Known due-at-signing components exceed")) {
    return "The amounts marked as included at signing add up to more than the total due at signing.";
  }
  if (error.message.includes("complete due-at-signing breakdown")) {
    return "The signing breakdown is marked complete, but its items do not add up to the entered due-at-signing total.";
  }
  if (error.message.includes("Refundable deposits and the included first payment")) {
    return "The refundable deposit and included first payment are greater than the total due at signing.";
  }
  return error.message;
}

function getEngineFieldErrors(error: Error): FormErrors | undefined {
  if (error.message.includes("Known due-at-signing components exceed")) {
    return {
      dueAtSigning:
        "Due at signing is lower than the items marked as included, such as the first payment. Correct the total or what is included.",
    };
  }
  if (error.message.includes("complete due-at-signing breakdown")) {
    return {
      dueAtSigning:
        "This total does not match the breakdown marked as complete. Correct the amount or mark the breakdown incomplete.",
    };
  }
  if (error.message.includes("Refundable deposits and the included first payment")) {
    return {
      dueAtSigning:
        "Due at signing is lower than the refundable deposit and included first payment entered below.",
    };
  }
  return undefined;
}

function humanizeMissingField(field: string): string {
  const labels: Record<string, string> = {
    "payment.paymentCountOrValidatedSchedule": "A payment count or verified schedule",
    "payment.tax.applicableRate": "The applicable payment tax rate",
    "payment.tax.status": "Whether the advertised payment includes tax",
    firstPaymentAtSigning: "Whether the first payment is in the signing amount",
    upfrontAmountsComplete: "A complete upfront-cost breakdown",
    leaseEndFeesComplete: "A complete contractual lease-end fee list",
    "dueAtSigning.completeBreakdown": "A complete due-at-signing breakdown",
    leaseEndScenario: "Whether you expect to return or buy out the vehicle",
  };

  return labels[field] ?? field;
}

export function SingleLeaseQuoteForm() {
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>("monthly");
  const [taxStatus, setTaxStatus] = useState("unknown");
  const [financingMethod, setFinancingMethod] = useState("none");
  const [errors, setErrors] = useState<FormErrors>({});
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  function focusFeedback() {
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFeedback(null);

    try {
      const formData = new FormData(event.currentTarget);
      const { input, vehicleName } = adaptFormToEngineInput(formData);
      const result = analyzeSingleLease(input);
      const paymentQuality = result.paymentBased.quality;
      const quoteLabel = vehicleName ? ` for ${vehicleName}` : "";

      if (paymentQuality.status === "unavailable") {
        setFeedback({
          tone: "needs-information",
          title: "A little more information is needed",
          message: `The quote${quoteLabel} was checked, but a reliable payment-based total is not available yet.`,
          details: paymentQuality.missingFields.map(humanizeMissingField),
        });
      } else if (paymentQuality.status === "estimated") {
        setFeedback({
          tone: "estimate",
          title: "Quote details checked with some unknowns",
          message:
            "The entered details passed the preflight check. Some information is still uncertain, so the detailed analysis in the next stage must be shown as an estimate.",
          details: [
            ...paymentQuality.missingFields.map(humanizeMissingField),
            ...paymentQuality.warnings,
          ],
        });
      } else {
        setFeedback({
          tone: "ready",
          title: "Your quote details passed the preflight check",
          message:
            "The payment-based inputs are internally consistent. Detailed single-quote results will be added in the next milestone.",
          details: [],
        });
      }
      focusFeedback();
    } catch (error) {
      if (error instanceof FormInputError) {
        setErrors(error.fields);
        setFeedback({
          tone: "needs-information",
          title: "Check the highlighted fields",
          message: "Nothing was checked or saved. Correct the entries and try again.",
          details: Object.values(error.fields),
        });
        const firstFieldName = Object.keys(error.fields)[0];
        requestAnimationFrame(() => {
          const field = formRef.current?.querySelector<HTMLElement>(
            `[name="${firstFieldName}"]`,
          );
          field?.focus();
        });
        return;
      }

      const message =
        error instanceof Error
          ? friendlyEngineError(error)
          : "The quote could not be checked.";
      const engineFieldErrors =
        error instanceof Error ? getEngineFieldErrors(error) : undefined;
      if (engineFieldErrors) {
        setErrors(engineFieldErrors);
      }
      setFeedback({
        tone: "needs-information",
        title: "The quote details conflict",
        message,
        details: ["Review the due-at-signing total and anything marked as included in it."],
      });
      if (engineFieldErrors?.dueAtSigning) {
        requestAnimationFrame(() => {
          formRef.current
            ?.querySelector<HTMLElement>('[name="dueAtSigning"]')
            ?.focus();
        });
      } else {
        focusFeedback();
      }
    }
  }

  function handleFormInput(event: FormEvent<HTMLFormElement>) {
    const fieldName = (event.target as HTMLInputElement | HTMLSelectElement).name;
    if (!fieldName || !errors[fieldName]) {
      return;
    }

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }

  const feedbackClasses =
    feedback?.tone === "ready"
      ? "border-teal-200 bg-teal-50 text-teal-950"
      : feedback?.tone === "estimate"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-red-200 bg-red-50 text-red-950";

  return (
    <section className="px-4 py-8 sm:px-8 sm:py-12" aria-labelledby="quote-form-title">
      <div className="mx-auto w-full max-w-4xl">
        <form
          id="single-lease-form"
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          onInput={handleFormInput}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_55px_-44px_rgba(15,23,42,0.6)] sm:p-6">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Start here
              </p>
              <h2 id="quote-form-title" className="mt-2 text-xl font-semibold text-slate-950">
                Basic quote details
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use the amounts exactly as shown on the dealer&apos;s quote. Optional fields can stay blank when you do not know them.
              </p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="vehicleName" className="text-sm font-semibold text-slate-800">
                  Vehicle name or trim <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="vehicleName"
                  name="vehicleName"
                  type="text"
                  placeholder="Example: 2026 Honda CR-V Sport"
                  className={fieldClassName}
                />
              </div>

              <NumberField
                name="paymentAmount"
                label="Payment amount"
                errors={errors}
                required
                prefix="$"
                placeholder="499.00"
                description="Enter one advertised payment, not the full lease total."
              />

              <SelectField
                name="paymentFrequency"
                label="Payment frequency"
                errors={errors}
                required
                value={paymentFrequency}
                onChange={(value) => setPaymentFrequency(value as PaymentFrequency)}
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Biweekly</option>
                <option value="weekly">Weekly</option>
              </SelectField>

              {paymentFrequency !== "monthly" ? (
                <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <NumberField
                    name="paymentCount"
                    label="Total payment count"
                    errors={errors}
                    required
                    step="1"
                    min="1"
                    placeholder={paymentFrequency === "weekly" ? "156" : "78"}
                    description="Use the count printed on the quote or verified lender schedule. It must include every scheduled payment, including the first."
                  />
                </div>
              ) : null}

              <NumberField
                name="termMonths"
                label="Lease term"
                errors={errors}
                required
                step="1"
                min="1"
                suffix="months"
                placeholder="36"
              />

              <NumberField
                name="annualKilometres"
                label="Annual kilometres"
                errors={errors}
                required
                step="1"
                min="1"
                suffix="km"
                placeholder="20000"
              />

              <NumberField
                name="dueAtSigning"
                label="Due at signing"
                errors={errors}
                prefix="$"
                placeholder="Leave blank if unknown"
                description="The total the dealer says is due when the vehicle is delivered."
                help={
                  <HelpDisclosure
                    subject="due at signing"
                    what="The total cash requested at delivery. It can contain the first payment, down payment, fees, and refundable deposits."
                    where="Look for “due at signing,” “due on delivery,” or “total drive-off” on the quote."
                    why="Knowing what is inside this total prevents the same payment or fee from being counted twice."
                  />
                }
              />

              <SelectField
                name="taxStatus"
                label="Payment includes tax?"
                errors={errors}
                required
                value={taxStatus}
                onChange={setTaxStatus}
                description="Choose “Not sure” rather than guessing."
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Not sure</option>
              </SelectField>

              {taxStatus === "no" ? (
                <NumberField
                  name="taxRatePercent"
                  label="Applicable tax rate"
                  errors={errors}
                  required
                  min="0"
                  max="100"
                  suffix="%"
                  placeholder="13"
                  description="Enter 13 for 13%. The form converts it to 0.13 for the calculation engine."
                />
              ) : null}

              <SelectField
                name="firstPaymentAtSigning"
                label="First payment included in due at signing?"
                errors={errors}
                required
                description="Choose “Not sure” if the quote does not say."
              >
                <option value="unknown">Not sure</option>
                <option value="included">Yes, it is included</option>
                <option value="separate">No, it is paid separately</option>
              </SelectField>
            </div>
          </section>

          <section aria-labelledby="advanced-details-title">
            <div className="mb-4">
              <h2 id="advanced-details-title" className="text-lg font-semibold text-slate-950">
                Optional advanced details
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Open only the sections that match information on your quote or contract.
              </p>
            </div>

            <div className="space-y-2.5">
              <AdvancedSection
                title="Vehicle pricing"
                description="MSRP, negotiated price, residual, and dealer discount"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField name="msrp" label="MSRP" errors={errors} prefix="$" />
                  <NumberField name="sellingPrice" label="Selling price" errors={errors} prefix="$" />
                  <NumberField
                    name="residualValue"
                    label="Residual value"
                    errors={errors}
                    prefix="$"
                    help={
                      <HelpDisclosure
                        subject="residual value"
                        what="The contract value assigned to the vehicle at the end of the lease."
                        where="Look in the lease worksheet or contract for “residual” or “purchase option value.”"
                        why="It is needed to reconstruct depreciation and compatible finance charges."
                      />
                    }
                  />
                  <NumberField
                    name="dealerDiscount"
                    label="Dealer discount"
                    errors={errors}
                    prefix="$"
                    description="Keep this separate from manufacturer rebates."
                  />
                </div>
              </AdvancedSection>

              <AdvancedSection
                title="Upfront breakdown"
                description="Down payment, fees, and refundable cash"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    name="upfrontCompleteness"
                    label="How complete is this breakdown?"
                    errors={errors}
                    description="Only mark complete when every upfront amount is accounted for."
                  >
                    <option value="unknown">Not sure or incomplete</option>
                    <option value="complete">Complete</option>
                  </SelectField>

                  <div />

                  <NumberField
                    name="cashDown"
                    label="Cash down"
                    errors={errors}
                    prefix="$"
                    help={
                      <HelpDisclosure
                        subject="cash down"
                        what="A non-refundable cap-cost reduction paid to lower the lease payment."
                        where="Look for “cash down,” “cap reduction,” or “capitalized cost reduction.”"
                        why="It lowers the advertised payment but remains part of what the lease costs you."
                      />
                    }
                  />
                  <SelectField name="cashDownTreatment" label="How is cash down paid?" errors={errors}>
                    <option value="">Choose if an amount is entered</option>
                    <option value="included-in-due-at-signing">Included in due at signing</option>
                    <option value="paid-separately">Paid separately</option>
                  </SelectField>

                  {feeDefinitions.map((fee) => (
                    <div key={fee.name} className="contents">
                      <NumberField
                        name={fee.name}
                        label={fee.label}
                        errors={errors}
                        prefix="$"
                        help={
                          fee.category === "acquisition" ? (
                            <HelpDisclosure
                              subject="the acquisition fee"
                              what="A lender or leasing-company fee for starting the lease."
                              where="Look in the fee or capitalized-cost section of the quote."
                              why="Its payment treatment determines whether it is already financed or must be added upfront."
                            />
                          ) : undefined
                        }
                      />
                      <SelectField
                        name={`${fee.name}Treatment`}
                        label={`How is the ${fee.label.toLowerCase()} paid?`}
                        errors={errors}
                      >
                        <option value="">Choose if an amount is entered</option>
                        {treatmentOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  ))}

                  <NumberField
                    name="securityDeposit"
                    label="Refundable security deposit"
                    errors={errors}
                    prefix="$"
                    help={
                      <HelpDisclosure
                        subject="the security deposit"
                        what="Cash held by the lessor and potentially returned at the end of the lease."
                        where="Look for “security deposit” or “refundable deposit” in the signing breakdown."
                        why="It affects cash needed at delivery but is not automatically a permanent lease expense."
                      />
                    }
                  />
                  <SelectField
                    name="securityDepositTreatment"
                    label="How is the deposit paid?"
                    errors={errors}
                  >
                    <option value="">Choose if an amount is entered</option>
                    <option value="included-in-due-at-signing">Included in due at signing</option>
                    <option value="paid-separately">Paid separately</option>
                  </SelectField>
                </div>
              </AdvancedSection>

              <AdvancedSection
                title="Finance details"
                description="APR or money factor, only when the quote provides it"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    name="financingMethod"
                    label="Finance information shown"
                    errors={errors}
                    value={financingMethod}
                    onChange={setFinancingMethod}
                  >
                    <option value="none">Nothing shown</option>
                    <option value="unknown">Method is unclear</option>
                    <option value="apr">APR</option>
                    <option value="money-factor">Money factor</option>
                  </SelectField>

                  <SelectField
                    name="capitalizedItemsComplete"
                    label="Are all financed items entered?"
                    errors={errors}
                    description="Choose complete only if the quote identifies every capitalized fee and incentive."
                  >
                    <option value="unknown">Not sure or incomplete</option>
                    <option value="complete">Complete</option>
                  </SelectField>

                  {financingMethod === "apr" ? (
                    <NumberField
                      name="aprPercent"
                      label="APR"
                      errors={errors}
                      required
                      suffix="%"
                      help={
                        <HelpDisclosure
                          subject="APR"
                          what="An annual percentage rate disclosed by the lender. It is not interchangeable with every lease money-factor method."
                          where="Look in the finance disclosure section of the quote or contract."
                          why="The engine records APR but will not invent an unsupported lease-payment reconstruction from it."
                        />
                      }
                    />
                  ) : null}

                  {financingMethod === "money-factor" ? (
                    <>
                      <NumberField
                        name="moneyFactor"
                        label="Money factor"
                        errors={errors}
                        required
                        step="0.00001"
                        placeholder="0.00200"
                        help={
                          <HelpDisclosure
                            subject="money factor"
                            what="A decimal rate some lessors use to calculate the monthly rent charge."
                            where="Look for “money factor,” “lease factor,” or ask the dealer or lender."
                            why="It can reconstruct rent only when the lender confirms the standard formula applies."
                          />
                        }
                      />
                      <label className="flex min-h-12 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-6 text-slate-700">
                        <input
                          type="checkbox"
                          name="moneyFactorVerified"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                        />
                        <span>
                          My lender or contract confirms the standard money-factor formula applies.
                          <span className="mt-1 block text-xs text-slate-500">
                            Entering a money factor alone does not verify compatibility.
                          </span>
                        </span>
                      </label>
                    </>
                  ) : null}
                </div>
              </AdvancedSection>

              <AdvancedSection
                title="Rebates and incentives"
                description="Keep manufacturer support separate from dealer discount"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    name="manufacturerIncentive"
                    label="Manufacturer incentive"
                    errors={errors}
                    prefix="$"
                  />
                  <SelectField
                    name="manufacturerIncentiveApplication"
                    label="How is the incentive applied?"
                    errors={errors}
                    description="Choose unknown unless the quote clearly identifies its use."
                  >
                    <option value="unknown">Not sure</option>
                    <option value="capitalized-cost-reduction">Reduces capitalized cost</option>
                    <option value="cash">Paid as cash</option>
                  </SelectField>
                </div>
              </AdvancedSection>

              <AdvancedSection
                title="Lease-end details"
                description="Contractual fees, return conditions, mileage, and wear"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField name="leaseEndScenario" label="Expected lease-end scenario" errors={errors}>
                    <option value="unknown">Not sure</option>
                    <option value="return">Return the vehicle</option>
                    <option value="buyout">Buy out the vehicle</option>
                  </SelectField>
                  <SelectField
                    name="leaseEndFeesComplete"
                    label="Is the contractual fee list complete?"
                    errors={errors}
                  >
                    <option value="unknown">Not sure or incomplete</option>
                    <option value="complete">Complete</option>
                  </SelectField>

                  <div>
                    <label htmlFor="leaseEndFeeName" className="text-sm font-semibold text-slate-800">
                      Contractual fee name
                    </label>
                    <input
                      id="leaseEndFeeName"
                      name="leaseEndFeeName"
                      type="text"
                      placeholder="Example: Disposition fee"
                      aria-invalid={Boolean(errors.leaseEndFeeName)}
                      aria-describedby={errors.leaseEndFeeName ? "leaseEndFeeName-error" : undefined}
                      className={fieldClassName}
                    />
                    <FieldError name="leaseEndFeeName" errors={errors} />
                  </div>
                  <NumberField
                    name="leaseEndFeeAmount"
                    label="Contractual fee amount"
                    errors={errors}
                    prefix="$"
                  />
                  <SelectField
                    name="leaseEndFeeApplicability"
                    label="When does the fee apply?"
                    errors={errors}
                    description="Leave as unknown when the contract is unclear."
                  >
                    <option value="unknown">Not sure</option>
                    <option value="return-only">Vehicle return only</option>
                    <option value="buyout-only">Buyout only</option>
                    <option value="all-end-scenarios">All end scenarios</option>
                  </SelectField>

                  <NumberField
                    name="excessKilometreRate"
                    label="Excess-kilometre rate"
                    errors={errors}
                    prefix="$"
                    suffix="/ km"
                    placeholder="0.25"
                    description="Conditional only; it is not automatically added to lease cost."
                  />
                  <NumberField
                    name="includedKilometres"
                    label="Total included kilometres"
                    errors={errors}
                    step="1"
                    suffix="km"
                  />
                  <NumberField
                    name="wearEstimate"
                    label="Possible excess-wear amount"
                    errors={errors}
                    prefix="$"
                    description="Optional estimate kept separate from contractual fees."
                  />
                </div>
              </AdvancedSection>
            </div>
          </section>

          {feedback ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              role={feedback.tone === "needs-information" ? "alert" : "status"}
              aria-live="polite"
              className={`rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-teal-700/30 sm:p-5 ${feedbackClasses}`}
            >
              <h2 className="font-semibold">{feedback.title}</h2>
              <p className="mt-1 text-sm leading-6">{feedback.message}</p>
              {feedback.details.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {Array.from(new Set(feedback.details)).map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 border-t border-current/10 pt-3 text-xs leading-5 opacity-80">
                This preflight does not save your quote or create a completed analysis. Detailed results will be added in the next milestone.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-[0_22px_60px_-40px_rgba(15,23,42,0.9)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div>
              <p className="text-sm font-semibold">Ready to check your quote details?</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                This validates the information and prepares it for detailed analysis in the next stage. No quote data is stored.
              </p>
            </div>
            <button
              type="submit"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-500 px-6 text-base font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0 sm:mt-0 sm:w-auto"
            >
              Check quote details
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
