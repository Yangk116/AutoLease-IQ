type MetricCardProps = {
  label: string;
  value: string;
  helperText?: string;
  prominent?: boolean;
};

export function MetricCard({
  label,
  value,
  helperText,
  prominent = false,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-md border p-4 ${
        prominent
          ? "border-teal-200 bg-teal-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-2 font-semibold text-slate-950 ${
          prominent ? "text-2xl" : "text-lg"
        }`}
      >
        {value}
      </dd>
      {helperText ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
