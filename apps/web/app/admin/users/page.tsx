"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiClient } from "@/lib/api-client";
import { adminCard, DemoBadge } from "@/features/admin-imports/components/import-ui";
import { AlertCircle, ChevronDown, Loader2, Search, ShieldCheck, UserRoundCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string; fullName: string; email: string; roles: string[]; designation?: string; department?: string;
  employeeId?: string; isActive: boolean; accountStatus: string; emailStatus?: string; employmentStatus?: string;
  isDemoData: boolean; lastLoginAt?: string; createdAt: string;
};
type UserPage = { items: AdminUser[]; total: number; page: number; limit: number };
const roles = ["STUDENT", "FACULTY", "PLACEMENT_OFFICER", "ADMIN", "RECRUITER"];
const statuses = ["ACTIVE", "INVITED", "SUSPENDED", "DEACTIVATED"];
const control = "h-10 rounded-xl border border-[#DCE3EC] bg-white px-3 text-sm text-[#142B4D] outline-none transition focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";

function humanize(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()); }

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["admin", "users", search, role, status, page],
    queryFn: () => apiClient.get<UserPage>("/admin/users", { params: { search, role, status, page: String(page), limit: "25" } }),
    placeholderData: (previous) => previous,
  });
  const updateStatus = useMutation({
    mutationFn: (v: { id: string; status: "ACTIVE" | "SUSPENDED" }) => apiClient.patch(`/admin/users/${v.id}/status`, { status: v.status }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin", "users"] }); setSelectedUser(null); toast.success("Account status updated"); },
    onError: (error) => toast.error("Couldn’t update account status", { description: error instanceof ApiError ? error.message : "Please try again." }),
  });
  const data = users.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const activeFilters = !!(search || role || status);

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B1A]">Admin / User Management</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4D] sm:text-3xl">User Management</h1><p className="mt-1 text-sm leading-6 text-slate-600">Review account roles and status. New student and faculty accounts are provisioned through Bulk Imports.</p></div>
      <span className="inline-flex items-center gap-2 self-start rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs text-slate-600 sm:self-auto"><ShieldCheck className="h-4 w-4 text-[#FF6B1A]" aria-hidden="true" />Administrator access</span>
    </header>

    <section className={cn(adminCard, "overflow-hidden")}>
      <div className="flex flex-col gap-3 border-b border-[#E8EDF3] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
        <label className="relative min-w-0 flex-1 sm:max-w-[400px]"><span className="sr-only">Search users</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input className={cn(control, "w-full pl-9")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, or employee ID" /></label>
        <Select value={role} onChange={(v) => { setRole(v); setPage(1); }} label="Filter by role" all="All roles" options={roles} />
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} label="Filter by status" all="All statuses" options={statuses} />
        {activeFilters && <button type="button" onClick={() => { setSearch(""); setRole(""); setStatus(""); setPage(1); }} className="h-10 rounded-xl px-3 text-sm font-semibold text-[#C54C0B] hover:bg-orange-50">Clear filters</button>}
        {data && <span className="text-xs text-slate-500 sm:ml-auto">{data.total.toLocaleString()} accounts</span>}
      </div>

      {users.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        : users.isError ? <ErrorState onRetry={() => users.refetch()} />
          : !data?.items.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><UserRoundCog className="mb-3 h-8 w-8 text-slate-400" aria-hidden="true" /><p className="font-semibold text-[#142B4D]">No matching accounts</p><p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p></div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last login</th><th className="px-5 py-3 text-right">Account action</th></tr></thead>
              <tbody className="divide-y divide-[#E8EDF3]">{data.items.map((user) => {
                const canToggle = user.accountStatus === "ACTIVE" || user.accountStatus === "SUSPENDED";
                return <tr key={user.id} className="transition hover:bg-slate-50/60">
                  <td className="px-5 py-3"><p className="font-semibold text-[#142B4D]">{user.fullName}{user.isDemoData && <span className="ml-2 align-middle"><DemoBadge /></span>}</p><p className="mt-0.5 text-xs text-slate-500">{user.email}{user.employeeId ? ` · ${user.employeeId}` : ""}{user.designation ? ` · ${user.designation}` : ""}</p></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{user.roles.map((value) => <span key={value} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{humanize(value)}</span>)}</div></td>
                  <td className="px-4 py-3 text-slate-600">{user.department ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.accountStatus} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td className="px-5 py-3 text-right">{canToggle ? <button type="button" onClick={() => setSelectedUser(user)} className={cn("h-9 rounded-lg border px-3 text-xs font-semibold transition", user.accountStatus === "ACTIVE" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50")}>{user.accountStatus === "ACTIVE" ? "Suspend" : "Reactivate"}</button> : <span className="text-xs text-slate-400">Managed by account workflow</span>}</td>
                </tr>;
              })}</tbody>
            </table></div>}
      {data && data.total > data.limit && <div className="flex items-center justify-between border-t border-[#E8EDF3] px-5 py-3 text-sm"><span className="text-slate-500">Page {page} of {pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 rounded-lg border border-[#DCE3EC] px-3 font-semibold text-[#142B4D] disabled:opacity-40">Previous</button><button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-9 rounded-lg border border-[#DCE3EC] px-3 font-semibold text-[#142B4D] disabled:opacity-40">Next</button></div></div>}
    </section>

    <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="text-[#142B4D]">{selectedUser?.accountStatus === "ACTIVE" ? "Suspend account?" : "Reactivate account?"}</DialogTitle><DialogDescription>{selectedUser?.fullName} · {selectedUser?.email}<br />{selectedUser?.accountStatus === "ACTIVE" ? "This account will no longer be able to sign in until reactivated." : "This restores sign-in access for this account."}</DialogDescription></DialogHeader>
        <DialogFooter><button type="button" onClick={() => setSelectedUser(null)} className="h-10 rounded-xl border border-[#DCE3EC] px-4 text-sm font-semibold text-[#142B4D]">Cancel</button><button type="button" disabled={updateStatus.isPending} onClick={() => selectedUser && updateStatus.mutate({ id: selectedUser.id, status: selectedUser.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B1A] px-4 text-sm font-semibold text-white disabled:opacity-50">{updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Confirm</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function Select({ value, onChange, label, all, options }: { value: string; onChange: (value: string) => void; label: string; all: string; options: string[] }) {
  return <label className="relative"><span className="sr-only">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className={cn(control, "w-full appearance-none pr-9 sm:min-w-[150px]")}><option value="">{all}</option>{options.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></label>;
}
function StatusBadge({ status }: { status: string }) {
  const tone = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : status === "SUSPENDED" ? "bg-red-50 text-red-700" : status === "INVITED" ? "bg-orange-50 text-[#C54C0B]" : "bg-slate-100 text-slate-600";
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>{humanize(status)}</span>;
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" /><p className="font-semibold text-[#142B4D]">Couldn’t load users</p><p className="text-sm text-slate-500">Check your connection and retry.</p><button type="button" onClick={onRetry} className="rounded-lg border border-[#DCE3EC] px-3 py-2 text-sm font-semibold">Try again</button></div>;
}
