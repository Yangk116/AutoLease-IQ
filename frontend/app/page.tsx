const features = [
  {
    title: "Compare lease offers",
    description:
      "Line up multiple lease options in one clear view so the strongest offer is easier to spot.",
  },
  {
    title: "Understand true monthly cost",
    description:
      "Look beyond the advertised payment and account for the costs that shape the real monthly commitment.",
  },
  {
    title: "Identify better lease terms",
    description:
      "Evaluate mileage limits, due-at-signing costs, and term length with more confidence before choosing.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">
          AutoLease IQ
        </span>
        <span className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:inline-flex">
          Lease comparison, simplified
        </span>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Vehicle lease intelligence
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Compare the true cost of vehicle lease offers before you sign.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            AutoLease IQ helps shoppers evaluate lease offers with a clearer
            view of monthly payments, upfront costs, mileage limits, and terms.
          </p>
          <button
            type="button"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-teal-700 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
          >
            Start Comparing
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-950">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
