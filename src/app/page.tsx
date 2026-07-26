import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "TalentMap | Structured psychometric assessment",
  description:
    "A secure assessment operations platform for participant access, consent, scoring, results, and contract-aligned retention.",
};

export default function Home() {
  return <LandingPage />;
}
