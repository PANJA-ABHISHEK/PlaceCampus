"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  actorName: string;
  actorRole: string;
  success: boolean;
  reason?: string;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const audit = useQuery({
    queryKey: ["admin", "audit", "recent"],
    queryFn: () => apiClient.get<AuditEntry[]>("/admin/audit/recent", { params: { limit: "50" } }),
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#F45D16]"><ShieldCheck className="h-5 w-5" /></span>
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F45D16]">Governance</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#142B4D]">Audit Logs</h1><p className="mt-1 text-sm text-[#64748B]">Administrative actions recorded by PlaceCampus.</p></div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white shadow-[0_8px_30px_-24px_rgba(20,43,77,0.25)]">
        <div className="flex items-center justify-between border-b border-[#EDF0F4] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#FF6B1A]" /><h2 className="font-bold text-[#142B4D]">Recent administrative activity</h2></div>
          <span className="text-xs text-[#718096]">Latest 50 records</span>
        </div>
        {audit.isLoading ? <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div> : audit.isError ? <div className="p-6"><ErrorState description="Audit activity could not be loaded." onRetry={() => audit.refetch()} /></div> : audit.data?.length ? (
          <div className="divide-y divide-[#EDF0F4]">
            {audit.data.map((entry) => <div key={entry.id} className="flex items-start gap-3 px-5 py-4 sm:px-6">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${entry.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{entry.success ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1"><p className="font-semibold text-[#142B4D]">{entry.action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</p><p className="mt-0.5 text-sm text-[#64748B]">{entry.actorName} · {entry.resourceType.toLowerCase()}{entry.reason ? ` · ${entry.reason}` : ""}</p></div>
              <time className="shrink-0 pt-0.5 text-xs text-[#718096]" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
            </div>)}
          </div>
        ) : <div className="px-6 py-16 text-center"><Activity className="mx-auto h-8 w-8 text-[#CBD5E1]" /><h3 className="mt-3 font-semibold text-[#142B4D]">No audit activity yet</h3><p className="mt-1 text-sm text-[#718096]">Administrative actions will appear here when recorded.</p></div>}
      </section>
    </div>
  );
}
