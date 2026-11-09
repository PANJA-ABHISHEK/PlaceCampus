"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Clock3, Database, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { adminCard } from "@/features/admin-imports/components/import-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Configuration = {
  checkedAt: string;
  runtime: { environment: string; apiPort: number; frontendUrl?: string; backendUrl?: string; accessTokenLifetime?: string; refreshTokenLifetime?: string; databaseConfiguration: string; queueConfiguration: string };
  policies: { mentorSoftTarget: number; evidenceReviewSlaWorkingDays: number; maximumImportRows: number; maximumUpcomingInterviews: number };
};

export default function AdminSystemConfigurationPage() {
  const config = useQuery({ queryKey: ["admin", "configuration"], queryFn: () => apiClient.get<Configuration>("/admin/configuration") });
  const data = config.data;
  return <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B1A]">Admin / System Configuration</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4D] sm:text-3xl">System Configuration</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Review active runtime settings and the operational policies currently used by PlaceCampus.</p></div><button type="button" onClick={() => config.refetch()} disabled={config.isFetching} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#DCE3EC] bg-white px-3.5 text-sm font-semibold text-[#142B4D] hover:bg-slate-50 disabled:opacity-50 sm:self-auto"><RefreshCw className={cn("h-4 w-4 text-[#FF6B1A]", config.isFetching && "animate-spin")} />Refresh</button></header>
    {config.isLoading ? <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      : config.isError || !data ? <div className={cn(adminCard, "flex flex-col items-center gap-3 px-6 py-12 text-center")}><AlertCircle className="h-8 w-8 text-red-500" /><p className="font-semibold text-[#142B4D]">Couldn’t load configuration</p><p className="text-sm text-slate-500">Check the API connection and try again.</p><button type="button" onClick={() => config.refetch()} className="rounded-lg border border-[#DCE3EC] px-3 py-2 text-sm font-semibold">Try again</button></div>
        : <>
          <section className="grid gap-4 md:grid-cols-2">
            <ConfigCard icon={Server} title="Runtime" description="Public runtime details returned by the API.">
              <ConfigRow label="Environment" value={data.runtime.environment} />
              <ConfigRow label="API port" value={String(data.runtime.apiPort)} />
              <ConfigRow label="Frontend URL" value={data.runtime.frontendUrl ?? "Not set"} />
              <ConfigRow label="Backend URL" value={data.runtime.backendUrl ?? "Not set"} />
            </ConfigCard>
            <ConfigCard icon={ShieldCheck} title="Authentication" description="Token lifetimes. Secret keys are never exposed here.">
              <ConfigRow label="Access token" value={data.runtime.accessTokenLifetime ?? "Not set"} />
              <ConfigRow label="Refresh token" value={data.runtime.refreshTokenLifetime ?? "Not set"} />
            </ConfigCard>
            <ConfigCard icon={Database} title="Connected services configuration" description="Shows where connection settings are sourced; it does not expose credentials or connection strings.">
              <ConfigRow label="Database" value={data.runtime.databaseConfiguration} />
              <ConfigRow label="Job queue" value={data.runtime.queueConfiguration} />
            </ConfigCard>
            <ConfigCard icon={Activity} title="Operational policies" description="Current limits enforced by the application services.">
              <ConfigRow label="Soft mentor workload target" value={`${data.policies.mentorSoftTarget} students`} />
              <ConfigRow label="Evidence review SLA" value={`${data.policies.evidenceReviewSlaWorkingDays} working days`} />
              <ConfigRow label="Maximum rows per import" value={data.policies.maximumImportRows.toLocaleString()} />
              <ConfigRow label="Upcoming interviews per student" value={String(data.policies.maximumUpcomingInterviews)} />
            </ConfigCard>
          </section>
          <div className="flex flex-col gap-2 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center"><Clock3 className="h-4 w-4 shrink-0 text-[#FF6B1A]" aria-hidden="true" /><p>Values checked {new Date(data.checkedAt).toLocaleString()}. Environment-dependent settings are deployment-managed; application policy values are maintained in their respective services.</p></div>
        </>}
  </div>;
}

function ConfigCard({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return <section className={cn(adminCard, "p-5 sm:p-6")}><div className="mb-4 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A]"><Icon className="h-5 w-5" /></span><div><h2 className="font-bold text-[#142B4D]">{title}</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div></div><div className="divide-y divide-slate-100">{children}</div></section>;
}
function ConfigRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span className="text-slate-600">{label}</span><span className="break-all text-right font-semibold text-[#142B4D]">{value}</span></div>;
}
