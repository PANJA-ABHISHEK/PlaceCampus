import { EvidenceForm } from "@/features/evidence/components/evidence-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Evidence | PlaceCampus",
};

export default function NewEvidencePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          href="/student/evidence"
          className="p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--muted-foreground))]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            Add Evidence
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Submit a new certification, project, or achievement for
            verification.
          </p>
        </div>
      </div>

      <EvidenceForm />
    </div>
  );
}
