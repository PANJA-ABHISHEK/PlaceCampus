import { EvidenceDetail } from "@/features/evidence/components/evidence-detail";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evidence Details | PlaceCampus",
};

// Use params asynchronously compatible with Next.js 15 constraints if any, or standard format
export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <EvidenceDetail id={resolvedParams.id} />;
}
