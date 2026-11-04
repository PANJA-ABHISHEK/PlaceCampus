"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { useGSAP } from "@/hooks/use-gsap";
import { verificationStages } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { FileCheck, ShieldCheck, UserCheck, AlertTriangle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** OCR bounding box drawn over a detected field on the certificate. */
function OcrBox({
  label,
  tone,
  className,
  children,
}: {
  label: string;
  tone: "primary" | "success" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    primary: "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] [--tag:hsl(var(--primary))]",
    success: "border-[hsl(var(--color-success))] bg-[hsl(var(--color-success)/0.08)] [--tag:hsl(var(--color-success))]",
    warning: "border-[hsl(var(--color-warning))] bg-[hsl(var(--color-warning)/0.1)] [--tag:hsl(var(--color-warning))]",
  };

  return (
    <div className={cn("relative rounded-[3px] border border-dashed px-1.5 py-0.5", tones[tone], className)}>
      <span className="absolute -top-2 right-1 rounded-[3px] bg-[var(--tag)] px-1 text-[7px] font-bold uppercase leading-[11px] tracking-wider text-white">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Illustrative course certificate shown inside the scanner. */
function CertificatePreview() {
  return (
    <div className="relative flex h-full min-h-[340px] flex-col items-center rounded-md bg-[linear-gradient(160deg,#fffdf9,#fff7ee)] p-2 text-center shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]">
      {/* Double frame */}
      <div className="pointer-events-none absolute inset-2 rounded-sm border-2 border-[hsl(var(--primary)/0.7)]" />
      <div className="pointer-events-none absolute inset-[13px] rounded-sm border border-[hsl(var(--primary)/0.3)]" />
      {/* Corner ornaments */}
      {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((pos) => (
        <span key={pos} className={cn("pointer-events-none absolute h-4 w-4 border-[hsl(var(--color-primary-700))]", pos)} />
      ))}

      <div className="relative flex w-full flex-1 flex-col items-center px-4 pt-6 pb-5">
        <OcrBox label="Issuer" tone="success" className="mb-3">
          <span className="text-[11px] font-extrabold tracking-[0.18em] text-[hsl(var(--foreground))]">UDEMY</span>
        </OcrBox>

        <p className="font-serif text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Certificate</p>
        <p className="font-serif text-base font-semibold text-[hsl(var(--foreground))]">of Completion</p>

        <div className="my-2.5 flex w-full items-center gap-2">
          <span className="h-px flex-1 bg-[hsl(var(--primary)/0.35)]" />
          <span className="h-1.5 w-1.5 rotate-45 bg-[hsl(var(--primary))]" />
          <span className="h-px flex-1 bg-[hsl(var(--primary)/0.35)]" />
        </div>

        <p className="text-[9px] text-[hsl(var(--muted-foreground))]">This is to certify that</p>
        <p className="mt-0.5 font-serif text-lg italic text-[hsl(var(--foreground))]">Aarav Mehta</p>
        <p className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">has successfully completed the course</p>

        <OcrBox label="Skill · 98%" tone="primary" className="mt-2.5">
          <span className="text-[13px] font-bold text-[hsl(var(--color-primary-700))]">Advanced React Patterns</span>
        </OcrBox>

        <div className="mt-auto flex w-full items-end justify-between gap-2 pt-4">
          <div className="text-left">
            <p className="font-serif text-sm italic leading-none text-[hsl(var(--foreground)/0.8)]">J. Carter</p>
            <span className="mt-1 block h-px w-16 bg-[hsl(var(--foreground)/0.3)]" />
            <p className="mt-0.5 text-[7px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Instructor</p>
          </div>

          <div className="relative -mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--color-primary-300))] to-[hsl(var(--color-primary-700))] shadow-md ring-2 ring-[hsl(var(--primary)/0.25)] ring-offset-2 ring-offset-[#fffaf3]">
            <Award className="h-5 w-5 text-white" />
          </div>

          <OcrBox label="Date ?" tone="warning" className="text-right">
            <span className="block select-none whitespace-nowrap text-[10px] font-medium text-[hsl(var(--foreground))] blur-[2.5px]">12 Mar 2026</span>
            <span className="block text-[7px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Issued</span>
          </OcrBox>
        </div>
      </div>
    </div>
  );
}

export function AiVerificationSection() {
  useAOS();
  const container = React.useRef<HTMLDivElement>(null);

  useGSAP((gsap) => {
    // Animation for the scanning effect inside the visualization
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.fromTo(
      ".scan-line",
      { top: "0%" },
      { top: "100%", duration: 2, ease: "linear" },
    );
  }, []);

  return (
    <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] py-14 md:py-16 overflow-hidden">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div data-aos="fade-right">
            <Badge
              variant="outline"
              className="mb-6 bg-[hsl(var(--primary)/0.05)] text-[hsl(var(--color-primary-dark))] border-[hsl(var(--primary)/0.2)]"
            >
              Intelligent Workflow
            </Badge>
            <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
              Trust the Evidence. <br className="hidden md:block" /> Not Just
              the <span className="text-[hsl(var(--primary))]">Claim.</span>
            </h2>
            <p className="text-body text-lg text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed max-w-lg">
              Students submit certificates and achievements. PlaceCampus
              processes the evidence through OCR and AI-assisted analysis,
              applying deterministic rules. Uncertain cases are securely routed
              to faculty for final verification.
            </p>

            <div className="flex flex-col gap-6 relative before:absolute before:inset-y-2 before:left-[1.125rem] before:w-[2px] before:bg-[hsl(var(--border))]">
              {verificationStages.map((stage, i) => (
                <div
                  key={stage.id}
                  className="relative flex items-center gap-6 z-10"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors",
                      stage.status === "completed"
                        ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white"
                        : stage.status === "active"
                          ? "bg-[hsl(var(--background))] border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                          : "bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
                    )}
                  >
                    {i + 1}
                  </div>
                  <div
                    className={cn(
                      "font-semibold text-lg",
                      stage.status === "active"
                        ? "text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--foreground))]",
                    )}
                  >
                    {stage.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-sm text-[hsl(var(--muted-foreground))] italic max-w-md">
              AI acts as a co-pilot accelerating the process, not the final
              authority. Faculty retain full control.
            </p>
          </div>

          <div ref={container} className="relative" data-aos="fade-left">
            {/* Visual Interface */}
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-[var(--shadow-2xl)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="border-b border-[hsl(var(--border))] p-4 flex items-center justify-between bg-[hsl(var(--muted)/0.5)]">
                <div className="flex min-w-0 items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <span className="font-semibold text-sm">
                    Evidence Verification
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    Illustrative preview
                  </span>
                  <Badge variant="warning">Needs Review</Badge>
                </div>
              </div>

              {/* Content */}
              <div className="relative grid gap-5 p-4 sm:p-6 md:grid-cols-2 md:gap-6">
                {/* Document Preview */}
                <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 sm:p-4">
                  <CertificatePreview />
                  {/* Scanner line with a soft trailing glow */}
                  <div className="scan-line pointer-events-none absolute inset-x-0 z-20 h-16 -translate-y-full bg-gradient-to-b from-transparent to-[hsl(var(--primary)/0.18)]">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[hsl(var(--primary))] shadow-[0_0_14px_2px_hsl(var(--primary))]" />
                  </div>
                </div>

                {/* Analysis Results */}
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1">
                      Extracted Skill
                    </div>
                    <div className="font-medium text-[hsl(var(--foreground))]">
                      Advanced React Patterns
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1">
                      AI Reasoning
                    </div>
                    <div className="text-sm p-3 bg-[hsl(var(--primary)/0.05)] text-[hsl(var(--color-primary-dark))] rounded-lg border border-[hsl(var(--primary)/0.2)]">
                      Document text matches &quot;React&quot; and &quot;Advanced
                      Patterns&quot;. Issued by a recognized authority (Udemy).
                      Date is within 1 year.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1">
                      Rule Check
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--color-success))] mb-2">
                      <ShieldCheck className="w-4 h-4" /> Institution Approved
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--color-warning))]">
                      <AlertTriangle className="w-4 h-4" /> Issue Date Obscured
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[hsl(var(--border))]">
                    <Button className="w-full gap-2">
                      <UserCheck className="w-4 h-4" /> Escalate to Faculty
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Background elements */}
            <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-[hsl(var(--primary)/0.1)] rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
