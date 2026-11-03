"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { preparationPlan } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "./section-eyebrow";
import { CheckCircle2, Circle } from "lucide-react";

export function PreparationJourneySection() {
  useAOS();
  const completedCount = preparationPlan.filter((step) => step.completed).length;
  const completionPercentage = Math.round(
    (completedCount / preparationPlan.length) * 100,
  );

  return (
    <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background-secondary))] py-14 md:py-16">
      <div className="container-app">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12" data-aos="fade-up">
          <SectionEyebrow>Personalised preparation</SectionEyebrow>
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            From Gap to <span className="text-[hsl(var(--primary))]">Readiness</span>
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            PlaceCampus doesn&apos;t just point out weaknesses. It generates
            actionable, timeline-driven preparation paths to help you reach
            eligibility.
          </p>
        </div>

        <div
          className="max-w-5xl mx-auto"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-xl)] sm:p-8 md:p-12">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 md:mb-12">
              <div>
                <span className="mb-2 inline-flex rounded-full bg-[hsl(var(--primary)/0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--color-primary-dark))]">
                  Illustrative plan preview
                </span>
                <h3 className="text-xl font-bold sm:text-2xl">
                  14-Day DSA Preparation
                </h3>
                <p className="text-[hsl(var(--muted-foreground))]">
                  Target: Level 4 · Example drive requirement
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[hsl(var(--primary))] sm:text-3xl">
                  {completionPercentage}%
                </div>
                <div className="text-sm font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {completedCount} of {preparationPlan.length} complete
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 md:left-[10%] top-0 bottom-0 w-1 bg-[hsl(var(--muted))]" />
              <div
                className="absolute left-4 top-0 w-1 bg-[hsl(var(--primary))] md:left-[10%]"
                style={{ height: `${completionPercentage}%` }}
              />

              <div className="space-y-8 relative z-10">
                {preparationPlan.map((step) => (
                  <div
                    key={step.day}
                    className="group flex items-center gap-4 md:gap-12"
                  >
                    {/* Day Marker */}
                    <div className="hidden w-10 shrink-0 text-right md:block md:w-[20%]">
                      <span
                        className={cn(
                          "font-mono font-bold text-lg transition-colors",
                          step.completed
                            ? "text-[hsl(var(--foreground))]"
                            : "text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        {step.day}
                      </span>
                    </div>

                    {/* Node */}
                    <div className="relative flex w-8 shrink-0 justify-center">
                      {step.completed ? (
                        <CheckCircle2
                          aria-label="Completed"
                          className="w-8 h-8 text-[hsl(var(--primary))] bg-[hsl(var(--card))] rounded-full"
                          fill="currentColor"
                          stroke="white"
                        />
                      ) : (
                        <Circle
                          aria-label="Upcoming"
                          className="w-8 h-8 text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] rounded-full"
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-xl border p-3 transition-colors duration-[var(--duration-normal)] sm:p-4",
                        step.completed
                          ? "bg-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary)/0.2)]"
                          : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))] group-hover:border-[hsl(var(--muted-foreground)/0.3)]",
                      )}
                    >
                      <div className="md:hidden font-mono text-sm font-bold text-[hsl(var(--primary))] mb-1">
                        {step.day}
                      </div>
                      <h4
                        className={cn(
                          "font-semibold text-lg",
                          step.completed
                            ? "text-[hsl(var(--foreground))]"
                            : "text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        {step.task}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
