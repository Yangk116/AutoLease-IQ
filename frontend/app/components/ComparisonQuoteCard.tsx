import type { LeaseQuoteInput } from "@/lib/leaseCalculations";

type MainQuoteField = keyof Pick<
  LeaseQuoteInput,
  "monthlyPayment" | "termMonths" | "annualMileage"
>;

type VehicleDealField = keyof Pick<
  LeaseQuoteInput,
  "vehicleMsrp" | "sellingPrice" | "residualMsrp" | "residualValue"
>;

type AdvancedFeeField = "dealerFees" | "leaseEndFee";
type DealerQuoteContextField = "dueOnDelivery" | "apr" | "moneyFactor";

export type ComparisonQuoteForm = LeaseQuoteInput & {
  id: "quote-a" | "quote-b";
  label: string;
  quoteName: string;
  addTaxToMonthlyPayment: boolean;
  taxRate: number;
  dueOnDelivery?: number;
  apr?: number;
  moneyFactor?: number;
  dealerNotes: string;
};

export type ComparisonQuoteNumericField = keyof Pick<
  ComparisonQuoteForm,
  | "downPayment"
  | "monthlyPayment"
  | "termMonths"
  | "annualMileage"
  | "dealerFees"
  | "leaseEndFee"
  | "taxRate"
>;

export type ComparisonQuoteOptionalNumericField = VehicleDealField;
export type ComparisonQuoteContextNumericField = DealerQuoteContextField;

type MainFieldConfig = {
  name: MainQuoteField;
  label: string;
  min: number;
  step: number;
};

type VehicleDealFieldConfig = {
  name: VehicleDealField;
  label: string;
  helperText?: string;
};

type AdvancedFeeFieldConfig = {
  name: AdvancedFeeField;
  label: string;
  helperText: string;
};

type DealerQuoteContextFieldConfig = {
  name: DealerQuoteContextField;
  label: string;
  min: number;
  step: number;
  helperText: string;
};

type ComparisonQuoteCardProps = {
  quote: ComparisonQuoteForm;
  onQuoteNameChange: (quoteId: ComparisonQuoteForm["id"], value: string) => void;
  onVehicleNameChange: (
    quoteId: ComparisonQuoteForm["id"],
    value: string,
  ) => void;
  onDealerNotesChange: (
    quoteId: ComparisonQuoteForm["id"],
    value: string,
  ) => void;
  onNumericChange: (
    quoteId: ComparisonQuoteForm["id"],
    field: ComparisonQuoteNumericField,
    value: string,
  ) => void;
  onOptionalNumericChange: (
    quoteId: ComparisonQuoteForm["id"],
    field: ComparisonQuoteOptionalNumericField | ComparisonQuoteContextNumericField,
    value: string,
  ) => void;
  onTaxIncludedChange: (
    quoteId: ComparisonQuoteForm["id"],
    checked: boolean,
  ) => void;
};

const mainFields: MainFieldConfig[] = [
  {
    name: "monthlyPayment",
    label: "Monthly payment",
    min: 0,
    step: 0.01,
  },
  {
    name: "termMonths",
    label: "Lease term in months",
    min: 1,
    step: 1,
  },
  {
    name: "annualMileage",
    label: "Annual kilometres",
    min: 1,
    step: 1_000,
  },
];

const vehicleDealFields: VehicleDealFieldConfig[] = [
  {
    name: "vehicleMsrp",
    label: "MSRP",
    helperText:
      "Use the vehicle MSRP or retail price shown on the quote. This is used to estimate dealer discount.",
  },
  {
    name: "sellingPrice",
    label: "Selling price",
  },
  {
    name: "residualMsrp",
    label: "Residual MSRP",
    helperText:
      "Use this if your quote shows a separate residual MSRP. It is used to calculate the residual percentage.",
  },
  {
    name: "residualValue",
    label: "Residual value",
    helperText:
      "This is the estimated lease-end value or buyout-related value shown on the quote.",
  },
];

const advancedFeeFields: AdvancedFeeFieldConfig[] = [
  {
    name: "dealerFees",
    label: "Dealer fees",
    helperText:
      "Only enter fees not already included in cash down, due on delivery, or monthly payment.",
  },
  {
    name: "leaseEndFee",
    label: "Lease-end fee",
    helperText:
      "Enter a separate lease-end or disposition fee if shown; do not count fees already included elsewhere.",
  },
];

const dealerQuoteContextFields: DealerQuoteContextFieldConfig[] = [
  {
    name: "dueOnDelivery",
    label: "Due on delivery",
    min: 0,
    step: 100,
    helperText:
      "For quote review context. Not added to total cost unless also entered as cash down or fees.",
  },
  {
    name: "apr",
    label: "APR",
    min: 0,
    step: 0.01,
    helperText: "APR is stored for review context in this version.",
  },
  {
    name: "moneyFactor",
    label: "Money factor",
    min: 0,
    step: 0.00001,
    helperText: "Money factor is stored for review context in this version.",
  },
];

const fieldInputClasses =
  "h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-[0_4px_14px_-12px_rgba(15,23,42,0.65)] outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";

export function ComparisonQuoteCard({
  quote,
  onQuoteNameChange,
  onVehicleNameChange,
  onDealerNotesChange,
  onNumericChange,
  onOptionalNumericChange,
  onTaxIncludedChange,
}: ComparisonQuoteCardProps) {
  const isTaxIncludedInPayment = !quote.addTaxToMonthlyPayment;
  const hasAdvancedDetails =
    vehicleDealFields.some((field) => quote[field.name] !== undefined) ||
    dealerQuoteContextFields.some((field) => quote[field.name] !== undefined) ||
    advancedFeeFields.some((field) => quote[field.name] !== 0) ||
    quote.dealerNotes.trim().length > 0;
  const labelClasses =
    "flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700";

  return (
    <article
      aria-labelledby={`${quote.id}-title`}
      className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <h3 id={`${quote.id}-title`} className="mb-4 text-lg font-semibold text-slate-950">
        {quote.label}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClasses}>
          Quote name
          <input
            type="text"
            value={quote.quoteName}
            onChange={(event) => onQuoteNameChange(quote.id, event.target.value)}
            className={fieldInputClasses}
          />
        </label>
        <label className={labelClasses}>
          Vehicle name / label
          <input
            type="text"
            value={quote.vehicleName ?? ""}
            onChange={(event) => onVehicleNameChange(quote.id, event.target.value)}
            placeholder="2026 Toyota RAV4 XLE"
            className={fieldInputClasses}
          />
        </label>
        {mainFields.map((field) => (
          <label key={field.name} className={labelClasses}>
            {field.label}
            <input
              type="number"
              min={field.min}
              step={field.step}
              value={quote[field.name]}
              onChange={(event) => onNumericChange(quote.id, field.name, event.target.value)}
              className={fieldInputClasses}
            />
          </label>
        ))}
        <label className={labelClasses}>
          Cash down
          <input
            type="number"
            min={0}
            step={100}
            value={quote.downPayment}
            onChange={(event) => onNumericChange(quote.id, "downPayment", event.target.value)}
            className={fieldInputClasses}
          />
          <span className="text-xs font-normal leading-5 text-slate-600">
            Actual down payment, not the full amount due on delivery.
          </span>
        </label>
        <div className="sm:col-span-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg focus-within:ring-2 focus-within:ring-teal-700">
            <input
              type="checkbox"
              role="switch"
              checked={isTaxIncludedInPayment}
              onChange={(event) => onTaxIncludedChange(quote.id, event.target.checked)}
              className="h-5 w-5 shrink-0 accent-teal-700"
            />
            <span className="text-sm font-semibold text-slate-800">
              Tax included in monthly payment?
            </span>
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Use the quoted monthly payment. Turn this off only for before-tax
            payments; the tax rate below will be added.
          </p>
          {!isTaxIncludedInPayment && (
            <label className={`mt-3 max-w-40 ${labelClasses}`}>
              Tax rate (%)
              <input
                type="number"
                min={0}
                step={0.1}
                value={quote.taxRate}
                onChange={(event) => onNumericChange(quote.id, "taxRate", event.target.value)}
                className={fieldInputClasses}
              />
            </label>
          )}
        </div>
      </div>

      <details className="mt-5 border border-slate-200 bg-slate-50">
        <summary className="min-h-12 cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          Advanced quote details
          <span className="sr-only"> for {quote.label}</span>
          {hasAdvancedDetails && (
            <span className="mt-1 block pl-4 text-xs font-normal text-slate-600">
              Additional quote details present
            </span>
          )}
        </summary>
        <div className="grid gap-4 border-t border-slate-200 p-3 sm:grid-cols-2">
          {vehicleDealFields.map((field) => (
            <label key={field.name} className={labelClasses}>
              {field.label}
              <input
                type="number"
                min={0}
                step={100}
                value={quote[field.name] ?? ""}
                onChange={(event) => onOptionalNumericChange(quote.id, field.name, event.target.value)}
                className={fieldInputClasses}
              />
              {field.helperText && (
                <span className="text-xs font-normal leading-5 text-slate-600">{field.helperText}</span>
              )}
            </label>
          ))}
          {dealerQuoteContextFields.map((field) => (
            <label key={field.name} className={labelClasses}>
              {field.label}
              <input
                type="number"
                min={field.min}
                step={field.step}
                value={quote[field.name] ?? ""}
                onChange={(event) => onOptionalNumericChange(quote.id, field.name, event.target.value)}
                className={fieldInputClasses}
              />
              <span className="text-xs font-normal leading-5 text-slate-600">{field.helperText}</span>
            </label>
          ))}
          {advancedFeeFields.map((field) => (
            <label key={field.name} className={labelClasses}>
              {field.label}
              <input
                type="number"
                min={0}
                step={50}
                value={quote[field.name]}
                onChange={(event) => onNumericChange(quote.id, field.name, event.target.value)}
                className={fieldInputClasses}
              />
              <span className="text-xs font-normal leading-5 text-slate-600">{field.helperText}</span>
            </label>
          ))}
          <p className="text-xs leading-5 text-slate-600 sm:col-span-2">
            Due on delivery can include the first payment, taxes, deposits, and
            fees. It is saved for context, not added to calculated costs. Enter
            actual cash down and separate fees in their own fields, without
            counting any amount twice.
          </p>
          <label className={`${labelClasses} sm:col-span-2`}>
            Dealer quote notes
            <textarea
              value={quote.dealerNotes}
              onChange={(event) => onDealerNotesChange(quote.id, event.target.value)}
              rows={3}
              placeholder="Incentives, add-ons, quote expiry, or dealer comments."
              className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            />
          </label>
        </div>
      </details>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        Missing dealer or lease-end fees may affect the comparison. A displayed
        zero does not confirm that no fee applies. Check the quote for fees not
        already included in another amount.
      </p>
    </article>
  );
}
