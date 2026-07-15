import Link from "next/link";

import { SiteHeader } from "./components/SiteHeader";

type ProductFlowItem = {
  step: string;
  title: string;
  description: string;
};

const productFlow: ProductFlowItem[] = [
  {
    step: "01",
    title: "Compare lease quotes",
    description: "Enter two offers and normalize the costs behind each payment.",
  },
  {
    step: "02",
    title: "Review the dashboard",
    description: "Focus on the verdict, trade-offs, and decision scorecard.",
  },
  {
    step: "03",
    title: "Generate a report",
    description: "Copy, print, or save a formal comparison summary.",
  },
  {
    step: "04",
    title: "Keep local history",
    description: "Save comparisons locally in this browser for later review.",
  },
];

const decisionSignals: string[] = [
  "True monthly cost",
  "Upfront cash pressure",
  "Mileage value",
  "Buyout and residual context",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="home" />

      <section
        id="overview"
        className="scroll-mt-32 border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_32%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-5 pb-14 pt-12 sm:scroll-mt-24 sm:px-8 sm:pb-16 sm:pt-18"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
                Clear lease comparison
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Compare lease offers beyond the advertised monthly payment.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Compare two offers, review the decision dashboard, and generate
                a formal report from the numbers you enter.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/compare"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-teal-700 px-6 text-base font-semibold text-white shadow-[0_12px_28px_-14px_rgba(13,148,136,0.85)] transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0"
                >
                  Start comparing
                </Link>
                <Link
                  href="/compare#examples"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2 active:translate-y-0"
                >
                  Try sample offers
                </Link>
              </div>
            </div>

            <aside className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_42%),linear-gradient(145deg,#0f172a,#111827)] p-5 text-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.9)] sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                    Decision snapshot
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    See the full lease structure
                  </h2>
                </div>
                <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-200">
                  4 signals
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {decisionSignals.map((signal, index) => (
                  <div
                    key={signal}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-400 text-xs font-black text-slate-950">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-100">
                      {signal}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
                Based only on entered numbers. Does not use live market data.
              </p>
            </aside>
          </div>

          <div className="mt-14">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                One focused flow from quote details to saved work.
              </h2>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)]">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                {productFlow.map((item, index) => (
                  <article
                    key={item.step}
                    className={`p-5 sm:p-6 ${
                      index > 0 ? "border-t border-slate-200" : ""
                    } ${index % 2 === 1 ? "sm:border-l" : ""} ${
                      index >= 2 ? "sm:border-t" : "sm:border-t-0"
                    } ${index > 0 ? "lg:border-l lg:border-t-0" : ""}`}
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
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col gap-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.55)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Ready to compare your offers?
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                No upload or external AI call. Saved locally in this browser.
              </p>
            </div>
            <Link
              href="/compare"
              className="inline-flex h-11 shrink-0 items-center justify-center self-start rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 active:translate-y-0 sm:self-auto"
            >
              Compare your offers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
