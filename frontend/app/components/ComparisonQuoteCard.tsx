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
    label: "Annual mileage",
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
      "Leave this as 0 unless the quote clearly shows a separate lease-end or disposition fee.",
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

  return (
    <article className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.6)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.5)] sm:p-6">
      <div className="-mx-4 -mt-4 mb-5 flex items-center justify-between gap-3 rounded-t-[1.25rem] border-b border-slate-800 bg-slate-950 p-4 sm:-mx-6 sm:-mt-6 sm:mb-6 sm:p-6">
        <h3 className="text-lg font-semibold text-white">
          {quote.label}
        </h3>
        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-200">
          Offer
        </span>
      </div>

      <div className="grid gap-4">
        <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Quote name
          <input
            type="text"
            value={quote.quoteName}
            onChange={(event) =>
              onQuoteNameChange(quote.id, event.target.value)
            }
            className={fieldInputClasses}
          />
        </label>
      </div>

      <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Dealer quote details
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Enter the fields as they appear on the dealer quote. Cash down,
            monthly payment, term, mileage, dealer fees, and lease-end fee feed
            the cost calculation.
          </p>
        </div>

        <div className="mt-5 space-y-6">
          <section>
            <h4 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-teal-700 after:h-px after:flex-1 after:bg-slate-200">
              Vehicle and price
            </h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Vehicle name / label
                <input
                  type="text"
                  value={quote.vehicleName ?? ""}
                  onChange={(event) =>
                    onVehicleNameChange(quote.id, event.target.value)
                  }
                  placeholder="2026 Toyota RAV4 XLE"
                  className={`${fieldInputClasses} placeholder:text-slate-400`}
                />
              </label>

              {vehicleDealFields.map((field) => (
                <label
                  key={field.name}
                  className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700"
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
                    className={fieldInputClasses}
                  />
                  {field.helperText ? (
                    <span className="text-xs leading-5 text-slate-500">
                      {field.helperText}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h4 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-teal-700 after:h-px after:flex-1 after:bg-slate-200">
              Lease terms
            </h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {mainFields.map((field) => (
                <label
                  key={field.name}
                  className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700"
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
                    className={fieldInputClasses}
                  />
                  {field.name === "monthlyPayment" ? (
                    <span className="text-xs leading-5 text-slate-500">
                      Use the dealer&apos;s monthly payment exactly as shown.
                    </span>
                  ) : null}
                </label>
              ))}

              <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={isTaxIncludedInPayment}
                    onChange={(event) =>
                      onTaxIncludedChange(quote.id, event.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <span className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 p-1 transition-colors after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-teal-700 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-700" />
                  <span className="text-sm font-semibold text-slate-800">
                    Tax included in monthly payment
                    <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                      Most dealer quotes show monthly payment with tax. Turn
                      this off only for before-tax payments.
                    </span>
                  </span>
                </label>

                {!isTaxIncludedInPayment ? (
                  <label className="mt-4 flex w-full max-w-40 min-w-0 flex-col gap-2 text-sm font-medium text-slate-700">
                    Tax rate (%)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={quote.taxRate}
                      onChange={(event) =>
                        onNumericChange(quote.id, "taxRate", event.target.value)
                      }
                      className={fieldInputClasses}
                    />
                  </label>
                ) : null}
              </div>

              {dealerQuoteContextFields
                .filter((field) => field.name !== "dueOnDelivery")
                .map((field) => (
                  <label
                    key={field.name}
                    className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700"
                  >
                    {field.label}
                    <input
                      type="number"
                      min={field.min}
                      step={field.step}
                      value={quote[field.name] ?? ""}
                      onChange={(event) =>
                        onOptionalNumericChange(
                          quote.id,
                          field.name,
                          event.target.value,
                        )
                      }
                      className={fieldInputClasses}
                    />
                    <span className="text-xs leading-5 text-slate-500">
                      {field.helperText}
                    </span>
                  </label>
                ))}
            </div>
          </section>

          <section>
            <h4 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-teal-700 after:h-px after:flex-1 after:bg-slate-200">
              Cash and fees
            </h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700">
                Cash down
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={quote.downPayment}
                  onChange={(event) =>
                    onNumericChange(quote.id, "downPayment", event.target.value)
                  }
                  className={fieldInputClasses}
                />
                <span className="text-xs leading-5 text-slate-500">
                  Included in total cost calculation.
                </span>
              </label>

              {dealerQuoteContextFields
                .filter((field) => field.name === "dueOnDelivery")
                .map((field) => (
                  <label
                    key={field.name}
                    className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700"
                  >
                    {field.label}
                    <input
                      type="number"
                      min={field.min}
                      step={field.step}
                      value={quote[field.name] ?? ""}
                      onChange={(event) =>
                        onOptionalNumericChange(
                          quote.id,
                          field.name,
                          event.target.value,
                        )
                      }
                      className={fieldInputClasses}
                    />
                    <span className="text-xs leading-5 text-slate-500">
                      {field.helperText}
                    </span>
                  </label>
                ))}

              {advancedFeeFields.map((field) => (
                <label
                  key={field.name}
                  className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700"
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
                    className={fieldInputClasses}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {field.helperText}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              Due on delivery may include first payment, taxes, deposit,
              license, or fees. It is saved for review context and is not
              double-counted unless you also enter those amounts as cash down or
              fees.
            </p>
          </section>

          <section>
            <h4 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-teal-700 after:h-px after:flex-1 after:bg-slate-200">
              Notes
            </h4>
            <label className="mt-3 flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700">
              Dealer quote notes
              <textarea
                value={quote.dealerNotes}
                onChange={(event) =>
                  onDealerNotesChange(quote.id, event.target.value)
                }
                rows={3}
                placeholder="Incentives, add-ons, quote expiry, included taxes, or dealer comments."
                className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              />
            </label>
          </section>
        </div>
      </section>
    </article>
  );
}
