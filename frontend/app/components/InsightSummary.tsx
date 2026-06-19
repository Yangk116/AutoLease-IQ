export type DealInsight = {
  title: string;
  body: string;
};

const insightBasisText =
  "This analysis is based on the numbers entered. A detailed quote audit can review itemized fees later.";

type InsightSummaryProps = {
  title: string;
  insights: DealInsight[];
};

export function InsightSummary({ title, insights }: InsightSummaryProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section className="my-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.55)] sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            Analysis
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {title}
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
            {insightBasisText}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <li
            key={`${title}-${insight.title}`}
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">
              {insight.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {insight.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
