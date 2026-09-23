"use client"

import * as React from "react"
import { motion } from "framer-motion"

const steps = [
  {
    num: "01",
    title: "Build Your Profile",
    description: "Connect your academic records, projects, certifications, coding performance and technical skills into a unified, evidence-based portfolio.",
  },
  {
    num: "02",
    title: "Measure Readiness",
    description: "Our intelligent engine analyzes your capabilities across multiple dimensions to generate a real-world placement readiness score.",
  },
  {
    num: "03",
    title: "Identify Skill Gaps",
    description: "Compare your profile against actual recruitment-drive requirements to understand exactly what you need to improve before the drive starts.",
  },
  {
    num: "04",
    title: "Prepare Strategically",
    description: "Generate a focused preparation roadmap targeting your exact weaknesses, ensuring you spend time only on what improves your chance of placement.",
  }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-background border-b border-border">
      <div className="container mx-auto px-6 max-w-5xl">
        
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.2]">
            A clearer path to <br className="hidden md:block" />
            <span className="text-accent italic pr-2">placement readiness.</span>
          </h2>
        </div>

        <div className="flex flex-col">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group"
            >
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 md:gap-12 py-10 border-t border-border group-hover:bg-[#f8f8f3] transition-colors -mx-6 px-6">
                <div className="text-5xl font-serif italic text-accent opacity-50 group-hover:opacity-100 transition-opacity">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">{step.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  )
}
