"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ChevronDown, Loader2, Plus, Search, Tags } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { adminCard } from "@/features/admin-imports/components/import-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TaxonomySkill = { id: string; name: string; normalizedName: string; description?: string; active: boolean; synonyms: string[]; clusterId?: string; clusterName?: string };
type Cluster = { id: string; name: string; description?: string };
type SkillForm = { name: string; description: string; clusterId: string; synonyms: string };
const input = "h-10 w-full rounded-xl border border-[#DCE3EC] bg-white px-3 text-sm text-[#142B4D] outline-none transition focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";
const emptyForm: SkillForm = { name: "", description: "", clusterId: "", synonyms: "" };

export default function AdminTaxonomyPage() {
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("ACTIVE");
  const [editing, setEditing] = React.useState<TaxonomySkill | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const qc = useQueryClient();
  const skills = useQuery({ queryKey: ["admin", "taxonomy"], queryFn: () => apiClient.get<TaxonomySkill[]>("/admin/skills") });
  const clusters = useQuery({ queryKey: ["skills", "clusters"], queryFn: () => apiClient.get<Cluster[]>("/skills/clusters") });
  const saveSkill = useMutation({
    mutationFn: (v: { id?: string; payload: SkillForm }) => {
      const synonyms = v.payload.synonyms.split(",").map((item) => item.trim()).filter(Boolean);
      const body = { name: v.payload.name.trim(), description: v.payload.description.trim(), clusterId: v.payload.clusterId || null, synonyms };
      return v.id ? apiClient.patch(`/admin/skills/${v.id}`, body) : apiClient.post("/admin/skills", body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin", "taxonomy"] }); void qc.invalidateQueries({ queryKey: ["skills", "taxonomy"] }); setDialogOpen(false); setEditing(null); toast.success("Skill saved"); },
    onError: (error) => toast.error("Couldn’t save this skill", { description: error instanceof ApiError ? error.message : "Please check the fields and retry." }),
  });
  const setSkillActive = useMutation({
    mutationFn: (skill: TaxonomySkill) => apiClient.patch(`/admin/skills/${skill.id}`, { active: !skill.active }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin", "taxonomy"] }); void qc.invalidateQueries({ queryKey: ["skills", "taxonomy"] }); toast.success("Taxonomy status updated"); },
    onError: (error) => toast.error("Couldn’t update the skill", { description: error instanceof ApiError ? error.message : undefined }),
  });
  const visible = (skills.data ?? []).filter((skill) => (activeFilter === "ALL" || (activeFilter === "ACTIVE" ? skill.active : !skill.active)) && `${skill.name} ${skill.description ?? ""} ${skill.synonyms.join(" ")} ${skill.clusterName ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (skill: TaxonomySkill) => { setEditing(skill); setDialogOpen(true); };

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B1A]">Admin / Skills Taxonomy</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4D] sm:text-3xl">Skills Taxonomy</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Manage canonical skills, aliases, and their existing clusters used across student profiles and placement matching.</p></div><button type="button" onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#FF6B1A] px-4 text-sm font-semibold text-white transition hover:bg-[#EA580C] sm:self-auto"><Plus className="h-4 w-4" />Add Skill</button></header>
    <section className={cn(adminCard, "overflow-hidden")}>
      <div className="flex flex-col gap-3 border-b border-[#E8EDF3] p-4 sm:flex-row sm:items-center sm:p-5">
        <label className="relative min-w-0 flex-1 sm:max-w-[420px]"><span className="sr-only">Search skills</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className={cn(input, "pl-9")} placeholder="Search skill, alias, or cluster" /></label>
        <Select value={activeFilter} onChange={setActiveFilter} options={[["ACTIVE", "Active skills"], ["INACTIVE", "Inactive skills"], ["ALL", "All skills"]]} />
        {skills.data && <span className="text-xs text-slate-500 sm:ml-auto">{visible.length} skill{visible.length === 1 ? "" : "s"}</span>}
      </div>
      {skills.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        : skills.isError ? <ErrorState onRetry={() => skills.refetch()} />
          : !visible.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><Tags className="mb-3 h-8 w-8 text-slate-400" /><p className="font-semibold text-[#142B4D]">No skills found</p><p className="mt-1 text-sm text-slate-500">Try another filter or add a canonical skill.</p></div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Skill</th><th className="px-4 py-3">Cluster</th><th className="px-4 py-3">Aliases</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#E8EDF3]">{visible.map((skill) => <tr key={skill.id} className="transition hover:bg-slate-50/60">
                <td className="max-w-[420px] px-5 py-3"><p className="font-semibold text-[#142B4D]">{skill.name}</p><p className="mt-0.5 text-xs text-slate-500">{skill.description || `Canonical key: ${skill.normalizedName}`}</p></td>
                <td className="px-4 py-3 text-slate-600">{skill.clusterName ?? "Uncategorized"}</td>
                <td className="max-w-[260px] px-4 py-3 text-xs text-slate-600">{skill.synonyms.length ? skill.synonyms.join(", ") : "—"}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", skill.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{skill.active ? "Active" : "Inactive"}</span></td>
                <td className="px-5 py-3 text-right"><div className="inline-flex gap-2"><button type="button" onClick={() => openEdit(skill)} className="h-9 rounded-lg border border-[#DCE3EC] px-3 text-xs font-semibold text-[#142B4D] hover:bg-slate-50">Edit</button><button type="button" disabled={setSkillActive.isPending} onClick={() => setSkillActive.mutate(skill)} className={cn("h-9 rounded-lg border px-3 text-xs font-semibold", skill.active ? "border-slate-200 text-slate-600 hover:bg-slate-100" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50")}>{skill.active ? "Deactivate" : "Activate"}</button></div></td>
              </tr>)}</tbody>
            </table></div>}
    </section>
    <p className="text-xs text-slate-500">Deactivated skills remain in historical records and are excluded from the active taxonomy returned to the application.</p>

    <SkillDialog key={`${dialogOpen}-${editing?.id ?? "new"}`} open={dialogOpen} skill={editing} clusters={clusters.data ?? []} clustersLoading={clusters.isLoading} pending={saveSkill.isPending} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }} onSave={(payload) => saveSkill.mutate({ id: editing?.id, payload })} />
  </div>;
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="relative"><span className="sr-only">Filter skills</span><select value={value} onChange={(e) => onChange(e.target.value)} className={cn(input, "w-full appearance-none pr-9 sm:min-w-[160px]")}>{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></label>;
}

function SkillDialog({ open, skill, clusters, clustersLoading, pending, onOpenChange, onSave }: { open: boolean; skill: TaxonomySkill | null; clusters: Cluster[]; clustersLoading: boolean; pending: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: SkillForm) => void }) {
  const [form, setForm] = React.useState<SkillForm>(() => skill ? { name: skill.name, description: skill.description ?? "", clusterId: skill.clusterId ?? "", synonyms: skill.synonyms.join(", ") } : emptyForm);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
    <DialogHeader><DialogTitle className="text-[#142B4D]">{skill ? "Edit skill" : "Add canonical skill"}</DialogTitle><DialogDescription>Canonical names and aliases are used to normalize verified evidence into student skill profiles.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <label className="block space-y-1.5 text-sm font-semibold text-[#142B4D]">Skill name<input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} placeholder="e.g. TypeScript" /></label>
      <label className="block space-y-1.5 text-sm font-semibold text-[#142B4D]">Description <span className="font-normal text-slate-500">(optional)</span><textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 w-full rounded-xl border border-[#DCE3EC] px-3 py-2 text-sm font-normal outline-none focus:border-[#FF6B1A]/50" /></label>
      <label className="block space-y-1.5 text-sm font-semibold text-[#142B4D]">Cluster <span className="font-normal text-slate-500">(optional)</span><select value={form.clusterId} onChange={(e) => setForm({ ...form, clusterId: e.target.value })} disabled={clustersLoading} className={cn(input, "font-normal")}><option value="">No cluster</option>{clusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.name}</option>)}</select></label>
      <label className="block space-y-1.5 text-sm font-semibold text-[#142B4D]">Aliases <span className="font-normal text-slate-500">(comma-separated)</span><input value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} className={cn(input, "font-normal")} placeholder="e.g. TS, Type Script" /></label>
      <DialogFooter><button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-[#DCE3EC] px-4 text-sm font-semibold text-[#142B4D]">Cancel</button><button type="submit" disabled={pending || !form.name.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B1A] px-4 text-sm font-semibold text-white disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />}Save Skill</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><AlertCircle className="h-8 w-8 text-red-500" /><p className="font-semibold text-[#142B4D]">Couldn’t load the taxonomy</p><button type="button" onClick={onRetry} className="rounded-lg border border-[#DCE3EC] px-3 py-2 text-sm font-semibold">Try again</button></div>; }
