import Link from "next/link";

import { SiteHeader } from "./components/SiteHeader";

type ProductFlowItem = {
  step: string;
  title: string;
  description: string;
};

type PreviewQuote = {
  name: string;
  monthlyPayment: string;
  dueAtSigning: string;
};

const productFlow: ProductFlowItem[] = [
  {
    step: "01",
    title: "Enter two quotes",
    description: "Add the payment, upfront costs, mileage, residual, and fees.",
  },
  {
    step: "02",
    title: "Review the decision dashboard",
    description: "See the recommendation, scorecard, and key trade-offs.",
  },
  {
    step: "03",
    title: "Open or print the report",
    description: "Move from the compact review into a formal summary.",
  },
];

const previewQuotes: PreviewQuote[] = [
  {
    name: "Quote A",
    monthlyPayment: "$489 / month",
    dueAtSigning: "$3,100 due at signing",
  },
  {
    name: "Quote B",
    monthlyPayment: "$515 / month",
    dueAtSigning: "$1,900 due at signing",
  },
];

const trustNotes: string[] = [
  "Based only on entered numbers",
  "Saved comparisons stay locally in this browser",
  "No upload, live market data, or external AI call",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="home" />

      <section className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_32%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-5 pb-14 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:gap-14">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              Clear lease comparison
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Compare lease quotes with the full cost in view.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Enter two lease quotes and compare true monthly cost, upfront
              cost, mileage value, plus residual and fee context. Then review a
              decision dashboard and open a printable report from the quote
              details you entered.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/compare"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-6 text-base font-semibold text-white shadow-[0_12px_28px_-14px_rgba(13,148,136,0.85)] transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 sm:w-auto"
              >
                Compare lease offers
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 sm:w-auto"
              >
                View how it works
              </Link>
            </div>

            <div
              className="mt-7 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
              role="note"
              aria-label="Product data and privacy notes"
            >
              <ul className="grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-3 sm:gap-4">
                {trustNotes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600"
                      aria-hidden="true"
                    />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside
            className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_42%),linear-gradient(145deg,#0f172a,#111827)] p-5 text-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.9)] sm:p-6"
            aria-labelledby="preview-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                  Example interface
                </p>
                <h2 id="preview-title" className="mt-1 text-xl font-semibold">
                  Illustrative comparison preview
                </h2>
              </div>
              <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-200">
                Static sample
              </span>
            </div>

            <div className="mt-5 grid min-w-0 grid-cols-2 gap-3">
              {previewQuotes.map((quote) => (
                <article
                  key={quote.name}
                  className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] p-3.5"
                  aria-label={`${quote.name} illustrative values`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {quote.name}
                  </p>
                  <p className="mt-2 break-words text-base font-semibold text-white sm:text-lg">
                    {quote.monthlyPayment}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                    {quote.dueAtSigning}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-teal-300/20 bg-teal-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                Illustrative verdict
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                Quote B leads for upfront flexibility.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                The dashboard explains the trade-offs behind the recommendation.
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Review scorecard
              </p>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Example scorecard categories">
                {[
                  "True monthly cost",
                  "Mileage value",
                  "Residual + fees",
                ].map((signal) => (
                  <span
                    key={signal}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-slate-200"
                  >
                    {signal}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs font-semibold text-slate-300">
                <span>Decision dashboard</span>
                <span aria-hidden="true" className="text-teal-300">
                  →
                </span>
                <span>Open or print report</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-32 px-5 py-14 sm:scroll-mt-24 sm:px-8 sm:py-16"
        aria-labelledby="workflow-title"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              How it works
            </p>
            <h2
              id="workflow-title"
              className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
            >
              From two quotes to a clear decision path.
            </h2>
          </div>

          <ol className="mt-8 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] md:grid-cols-3">
            {productFlow.map((item, index) => (
              <li
                key={item.step}
                className={`p-5 sm:p-6 ${
                  index > 0
                    ? "border-t border-slate-200 md:border-l md:border-t-0"
                    : ""
                }`}
              >
                <p className="text-xs font-bold tracking-[0.18em] text-teal-700">
                  STEP {item.step}
                </p>
                <h3 className="mt-3 text-base font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-5 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_22px_60px_-44px_rgba(15,23,42,0.85)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h2 className="text-lg font-semibold">
                Put your two lease quotes side by side.
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Start with the details already shown on your offers.
              </p>
            </div>
            <Link
              href="/compare"
              className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-xl bg-teal-500 px-5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-0 sm:w-auto"
            >
              Compare lease offers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
