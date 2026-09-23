"use client"

import * as React from "react"
import { motion } from "framer-motion"

const metrics = [
  { value: "5,000+", label: "Students Assessed" },
  { value: "78%", label: "Average Readiness" },
  { value: "3,842", label: "Drive Ready" },
  { value: "100+", label: "Recruitment Drives" },
]

export function PlacementCellSection() {
  return (
    <section id="placement-cell" className="py-24 md:py-32 bg-[#252525] text-white">
      <div className="container mx-auto px-6 max-w-7xl">
        
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif text-white leading-[1.2] mb-8">
              A clearer view of <br />
              <span className="text-accent italic">campus readiness.</span>
            </h2>
            <p className="text-lg text-[#bfbfbf] leading-relaxed max-w-lg">
              Give placement teams the visibility to understand readiness across students, programs and recruitment drives. Monitor college-wide performance and make data-driven decisions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="border border-white/10 p-8 md:p-12">
              <div className="grid grid-cols-2 gap-x-8 gap-y-12">
                {metrics.map((metric, i) => (
                  <div key={i} className="border-t border-accent/30 pt-6">
                    <div className="text-4xl md:text-5xl font-serif text-accent mb-3">{metric.value}</div>
                    <div className="text-sm font-bold tracking-[0.15em] uppercase text-white/70">
                      {metric.label}
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
