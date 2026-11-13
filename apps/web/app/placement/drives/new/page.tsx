import { BriefcaseBusiness, FileEdit } from "lucide-react";
import { DriveForm } from "@/features/drives/components/drive-form";
import { RecruitmentIllustration } from "@/features/drives/components/drive-ui";
import { HeroWaves } from "@/components/brand/hero-waves";

export default function NewDrivePage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-8">
      <header className="pc-enter relative overflow-hidden rounded-[20px] border border-[#FF6500]/15 bg-gradient-to-r from-white via-[#FFF6F0] to-[#FFE9DB] px-5 py-5 shadow-[0_10px_30px_-20px_rgba(255,101,0,0.45)] sm:px-7 sm:py-6">
        <HeroWaves />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFE7D6] text-[#FF6500] shadow-[0_8px_18px_-10px_rgba(255,101,0,0.7)] ring-1 ring-[#FF6500]/15 sm:flex">
              <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#10264A] sm:text-[32px] sm:leading-tight">
                  Create <span className="text-[#FF6500]">Placement Drive</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6500]/20 bg-white/80 px-3 py-1 text-xs font-semibold text-[#C24E00] shadow-sm">
                  <FileEdit className="h-3.5 w-3.5" aria-hidden="true" />Draft
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#10264A]/75 sm:text-[15px]">
                Configure recruitment details, eligibility criteria and required skills for a new placement opportunity.
              </p>
            </div>
          </div>
          <div className="pointer-events-none hidden h-[112px] w-[190px] shrink-0 lg:block xl:mr-8">
            <RecruitmentIllustration />
          </div>
        </div>
      </header>

      <DriveForm />
    </div>
  );
}
