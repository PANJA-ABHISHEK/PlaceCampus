"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export function StudentSection() {
  return (
    <section id="students" className="py-24 md:py-32 bg-[#f8f8f3] border-b border-border">
      <div className="container mx-auto px-6 max-w-7xl">
        
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
          
          {/* Left Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.2] mb-8">
              Know where you stand. <br />
              <span className="text-accent italic">Know what comes next.</span>
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              Get a verifiable, data-backed score of your placement readiness across coding, technical skills, interviews, and resume strength. Identify exact skill gaps before the technical rounds begin.
            </p>

            <Link href="/student" className="inline-flex items-center text-lg font-bold text-foreground hover:text-accent transition-colors group">
              Explore Student Experience <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right Visual: Editorial Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white border border-border p-8 md:p-12 shadow-xl">
              
              <div className="border-b border-border pb-8 mb-8">
                <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">Overall Readiness</p>
                <div className="text-6xl font-serif text-accent">82%</div>
              </div>

              <div className="space-y-6 mb-12">
                <ReadinessRow label="Technical Skills" value={86} />
                <ReadinessRow label="Coding & DSA" value={78} />
                <ReadinessRow label="Interview Readiness" value={71} />
                <ReadinessRow label="Projects" value={89} />
              </div>

              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-6">Top Skill Gaps</p>
                <ul className="space-y-4">
                  {["Advanced DSA", "System Design", "SQL"].map((gap, i) => (
                    <li key={i} className="flex justify-between items-center text-sm font-bold text-muted-foreground border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <span>{gap}</span>
                      <span className="text-accent">Needs Work</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}

function ReadinessRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="font-bold text-foreground">{label}</span>
        <span className="font-bold text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1 w-full bg-[#f0f0ea]">
        <div 
          className="h-1 bg-accent" 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
