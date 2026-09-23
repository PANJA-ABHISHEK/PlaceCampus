"use client"

import * as React from "react"
import { motion } from "framer-motion"

const eligibilityList = [
  "CGPA",
  "Branch",
  "Backlogs",
  "Graduation Year",
  "Basic Criteria",
]

const readinessList = [
  "DSA",
  "Technical Skills",
  "Projects",
  "Resume",
  "Interview",
  "Role-specific Skills",
]

export function EligibilityReadiness() {
  return (
    <section className="py-24 md:py-32 bg-white border-b border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.2] max-w-2xl">
            Eligibility gets you <br className="hidden md:block" /> through the door. <br />
            <span className="text-accent italic pr-2">Readiness</span> prepares you <br className="hidden md:block" /> for what comes next.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-0 border-t border-border pt-12 relative">
          
          {/* Decorative center line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-border -translate-x-1/2" />

          {/* Eligibility Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:pr-16"
          >
            <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-12">Eligibility</h3>
            <ul className="space-y-6">
              {eligibilityList.map((item, i) => (
                <li key={i} className="flex items-center text-lg text-foreground font-medium border-b border-border/50 pb-4">
                  <span className="text-muted-foreground mr-6 font-serif italic text-xl">0{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Readiness Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:pl-16"
          >
            <h3 className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-12">Readiness</h3>
            <ul className="space-y-6">
              {readinessList.map((item, i) => (
                <li key={i} className="flex items-center text-lg text-foreground font-bold border-b border-accent/20 pb-4">
                  <span className="text-accent mr-6 font-serif italic text-xl">0{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
