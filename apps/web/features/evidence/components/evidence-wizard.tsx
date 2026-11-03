"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CloudUpload,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Type,
  X,
} from "lucide-react";
import {
  EvidenceItem,
  EvidenceStatus,
  EvidenceType,
  type CreateEvidenceDto,
  type UpdateEvidenceDto,
} from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn, isHttpUrl } from "@/lib/utils";
import {
  FieldError,
  fieldInputClassName,
} from "@/features/student/components/profile/profile-fields";
import {
  useCreateEvidence,
  useUpdateEvidence,
  useUploadEvidenceDocument,
} from "../hooks/use-evidence";
import {
  TYPE_META,
  formatEvidenceDate,
  getStatusGroup,
} from "../lib/evidence-meta";

/* Same limits the API enforces in EvidenceController / evidence DTOs. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const DESCRIPTION_MAX = 1000;

const TYPE_ORDER: EvidenceType[] = [
  EvidenceType.CERTIFICATION,
  EvidenceType.PROJECT,
  EvidenceType.INTERNSHIP,
  EvidenceType.ACHIEVEMENT,
  EvidenceType.HACKATHON,
  EvidenceType.CODING_PROFILE,
  EvidenceType.ACADEMIC,
  EvidenceType.OTHER,
];

const schema = z.object({
  type: z.nativeEnum(EvidenceType),
  title: z
    .string()
    .trim()
    .min(2, "Add a title of at least 2 characters")
    .max(255, "Title must be 255 characters or fewer"),
  issuer: z.string().trim().max(255, "Must be 255 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Must be ${DESCRIPTION_MAX} characters or fewer`),
  issuedDate: z.string(),
  externalUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isHttpUrl(value),
      "Enter a valid URL starting with https://",
    ),
});

type WizardValues = z.infer<typeof schema>;

export type WizardMode =
  | {
      kind: "create";
      initialType?: EvidenceType;
      /** Replaces the default subtitle, e.g. when opened from the Skills page. */
      note?: string;
    }
  | { kind: "edit"; evidence: EvidenceItem };

const STEPS = ["Type", "Details", "Document", "Review"] as const;

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

function validateFile(file: File) {
  if (!ALLOWED_MIME.includes(file.type))
    return "Only PDF, JPG and PNG files are supported.";
  if (file.size > MAX_FILE_BYTES) return "File is larger than 10 MB.";
  return null;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError)
    return error.errors?.validation?.[0] || error.message;
  return error instanceof Error ? error.message : fallback;
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, index) => {
        const done = index < step;
        const current = index === step;
        return (
          <li
            key={label}
            className="flex flex-1 items-center gap-2"
            aria-current={current ? "step" : undefined}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300",
                done && "bg-[hsl(var(--primary))] text-white",
                current &&
                  "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]",
                !done &&
                  !current &&
                  "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-semibold sm:block",
                current
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))]",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                <span
                  className={cn(
                    "block h-full bg-[hsl(var(--primary))] transition-all duration-500",
                    done ? "w-full" : "w-0",
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function WizardBody({
  mode,
  onClose,
  onBusyChange,
}: {
  mode: WizardMode;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const isEdit = mode.kind === "edit";
  const existing = isEdit ? mode.evidence : undefined;

  const createMutation = useCreateEvidence();
  const updateMutation = useUpdateEvidence();
  const uploadMutation = useUploadEvidenceDocument();

  const [step, setStep] = React.useState(isEdit ? 1 : 0);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "saving" | "uploading">(
    "idle",
  );
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    trigger,
    getValues,
    setValue,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<WizardValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      type:
        existing?.type ??
        (mode.kind === "create" ? mode.initialType : undefined) ??
        EvidenceType.CERTIFICATION,
      title: existing?.title ?? "",
      issuer: existing?.issuer ?? "",
      description: existing?.description ?? "",
      issuedDate: existing?.issuedDate?.slice(0, 10) ?? "",
      externalUrl: existing?.externalUrl ?? "",
    },
  });

  const [type, description] = useWatch({
    control,
    name: ["type", "description"],
  });
  const typeMeta = TYPE_META[type];
  const busy = phase !== "idle";

  React.useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validateFile(candidate);
    setFileError(problem);
    if (!problem) setFile(candidate);
  };

  const next = async () => {
    if (step === 1) {
      const ok = await trigger([
        "title",
        "issuer",
        "description",
        "issuedDate",
        "externalUrl",
      ]);
      if (!ok) return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const back = () => setStep((current) => Math.max(current - 1, 0));

  const hasChanges = !isEdit || isDirty || !!file;

  const submit = async () => {
    const valid = await trigger();
    if (!valid) {
      setStep(1);
      return;
    }
    const values = schema.parse(getValues());
    let evidenceId = existing?.id;

    try {
      setPhase("saving");
      if (!isEdit) {
        const dto: CreateEvidenceDto = {
          type: values.type,
          title: values.title,
          issuer: values.issuer || undefined,
          description: values.description || undefined,
          issuedDate: values.issuedDate || undefined,
          externalUrl: values.externalUrl || undefined,
        };
        const created = await createMutation.mutateAsync(dto);
        evidenceId = created.id;
      } else if (isDirty && evidenceId) {
        const dto: UpdateEvidenceDto = {};
        for (const key of Object.keys(dirtyFields) as (keyof WizardValues)[]) {
          if (key === "externalUrl") dto.externalUrl = values.externalUrl || null;
          else if (key === "type") dto.type = values.type;
          else dto[key] = values[key];
        }
        await updateMutation.mutateAsync({ id: evidenceId, data: dto });
      }
    } catch (error) {
      setPhase("idle");
      toast.error(
        isEdit ? "Couldn't save your changes" : "Couldn't submit evidence",
        { description: errorMessage(error, "Please try again.") },
      );
      return;
    }

    let uploaded: EvidenceItem | undefined;
    if (file && evidenceId) {
      try {
        setPhase("uploading");
        setProgress(0);
        uploaded = await uploadMutation.mutateAsync({
          id: evidenceId,
          file,
          onProgress: setProgress,
        });
      } catch (error) {
        setPhase("idle");
        toast.error("Evidence saved, but the document upload failed", {
          description: `${errorMessage(error, "Upload failed.")} You can attach it later with Edit.`,
        });
        onClose();
        return;
      }
    }

    setPhase("idle");
    toast.success(isEdit ? "Evidence updated" : "Evidence submitted", {
      // The API falls back to faculty review if automatic verification can't start.
      description: uploaded
        ? uploaded.status === EvidenceStatus.NEEDS_REVIEW
          ? "Your document was uploaded and sent for faculty review."
          : "Your document was uploaded and verification has started."
        : isEdit
          ? "Your changes have been saved."
          : "Attach a supporting document to start verification.",
    });
    onClose();
  };

  const reviewRows: { label: string; value: string | null }[] = [
    { label: "Type", value: typeMeta.label },
    { label: "Title", value: getValues("title") || null },
    { label: "Issuer / Organization", value: getValues("issuer") || null },
    {
      label: "Date",
      value: formatEvidenceDate(getValues("issuedDate"), "d MMM yyyy"),
    },
    { label: "Supporting URL", value: getValues("externalUrl") || null },
    { label: "Description", value: getValues("description") || null },
    {
      label: "Document",
      value: file
        ? `${file.name} (${formatBytes(file.size)})`
        : existing?.document
          ? `${existing.document.originalName} (current)`
          : null,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="border-b border-[hsl(var(--border)/0.7)] px-6 pb-5 pt-6">
        <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">
          {isEdit ? "Edit Evidence" : "Add Evidence"}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {isEdit
            ? "Update the details or attach a new supporting document."
            : (mode.kind === "create" && mode.note) ||
              "Add a certification, project or achievement for verification."}
        </DialogPrimitive.Description>
        <div className="mt-5">
          <Stepper step={step} />
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {step === 0 && (
          <div key="step-0" className="pc-step space-y-4">
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              What kind of evidence is this?
            </p>
            <div
              role="radiogroup"
              aria-label="Evidence type"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {TYPE_ORDER.map((value) => {
                const meta = TYPE_META[value];
                const Icon = meta.icon;
                const selected = type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setValue("type", value, { shouldDirty: true })
                    }
                    onDoubleClick={() => setStep(1)}
                    className={cn(
                      "flex flex-col items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]",
                      selected
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                        : "border-[hsl(var(--border))] bg-white hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.35)] hover:shadow-[var(--shadow-card)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                        selected
                          ? "bg-[hsl(var(--primary))] text-white"
                          : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[hsl(var(--foreground))]">
                        {meta.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-[hsl(var(--muted-foreground))]">
                        {meta.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div key="step-1" className="pc-step grid grid-cols-1 gap-5 sm:grid-cols-2">
            <WizardField
              id="ev-title"
              label="Title"
              required
              icon={Type}
              error={errors.title?.message}
              className="sm:col-span-2"
            >
              <input
                id="ev-title"
                autoFocus
                placeholder={`e.g. ${type === EvidenceType.CERTIFICATION ? "AWS Certified Solutions Architect" : type === EvidenceType.PROJECT ? "Real-time chat app with WebSockets" : `${typeMeta.label} title`}`}
                aria-invalid={!!errors.title}
                className={cn(fieldInputClassName, "h-11 pl-10 pr-3.5")}
                {...register("title")}
              />
            </WizardField>
            <WizardField
              id="ev-issuer"
              label={
                type === EvidenceType.CERTIFICATION
                  ? "Issuing organization"
                  : type === EvidenceType.ACADEMIC
                    ? "Institution"
                    : "Organization"
              }
              icon={Building2}
              error={errors.issuer?.message}
            >
              <input
                id="ev-issuer"
                placeholder="e.g. Amazon Web Services"
                aria-invalid={!!errors.issuer}
                className={cn(fieldInputClassName, "h-11 pl-10 pr-3.5")}
                {...register("issuer")}
              />
            </WizardField>
            <WizardField
              id="ev-date"
              label="Date (issued / completed)"
              icon={CalendarDays}
              error={errors.issuedDate?.message}
            >
              <input
                id="ev-date"
                type="date"
                className={cn(fieldInputClassName, "h-11 pl-10 pr-3.5")}
                {...register("issuedDate")}
              />
            </WizardField>
            <WizardField
              id="ev-url"
              label="Supporting URL"
              icon={Link2}
              error={errors.externalUrl?.message}
              className="sm:col-span-2"
            >
              <input
                id="ev-url"
                type="url"
                inputMode="url"
                placeholder="e.g. https://www.credly.com/badges/…"
                aria-invalid={!!errors.externalUrl}
                className={cn(fieldInputClassName, "h-11 pl-10 pr-3.5")}
                {...register("externalUrl")}
              />
            </WizardField>
            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="ev-description"
                className="text-sm font-semibold text-[hsl(var(--foreground))]"
              >
                Description
              </label>
              <div className="relative">
                <textarea
                  id="ev-description"
                  rows={4}
                  placeholder="Briefly describe what this evidence demonstrates…"
                  aria-invalid={!!errors.description}
                  className={cn(
                    fieldInputClassName,
                    "block resize-y px-3.5 pb-7 pt-3 leading-relaxed",
                  )}
                  {...register("description")}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums",
                    (description?.length ?? 0) > DESCRIPTION_MAX
                      ? "text-red-600"
                      : "text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  {description?.length ?? 0} / {DESCRIPTION_MAX}
                </span>
              </div>
              <FieldError
                id="ev-description-error"
                message={errors.description?.message}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="pc-step space-y-4">
            {existing?.document && !file && (
              <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-3 text-sm">
                <FileText
                  className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  Current: <strong>{existing.document.originalName}</strong>
                </span>
                <span className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                  Uploading a new file replaces it
                </span>
              </div>
            )}

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  pickFile(event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]",
                  isDragging
                    ? "scale-[1.01] border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]"
                    : "border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--color-primary-50)/0.6)] to-white hover:border-[hsl(var(--primary)/0.5)]",
                )}
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--border)/0.7)]">
                  <CloudUpload className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {isDragging ? "Drop your file here" : "Drag and drop your document here"}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  PDF, JPG or PNG · up to 10 MB
                </p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-semibold text-[hsl(var(--foreground))] shadow-[var(--shadow-xs)]">
                  Browse Files
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.04)] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-xs)]">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {formatBytes(file.size)} · Ready to upload
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-white"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Remove file"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(event) => {
                pickFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <FieldError id="ev-file-error" message={fileError ?? undefined} />
            <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              Optional, but recommended: verification starts once a document is
              attached. You can also add one later.
            </p>
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="pc-step space-y-4">
            <dl className="divide-y divide-[hsl(var(--border)/0.7)] overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)]">
              {reviewRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                >
                  <dt className="text-sm text-[hsl(var(--muted-foreground))]">
                    {row.label}
                  </dt>
                  <dd
                    className={cn(
                      "min-w-0 break-words text-sm",
                      row.value
                        ? "font-medium text-[hsl(var(--foreground))]"
                        : "italic text-[hsl(var(--muted-foreground)/0.8)]",
                    )}
                  >
                    {row.value ?? "Not provided"}
                  </dd>
                </div>
              ))}
            </dl>
            {isEdit &&
              existing &&
              getStatusGroup(existing.status) === "NEEDS_ACTION" && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Saving resubmits this evidence for verification.
                </p>
              )}
            {phase === "uploading" && (
              <div className="space-y-2" aria-live="polite">
                <div className="flex justify-between text-xs font-semibold text-[hsl(var(--foreground))]">
                  <span>Uploading document…</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--primary)/0.12)]">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {progress === 100 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Upload complete. Starting verification…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
        <button
          type="button"
          onClick={step === 0 || (isEdit && step === 1) ? onClose : back}
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-white disabled:opacity-50"
        >
          {step === 0 || (isEdit && step === 1) ? (
            "Cancel"
          ) : (
            <>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </>
          )}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.7)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
          >
            {step === 2 && !file ? "Skip for now" : "Continue"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy || !hasChanges}
            title={hasChanges ? undefined : "No changes to save"}
            className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.7)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[hsl(var(--primary)/0.45)] disabled:shadow-none"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {phase === "saving"
              ? "Saving…"
              : phase === "uploading"
                ? "Uploading…"
                : isEdit
                  ? "Save Changes"
                  : "Submit Evidence"}
          </button>
        )}
      </div>
    </>
  );
}

function WizardField({
  id,
  label,
  required,
  icon: Icon,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  icon: React.ElementType;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[hsl(var(--foreground))]"
      >
        {label}
        {required && <span className="ml-0.5 text-[hsl(var(--primary))]">*</span>}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))] transition-colors group-focus-within:text-[hsl(var(--primary))]"
        />
        {children}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function EvidenceWizard({
  mode,
  onOpenChange,
}: {
  mode: WizardMode | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const close = () => onOpenChange(false);

  return (
    <DialogPrimitive.Root
      open={!!mode}
      onOpenChange={(open) => {
        if (!busy) onOpenChange(open);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.45)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          onInteractOutside={(event) => busy && event.preventDefault()}
          className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[min(92vh,760px)] w-[calc(100vw-1.5rem)] max-w-[44rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-2xl)] focus:outline-none"
        >
          {mode && (
            <WizardBody
              mode={mode}
              onClose={close}
              onBusyChange={setBusy}
            />
          )}
          <DialogPrimitive.Close
            disabled={busy}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
