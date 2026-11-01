"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { preparationPlan } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export function PreparationJourneySection() {
  useAOS();

  return (
    <section className="py-24 bg-[hsl(var(--background-secondary))] border-t border-[hsl(var(--border))]">
      <div className="container-app">
        <div className="max-w-3xl mx-auto text-center mb-16" data-aos="fade-up">
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            From Gap to Readiness
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
          <div className="bg-[hsl(var(--card))] rounded-3xl border border-[hsl(var(--border))] shadow-xl p-8 md:p-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  14-Day DSA Preparation
                </h3>
                <p className="text-[hsl(var(--muted-foreground))]">
                  Target: Level 4 • Amazon Drive Eligibility
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-3xl font-bold text-[hsl(var(--primary))]">
                  40%
                </div>
                <div className="text-sm font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Completed
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 md:left-[10%] top-0 bottom-0 w-1 bg-[hsl(var(--muted))]" />
              <div className="absolute left-4 md:left-[10%] top-0 h-[40%] w-1 bg-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary))]" />

              <div className="space-y-8 relative z-10">
                {preparationPlan.map((step) => (
                  <div
                    key={step.day}
                    className="flex items-center gap-6 md:gap-12 group cursor-default"
                  >
                    {/* Day Marker */}
                    <div className="w-10 md:w-[20%] flex-shrink-0 text-right hidden md:block">
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
                    <div className="flex-shrink-0 relative flex justify-center w-8">
                      {step.completed ? (
                        <CheckCircle2
                          className="w-8 h-8 text-[hsl(var(--primary))] bg-[hsl(var(--card))] rounded-full"
                          fill="currentColor"
                          stroke="white"
                        />
                      ) : (
                        <Circle
                          className="w-8 h-8 text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] rounded-full"
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        "flex-1 p-4 rounded-xl border transition-all duration-[var(--duration-normal)]",
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
