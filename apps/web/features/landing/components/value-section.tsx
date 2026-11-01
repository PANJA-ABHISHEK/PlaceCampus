"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { valueCards } from "@/config/marketing-data";

export function ValueSection() {
  useAOS();

  return (
    <section className="py-24 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))]">
      <div className="container-app">
        <div className="max-w-3xl mx-auto text-center mb-16" data-aos="fade-up">
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            Placement preparation should be more than an eligibility checklist.
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            We built PlaceCampus to provide universities with genuine placement
            intelligence, moving beyond basic tracking to verifiable readiness
            and targeted improvement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {valueCards.map((card, index) => (
            <div
              key={card.title}
              className="group p-6 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:shadow-xl transition-all duration-[var(--duration-normal)]"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-[var(--duration-spring)] group-hover:bg-[hsl(var(--primary))] group-hover:text-white text-[hsl(var(--primary))]">
                <card.icon className="h-6 w-6" />
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
