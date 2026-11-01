"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { analyticsPreview } from "@/config/marketing-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UniversityIntelligenceSection() {
  useAOS();

  return (
    <section className="py-24 bg-[hsl(var(--navy))] text-white border-t border-[hsl(var(--navy-light))] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] aspect-square rounded-full bg-[hsl(var(--primary)/0.05)] blur-[100px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] aspect-square rounded-full bg-[hsl(var(--primary)/0.03)] blur-[80px]" />
      </div>

      <div className="container-app relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary-light))] font-medium text-sm mb-6 border border-[hsl(var(--primary)/0.3)]">
            Placement Head Analytics
          </div>
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6">
            University-Wide Intelligence
          </h2>
          <p className="text-body text-lg text-white/70">
            Make data-driven decisions on training, curriculum adjustments, and
            recruiter outreach based on real-time aggregated readiness.
          </p>
        </div>

        <div
          className="grid lg:grid-cols-3 gap-8"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          {/* Card 1: Institution Readiness */}
          <Card className="bg-[hsl(var(--navy-light))] border-[hsl(var(--border)/0.1)] text-white">
            <CardHeader>
              <CardTitle className="text-lg font-normal text-white/80">
                Institution Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 mb-8">
                <div className="text-6xl font-bold font-display text-white">
                  {analyticsPreview.institutionReadiness}%
                </div>
                <div className="text-sm text-[hsl(var(--success))] bg-[hsl(var(--success)/0.2)] px-2 py-1 rounded mb-2">
                  +4% YoY
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
                  Batch Comparison
                </h4>
                {analyticsPreview.batches.map((batch) => (
                  <div key={batch.year} className="flex items-center gap-4">
                    <span className="w-12 font-mono text-white/80">
                      {batch.year}
                    </span>
                    <div className="flex-1 h-2 bg-[hsl(var(--navy-dark))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))]"
                        style={{ width: `${batch.score}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold">
                      {batch.score}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 2 & 3: Demand vs Supply (Span 2) */}
          <Card className="lg:col-span-2 bg-[hsl(var(--navy-light))] border-[hsl(var(--border)/0.1)] text-white">
            <CardHeader>
              <CardTitle className="text-lg font-normal text-white/80">
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
                        <span className="font-bold text-lg">{item.skill}</span>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded font-bold",
                            isLow
                              ? "bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive-light))]"
                              : "bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success-light))]",
                          )}
                        >
                          {percentMet}% Met
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Demand Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-xs text-white/60 uppercase text-right">
                            Demand
                          </span>
                          <div className="flex-1 h-3 bg-[hsl(var(--navy-dark))] rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-white/40"
                              style={{ width: "100%" }}
                            />
                          </div>
                          <span className="w-10 text-xs font-mono">
                            {item.demand}
                          </span>
                        </div>
                        {/* Supply Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-xs text-white/60 uppercase text-right">
                            Supply
                          </span>
                          <div className="flex-1 h-3 bg-[hsl(var(--navy-dark))] rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--primary))]"
                              style={{ width: `${percentMet}%` }}
                            />
                          </div>
                          <span className="w-10 text-xs font-mono">
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
