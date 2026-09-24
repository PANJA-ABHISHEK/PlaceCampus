"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FinalCTA() {
  return (
    <section className="py-24 md:py-32 bg-[#111111] border-t border-[#5B2A86]/20">
      <div className="container mx-auto px-6 max-w-4xl text-center">
        
        <h2 className="text-5xl md:text-6xl font-serif text-white mb-8 leading-[1.1]">
          Build a campus ready <br />
          <span className="text-[#5B2A86] italic">for opportunity.</span>
        </h2>
        
        <p className="text-lg md:text-xl text-[#bfbfbf] mb-12 font-medium max-w-2xl mx-auto">
          Give students clarity. Give placement teams visibility. Give every recruitment drive a better-prepared talent pool.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button size="lg" className="h-14 px-8 text-base bg-[#5B2A86] hover:bg-[#F58220] text-white rounded font-bold shadow-none group transition-colors" asChild>
            <Link href="/register">
              Get Started <ArrowUpRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-8 text-base bg-transparent border-white/20 text-white hover:border-[#F58220] hover:text-[#F58220] rounded font-bold shadow-none transition-colors group" asChild>
            <Link href="/login">
              Login <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

      </div>
    </section>
  )
}
