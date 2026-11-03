"use client";

import * as React from "react";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FileCheck2,
  GraduationCap,
  UserRound,
} from "lucide-react";
import { useAOS } from "@/hooks/use-aos";
import {
  companyMatches,
  preparationPlan,
  readinessDimensions,
  verificationStages,
  workflowSteps,
} from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "./section-eyebrow";

function WorkflowPreview({ activeStep }: { activeStep: number }) {
  const active = workflowSteps[activeStep];

  return (
    <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-xl)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Student workspace
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {active.title}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Illustrative interface
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:gap-5 sm:p-5 md:grid-cols-[148px_minmax(0,1fr)]">
        <nav aria-label="Workflow preview steps" className="grid grid-cols-2 gap-2 md:flex md:flex-col">
          {workflowSteps.map((step, index) => (
            <div
              key={step.id}
              aria-current={index === activeStep ? "step" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors md:gap-3 md:px-3",
                index === activeStep
                  ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--foreground))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.35)]",
              )}
            >
              <span
                className={cn(
                  "font-mono text-xs font-bold",
                  index === activeStep
                    ? "text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {step.id}
              </span>
              <span className="text-xs font-semibold leading-tight sm:text-sm">
                {step.title}
              </span>
            </div>
          ))}
        </nav>

        <div
          aria-live="polite"
          className="min-h-[286px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 sm:min-h-[330px] sm:p-5"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                Step {activeStep + 1} of {workflowSteps.length}
              </p>
              <h3 className="mt-1 text-lg font-bold text-[hsl(var(--foreground))] sm:text-xl">
                {active.title}
              </h3>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                {active.description}
              </p>
            </div>
          </div>

          {activeStep === 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: UserRound, title: "Academic profile", detail: "Programme and background" },
                { icon: BadgeCheck, title: "Skill profile", detail: "Skills and evidence" },
                { icon: BriefcaseBusiness, title: "Target role", detail: "Career direction" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <item.icon className="mb-3 h-5 w-5 text-[hsl(var(--primary))]" />
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</p>
                </div>
              ))}
            </div>
          )}

          {activeStep === 1 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {["Certificates", "Projects", "Achievements"].map((item) => (
                <div key={item} className="flex min-h-24 flex-col justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <FileCheck2 className="h-5 w-5 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{item}</span>
                </div>
              ))}
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-2">
              {verificationStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2">
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    stage.status === "completed"
                      ? "bg-[hsl(var(--color-success-light))] text-[hsl(var(--color-success))]"
                      : stage.status === "active"
                        ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                  )}>{index + 1}</span>
                  <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">{stage.label}</span>
                  {stage.id === "decision" && <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Faculty decides</span>}
                </div>
              ))}
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-3">
              {readinessDimensions.map((dimension) => (
                <div key={dimension} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-3">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{dimension}</span>
                  <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">Evidence-based</span>
                </div>
              ))}
            </div>
          )}

          {activeStep === 4 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {companyMatches.slice(0, 2).map((company) => (
                <div key={company.name} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[hsl(var(--foreground))]">{company.name}</span>
                    <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-xs font-bold text-[hsl(var(--color-primary-dark))]">{company.match}%</span>
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{company.role}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${company.match}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-2">
              {preparationPlan.slice(0, 3).map((item) => (
                <div key={item.day} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  {item.completed ? <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--color-success))]" /> : <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[hsl(var(--primary))]">{item.day}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.task}</p>
                  </div>
                  <BookOpen className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  useAOS();
  const [activeStep, setActiveStep] = React.useState(0);

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-t border-[hsl(var(--border))] bg-[hsl(var(--background-secondary))] py-14 md:py-16"
    >
      <div className="container-app">
        <div className="mb-10 max-w-3xl md:mb-12" data-aos="fade-up">
          <SectionEyebrow>The student journey</SectionEyebrow>
          <h2 className="text-heading mb-5 text-3xl text-[hsl(var(--foreground))] md:text-4xl lg:text-5xl">
            How PlaceCampus <span className="text-[hsl(var(--primary))]">Works</span>
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            Follow the student journey from building a profile to creating a
            focused preparation plan.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1" data-aos="fade-up">
            {workflowSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                aria-pressed={index === activeStep}
                onClick={() => setActiveStep(index)}
                onFocus={() => setActiveStep(index)}
                onMouseEnter={() => setActiveStep(index)}
                className={cn(
                  "flex min-h-[88px] w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-[var(--duration-normal)] sm:p-5",
                  index === activeStep
                    ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--card))] shadow-[var(--shadow-card)]"
                    : "border-transparent bg-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--card)/0.65)]",
                )}
              >
                <span className={cn(
                  "mt-0.5 font-mono text-lg font-bold",
                  index === activeStep ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]",
                )}>{step.id}</span>
                <span>
                  <span className="block text-base font-semibold text-[hsl(var(--foreground))]">{step.title}</span>
                  {index === activeStep && <span className="mt-1 block text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{step.description}</span>}
                </span>
              </button>
            ))}
          </div>

          <div data-aos="fade-up" data-aos-delay="100">
            <WorkflowPreview activeStep={activeStep} />
            <p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
              Sample interface preview. Details shown here are illustrative.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
