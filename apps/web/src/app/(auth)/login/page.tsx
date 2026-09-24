'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { 
  LogIn, 
  AlertCircle, 
  GraduationCap, 
  Search, 
  BarChart2, 
  Target, 
  Briefcase,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';

const roleHomePaths: Record<string, string> = {
  STUDENT: '/student/dashboard',
  FACULTY: '/faculty/dashboard',
  PLACEMENT_OFFICER: '/placement/dashboard',
  PLACEMENT_HEAD: '/placement/dashboard',
  RECRUITER: '/recruiter/dashboard',
  ADMIN: '/admin/dashboard',
};

const benefits = [
  {
    icon: Search,
    title: "Discover Placement Opportunities",
    desc: "Find drives that match your eligibility and skills."
  },
  {
    icon: BarChart2,
    title: "Measure Your Readiness",
    desc: "Understand your preparation across technical, coding, project, and interview dimensions."
  },
  {
    icon: Target,
    title: "Identify Skill Gaps",
    desc: "Know exactly what you need to improve for your target roles."
  },
  {
    icon: Briefcase,
    title: "Prepare for Recruitment",
    desc: "Turn readiness gaps into actionable preparation."
  }
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Get user from localStorage after login sets it
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser) as { role: string };
        const redirectPath = roleHomePaths[user.role] ?? '/student/dashboard';
        router.push(redirectPath);
      } else {
        router.push('/student/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Global Header */}
      <header className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 flex items-center justify-center rounded bg-[#5B2A86] group-hover:bg-[#4a226d] transition-colors">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#111111] font-serif">
            PlaceCampus
          </span>
        </Link>
        <div className="text-sm font-medium text-[#777777] hidden sm:block">
          New to PlaceCampus?{' '}
          <Link href="/register" className="text-[#5B2A86] hover:text-[#F58220] transition-colors ml-1 font-bold">
            Create Account &rarr;
          </Link>
        </div>
      </header>

      {/* Left Area - Hero & Content */}
      <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-24 pt-32 pb-12 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <h1 className="text-5xl lg:text-[4rem] font-bold text-[#111111] leading-[1.1] mb-2 tracking-tight">
            GET PLACEMENT-READY
          </h1>
          <h2 className="text-4xl lg:text-5xl font-serif text-[#5B2A86] italic mb-6">
            with confidence.
          </h2>
          
          <p className="text-lg text-[#555555] mb-12 leading-relaxed max-w-[500px]">
            Build your placement readiness, discover relevant opportunities,
            identify skill gaps, and prepare with a clear path toward your
            next career opportunity.
          </p>

          <div className="space-y-6 mb-16 relative z-20">
            {benefits.map((benefit, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + (i * 0.1) }}
                className="flex items-start gap-4 group"
              >
                <div className="mt-0.5 p-2 rounded-lg border border-[#5B2A86]/20 bg-white group-hover:bg-[#f0e6f6] transition-colors shrink-0">
                  <benefit.icon className="h-5 w-5 text-[#5B2A86]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] text-[15px] mb-1">{benefit.title}</h3>
                  <p className="text-sm text-[#777777] leading-relaxed max-w-sm">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-8 sm:gap-12 border-t border-[#D9D9D9] pt-8 relative z-20">
            <div>
              <div className="text-2xl font-bold text-[#111111]">5,000+</div>
              <div className="text-xs font-bold text-[#777777] uppercase tracking-wider mt-1">Students</div>
            </div>
            <div className="w-px h-10 bg-[#D9D9D9]"></div>
            <div>
              <div className="text-2xl font-bold text-[#5B2A86]">100+</div>
              <div className="text-xs font-bold text-[#777777] uppercase tracking-wider mt-1">Placement Drives</div>
            </div>
            <div className="w-px h-10 bg-[#D9D9D9] hidden sm:block"></div>
            <div className="hidden sm:block">
              <div className="text-2xl font-bold text-[#111111]">95%</div>
              <div className="text-xs font-bold text-[#777777] uppercase tracking-wider mt-1">Readiness Tracking</div>
            </div>
          </div>
        </motion.div>

        {/* Abstract shape and Student Image Background */}
        <div className="absolute bottom-[100px] right-0 w-[400px] h-[500px] pointer-events-none opacity-20 sm:opacity-100 hidden md:block">
          <div className="absolute bottom-0 right-[-50px] w-[500px] h-[500px] bg-[#5B2A86] rounded-tl-[200px] opacity-10"></div>
          <Image 
            src="/student-hero.png" 
            alt="Student placement ready" 
            width={400} 
            height={500} 
            className="absolute bottom-[60px] right-0 object-contain object-bottom h-[90%] w-auto drop-shadow-2xl"
            priority
          />
        </div>
      </div>

      {/* Right Area - Login Card */}
      <div className="w-full lg:w-[45%] xl:w-[40%] bg-white border-l border-[#D9D9D9] flex flex-col justify-center items-center px-6 py-20 relative z-20 shadow-[-20px_0_60px_rgba(0,0,0,0.03)]">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {/* Card Container */}
          <div className="bg-white rounded-[20px] sm:border sm:border-[#E0E0E0] sm:shadow-[0_20px_60px_rgba(0,0,0,0.06)] sm:p-10">
            <div className="mb-8">
              <h2 className="text-[28px] font-bold text-[#111111] mb-2 font-sans tracking-tight">STUDENT LOGIN</h2>
              <p className="text-[#777777] text-[15px]">Welcome back to PlaceCampus.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3.5 mb-6 rounded-lg bg-[#FFF5F5] border border-[#FFE0E0] text-[#D93025] text-sm font-medium">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error === 'Invalid email or password' ? 'Invalid email or password.' : 'Unable to sign in right now. Please try again.'}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-[14px] font-semibold text-[#111111]">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#999999] group-focus-within:text-[#5B2A86] transition-colors" />
                  <input
                    type="email"
                    className="w-full h-14 pl-11 pr-4 rounded-lg border border-[#D9D9D9] bg-white text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[15px]"
                    placeholder="Enter your university email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[14px] font-semibold text-[#111111]">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#999999] group-focus-within:text-[#5B2A86] transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-14 pl-11 pr-12 rounded-lg border border-[#D9D9D9] bg-white text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[15px]"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#5B2A86] focus:outline-none p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 pb-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-[#D9D9D9] text-[#5B2A86] focus:ring-[#5B2A86]/30 cursor-pointer" />
                  <span className="text-[14px] text-[#777777] group-hover:text-[#111111] transition-colors">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[14px] text-[#5B2A86] hover:text-[#F58220] transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full h-14 rounded-lg bg-[#5B2A86] text-white font-bold text-[16px] hover:bg-[#F58220] focus:outline-none focus:ring-4 focus:ring-[#F58220]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in &rarr;
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center sm:hidden">
            <span className="text-[14px] text-[#777777]">New to PlaceCampus? </span>
            <Link href="/register" className="text-[14px] text-[#5B2A86] font-bold hover:underline">
              Create Account
            </Link>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-[14px] text-[#777777] mb-1">Need help signing in?</p>
            <button className="text-[14px] font-bold text-[#111111] hover:text-[#5B2A86] transition-colors">
              Contact Placement Cell
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
