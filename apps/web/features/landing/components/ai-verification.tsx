"use client";

import * as React from "react";
import { useAOS } from "@/hooks/use-aos";
import { useGSAP } from "@/hooks/use-gsap";
import { verificationStages } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { FileCheck, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <section className="py-24 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] overflow-hidden">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div data-aos="fade-right">
            <Badge
              variant="outline"
              className="mb-6 bg-[hsl(var(--primary)/0.05)] text-[hsl(var(--primary-dark))] border-[hsl(var(--primary)/0.2)]"
            >
              Intelligent Workflow
            </Badge>
            <h2 className="text-heading text-3xl md:text-4xl lg:text-5xl mb-6 text-[hsl(var(--foreground))]">
              Trust the Evidence. <br className="hidden md:block" /> Not Just
              the Claim.
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
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="border-b border-[hsl(var(--border))] p-4 flex items-center justify-between bg-[hsl(var(--muted)/0.5)]">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <span className="font-semibold text-sm">
                    Evidence Verification
                  </span>
                </div>
                <Badge variant="warning">Needs Review</Badge>
              </div>

              {/* Content */}
              <div className="p-6 grid md:grid-cols-2 gap-6 relative">
                {/* Document Preview */}
                <div className="relative aspect-[3/4] bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))] overflow-hidden flex items-center justify-center p-4">
                  <div className="w-full h-full bg-white rounded shadow-sm border border-gray-200 p-4 flex flex-col gap-3 opacity-80">
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-8 w-3/4 bg-gray-300 rounded mb-4" />
                    <div className="h-2 w-full bg-gray-200 rounded" />
                    <div className="h-2 w-full bg-gray-200 rounded" />
                    <div className="h-2 w-5/6 bg-gray-200 rounded" />
                    <div className="mt-auto self-end h-8 w-24 bg-[hsl(var(--primary)/0.2)] rounded-full" />
                  </div>
                  {/* Scanner line */}
                  <div className="scan-line absolute left-0 right-0 h-1 bg-[hsl(var(--primary))] shadow-[0_0_15px_hsl(var(--primary))] z-10" />
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
                    <div className="text-sm p-3 bg-[hsl(var(--primary)/0.05)] text-[hsl(var(--primary-dark))] rounded-lg border border-[hsl(var(--primary)/0.2)]">
                      Document text matches &quot;React&quot; and &quot;Advanced
                      Patterns&quot;. Issued by a recognized authority (Udemy).
                      Date is within 1 year.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1">
                      Rule Check
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))] mb-2">
                      <ShieldCheck className="w-4 h-4" /> Institution Approved
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--warning))]">
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
