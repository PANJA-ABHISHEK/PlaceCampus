"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { analyticsPreview } from "@/config/marketing-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UniversityIntelligenceSection() {
  useAOS();

  return (
    <section id="universities" className="scroll-mt-24 relative overflow-hidden border-t border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--color-primary-50))] to-[hsl(var(--background))] py-14 md:py-16">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[30%] -right-[10%] w-[55%] aspect-square rounded-full bg-[hsl(var(--primary)/0.14)] blur-[110px]" />
        <div className="absolute -bottom-[30%] -left-[10%] w-[45%] aspect-square rounded-full bg-[hsl(var(--color-primary-300)/0.12)] blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.12)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="container-app relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12" data-aos="fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.1)] px-3 py-1.5 text-sm font-medium text-[hsl(var(--color-primary-dark))]">
            Illustrative sample analytics
          </div>
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            University-Wide <span className="text-[hsl(var(--primary))]">Intelligence</span>
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            Preview the placement intelligence available to university teams.
            Values shown are sample data, not live university results.
          </p>
        </div>

        <div
          className="grid lg:grid-cols-3 gap-6"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          {/* Card 1: Institution Readiness */}
          <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-[var(--shadow-xl)] transition-shadow hover:shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.35)]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Institution Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 mb-8">
                <div className="text-6xl font-bold font-display text-[hsl(var(--foreground))]">
                  {analyticsPreview.institutionReadiness}%
                </div>
                <div className="mb-2 rounded bg-[hsl(var(--color-success-light))] px-2 py-1 text-sm text-[hsl(var(--color-success))]">
                  +4% YoY
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--color-neutral-600))]">
                  Batch Comparison
                </h4>
                {analyticsPreview.batches.map((batch) => (
                  <div key={batch.year} className="flex items-center gap-4">
                    <span className="w-12 font-mono text-[hsl(var(--color-neutral-600))]">
                      {batch.year}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--color-neutral-200))]">
                      <div
                        className="h-full bg-[hsl(var(--primary))]"
                        style={{ width: `${batch.score}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold text-[hsl(var(--foreground))]">
                      {batch.score}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 2 & 3: Demand vs Supply (Span 2) */}
          <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-[var(--shadow-xl)] transition-shadow hover:shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.35)] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Skill Demand vs. Verified Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-8 mt-4">
                {analyticsPreview.demandSupply.map((item) => {
                  const percentMet = Math.round(
                    (item.supply / item.demand) * 100,
                  );
                  const isLow = percentMet < 50;

                  return (
                    <div key={item.skill} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-lg font-bold text-[hsl(var(--foreground))]">{item.skill}</span>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded font-bold",
                            isLow
                              ? "bg-[hsl(var(--color-error-light))] text-[hsl(var(--color-error))]"
                              : "bg-[hsl(var(--color-success-light))] text-[hsl(var(--color-success))]",
                          )}
                        >
                          {percentMet}% Met
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Demand Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-right text-xs uppercase text-[hsl(var(--color-neutral-600))]">
                            Demand
                          </span>
                          <div className="h-3 flex-1 overflow-hidden rounded-sm bg-[hsl(var(--color-neutral-200))]">
                            <div
                              className="h-full bg-[hsl(var(--color-neutral-300))]"
                              style={{ width: "100%" }}
                            />
                          </div>
                          <span className="w-10 font-mono text-xs text-[hsl(var(--color-neutral-700))]">
                            {item.demand}
                          </span>
                        </div>
                        {/* Supply Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-right text-xs uppercase text-[hsl(var(--color-neutral-600))]">
                            Supply
                          </span>
                          <div className="h-3 flex-1 overflow-hidden rounded-sm bg-[hsl(var(--color-neutral-200))]">
                            <div
                              className="h-full bg-[hsl(var(--primary))]"
                              style={{ width: `${percentMet}%` }}
                            />
                          </div>
                          <span className="w-10 font-mono text-xs text-[hsl(var(--color-neutral-700))]">
                            {item.supply}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
