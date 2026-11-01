import { HeroSection } from "@/features/landing/components/hero-section";
import { ValueSection } from "@/features/landing/components/value-section";
import { HowItWorksSection } from "@/features/landing/components/how-it-works";
import { AiVerificationSection } from "@/features/landing/components/ai-verification";
import { ReadinessMatchingSection } from "@/features/landing/components/readiness-matching";
import { PreparationJourneySection } from "@/features/landing/components/preparation-journey";
import { UniversityIntelligenceSection } from "@/features/landing/components/university-intelligence";
import { FinalCtaSection } from "@/features/landing/components/final-cta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PlaceCampus | Unified Placement & Student Readiness Platform",
  description:
    "AI-assisted verification, student readiness, placement matching, and personalized preparation. Know where you stand. Know what to improve. Know where you fit.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <HeroSection />
      <ValueSection />
      <HowItWorksSection />
      <AiVerificationSection />
      <ReadinessMatchingSection />
      <PreparationJourneySection />
      <UniversityIntelligenceSection />
      <FinalCtaSection />
    </div>
  );
}
