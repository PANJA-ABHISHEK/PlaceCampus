export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Evidence-Based Placement Intelligence
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SkillBridge
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Build verified skill profiles. Match against placement drives.
          Track readiness with explainable, evidence-based analysis.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a
            href="/student"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Student Portal
          </a>
          <a
            href="/admin"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold text-base border border-border hover:bg-secondary/80 transition-colors"
          >
            Administration
          </a>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          <FeatureCard
            title="Skill Taxonomy"
            description="Standardized skill definitions with levels, categories, and intelligent synonym matching."
            icon="🎯"
          />
          <FeatureCard
            title="Evidence Verification"
            description="Faculty-verified evidence converts to trusted skill claims with confidence scoring."
            icon="✅"
          />
          <FeatureCard
            title="Readiness ≠ Eligibility"
            description="Separate engines for deterministic eligibility and configurable readiness analysis."
            icon="📊"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 text-sm text-muted-foreground">
        SkillBridge v0.1.0 · Academic Project
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
