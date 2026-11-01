"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-[hsl(var(--navy))]">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[hsl(var(--primary)/0.15)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[hsl(var(--primary-dark)/0.1)] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="container-app relative z-10 text-center max-w-4xl mx-auto">
        <h2 className="text-display text-4xl md:text-5xl lg:text-6xl text-white mb-6">
          Your next opportunity starts with knowing where you stand.
        </h2>
        <p className="text-body text-xl text-white/70 mb-10 max-w-2xl mx-auto">
          Join universities transforming their placement outcomes through
          verified readiness and intelligent matching.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto h-14 px-8 text-base shadow-lg shadow-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-light))] text-white border-none"
          >
            <Link href="/register">
              Check My Readiness
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto h-14 px-8 text-base border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
          >
            Explore Opportunities
          </Button>
        </div>
      </div>
    </section>
  );
}
