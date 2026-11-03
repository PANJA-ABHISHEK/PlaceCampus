"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGSAP } from "@/hooks/use-gsap";

export function HeroSection() {
  const container = React.useRef<HTMLElement>(null);
  const studentRef = React.useRef<HTMLDivElement>(null);
  const shapeRef = React.useRef<HTMLDivElement>(null);

  useGSAP((gsap) => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Text animations
    tl.fromTo(
      ".hero-title",
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.15 },
    )
      .fromTo(
        ".hero-desc",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        "-=0.5",
      )
      .fromTo(
        ".hero-cta",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 },
        "-=0.5",
      );

    // Visual animations
    tl.fromTo(
      shapeRef.current,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" },
      "-=1",
    )
      .fromTo(
        studentRef.current,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: "power2.out" },
        "-=1.2",
      )
      .fromTo(
        ".floating-card",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.2 },
        "-=0.8",
      );

    // Setup mouse parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!container.current) return;
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 20;
      const yPos = (clientY / window.innerHeight - 0.5) * 20;

      gsap.to(shapeRef.current, {
        x: xPos * 2,
        y: yPos * 2,
        duration: 1,
        ease: "power2.out",
      });
      gsap.to(studentRef.current, {
        x: -xPos,
        y: -yPos,
        duration: 1,
        ease: "power2.out",
      });
      gsap.to(".card-1", {
        x: xPos * 1.5,
        y: yPos * 1.5,
        duration: 1,
        ease: "power2.out",
      });
      gsap.to(".card-2", {
        x: -xPos * 1.2,
        y: yPos * 1.2,
        duration: 1,
        ease: "power2.out",
      });
      gsap.to(".card-3", {
        x: xPos * 0.8,
        y: -yPos * 0.8,
        duration: 1,
        ease: "power2.out",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={container}
      className="relative overflow-hidden pt-24 md:pt-28 lg:pt-24"
    >
      {/* Background: warm base, orange glows and a faded dot grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--color-primary-50))] via-[hsl(var(--background))] to-[hsl(var(--background))]" />
        <div className="absolute -top-40 right-[-10%] h-[640px] w-[640px] rounded-full bg-[hsl(var(--primary)/0.22)] blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-[hsl(var(--color-primary-300)/0.18)] blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.16)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_40%,black,transparent)]" />
      </div>

      <div className="container-app relative z-10 grid lg:grid-cols-2 gap-4 lg:gap-8 items-end">
        {/* Left: Content */}
        <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left lg:self-center lg:pb-10">

          <h1 className="text-display text-5xl md:text-6xl lg:text-7xl mb-6 text-[hsl(var(--foreground))]">
            <span className="hero-title block">
              Build Your{" "}
              <span className="relative inline-block text-[hsl(var(--primary))]">
                Readiness.
                {/* Hand-drawn underline accent */}
                <svg
                  aria-hidden
                  viewBox="0 0 300 20"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-3 w-full text-[hsl(var(--primary)/0.45)] md:h-4"
                >
                  <path d="M4 14 C 70 4, 160 2, 296 10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </span>
            <span className="hero-title block">Build Your Future.</span>
          </h1>

          <p className="hero-desc text-body text-lg md:text-xl text-[hsl(var(--muted-foreground))] mb-8 max-w-xl mx-auto lg:mx-0">
            PlaceCampus connects verified skills, placement readiness, company
            requirements and personalized preparation in one intelligent
            platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 hero-cta">
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto text-base h-14 px-8 shadow-lg shadow-[hsl(var(--primary)/0.2)]"
            >
              <Link href="/register">
                Check My Readiness
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-auto text-base h-14 px-8 border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
            >
              <Link href="#how-it-works">
                <Play className="mr-2 h-5 w-5 text-[hsl(var(--primary))]" />
                How it works
              </Link>
            </Button>
          </div>

          <ul className="hero-cta mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[hsl(var(--muted-foreground))] lg:justify-start">
            {["AI + faculty verified skills", "Explainable readiness", "Smart company matching"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Visual */}
        <div className="relative h-[430px] md:h-[560px] lg:h-[620px] w-full mt-4 md:mt-8 lg:mt-0">
          {/* Orange backdrop: glow, solid disc and outline rings behind the student */}
          <div
            ref={shapeRef}
            aria-hidden
            className="absolute bottom-0 left-1/2 aspect-square w-[86%] max-w-[560px] -translate-x-1/2 translate-y-[12%]"
          >
            <div className="absolute inset-[-12%] rounded-full bg-[hsl(var(--primary)/0.35)] blur-[70px]" />
            <div className="absolute inset-[-9%] rounded-full border border-dashed border-[hsl(var(--primary)/0.35)] animate-[spin_60s_linear_infinite]" />
            <div className="absolute inset-[-4%] rounded-full border border-[hsl(var(--primary)/0.2)]" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--color-primary-300))] via-[hsl(var(--primary))] to-[hsl(var(--color-primary-700))] shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.6)]" />
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_30%_25%,hsl(0_0%_100%/0.35),transparent_55%)]" />
          </div>

          {/* Student image stays proportional and aligned to the visual baseline. */}
          <div
            ref={studentRef}
            className="absolute inset-x-0 bottom-0 z-10 h-[86%] md:h-[92%] lg:h-[96%]"
          >
            <Image
              src="/images/hero/student-professional.png"
              alt="Student carrying a backpack and working on a laptop"
              width={1270}
              height={1239}
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="h-full w-full object-contain object-bottom"
            />
          </div>

          {/* Floating Card 1: Readiness */}
          <div className="floating-card card-1 absolute top-4 right-0 md:top-[8%] md:right-[5%] z-30 glass rounded-xl p-2.5 md:p-4 shadow-xl w-[48%] md:w-48 border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
              <span>Readiness</span>
              <span className="text-[9px] tracking-normal text-[hsl(var(--muted-foreground))]">
                Sample
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                78%
              </div>
              <div className="text-sm font-medium text-[hsl(var(--color-success))] bg-[hsl(var(--color-success-light))] px-2 py-0.5 rounded">
                +8%
              </div>
            </div>
            <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[hsl(var(--primary))] w-[78%] rounded-full" />
            </div>
          </div>

          {/* Floating Card 2: Company Match */}
          <div className="floating-card card-2 absolute top-4 left-0 md:top-[16%] z-30 glass rounded-xl p-2.5 md:p-4 shadow-xl w-[48%] md:w-56 border border-[hsl(var(--border))] flex items-center gap-2 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded bg-[hsl(var(--foreground))] flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <div className="font-semibold text-[hsl(var(--foreground))]">
                Amazon
              </div>
              <div className="text-sm text-[hsl(var(--color-success))] font-medium">
                82% Match
              </div>
              <div className="text-[9px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Illustrative
              </div>
            </div>
          </div>

          {/* Floating Card 3: Skill */}
          <div className="floating-card card-3 absolute top-[40%] -left-4 md:left-[10%] z-20 glass rounded-xl p-3 shadow-xl flex items-center gap-3 border border-[hsl(var(--border))]">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
            </div>
            <div>
              <div className="text-sm font-bold">React.js</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
