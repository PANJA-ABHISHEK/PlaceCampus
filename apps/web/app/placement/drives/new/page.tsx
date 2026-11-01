import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DriveForm } from "@/features/drives/components/drive-form";

export default function NewDrivePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/placement/drives"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-heading mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Drives
        </Link>
        <h1 className="text-2xl font-bold text-heading">
          Create Placement Drive
        </h1>
        <p className="text-muted-foreground">
          Draft a new recruitment opportunity for students.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <DriveForm />
      </div>
    </div>
  );
}
