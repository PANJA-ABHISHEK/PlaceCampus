"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
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
      className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden min-h-[90vh] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))] via-[hsl(var(--background-secondary))] to-[hsl(var(--background))]" />

      <div className="container-app relative z-10 grid lg:grid-cols-2 gap-4 lg:gap-8 items-center">
        {/* Left: Content */}
        <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)] text-[hsl(var(--color-primary-dark))] font-medium text-sm mb-8 hero-title">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--primary))] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--primary))]"></span>
            </span>
            Platform 2.0 Now Live
          </div>

          <h1 className="text-display text-5xl md:text-6xl lg:text-7xl mb-6 text-[hsl(var(--foreground))]">
            <span className="hero-title block">
              Build Your{" "}
              <span className="text-[hsl(var(--primary))]">Readiness.</span>
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
        </div>

        {/* Right: Visual */}
        <div className="relative h-[430px] md:h-[560px] lg:h-[600px] w-full mt-4 md:mt-8 lg:mt-0">
          {/* Background Shape */}
          <div
            ref={shapeRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-square rounded-full bg-gradient-to-br from-[hsl(var(--primary-200))] to-[hsl(var(--primary-100))] blur-3xl opacity-60"
          />

          {/* Student image stays proportional and aligned to the visual baseline. */}
          <div
            ref={studentRef}
            className="absolute inset-x-0 bottom-0 z-10 h-[78%] md:h-[86%] lg:h-[94%]"
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
