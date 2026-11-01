"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { workflowSteps } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function HowItWorksSection() {
  useAOS();
  const [activeStep, setActiveStep] = React.useState(0);

  return (
    <section
      id="how-it-works"
      className="py-24 bg-[hsl(var(--background-secondary))] border-t border-[hsl(var(--border))]"
    >
      <div className="container-app">
        <div className="max-w-3xl mb-16" data-aos="fade-up">
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            How PlaceCampus Works
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            A comprehensive workflow from building a profile to securing the
            right placement opportunity.
          </p>
        </div>

        <div
          className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          {/* Left: Interactive Steps (Vertical List) */}
          <div className="flex flex-col gap-4">
            {workflowSteps.map((step, index) => {
              const isActive = index === activeStep;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "p-6 rounded-2xl border transition-all duration-[var(--duration-normal)] cursor-pointer flex gap-6 items-start",
                    isActive
                      ? "bg-[hsl(var(--card))] border-[hsl(var(--primary)/0.5)] shadow-lg"
                      : "bg-transparent border-transparent hover:bg-[hsl(var(--card)/0.5)]",
                  )}
                  onClick={() => setActiveStep(index)}
                  onMouseEnter={() => setActiveStep(index)}
                >
                  <div
                    className={cn(
                      "text-2xl font-bold transition-colors font-mono mt-1",
                      isActive
                        ? "text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--muted-foreground)/0.5)]",
                    )}
                  >
                    {step.id}
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "text-xl font-semibold mb-2 transition-colors",
                        isActive
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--foreground)/0.7)]",
                      )}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={cn(
                        "transition-all duration-[var(--duration-normal)] overflow-hidden",
                        isActive
                          ? "text-[hsl(var(--muted-foreground))] max-h-40 opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Visual representation of active step */}
          <div className="relative h-[400px] lg:h-[600px] w-full bg-[hsl(var(--card))] rounded-3xl border border-[hsl(var(--border))] shadow-xl overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent" />

            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-2xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-8 border border-[hsl(var(--primary)/0.2)]">
                <span className="text-4xl font-bold text-[hsl(var(--primary))] font-mono">
                  {workflowSteps[activeStep].id}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
                {workflowSteps[activeStep].title}
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] max-w-sm mb-8">
                {workflowSteps[activeStep].description}
              </p>
              <div className="inline-flex items-center text-sm font-medium text-[hsl(var(--primary))]">
                Visual demonstration placeholder{" "}
                <ArrowRight className="ml-2 w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
