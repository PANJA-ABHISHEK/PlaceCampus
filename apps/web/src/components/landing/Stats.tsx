"use client"

import * as React from "react"
import { motion } from "framer-motion"

const stats = [
  { value: "5,000+", label: "Students Assessed" },
  { value: "100+", label: "Recruitment Drives" },
  { value: "50+", label: "Skill Categories" },
  { value: "1", label: "Unified Platform" },
]

export function Stats() {
  return (
    <section className="py-24 bg-accent">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8 divide-x divide-white/20">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center px-4 first:border-0 md:first:border-l-0"
            >
              <h4 className="text-4xl md:text-5xl font-serif text-white mb-4">{stat.value}</h4>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#111111]">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
