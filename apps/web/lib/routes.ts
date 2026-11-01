export const ROLE_ROUTES: Record<string, string> = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  placement_officer: "/placement/dashboard",
  placement_head: "/placement-head/dashboard",
  recruiter: "/recruiter/dashboard",
  admin: "/admin/dashboard",
};

export function getDashboardRoute(role: string): string {
  return ROLE_ROUTES[role.toLowerCase()] || "/";
}
