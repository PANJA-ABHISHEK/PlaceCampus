"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="bg-[hsl(var(--background))] py-14 md:py-16">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[hsl(var(--color-primary-400))] via-[hsl(var(--primary))] to-[hsl(var(--color-primary-700))] px-6 py-14 text-center shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.7)] sm:px-12 md:py-16">
          {/* Decorative light, rings and grid */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[hsl(var(--color-primary-800)/0.45)] blur-3xl" />
            <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full border border-white/20" />
            <div className="absolute -right-8 -bottom-12 h-48 w-48 rounded-full border border-white/25" />
            <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_70%_at_20%_20%,black,transparent)]" />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl">
            <span className="mb-6 inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              Built for students, universities and recruiters
            </span>
            <h2 className="text-display mb-5 text-3xl text-white md:text-5xl">
              Your next opportunity starts with knowing where you stand.
            </h2>
            <p className="text-body mx-auto mb-9 max-w-2xl text-lg text-white/90">
              Join universities transforming their placement outcomes through
              verified readiness and intelligent matching.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-14 w-full border-none bg-white px-8 text-base text-[hsl(var(--color-primary-700))] shadow-lg shadow-black/10 hover:bg-[hsl(var(--color-primary-50))] sm:w-auto"
              >
                <Link href="/register">
                  Check My Readiness
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 w-full border-white/60 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link href="/#recruiters">Explore Opportunities</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
