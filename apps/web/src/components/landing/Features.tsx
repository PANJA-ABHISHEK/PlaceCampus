"use client"

import * as React from "react"
import { motion } from "framer-motion"

const features = [
  {
    num: "01",
    title: "Intelligent Readiness Score",
    description: "Measure your preparation across multiple dimensions.",
  },
  {
    num: "02",
    title: "Skill Gap Detection",
    description: "Understand exactly what needs improvement.",
  },
  {
    num: "03",
    title: "Drive Matching",
    description: "Compare readiness against recruitment requirements.",
  },
  {
    num: "04",
    title: "Personalized Preparation",
    description: "Turn gaps into actionable preparation.",
  },
  {
    num: "05",
    title: "Placement Analytics",
    description: "Understand campus-level readiness.",
  },
  {
    num: "06",
    title: "Evidence-Based Profiles",
    description: "Build profiles around measurable evidence.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 bg-background border-b border-border">
      <div className="container mx-auto px-6 max-w-5xl">
        
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.2]">
            Everything you need to <br className="hidden md:block" />
            <span className="text-accent italic">build readiness.</span>
          </h2>
        </div>

        <div className="flex flex-col border-t border-border">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group"
            >
              <div className="grid grid-cols-[60px_1fr] md:grid-cols-[100px_1fr_2fr] gap-4 md:gap-8 items-center py-8 border-b border-border group-hover:bg-[#f8f8f3] transition-colors -mx-6 px-6 cursor-default">
                <div className="text-xl font-serif italic text-accent opacity-70">
                  {feature.num}
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground font-medium col-span-2 md:col-span-1 mt-2 md:mt-0">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
