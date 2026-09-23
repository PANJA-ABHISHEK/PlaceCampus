import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { EligibilityReadiness } from "@/components/landing/EligibilityReadiness"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { StudentSection } from "@/components/landing/StudentSection"
import { PlacementCellSection } from "@/components/landing/PlacementCellSection"
import { DrivePreview } from "@/components/landing/DrivePreview"
import { Features } from "@/components/landing/Features"
import { ReadinessScore } from "@/components/landing/ReadinessScore"
import { Stats } from "@/components/landing/Stats"
import { FinalCTA } from "@/components/landing/FinalCTA"
import { Footer } from "@/components/landing/Footer"

export const metadata = {
  title: 'PlaceCampus — Intelligent University Placement Readiness Platform',
  description: 'Measure placement readiness, identify skill gaps, and prepare students for recruitment drives with PlaceCampus.',
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <EligibilityReadiness />
        <HowItWorks />
        <StudentSection />
        <PlacementCellSection />
        <DrivePreview />
        <Features />
        <ReadinessScore />
        <Stats />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
