import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function PlacementCellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
