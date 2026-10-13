"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analyzeSingleLease, type CalculationQuality, type SingleLeaseAnalysisResult } from "@/lib/singleLeaseAnalysis";
import { readSingleLeaseSession } from "./singleLeaseSession";
import { getLeaseChecks, getMoneyFlow, missingRequirement } from "./singleLeaseResults";

const currency = (value: number) => `${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(value)} CAD`;
const linkClass = "inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700";
const frequencyLabels = { monthly: "per month", biweekly: "every two weeks", weekly: "per week" };

function QualityDetails({ quality }: { quality: CalculationQuality }) {
  return <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
    {[
      { label: "Details to confirm", items: quality.missingFields.map(missingRequirement) },
      { label: "Assumptions used", items: quality.assumptions },
      { label: "Calculation notes", items: quality.warnings },
    ].filter(({ items }) => items.length > 0).map(({ label, items }) => <div key={label}>
      <h3 className="font-semibold text-slate-900">{label}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">{Array.from(new Set(items)).map((item) => <li key={item}>{item}</li>)}</ul>
    </div>)}
  </div>;
}

export function LeaseResultsContent({ result }: { result: SingleLeaseAnalysisResult }) {
  const payment = result.paymentBased;
  const { quality } = payment;
  const available = quality.status !== "unavailable";
  const estimated = quality.status === "estimated";
  const value = (amount: number | undefined) => available && amount !== undefined ? `${currency(amount)}${estimated ? " (estimate)" : ""}` : "Not available";
  const flow = getMoneyFlow(payment);
  const checks = getLeaseChecks(payment);
  const advanced = result.advancedFinance;
  const mathValues = [
    ["MSRP", result.pricing.msrp], ["Selling price", result.pricing.sellingPrice],
    ["Residual value", result.pricing.residualValue],
    ["Reconstructed total depreciation", advanced.totalDepreciationCharge],
    ["Standard money-factor rent charge, per month", advanced.monthlyFinanceCharge],
    ["Standard money-factor rent charge, total", advanced.totalFinanceCharge],
  ] as const;

  return <>
    <section aria-labelledby="paying-title" className="border-b border-slate-200 pb-8">
      <h2 id="paying-title" className="text-xl font-semibold">What am I actually paying?</h2>
      <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-7">
        <p className="text-sm font-semibold text-teal-900">Effective monthly cost · {quality.status === "confirmed" ? "Confirmed from entered details" : estimated ? "Estimate" : "Unavailable"}</p>
        <p className="mt-2 break-words text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{available && payment.effectiveMonthlyCost !== undefined ? currency(payment.effectiveMonthlyCost) : "Not available"}</p>
        {available && payment.effectiveMonthlyCost !== undefined ? <p className="mt-1 text-sm text-teal-900">per month over the lease term{estimated ? " · estimated" : ""}</p> : null}
        <p className="mt-3 text-sm leading-6 text-slate-600">{available ? "Spreads scheduled payments and known non-refundable costs over the lease term. Refundable deposits and conditional mileage or wear charges are excluded." : "More contract details are needed to calculate a reliable lease cost."}</p>
        {quality.status !== "confirmed" ? <p className="mt-3 text-sm leading-6 text-amber-900">{estimated ? "Some details are still missing from your quote. Your estimated cost may change once the payment, upfront amounts and lease-end charges are confirmed." : "We need more information from your dealer before we can total your lease cost."} See detailed lease math for the details to confirm and any assumptions used.</p> : null}
      </div>
      <dl className="mt-6 grid gap-5 sm:grid-cols-3">
        <div><dt className="text-sm text-slate-600">Dealer-advertised payment</dt><dd className="mt-1 font-semibold">{currency(payment.dealerAdvertisedPayment)} <span className="text-sm font-normal">{frequencyLabels[payment.paymentFrequency]}</span></dd><dd className="mt-1 text-xs text-slate-500">As quoted; tax treatment may differ.</dd></div>
        <div><dt className="text-sm text-slate-600">Total lease cost</dt><dd className="mt-1 font-semibold">{value(payment.totalKnownNonRefundableLeaseCost)}</dd><dd className="mt-1 text-xs text-slate-500">Known non-refundable costs over the lease term.</dd></div>
        <div><dt className="text-sm text-slate-600">Cash required at delivery</dt><dd className="mt-1 font-semibold">{value(payment.cashRequiredAtDelivery)}</dd><dd className="mt-1 text-xs text-slate-500">Includes any entered refundable deposits.</dd></div>
      </dl>
    </section>

    <section aria-labelledby="money-title" className="border-b border-slate-200 py-8">
      <h2 id="money-title" className="text-xl font-semibold">Where does my money go?</h2>
      <p className="mt-4 text-sm leading-6 text-slate-600">{flow.explanation}</p>
      {flow.proportional && payment.totalKnownNonRefundableLeaseCost !== undefined && payment.totalKnownNonRefundableLeaseCost > 0 ? <div aria-hidden="true" className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100">{flow.components.filter(({ amount }) => amount !== undefined && amount > 0).map(({ label, amount, color }) => <div key={label} className={color} style={{ width: `${amount! / payment.totalKnownNonRefundableLeaseCost! * 100}%` }} />)}</div> : null}
      <dl className={`mt-4 ${flow.proportional ? "space-y-3" : "divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4"}`}>
        {flow.components.map(({ label, amount, status, color }) => <div key={label} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm ${flow.proportional ? "" : "py-3"}`}>
          <dt className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />{label}</dt>
          <dd className="font-semibold">{amount === undefined ? "Not available" : `${currency(amount)} total${status === "estimated" ? " (estimate)" : status === "known" ? " (known amount)" : ""}`}</dd>
        </div>)}
      </dl>
      <p className="mt-4 text-sm leading-6 text-slate-600">Refundable cash tied up: <strong className="text-slate-900">{currency(payment.refundableCashTiedUp)}</strong> in entered deposits. This is separate from permanent lease cost; refund depends on the contract conditions.</p>
      {payment.unresolvedContractualLeaseEndFeesTotal > 0 ? <p className="mt-3 text-sm text-amber-900">{currency(payment.unresolvedContractualLeaseEndFeesTotal)} in contractual lease-end fees has unresolved applicability and is excluded from the current cost.</p> : null}
    </section>

    <section aria-labelledby="check-title" className="py-8">
      <h2 id="check-title" className="text-xl font-semibold">What should I check?</h2>
      {checks.length > 0 ? <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">{checks.map((check) => <li key={check}>{check}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-slate-600">No unresolved items were identified in the entered cost details. Match these entries to the final contract before signing.</p>}
    </section>

    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="min-h-14 cursor-pointer px-5 py-4 font-semibold focus-visible:outline-2 focus-visible:outline-teal-700">See detailed lease math</summary>
      <div className="border-t border-slate-200 p-5">
        <p className="text-sm font-semibold">Payment-based calculation: {quality.status}</p>
        <QualityDetails quality={quality} />
        <dl className="mt-6 space-y-3 text-sm">{mathValues.filter(([label, amount]) => amount !== undefined && (!label.startsWith("Reconstructed") && !label.startsWith("Standard") || advanced.quality.status !== "unavailable")).map(([label, amount]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">{label}</dt><dd className="font-semibold">{currency(amount!)}{label.includes("per month") ? " / month" : ""}{label.includes("total") || label.includes("depreciation") ? " total" : ""}{advanced.quality.status === "estimated" && (label.startsWith("Standard") || label.startsWith("Reconstructed")) ? " (estimate)" : ""}</dd></div>)}
          {result.pricing.residualPercentage !== undefined ? <div className="flex flex-wrap justify-between gap-2"><dt>Residual as a share of MSRP</dt><dd>{result.pricing.residualPercentage.toFixed(2)}%</dd></div> : null}
          {advanced.quality.status !== "unavailable" && advanced.approximateAprEquivalentPercent !== undefined ? <div className="flex flex-wrap justify-between gap-2"><dt>Approximate MF-to-APR equivalent</dt><dd>{advanced.approximateAprEquivalentPercent.toFixed(2)}%{advanced.quality.status === "estimated" ? " (estimate)" : ""}</dd></div> : null}
        </dl>
        <h3 className="mt-6 font-semibold">Finance reconstruction: {advanced.quality.status}</h3>
        <QualityDetails quality={advanced.quality} />
      </div>
    </details>
  </>;
}

export function SingleLeaseAnalysisResults() {
  const [state, setState] = useState<{ status: string; result?: SingleLeaseAnalysisResult }>({ status: "loading" });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = readSingleLeaseSession();
      if (stored.status !== "ready") { setState({ status: stored.status }); return; }
      try { setState({ status: "ready", result: analyzeSingleLease(stored.session.input) }); }
      catch { setState({ status: "invalid" }); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const messages: Record<string, string> = {
    missing: "Enter a lease quote to see its costs and the details to verify.",
    invalid: "The stored quote could not be read safely. Enter your quote again.",
    stale: "Your stored quote has expired. Enter or confirm a fresh quote to continue.",
    blocked: "Browser session storage is unavailable. Allow session storage and enter your quote again.",
  };
  return <main className="min-h-screen bg-slate-50 px-4 pb-12 text-slate-950 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <nav aria-label="Analysis actions" className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 py-4"><Link href="/" className={linkClass}>AutoLease IQ · Home</Link><Link href="/analyze" className={linkClass}>Edit quote</Link></nav>
      <header className="py-8"><p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Single lease analysis</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Understand your lease quote</h1><p className="mt-3 text-sm leading-6 text-slate-600">Costs in CAD, based on the details you entered.</p></header>
      {state.result ? <LeaseResultsContent result={state.result} /> : state.status === "loading" ? <p role="status">Loading your quote…</p> : <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">No analysis available</h2><p className="mt-3 text-sm leading-6 text-slate-600">{messages[state.status]}</p><Link href="/analyze" className={`${linkClass} mt-4 bg-teal-50`}>Enter a lease quote</Link></div>}
    </div>
  </main>;
}
