export const ROLE_ROUTES: Record<string, string> = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  placement_officer: "/placement/dashboard",
  placement_head: "/placement-head/dashboard",
  recruiter: "/recruiter/dashboard",
  admin: "/admin/dashboard",
};

export const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  placement_officer: "Placement Officer",
  placement_head: "Placement Head",
  recruiter: "Recruiter",
  admin: "Administrator",
};

export const CAMPUS_LOGIN_ROUTE = "/login";
export const RECRUITER_LOGIN_ROUTE = "/recruiter/login";
export const SELECT_ROLE_ROUTE = "/select-role";

/** Full-screen auth pages: no marketing header or footer. */
export const AUTH_ROUTE_PATTERN = /^\/(login|register|forgot-password|faculty-login|select-role|recruiter\/login)(\/|$)/;

/** Signed-in portal areas; a session without an active role can't use them. */
export const PORTAL_ROUTE_PATTERN = /^\/(student|faculty|placement|placement-head|recruiter|admin)(\/|$)/;

export function getDashboardRoute(role: string): string {
  return ROLE_ROUTES[role.toLowerCase()] || "/";
}

/** Where to go after sign-in, decided only by what the API returned. */
export function getPostLoginRoute(result: {
  activeRole: string | null;
  requiresRoleSelection: boolean;
}): string {
  if (result.requiresRoleSelection || !result.activeRole) return SELECT_ROLE_ROUTE;
  return getDashboardRoute(result.activeRole);
}
