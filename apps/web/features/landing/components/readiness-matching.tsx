"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import {
  readinessFactors,
  companyMatches,
  skillGaps,
} from "@/config/marketing-data";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
  TrendingUp,
  Info,
  Target,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Swiper styles moved to globals.css to prevent Turbopack SSR hang

export function ReadinessMatchingSection() {
  useAOS();
  const [activeFactor, setActiveFactor] = React.useState<number | null>(null);
  const [hoveredGap, setHoveredGap] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);

  const prevRef = React.useRef<HTMLButtonElement>(null);
  const nextRef = React.useRef<HTMLButtonElement>(null);

  // Animated count up for readiness score
  React.useEffect(() => {
    let startTime: number;
    const duration = 1500;
    const targetScore = 72;

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setScore(Math.floor(ease * targetScore));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    // Slight delay before counting
    const timer = setTimeout(() => requestAnimationFrame(animateCount), 500);
    return () => clearTimeout(timer);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "high":
        return "text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.1)]";
      case "medium":
        return "text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.1)]";
      default:
        return "text-[hsl(var(--info))] border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info)/0.1)]";
    }
  };

  return (
    <section className="py-24 bg-[hsl(var(--background-secondary))] border-t border-[hsl(var(--border))] overflow-hidden">
      <div className="container-app">
        <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary-dark))] font-medium text-sm mb-6 border border-[hsl(var(--primary)/0.2)]">
            Explainable Intelligence
          </div>
          <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
            Know where you stand.
            <br />
            Know where you fit.
          </h2>
          <p className="text-body text-lg text-[hsl(var(--muted-foreground))]">
            We evaluate your readiness dimensions against real company
            requirements to recommend placement drives and highlight exact skill
            gaps.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Readiness Score & Breakdown */}
          <div className="lg:col-span-5 space-y-6" data-aos="fade-right">
            <Card className="border-[hsl(var(--border))] shadow-xl bg-[hsl(var(--card))] overflow-hidden">
              <CardContent className="p-8 flex flex-col items-center">
                {/* Visual Circle */}
                <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="3"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * score) / 100}
                      className="transition-all duration-300 ease-out -rotate-90 origin-center"
                    />
                  </svg>

                  <div className="text-center relative z-10 flex flex-col items-center">
                    <div className="text-5xl font-bold text-[hsl(var(--foreground))] font-display tracking-tight mb-1">
                      {score}
                      <span className="text-2xl text-[hsl(var(--muted-foreground))]">
                        %
                      </span>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                      Readiness
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)] px-3 py-1 rounded-full mb-8">
                  <TrendingUp className="w-3 h-3" /> +5% this month
                </div>

                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Dimension Breakdown
                    </h3>
                    <Info className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </div>

                  {readinessFactors.map((factor, index) => (
                    <div
                      key={factor.name}
                      className="cursor-pointer group"
                      onClick={() =>
                        setActiveFactor(activeFactor === index ? null : index)
                      }
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                          {factor.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[hsl(var(--foreground))]">
                            {factor.score}%
                          </span>
                        </div>
                      </div>
                      <Progress value={factor.score} className="h-1.5" />

                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-[var(--duration-normal)] text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] rounded-b px-2",
                          activeFactor === index
                            ? "max-h-20 py-2 mt-1 opacity-100"
                            : "max-h-0 opacity-0",
                        )}
                      >
                        Calculated based on verified evidence.
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Company Match & Skill Gaps */}
          <div
            className="lg:col-span-7 space-y-8"
            data-aos="fade-left"
            data-aos-delay="100"
          >
            {/* Company Matching Swiper */}
            <div>
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  Opportunity Matching
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    ref={prevRef}
                    className="h-8 w-8 rounded-full border border-[hsl(var(--border))] flex items-center justify-center bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    ref={nextRef}
                    className="h-8 w-8 rounded-full border border-[hsl(var(--border))] flex items-center justify-center bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Swiper
                modules={[Navigation, Pagination, A11y]}
                spaceBetween={16}
                slidesPerView={1}
                breakpoints={{
                  640: { slidesPerView: 2 },
                }}
                onBeforeInit={(swiper) => {
                  if (
                    swiper.params.navigation &&
                    typeof swiper.params.navigation !== "boolean"
                  ) {
                    swiper.params.navigation.prevEl = prevRef.current;
                    swiper.params.navigation.nextEl = nextRef.current;
                  }
                }}
                onInit={(swiper) => {
                  if (
                    swiper.params.navigation &&
                    typeof swiper.params.navigation !== "boolean"
                  ) {
                    swiper.params.navigation.prevEl = prevRef.current;
                    swiper.params.navigation.nextEl = nextRef.current;
                    swiper.navigation.init();
                    swiper.navigation.update();
                  }
                }}
              >
                {companyMatches.slice(0, 4).map((company) => (
                  <SwiperSlide key={company.name} className="h-auto pb-2">
                    <Card className="h-full flex flex-col group hover:border-[hsl(var(--primary)/0.5)] transition-colors duration-[var(--duration-normal)]">
                      <CardContent className="p-5 flex flex-col h-full flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded bg-[hsl(var(--muted))] flex items-center justify-center overflow-hidden border border-[hsl(var(--border))]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={company.logo}
                              alt={company.name}
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                          <Badge
                            variant={
                              company.status === "Eligible"
                                ? "success"
                                : "warning"
                            }
                            className="font-medium text-xs"
                          >
                            {company.status}
                          </Badge>
                        </div>

                        <h4 className="text-lg font-bold text-[hsl(var(--foreground))] mb-1">
                          {company.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] mb-4 text-xs">
                          <Briefcase className="h-3 w-3" />
                          {company.role}
                        </div>

                        <div className="mt-auto">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-[hsl(var(--foreground))]">
                              Match Score
                            </span>
                            <span className="font-bold text-[hsl(var(--primary))]">
                              {company.match}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-[var(--duration-slow)] ease-out"
                              style={{ width: `${company.match}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Skill Gaps */}
            <div>
              <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[hsl(var(--primary))]" />{" "}
                Priority Skill Gaps
              </h3>
              <div className="space-y-3">
                {skillGaps.slice(0, 3).map((gap, index) => {
                  const isHovered = hoveredGap === index;
                  return (
                    <div
                      key={gap.skill}
                      className={cn(
                        "border rounded-lg transition-all duration-[var(--duration-normal)] overflow-hidden",
                        isHovered
                          ? "border-[hsl(var(--primary)/0.5)] shadow-md bg-[hsl(var(--card))]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))]",
                      )}
                      onMouseEnter={() => setHoveredGap(index)}
                      onMouseLeave={() => setHoveredGap(null)}
                    >
                      <div className="p-4 flex items-center justify-between gap-4 cursor-pointer">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-1">
                          <div className="flex items-center gap-2 min-w-32">
                            <span className="font-bold text-[hsl(var(--foreground))]">
                              {gap.skill}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                getImpactColor(gap.impact),
                              )}
                            >
                              {gap.impact}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs flex-1 max-w-xs">
                            <div className="flex flex-col w-full gap-1">
                              <div className="flex justify-between">
                                <span className="text-[hsl(var(--muted-foreground))]">
                                  Current: L{gap.current}
                                </span>
                                <span className="font-medium text-[hsl(var(--foreground))]">
                                  Required: L{gap.required}
                                </span>
                              </div>
                              <div className="w-full h-1.5 flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "h-full flex-1 rounded-sm",
                                      i < gap.current
                                        ? "bg-[hsl(var(--primary))]"
                                        : i < gap.required
                                          ? "bg-[hsl(var(--navy-300))]"
                                          : "bg-[hsl(var(--muted))]",
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--muted))] items-center justify-center">
                          <ArrowUpRight
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isHovered
                                ? "rotate-45 text-[hsl(var(--primary))]"
                                : "",
                            )}
                          />
                        </div>
                      </div>

                      <div
                        className={cn(
                          "bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))] transition-all duration-[var(--duration-normal)] overflow-hidden",
                          isHovered
                            ? "max-h-24 opacity-100"
                            : "max-h-0 opacity-0",
                        )}
                      >
                        <div className="p-4 flex items-center justify-between gap-4">
                          <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-start gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                            Reach L{gap.required} to unlock drives matching this
                            requirement.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white shrink-0"
                          >
                            Practice
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
