"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FilePenLine, SearchX } from "lucide-react";
import { DriveForm } from "@/features/drives/components/drive-form";
import { DriveStatusBadge, driveCardClassName } from "@/features/drives/components/drive-admin-ui";
import { usePlacementDrive } from "@/features/drives/hooks/use-drives";
import { HeroWaves } from "@/components/brand/hero-waves";

export default function EditDrivePage() {
  const { id } = useParams() as { id: string };
  const { data: drive, isLoading, isError, refetch } = usePlacementDrive(id);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-8">
      <Link
        href={`/placement/drives/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10264A]/70 transition-colors hover:text-[#FF6500]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Drive Details
      </Link>

      <header className="pc-enter relative overflow-hidden rounded-[20px] border border-[#FF6500]/15 bg-gradient-to-r from-white via-[#FFF6F0] to-[#FFE9DB] px-5 py-5 shadow-[0_10px_30px_-20px_rgba(255,101,0,0.45)] sm:px-7 sm:py-6">
        <HeroWaves />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFE7D6] text-[#FF6500] shadow-[0_8px_18px_-10px_rgba(255,101,0,0.7)] ring-1 ring-[#FF6500]/15 sm:flex">
              <FilePenLine className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#10264A] sm:text-[32px] sm:leading-tight">
                Edit <span className="text-[#FF6500]">Placement Drive</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#10264A]/75 sm:text-[15px]">
                {drive
                  ? <>Update the recruitment details, eligibility criteria and required skills for <span className="font-semibold text-[#10264A]">{drive.companyName}</span> · {drive.roleTitle}.</>
                  : "Update the recruitment details, eligibility criteria and required skills."}
              </p>
            </div>
          </div>
          {drive && <DriveStatusBadge status={drive.status} className="mt-1" />}
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-5" aria-label="Loading drive">
          <div className="h-[68px] animate-pulse rounded-[20px] bg-white" />
          <div className="h-[520px] animate-pulse rounded-[20px] bg-white" />
        </div>
      ) : !drive ? (
        <div className={`${driveCardClassName} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1E8] text-[#FF6500]">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-bold text-[#10264A]">{isError ? "Drive could not be loaded" : "Drive not found"}</h2>
          <p className="max-w-md text-sm text-slate-500">
            {isError ? "Check your connection and try again." : "This drive may have been removed, or the link is incorrect."}
          </p>
          <div className="flex gap-2 pt-1">
            {isError && (
              <button type="button" onClick={() => void refetch()} className="h-10 rounded-xl bg-[#FF6500] px-4 text-sm font-semibold text-white hover:bg-[#E85C00]">
                Try again
              </button>
            )}
            <Link href="/placement/drives" className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-[#10264A] hover:bg-slate-50">
              Back to Drives
            </Link>
          </div>
        </div>
      ) : (
        <DriveForm key={drive.id} initialData={drive} />
      )}
    </div>
  );
}
