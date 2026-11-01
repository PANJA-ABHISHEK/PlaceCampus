"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { EvidenceType, CreateEvidenceDto } from "@placecampus/shared-types";
import {
  useCreateEvidence,
  useUploadEvidenceDocument,
} from "@/features/evidence/hooks/use-evidence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, File as FileIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(2, "Title is required").max(255),
  type: z.nativeEnum(EvidenceType, {
    required_error: "Please select an evidence type",
  }),
  description: z.string().max(1000).optional(),
  issuer: z.string().max(255).optional(),
  issuedDate: z.string().optional(),
  externalUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export function EvidenceForm() {
  const router = useRouter();
  const createMutation = useCreateEvidence();
  const uploadMutation = useUploadEvidenceDocument();

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: EvidenceType.CERTIFICATION,
    },
  });

  const currentType = watch("type");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validation: 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large: Please upload a file smaller than 10MB.");
        return;
      }
      // Validation: MIME types
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(file.type)) {
        toast.error("Invalid file type: Only PDF, JPG, and PNG are supported.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // 1. Create Evidence Item
      const dto: CreateEvidenceDto = {
        title: data.title,
        type: data.type,
        description: data.description || undefined,
        issuer: data.issuer || undefined,
        issuedDate: data.issuedDate || undefined,
        externalUrl: data.externalUrl || undefined,
      };

      const created = await createMutation.mutateAsync(dto);

      // 2. Upload File if selected
      if (selectedFile && created.id) {
        await uploadMutation.mutateAsync({
          id: created.id,
          file: selectedFile,
        });
      }

      toast.success(
        "Evidence created successfully and is now pending verification.",
      );
      router.push("/student/evidence");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again later.",
      );
    }
  };

  const isLoading =
    isSubmitting || createMutation.isPending || uploadMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-white p-6 md:p-8 rounded-xl border border-[hsl(var(--border))] shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title" className="text-heading font-medium">
            Evidence Title *
          </Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="e.g. AWS Certified Solutions Architect"
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && (
            <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type" className="text-heading font-medium">
            Evidence Type *
          </Label>
          <select
            id="type"
            {...register("type")}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors.type && "border-red-500",
            )}
          >
            {Object.values(EvidenceType).map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuedDate" className="text-heading font-medium">
            Date (Issued / Completed)
          </Label>
          <Input id="issuedDate" type="date" {...register("issuedDate")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="issuer" className="text-heading font-medium">
            {currentType === EvidenceType.CERTIFICATION
              ? "Issuing Organization"
              : currentType === EvidenceType.ACADEMIC
                ? "Institution"
                : "Organization (Optional)"}
          </Label>
          <Input
            id="issuer"
            {...register("issuer")}
            placeholder="e.g. Amazon Web Services"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="externalUrl" className="text-heading font-medium">
            External Link (Optional)
          </Label>
          <Input
            id="externalUrl"
            {...register("externalUrl")}
            placeholder="e.g. https://www.credly.com/badges/..."
            className={errors.externalUrl ? "border-red-500" : ""}
          />
          {errors.externalUrl && (
            <p className="text-sm text-red-500 mt-1">
              {errors.externalUrl.message}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description" className="text-heading font-medium">
            Description (Optional)
          </Label>
          <textarea
            id="description"
            {...register("description")}
            placeholder="Briefly describe what this evidence demonstrates..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* File Upload Area */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-heading font-medium">
            Supporting Document (Optional but recommended)
          </Label>

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[hsl(var(--muted)/0.3)] hover:border-[hsl(var(--primary)/0.5)] transition-colors"
            >
              <Upload className="w-8 h-8 text-[hsl(var(--muted-foreground))] mb-3" />
              <p className="text-sm font-medium text-heading">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                PDF, JPG, or PNG (max. 10MB)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.3)]">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon className="w-8 h-8 text-[hsl(var(--primary))] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-heading truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="shadow-md">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            "Submit Evidence"
          )}
        </Button>
      </div>
    </form>
  );
}
