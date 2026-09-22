import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
