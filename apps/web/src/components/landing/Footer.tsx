import * as React from "react"
import Link from "next/link"
import { GraduationCap } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#111111] pt-20 pb-8 text-white relative border-t-4 border-[#5B2A86]">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group mb-8">
              <div className="p-1.5 flex items-center justify-center rounded border border-[#5B2A86]/20 bg-white group-hover:bg-[#f0e6f6] transition-colors">
                <GraduationCap className="h-6 w-6 text-[#5B2A86]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white font-serif">
                PlaceCampus
              </span>
            </Link>
          </div>
          
          <div>
            <h4 className="font-bold text-[#777777] mb-6 uppercase tracking-[0.2em] text-xs">Platform</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/student" className="text-white/70 hover:text-[#c4a6db] transition-colors">Student Dashboard</Link></li>
              <li><Link href="/student/readiness" className="text-white/70 hover:text-[#c4a6db] transition-colors">Readiness</Link></li>
              <li><Link href="/student/drives" className="text-white/70 hover:text-[#c4a6db] transition-colors">Placement Drives</Link></li>
              <li><Link href="/student/preparation" className="text-white/70 hover:text-[#c4a6db] transition-colors">Preparation</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[#777777] mb-6 uppercase tracking-[0.2em] text-xs">Placement Cells</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/placement-cell" className="text-white/70 hover:text-[#c4a6db] transition-colors">Dashboard</Link></li>
              <li><Link href="/placement-cell/drives" className="text-white/70 hover:text-[#c4a6db] transition-colors">Drive Management</Link></li>
              <li><Link href="/placement-cell/analytics" className="text-white/70 hover:text-[#c4a6db] transition-colors">Analytics</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#777777] mb-6 uppercase tracking-[0.2em] text-xs">Company</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/about" className="text-white/70 hover:text-[#c4a6db] transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-white/70 hover:text-[#c4a6db] transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-white/70 hover:text-[#c4a6db] transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-white/70 hover:text-[#c4a6db] transition-colors">Terms</Link></li>
            </ul>
          </div>
          
        </div>
        
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-medium text-white/50 tracking-widest uppercase">
            © 2026 PlaceCampus • Intelligent University Placement Readiness Platform
          </p>
          <div className="flex gap-6 text-xs font-medium text-white/50 tracking-widest uppercase">
            <Link href="/privacy" className="hover:text-[#c4a6db] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#c4a6db] transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
