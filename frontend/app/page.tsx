import Link from "next/link";

import { SiteHeader } from "./components/SiteHeader";

type ProductFlowItem = {
  step: string;
  title: string;
  description: string;
};

type LandingBenefit = {
  title: string;
  description: string;
};

const productFlow: ProductFlowItem[] = [
  {
    step: "01",
    title: "Enter quote numbers",
    description: "Add the payment, upfront cash, term, mileage, and fees.",
  },
  {
    step: "02",
    title: "Compare true cost",
    description: "See what each offer costs beyond the advertised payment.",
  },
  {
    step: "03",
    title: "Review final verdict",
    description: "Choose a decision goal and understand the key trade-offs.",
  },
  {
    step: "04",
    title: "Generate report",
    description: "Save, print, or copy a polished comparison summary.",
  },
];

const decisionSignals: string[] = [
  "True monthly cost",
  "Upfront cash pressure",
  "Mileage value",
  "Buyout and residual context",
];

const landingBenefits: LandingBenefit[] = [
  {
    title: "Compare true cost",
    description:
      "Normalize payments, upfront cash, fees, term, and mileage into a fair comparison.",
  },
  {
    title: "Understand trade-offs",
    description:
      "See where an offer wins and what you give up across cost, flexibility, and value.",
  },
  {
    title: "Negotiate smarter",
    description:
      "Turn the quote details into focused questions for the dealer before you commit.",
  },
  {
    title: "Save or print a report",
    description:
      "Keep a decision-ready summary you can review, copy, or bring into the showroom.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <SiteHeader currentPage="home" />

      <section
        id="overview"
        className="scroll-mt-32 border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.13),transparent_34%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-6 pb-16 pt-14 sm:scroll-mt-24 sm:px-8 sm:pb-20 sm:pt-20"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
            <div>
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
                Vehicle lease intelligence
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Compare lease offers beyond the advertised monthly payment.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                Understand true monthly cost, upfront cash pressure, buyout
                risk, and the questions worth asking before you sign. Then
                generate a polished report you can save or print.
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

            <aside className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)] sm:p-6">
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
              <p className="mt-5 text-sm leading-6 text-slate-400">
                Built to compare the numbers dealers emphasize with the costs
                that actually shape your decision.
              </p>
            </aside>
          </div>

          <div className="mt-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                A clear path from quote details to a confident decision.
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

      <section className="px-6 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                Decision-ready output
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                From dealer quote to decision-ready report.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Focus on the numbers and trade-offs that matter before the
                paperwork is in front of you.
              </p>
            </div>
            <Link
              href="/compare"
              className="inline-flex h-11 shrink-0 items-center justify-center self-start rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 active:translate-y-0 sm:self-auto"
            >
              Compare your offers
            </Link>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {landingBenefits.map((benefit, index) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-sm font-bold text-teal-800">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
