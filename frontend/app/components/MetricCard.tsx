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
      className={`group min-w-0 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        prominent
          ? "border-teal-200/90 bg-gradient-to-br from-teal-50 to-white shadow-[0_10px_25px_-22px_rgba(13,148,136,0.9)]"
          : "border-slate-200/80 bg-white shadow-[0_8px_22px_-22px_rgba(15,23,42,0.7)]"
      }`}
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-2 break-words font-semibold text-slate-950 ${
          prominent
            ? "text-xl tracking-tight tabular-nums sm:text-2xl"
            : "text-lg tabular-nums"
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
