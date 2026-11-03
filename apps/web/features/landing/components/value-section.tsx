"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { valueCards } from "@/config/marketing-data";
import { SectionEyebrow } from "./section-eyebrow";

export function ValueSection() {
  useAOS();

  return (
    <section
      id="platform"
      className="scroll-mt-24 py-14 md:py-16 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))]"
    >
      <div className="container-app">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12" data-aos="fade-up">
          <SectionEyebrow>Why PlaceCampus</SectionEyebrow>
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            Placement preparation should be more than an{" "}
            <span className="text-[hsl(var(--primary))]">eligibility checklist.</span>
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            We built PlaceCampus to provide universities with genuine placement
            intelligence, moving beyond basic tracking to verifiable readiness
            and targeted improvement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {valueCards.map((card, index) => (
            <div
              key={card.title}
              className="group relative h-full overflow-hidden p-6 md:p-7 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-[var(--shadow-card)] hover:-translate-y-1.5 hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[0_24px_50px_-24px_hsl(var(--primary)/0.45)] transition-all duration-[var(--duration-normal)]"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              {/* Top accent bar grows on hover */}
              <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[hsl(var(--color-primary-300))] to-[hsl(var(--color-primary-700))] transition-transform duration-500 group-hover:scale-x-100" />
              {/* Soft corner glow */}
              <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[hsl(var(--primary)/0.12)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary-400))] to-[hsl(var(--color-primary-700))] text-white shadow-[0_10px_20px_-8px_hsl(var(--primary)/0.7)] transition-transform duration-[var(--duration-normal)] group-hover:scale-110 group-hover:-rotate-3">
                  <card.icon className="h-6 w-6" />
                </div>
                <span className="font-mono text-sm font-bold text-[hsl(var(--muted-foreground)/0.5)] transition-colors group-hover:text-[hsl(var(--primary))]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[hsl(var(--foreground))]">
                {card.title}
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
