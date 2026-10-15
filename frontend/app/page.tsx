import Link from "next/link";

import { SiteHeader } from "./components/SiteHeader";

const tasks = [
  {
    title: "Analyze one quote",
    question: "I have one dealer quote. What am I actually paying?",
    description:
      "Understand payments, effective monthly cost, upfront cash, fee transparency, and missing information.",
    cta: "Analyze my lease",
    href: "/analyze",
  },
  {
    title: "Compare offers",
    question: "I have two offers. Which option suits me better?",
    description:
      "Compare total lease cost, upfront cash, mileage differences, and decision trade-offs.",
    cta: "Compare lease offers",
    href: "/compare",
  },
];

const steps = [
  {
    title: "Enter your quote details",
    description: "Start with one dealer quote or two offers.",
  },
  {
    title: "Understand the costs",
    description: "Review the entered numbers and any unknown details.",
  },
  {
    title: "Decide what comes next",
    description: "Use the results to weigh trade-offs and ask informed questions.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader currentPage="home" />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
        <section aria-labelledby="home-title">
          <h1
            id="home-title"
            className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          >
            Know what you&apos;re really paying.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-600">
            Understand lease quotes, compare offers, and make more informed
            decisions.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {tasks.map((task, index) => (
              <article
                key={task.href}
                aria-labelledby={`task-${index}`}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h2
                  id={`task-${index}`}
                  className="text-2xl font-semibold tracking-tight"
                >
                  {task.title}
                </h2>
                <p className="mt-3 text-base font-medium leading-6 text-slate-800">
                  {task.question}
                </p>
                <p className="mb-6 mt-3 text-sm leading-6 text-slate-600">
                  {task.description}
                </p>
                <Link
                  href={task.href}
                  className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                >
                  {task.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="workflow-title">
          <h2 id="workflow-title" className="text-xl font-semibold">
            How it works
          </h2>
          <ol className="mt-4 grid gap-5 md:grid-cols-3 md:gap-6">
            {steps.map((step, index) => (
              <li key={step.title}>
                <p className="text-sm font-semibold text-teal-700">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mt-8 border-t border-slate-200 pt-6"
          aria-labelledby="trust-title"
        >
          <h2 id="trust-title" className="text-base font-semibold">
            Clear numbers, clear limits
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Results are based on entered numbers, and unknown details are
            identified. Saved comparisons remain in this browser. The current
            version uses no live market data or external AI analysis.
          </p>
        </section>
      </div>
    </main>
  );
}
