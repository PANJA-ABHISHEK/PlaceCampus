'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiClientError } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users,
  Rocket,
  BarChart2,
  Target,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'PLACEMENT_OFFICER', label: 'Placement Officer' },
  { value: 'RECRUITER', label: 'Recruiter' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'STUDENT',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  }

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  
  const isFormValid = 
    formData.firstName.trim() !== '' &&
    formData.lastName.trim() !== '' &&
    /^\S+@\S+\.\S+$/.test(formData.email) &&
    formData.password.length >= 8 &&
    passwordsMatch;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    setError('');
    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9FC] to-[#F3EEF9] relative overflow-hidden font-sans text-[#111111] flex flex-col selection:bg-[#5B2A86]/20">
      
      {/* Background Decoratives */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-white/80 blur-[80px]" />
        <div className="absolute top-[10%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-[#5B2A86]/5 blur-[100px]" />
        <div className="absolute top-10 right-[25%] w-[5vw] h-[5vw] rounded-full bg-[#5B2A86]/10 blur-xl" />
        <div className="absolute bottom-10 left-[15%] w-[8vw] h-[8vw] rounded-full bg-[#5B2A86]/10 blur-2xl" />
        
        {/* Right side large circle background */}
        <div className="absolute top-1/2 -translate-y-1/2 right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#F4EEFA] border-[1.5px] border-dashed border-[#5B2A86]/20 hidden lg:block">
          <div className="absolute inset-0 m-auto w-[75%] h-[75%] rounded-full border border-dashed border-[#5B2A86]/15" />
          <div className="absolute inset-0 m-auto w-[50%] h-[50%] rounded-full bg-white/60 shadow-[0_0_100px_rgba(91,42,134,0.1)]" />
        </div>
      </div>

      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 md:px-12 py-6 relative z-50">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 flex items-center justify-center rounded-lg bg-[#5B2A86] text-white shadow-[0_4px_12px_rgba(91,42,134,0.3)] transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#111111] font-serif">
            PlaceCampus
          </span>
        </Link>
        <div className="text-[14px] font-medium text-[#555555]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#5B2A86] hover:text-[#4a226d] font-bold transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col xl:flex-row items-center xl:items-stretch justify-center w-full max-w-[1700px] mx-auto px-6 md:px-12 pb-12 relative z-10 gap-10 xl:gap-4 2xl:gap-12">
        
        {/* LEFT COLUMN: Marketing & Benefits */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full xl:w-[32%] flex flex-col justify-center xl:pr-4 order-2 xl:order-1 pt-8 xl:pt-0"
        >
          <div className="inline-flex items-center gap-2 bg-[#F3EEF9] border border-[#5B2A86]/10 px-3 py-1.5 rounded-full w-fit mb-6">
            <Users size={14} className="text-[#5B2A86]" />
            <span className="text-[12px] font-bold text-[#555555]">Join thousands of students</span>
          </div>
          
          <h1 className="text-[40px] leading-[1.1] md:text-[48px] font-bold text-[#111111] mb-5 tracking-tight">
            Start Your<br />Placement Journey<br /><span className="text-[#5B2A86]">Today.</span>
          </h1>
          
          <p className="text-[16px] text-[#555555] mb-10 leading-relaxed max-w-[400px]">
            Create your account and unlock opportunities, track your readiness, and move closer to your dream career.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="p-3 bg-white rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E5E5] shrink-0 group-hover:border-[#5B2A86]/30 transition-colors">
                <Rocket className="h-6 w-6 text-[#5B2A86]" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[#111111] mb-0.5">Explore Opportunities</h3>
                <p className="text-[13px] text-[#777777]">Find drives that match your skills.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="p-3 bg-white rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E5E5] shrink-0 group-hover:border-[#5B2A86]/30 transition-colors">
                <BarChart2 className="h-6 w-6 text-[#5B2A86]" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[#111111] mb-0.5">Track Your Growth</h3>
                <p className="text-[13px] text-[#777777]">Measure and improve your readiness.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="p-3 bg-white rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E5E5] shrink-0 group-hover:border-[#5B2A86]/30 transition-colors">
                <Target className="h-6 w-6 text-[#5B2A86]" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[#111111] mb-0.5">Get Placed with Confidence</h3>
                <p className="text-[13px] text-[#777777]">Turn your preparation into success.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 opacity-80">
            <span className="font-serif italic text-2xl text-[#5B2A86] transform -rotate-2 inline-block">
              Your<br />
              <span className="ml-4 border-b border-[#5B2A86]/30 pb-1">Career Starts Here</span>
            </span>
          </div>
        </motion.div>

        {/* CENTER COLUMN: Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-[480px] xl:w-[36%] flex flex-col items-center order-1 xl:order-2"
        >
          {/* Centered Logo Above Card */}
          <div className="text-center mb-6">
            <h2 className="text-[32px] font-bold font-serif text-[#5B2A86] tracking-tight">
              PlaceCampus
            </h2>
            <p className="text-[13px] text-[#777777] font-medium mt-1">
              Intelligent University Placement Readiness
            </p>
          </div>

          <div className="w-full bg-white rounded-[24px] shadow-[0_20px_80px_rgba(0,0,0,0.05)] border border-[#F0F0F0] p-8 sm:p-10">
            <h3 className="text-[22px] font-bold text-center mb-8 text-[#111111]">Create Account</h3>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-[10px] bg-[#FFF5F5] border border-[#FFE0E0] px-4 py-3 text-[13px] text-[#D93025] font-medium">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-[10px] bg-[#F0FDF4] border border-[#DCFCE7] px-4 py-3 text-[13px] text-[#15803D] font-medium">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    <span>Account created successfully! Redirecting...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#111111]">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-[10px] border border-[#E5E5E5] bg-white text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[14px]"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#111111]">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-[10px] border border-[#E5E5E5] bg-white text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[14px]"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111111]">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full h-11 px-4 rounded-[10px] border border-[#E5E5E5] bg-white text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[14px]"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111111]">Role</label>
                <div className="relative">
                  <select
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    className="w-full h-11 px-4 pr-10 rounded-[10px] border border-[#E5E5E5] bg-white text-[#111111] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[14px] appearance-none cursor-pointer"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  select
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/0.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111111]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required
                    className="w-full h-11 px-4 pr-10 rounded-[10px] border border-[#E5E5E5] bg-white text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#5B2A86] focus:ring-[3px] focus:ring-[#5B2A86]/10 transition-all text-[14px]"
                    placeholder="Min. 8 characters"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111111]">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    required
                    className={`w-full h-11 px-4 pr-10 rounded-[10px] border bg-white text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:ring-[3px] transition-all text-[14px] ${
                      formData.confirmPassword.length > 0
                        ? passwordsMatch 
                          ? 'border-[#15803D]/50 focus:border-[#15803D] focus:ring-[#15803D]/10'
                          : 'border-[#D93025]/50 focus:border-[#D93025] focus:ring-[#D93025]/10'
                        : 'border-[#E5E5E5] focus:border-[#5B2A86] focus:ring-[#5B2A86]/10'
                    }`}
                    placeholder="Repeat password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] focus:outline-none transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid || success}
                className="w-full h-[46px] rounded-[10px] bg-[#5B2A86] text-white font-bold text-[14px] hover:bg-[#4a226d] focus:outline-none focus:ring-4 focus:ring-[#5B2A86]/20 transition-all disabled:opacity-50 disabled:hover:bg-[#5B2A86] disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 size={18} />
                    Success!
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
            
            <div className="mt-8 text-center sm:hidden">
              <span className="text-[13px] text-[#777777]">Already have an account? </span>
              <Link href="/login" className="text-[13px] text-[#5B2A86] font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Student Visual */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full xl:w-[32%] hidden lg:flex flex-col items-center justify-center relative order-3 h-[600px] xl:h-auto"
        >
          {/* Floating UI Elements */}
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-0 xl:left-[-10%] bg-white rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-white z-20 flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3EEF9] flex items-center justify-center text-[#5B2A86]">
              <GraduationCap size={20} />
            </div>
            <div className="text-[11px] font-bold text-[#111111] text-center leading-tight">
              Learn<br/>Prepare<br/>Get Placed
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[40%] right-[-5%] xl:right-[-15%] bg-white rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-white z-20 flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3EEF9] flex items-center justify-center text-[#5B2A86]">
              <BarChart2 size={20} />
            </div>
            <div className="text-[11px] font-bold text-[#111111] text-center leading-tight">
              Skills<br/>Growth<br/>Success
            </div>
          </motion.div>
          
          <motion.div 
            animate={{ y: [0, -8, 0] }} 
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-[25%] left-[5%] xl:left-[-20%] bg-white rounded-2xl p-3 px-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-white z-20 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3EEF9] flex items-center justify-center text-[#5B2A86]">
              <Target size={20} />
            </div>
            <div className="text-[12px] font-bold text-[#111111] leading-tight">
              Opportunities<br/><span className="text-[#777777] font-normal">For You</span>
            </div>
          </motion.div>

          {/* Student Image */}
          <div className="relative w-[380px] h-[550px] z-10 flex items-end justify-center">
            <Image
              src="/student-hero.png"
              alt="Student ready for placement"
              fill
              className="object-contain object-bottom drop-shadow-2xl"
              priority
            />
          </div>
          
          <div className="absolute bottom-4 right-0 xl:right-[-10%] z-20">
            <span className="font-serif italic text-xl text-[#777777] transform -rotate-6 inline-block leading-tight text-right">
              Dream<br/>Prepare<br/>Achieve
            </span>
          </div>
          
        </motion.div>
      </main>
    </div>
  );
}
