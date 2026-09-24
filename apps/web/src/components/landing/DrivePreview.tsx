"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"

export function DrivePreview() {
  return (
    <section className="py-24 md:py-32 bg-background border-b border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 md:order-1"
          >
            {/* Editorial Recruitment Card */}
            <div className="border border-border p-8 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-8 pb-8 border-b border-border">
                <div>
                  <h3 className="text-2xl font-bold text-foreground uppercase tracking-wider mb-2">Software Engineer</h3>
                  <p className="text-muted-foreground font-medium">Google</p>
                </div>
                <div className="text-xs font-bold bg-[#F58220]/10 text-[#F58220] px-3 py-1 uppercase tracking-widest border border-[#F58220]/20 rounded-sm">
                  12 Days Remaining
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">Eligibility</p>
                <p className="text-foreground font-serif text-xl">CGPA 7.5+</p>
              </div>

              <div className="mb-10">
                <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {["Java", "DSA", "SQL", "System Design"].map(skill => (
                    <span key={skill} className="text-sm border border-border px-3 py-1 font-medium text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#f8f8f3] border border-border p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-1">Your Readiness</p>
                  <p className="text-3xl font-serif text-[#5B2A86]">82%</p>
                </div>
                <div className="h-px sm:h-12 w-full sm:w-px bg-border hidden sm:block" />
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-1">Skill Gap</p>
                  <p className="text-sm font-bold text-[#5B2A86]">Advanced Graph Algorithms</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="order-1 md:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.2] mb-8">
              Prepare for the <br />
              <span className="text-[#5B2A86] italic">opportunity</span> <br />
              before it arrives.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              PlaceCampus connects your actual readiness score with real recruitment requirements, telling you exactly what to prepare weeks before the drive happens.
            </p>
            <Link href="/student/drives" className="inline-block text-sm font-bold tracking-widest uppercase text-foreground border-b-2 border-[#5B2A86] pb-1 hover:text-[#5B2A86] transition-colors">
              Explore Active Drives
            </Link>
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}
