"use client"

import * as React from "react"
import { motion } from "framer-motion"

const weights = [
  { label: "Technical Skills", value: 30 },
  { label: "Coding & DSA", value: 25 },
  { label: "Projects", value: 15 },
  { label: "Interview Readiness", value: 15 },
  { label: "Resume/Profile", value: 10 },
  { label: "Academics", value: 5 },
]

export function ReadinessScore() {
  return (
    <section className="py-24 md:py-32 bg-[#f8f8f3] border-b border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        
        <div className="grid md:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-6xl font-serif text-foreground leading-[1.1] mb-8">
              Your readiness <br />
              is more than <br />
              <span className="text-accent italic">a CGPA.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              * Example weights shown. Fully configurable by the university placement cell.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white border border-border p-8 md:p-12">
              <div className="mb-10 pb-10 border-b border-border text-center">
                <div className="text-7xl font-serif text-accent mb-2">82%</div>
                <div className="text-sm font-bold tracking-[0.2em] text-foreground uppercase">Overall Readiness Score</div>
              </div>

              <div className="space-y-6">
                {weights.map((w, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-bold text-foreground mb-2 uppercase tracking-wide">
                      <span>{w.label}</span>
                      <span>{w.value}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#f0f0ea]">
                      <div className="h-1 bg-accent" style={{ width: `${w.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}
