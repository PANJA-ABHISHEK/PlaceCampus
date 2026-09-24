"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 bg-[#f8f8f3] border-b border-border overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-12 items-center max-w-7xl mx-auto">
          
          {/* LEFT: Editorial Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="w-8 h-[1px] bg-accent" />
              <p className="text-xs font-bold tracking-[0.2em] text-charcoal uppercase">
                Intelligent University Placement Platform
              </p>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif text-foreground leading-[1.1] mb-8">
              Turn placement <br />
              preparation into <br />
              <span className="text-[#5B2A86] italic pr-4">placement readiness.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
              PlaceCampus helps students measure their real placement readiness, 
              identify skill gaps, and prepare strategically for recruitment drives — 
              while giving placement teams a university-wide view of readiness.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-14 px-8 text-base bg-[#5B2A86] hover:bg-[#F58220] text-white rounded font-bold shadow-none group transition-colors" asChild>
                <Link href="/register">
                  Get Started <ArrowUpRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base bg-white border-[#5B2A86] text-[#5B2A86] hover:bg-[#5B2A86] hover:text-white rounded font-bold shadow-none transition-colors group" asChild>
                <Link href="/#how-it-works">
                  Explore Platform <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* RIGHT: Editorial Dashboard Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full relative"
          >
            <div className="bg-white border border-[#D9D9D9] shadow-sm p-8 md:p-10 w-full relative z-10 rounded">
              {/* Subtle top decoration */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#5B2A86]" />
              
              <div className="border-b border-border pb-6 mb-8">
                <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">Student Profile</p>
                <div className="flex justify-between items-end">
                  <h3 className="text-3xl font-serif text-foreground">Placement Readiness</h3>
                  <span className="text-5xl font-serif text-[#5B2A86]">82%</span>
                </div>
              </div>

              <div className="space-y-6">
                <MetricRow label="Technical Skills" value={78} />
                <MetricRow label="Interview Readiness" value={74} />
                <MetricRow label="Coding & DSA" value={81} />
                <MetricRow label="Profile Strength" value={88} />
              </div>

              <div className="mt-10 p-6 bg-[#f8f8f3] border border-border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-1">Upcoming Drive</p>
                    <h4 className="text-lg font-bold text-foreground">Software Engineer</h4>
                  </div>
                  <span className="text-xs font-bold bg-[#5B2A86] text-white px-3 py-1 uppercase tracking-widest rounded-sm">
                    Match: 78%
                  </span>
                </div>
                <div className="h-1 w-full bg-[#f0f0ea] mt-4 rounded-full overflow-hidden">
                  <div className="h-1 bg-[#5B2A86] w-[78%]" />
                </div>
              </div>
            </div>

            {/* Background offset block for architectural depth */}
            <div className="absolute top-8 -right-8 bottom-8 -left-8 border border-border -z-10 bg-white/50" />
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-bold text-foreground">{label}</span>
        <span className="font-bold text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1 w-full bg-[#f0f0ea] rounded-full overflow-hidden">
        <div 
          className="h-1 bg-[#5B2A86]" 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
