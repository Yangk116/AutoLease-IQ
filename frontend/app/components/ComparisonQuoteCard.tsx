import type { LeaseQuoteInput } from "@/lib/leaseCalculations";

type MainQuoteField = keyof Pick<
  LeaseQuoteInput,
  "downPayment" | "monthlyPayment" | "termMonths" | "annualMileage"
>;

type VehicleDealField = keyof Pick<
  LeaseQuoteInput,
  "vehicleMsrp" | "sellingPrice" | "residualMsrp" | "residualValue"
>;

type AdvancedFeeField = "dealerFees" | "leaseEndFee";

export type ComparisonQuoteForm = LeaseQuoteInput & {
  id: "quote-a" | "quote-b";
  label: string;
  quoteName: string;
  addTaxToMonthlyPayment: boolean;
  taxRate: number;
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

type ComparisonQuoteCardProps = {
  quote: ComparisonQuoteForm;
  onQuoteNameChange: (quoteId: ComparisonQuoteForm["id"], value: string) => void;
  onVehicleNameChange: (
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
    field: ComparisonQuoteOptionalNumericField,
    value: string,
  ) => void;
  onTaxToggleChange: (
    quoteId: ComparisonQuoteForm["id"],
    checked: boolean,
  ) => void;
};

const mainFields: MainFieldConfig[] = [
  {
    name: "downPayment",
    label: "Down payment / due at signing",
    min: 0,
    step: 100,
  },
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
    label: "Annual mileage",
    min: 1,
    step: 1_000,
  },
];

const vehicleDealFields: VehicleDealFieldConfig[] = [
  {
    name: "vehicleMsrp",
    label: "Vehicle MSRP / retail price",
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
    label: "Optional extra upfront fees",
    helperText:
      "Use this only for separate fees you pay outside the monthly payment and due-at-signing amount.",
  },
  {
    name: "leaseEndFee",
    label: "Optional lease-end / disposition fee",
    helperText:
      "Leave this as 0 unless the quote clearly shows a separate lease-end or disposition fee.",
  },
];

const taxHelperText =
  "Turn this on only if the monthly payment you entered is before tax. If your quote already shows payment with tax, leave this off.";

export function ComparisonQuoteCard({
  quote,
  onQuoteNameChange,
  onVehicleNameChange,
  onNumericChange,
  onOptionalNumericChange,
  onTaxToggleChange,
}: ComparisonQuoteCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_22px_55px_-35px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-950">
          {quote.label}
        </h3>
        <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          Offer
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Quote name
          <input
            type="text"
            value={quote.quoteName}
            onChange={(event) =>
              onQuoteNameChange(quote.id, event.target.value)
            }
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          />
        </label>

        {mainFields.map((field) => (
          <label
            key={field.name}
            className="flex flex-col gap-2 text-sm font-medium text-slate-700"
          >
            {field.label}
            <input
              type="number"
              min={field.min}
              step={field.step}
              value={quote[field.name]}
              onChange={(event) =>
                onNumericChange(quote.id, field.name, event.target.value)
              }
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            role="switch"
            checked={quote.addTaxToMonthlyPayment}
            onChange={(event) =>
              onTaxToggleChange(quote.id, event.target.checked)
            }
            className="peer sr-only"
          />
          <span className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 p-1 transition-colors after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-teal-700 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-700" />
          <span className="text-sm font-semibold text-slate-800">
            Add tax to monthly payment
            <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
              {taxHelperText}
            </span>
          </span>
        </label>

        <label className="mt-4 flex max-w-40 flex-col gap-2 text-sm font-medium text-slate-700">
          Tax rate (%)
          <input
            type="number"
            min={0}
            step={0.1}
            value={quote.taxRate}
            onChange={(event) =>
              onNumericChange(quote.id, "taxRate", event.target.value)
            }
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          />
        </label>
      </div>

      <details className="mt-5 rounded-md border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Optional vehicle details
        </summary>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Add these when comparing different vehicles or when a quote shows
          MSRP, selling price, or residual values.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Vehicle / trim name
            <input
              type="text"
              value={quote.vehicleName ?? ""}
              onChange={(event) =>
                onVehicleNameChange(quote.id, event.target.value)
              }
              placeholder="2026 Toyota RAV4 XLE"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            />
          </label>

          {vehicleDealFields.map((field) => (
            <label
              key={field.name}
              className="flex flex-col gap-2 text-sm font-medium text-slate-700"
            >
              {field.label}
              <input
                type="number"
                min={0}
                step={100}
                value={quote[field.name] ?? ""}
                onChange={(event) =>
                  onOptionalNumericChange(
                    quote.id,
                    field.name,
                    event.target.value,
                  )
                }
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              />
              {field.helperText ? (
                <span className="text-xs leading-5 text-slate-500">
                  {field.helperText}
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </details>

      <details className="mt-5 rounded-md border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Advanced optional fees
        </summary>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Optional. Add these only when they are paid separately and are not
          already included in this offer.
        </p>
        <div className="mt-4 grid gap-4">
          {advancedFeeFields.map((field) => (
            <label
              key={field.name}
              className="flex flex-col gap-2 text-sm font-medium text-slate-700"
            >
              {field.label}
              <input
                type="number"
                min={0}
                step={50}
                value={quote[field.name]}
                onChange={(event) =>
                  onNumericChange(quote.id, field.name, event.target.value)
                }
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              />
              <span className="text-xs leading-5 text-slate-500">
                {field.helperText}
              </span>
            </label>
          ))}
        </div>
      </details>
    </article>
  );
}
