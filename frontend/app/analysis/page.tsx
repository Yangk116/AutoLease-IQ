import type { Metadata } from "next";
import { SingleLeaseAnalysisResults } from "../components/SingleLeaseAnalysisResults";

export const metadata: Metadata = {
  title: "Single Lease Analysis | AutoLease IQ",
  description: "Understand your lease cost, where your money goes, and what to verify before signing.",
};

export default function AnalysisPage() {
  return <SingleLeaseAnalysisResults />;
}
