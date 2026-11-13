"use client";

import React, { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDrive,
  useUpdateDrive,
} from "@/features/drives/hooks/use-drives";
import {
  DriveStatus,
  PlacementDrive,
  CreatePlacementDriveDto,
} from "@placecampus/shared-types";
import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Hash,
  Laptop,
  Layers,
  Lock,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useTaxonomy } from "@/features/skills/hooks/use-skills";
import { cn } from "@/lib/utils";

const skillReqSchema = z.object({
  skillId: z.string().min(1, "Skill is required"),
  skillName: z.string().optional(),
  minimumLevel: z.coerce.number().min(1).max(5),
  isOptional: z.boolean(),
});

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  roleTitle: z.string().min(2, "Role title is required"),
  description: z.string().min(10, "Description is required"),
  location: z.string().optional(),
  workMode: z.string().optional(),
  package: z.string().optional(),
  applicationStart: z.string().optional(),
  applicationDeadline: z.string().optional(),
  driveDate: z.string().optional(),
  minimumCGPA: z.coerce.number().min(0).max(10).optional().or(z.literal("")),
  maximumBacklogs: z.coerce.number().min(0).optional().or(z.literal("")),
  graduationYear: z.coerce
    .number()
    .min(2020)
    .max(2030)
    .optional()
    .or(z.literal("")),
  allowedDepartments: z.string().optional(),
  skills: z.array(skillReqSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;


const inputClassName =
  "h-12 rounded-xl border-[#DCE2EA] bg-white px-3.5 text-sm text-[#10264A] shadow-none transition-colors placeholder:text-slate-400 hover:border-[#C9D2DE] focus-visible:border-[#FF9A5C] focus-visible:ring-4 focus-visible:ring-[#FF6500]/10 aria-[invalid=true]:border-rose-300";

const cardClassName =
  "overflow-hidden rounded-[20px] border border-[#E7EBF0] bg-white shadow-[0_6px_24px_-12px_rgba(16,38,74,0.12)]";

const STEPS = [
  { title: "Drive Information", short: "Details" },
  { title: "Eligibility", short: "Eligibility" },
  { title: "Skills", short: "Skills" },
] as const;

type StepIndex = 0 | 1 | 2;

/** Fields validated before leaving each step. */
const STEP_FIELDS: Record<StepIndex, (keyof FormValues)[]> = {
  0: ["companyName", "roleTitle", "location", "workMode", "package", "applicationStart", "applicationDeadline", "driveDate", "description"],
  1: ["minimumCGPA", "maximumBacklogs", "graduationYear", "allowedDepartments"],
  2: ["skills"],
};

const WORK_MODES = ["On-site", "Hybrid", "Remote"];

export function DriveForm({ initialData }: { initialData?: PlacementDrive }) {
  const router = useRouter();
  const createMutation = useCreateDrive();
  const updateMutation = useUpdateDrive();
  const { data: taxonomy, isLoading: taxonomyLoading, isError: taxonomyError } = useTaxonomy();
  const [skillSearch, setSkillSearch] = useState("");
  const [submitGuard, setSubmitGuard] = useState(false);
  const isEdit = Boolean(initialData);
  // The API only accepts edits to draft drives; anything else is shown read-only.
  const locked = Boolean(initialData && initialData.status !== DriveStatus.DRAFT);
  const exitHref = initialData ? `/placement/drives/${initialData.id}` : "/placement/drives";
  // Editing PATCHes the same draft, so both save buttons read "Save Changes".
  const footerLabels = {
    save: isEdit ? "Save Changes" : "Save as Draft",
    final: isEdit ? "Save Changes" : "Save Draft",
    cancel: locked ? "Back to Drive" : "Cancel",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      roleTitle: initialData?.roleTitle || "",
      description: initialData?.description || "",
      location: initialData?.location || "",
      workMode: initialData?.workMode || "",
      package: initialData?.package || "",
      applicationStart: initialData?.applicationStart?.substring(0, 10) || "",
      applicationDeadline:
        initialData?.applicationDeadline?.substring(0, 10) || "",
      driveDate: initialData?.driveDate?.substring(0, 10) || "",
      minimumCGPA: initialData?.requirements?.minimumCGPA ?? "",
      maximumBacklogs:
        initialData?.requirements?.maximumBacklogs !== undefined
          ? initialData.requirements.maximumBacklogs
          : "",
      graduationYear: initialData?.requirements?.graduationYear ?? "",
      allowedDepartments:
        initialData?.requirements?.allowedDepartments?.join(", ") || "",
      skills: initialData?.requirements?.skills || [],
    },
  });

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control: form.control,
    name: "skills",
  });

  const minimumCGPA = useWatch({ control: form.control, name: "minimumCGPA" });
  const maximumBacklogs = useWatch({ control: form.control, name: "maximumBacklogs" });
  const graduationYear = useWatch({ control: form.control, name: "graduationYear" });
  const allowedDepartments = useWatch({ control: form.control, name: "allowedDepartments" });
  const eligibilityCount = [
    minimumCGPA !== "" && minimumCGPA !== undefined,
    maximumBacklogs !== "" && maximumBacklogs !== undefined,
    graduationYear !== "" && graduationYear !== undefined,
    Boolean(allowedDepartments?.trim()),
  ].filter(Boolean).length;
  const isSaving =
    createMutation.isPending || updateMutation.isPending || form.formState.isSubmitting || submitGuard;

  const onSubmit = async (data: FormValues) => {
    if (submitGuard || locked) return;
    setSubmitGuard(true);

    const payload: CreatePlacementDriveDto = {
      companyName: data.companyName,
      roleTitle: data.roleTitle,
      description: data.description,
      location: data.location || undefined,
      workMode: data.workMode || undefined,
      package: data.package || undefined,
      applicationStart: data.applicationStart
        ? new Date(data.applicationStart).toISOString()
        : undefined,
      applicationDeadline: data.applicationDeadline
        ? new Date(data.applicationDeadline).toISOString()
        : undefined,
      driveDate: data.driveDate
        ? new Date(data.driveDate).toISOString()
        : undefined,
      requirements: {
        minimumCGPA:
          data.minimumCGPA !== "" ? Number(data.minimumCGPA) : undefined,
        maximumBacklogs:
          data.maximumBacklogs !== ""
            ? Number(data.maximumBacklogs)
            : undefined,
        graduationYear:
          data.graduationYear !== "" ? Number(data.graduationYear) : undefined,
        allowedDepartments: data.allowedDepartments
          ? data.allowedDepartments
              .split(",")
              .map((department) => department.trim())
              .filter(Boolean)
          : undefined,
        skills: data.skills.map((skill) => ({
          skillId: skill.skillId,
          skillName: skill.skillName,
          minimumLevel: Number(skill.minimumLevel),
          isOptional: skill.isOptional,
        })),
      },
    };

    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast.success("Placement drive saved");
        router.push(`/placement/drives/${initialData.id}`);
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast.success("Placement drive saved as a draft");
        router.push(`/placement/drives/${result.id}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save drive. Please try again.");
    } finally {
      setSubmitGuard(false);
    }
  };

  const searchedSkills = taxonomy
    ? taxonomy.filter(
        (skill) =>
          skill.active &&
          !skillFields.some((selected) => selected.skillId === skill.id) &&
          (skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
            skill.synonyms.some((synonym) =>
              synonym.toLowerCase().includes(skillSearch.toLowerCase()),
            )),
      )
    : [];

  const handleAddSkill = (skill: { id: string; name: string }) => {
    if (skillFields.some((field) => field.skillId === skill.id)) return;
    appendSkill({
      skillId: skill.id,
      skillName: skill.name,
      minimumLevel: 3,
      isOptional: false,
    });
    setSkillSearch("");
  };

  const cancel = () => {
    if (
      form.formState.isDirty &&
      !window.confirm("Discard your unsaved changes and leave this page?")
    ) {
      return;
    }
    router.push(exitHref);
  };

  // ---- Step navigation -------------------------------------------------
  const [step, setStep] = useState<StepIndex>(0);
  const [furthest, setFurthest] = useState<StepIndex>(0);
  const stepperRef = React.useRef<HTMLDivElement>(null);
  const description = useWatch({ control: form.control, name: "description" }) ?? "";
  const workMode = useWatch({ control: form.control, name: "workMode" }) ?? "";
  const workModeOptions = workMode && !WORK_MODES.includes(workMode) ? [...WORK_MODES, workMode] : WORK_MODES;

  const goTo = (target: StepIndex) => {
    setStep(target);
    setFurthest((current) => (target > current ? target : current));
    stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  /** Moving forward validates every step in between; moving back is always allowed. */
  const requestStep = async (target: StepIndex) => {
    if (target <= step) return goTo(target);
    for (let s = step; s < target; s++) {
      const valid = await form.trigger(STEP_FIELDS[s as StepIndex], { shouldFocus: true });
      if (!valid) {
        if (s !== step) setStep(s as StepIndex);
        toast.error("Please fix the highlighted fields before continuing.");
        return;
      }
    }
    goTo(target);
  };

  /** Draft saving validates the whole form and jumps to the first step with an error. */
  const saveDraft = form.handleSubmit(onSubmit, (errors) => {
    const failing = ([0, 1, 2] as StepIndex[]).find((s) => STEP_FIELDS[s].some((field) => errors[field]));
    if (failing !== undefined) setStep(failing);
    toast.error("Please complete the required fields before saving.");
  });

  const stepHasError = (s: StepIndex) => STEP_FIELDS[s].some((field) => form.formState.errors[field]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        // Enter advances the wizard; it only saves from the last step.
        event.preventDefault();
        if (step < 2) void requestStep((step + 1) as StepIndex);
        else if (!locked) void saveDraft();
      }}
      className="space-y-5"
    >
      {locked && initialData && (
        <div role="status" className="flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 sm:px-5">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">This drive is {initialData.status.toLowerCase()}, so it can&apos;t be edited.</span>{" "}
            Only draft drives can be changed. The details below are read-only.
          </p>
        </div>
      )}

      <div ref={stepperRef} className="scroll-mt-24">
        <ProgressSteps current={step} furthest={furthest} hasError={stepHasError} onSelect={(s) => void requestStep(s)} />
      </div>

      {/* Step 1: Drive information */}
      <section hidden={step !== 0} aria-labelledby="drive-step-1" className={cardClassName}>
        <SectionHeading
          id="drive-step-1"
          icon={BriefcaseBusiness}
          title="Basic Drive Information"
          description="Enter the recruitment opportunity details."
        />
        <fieldset disabled={locked} className="min-w-0 grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
          <Field label="Company Name" required icon={Building2} error={form.formState.errors.companyName?.message}>
            <Input {...form.register("companyName")} placeholder="e.g. Google" autoComplete="organization" className={inputClassName} />
          </Field>
          <Field label="Role Title" required icon={UserRound} error={form.formState.errors.roleTitle?.message}>
            <Input {...form.register("roleTitle")} placeholder="e.g. Software Engineer" className={inputClassName} />
          </Field>
          <Field label="Location" icon={MapPin} hint="Office or hiring location.">
            <Input {...form.register("location")} placeholder="e.g. Bangalore" className={inputClassName} />
          </Field>
          <Field label="Work Mode" icon={Laptop} trailingIcon={ChevronDown}>
            <select
              {...form.register("workMode")}
              className={cn(inputClassName, "w-full appearance-none border pr-10 outline-none disabled:cursor-not-allowed disabled:opacity-50", !workMode && "text-slate-400")}
            >
              <option value="">e.g. Hybrid</option>
              {workModeOptions.map((mode) => (
                <option key={mode} value={mode} className="text-[#10264A]">{mode}</option>
              ))}
            </select>
          </Field>
          <Field label="Package / CTC" icon={BadgeIndianRupee}>
            <Input {...form.register("package")} placeholder="e.g. 15 LPA" className={inputClassName} />
          </Field>
          <Field label="Application Start" icon={CalendarDays}>
            <Input type="date" {...form.register("applicationStart")} className={cn(inputClassName, "[color-scheme:light]")} />
          </Field>
          <Field label="Application Deadline" icon={CalendarClock}>
            <Input type="date" {...form.register("applicationDeadline")} className={cn(inputClassName, "[color-scheme:light]")} />
          </Field>
          <Field label="Drive Date" icon={CalendarCheck}>
            <Input type="date" {...form.register("driveDate")} className={cn(inputClassName, "[color-scheme:light]")} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field
              label="Description"
              required
              icon={FileText}
              iconTop
              error={form.formState.errors.description?.message}
              hint="At least 10 characters."
              counter={`${description.length} characters`}
            >
              <Textarea
                {...form.register("description")}
                placeholder="Brief about the role, responsibilities, and other important details..."
                rows={4}
                className="min-h-28 rounded-xl border-[#DCE2EA] bg-white px-3.5 py-3 text-sm text-[#10264A] shadow-none transition-colors placeholder:text-slate-400 hover:border-[#C9D2DE] focus-visible:border-[#FF9A5C] focus-visible:ring-4 focus-visible:ring-[#FF6500]/10 aria-[invalid=true]:border-rose-300"
              />
            </Field>
          </div>
        </fieldset>
        <StepFooter
          onCancel={cancel}
          onSave={locked ? undefined : () => void saveDraft()}
          labels={footerLabels}
          isSaving={isSaving}
          next={{ label: "Next: Eligibility", onClick: () => void requestStep(1) }}
        />
      </section>

      {/* Step 2: Eligibility */}
      <section hidden={step !== 1} aria-labelledby="drive-step-2" className={cardClassName}>
        <SectionHeading
          id="drive-step-2"
          icon={Users}
          title="Eligibility Requirements"
          description="Define which students are eligible to apply. Leave a field empty for no restriction."
          trailing={<span className="shrink-0 rounded-full bg-[#FFF1E8] px-2.5 py-1 text-xs font-semibold text-[#C24E00]">{eligibilityCount} of 4 set</span>}
        />
        <fieldset disabled={locked} className="min-w-0 grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-4">
          <Field label="Minimum CGPA" icon={Star} error={form.formState.errors.minimumCGPA?.message}>
            <Input type="number" min="0" max="10" step="0.1" {...form.register("minimumCGPA")} placeholder="e.g. 7.5" className={inputClassName} />
          </Field>
          <Field label="Maximum Backlogs" icon={Hash} error={form.formState.errors.maximumBacklogs?.message}>
            <Input type="number" min="0" step="1" {...form.register("maximumBacklogs")} placeholder="e.g. 0" className={inputClassName} />
          </Field>
          <Field label="Graduation Year" icon={GraduationCap} error={form.formState.errors.graduationYear?.message}>
            <Input type="number" {...form.register("graduationYear")} placeholder="e.g. 2027" className={inputClassName} />
          </Field>
          <Field label="Departments" icon={Layers} hint="Separate departments with commas.">
            <Input {...form.register("allowedDepartments")} placeholder="e.g. CSE, IT" className={inputClassName} />
          </Field>
        </fieldset>
        <StepFooter
          onBack={() => goTo(0)}
          onCancel={cancel}
          onSave={locked ? undefined : () => void saveDraft()}
          labels={footerLabels}
          isSaving={isSaving}
          next={{ label: "Next: Skills", onClick: () => void requestStep(2) }}
        />
      </section>

      {/* Step 3: Skills */}
      <section hidden={step !== 2} aria-labelledby="drive-step-3" className={cn(cardClassName, "overflow-visible")}>
        <SectionHeading
          id="drive-step-3"
          icon={GraduationCap}
          title="Required Skills"
          description="Add the technical or professional skills expected from applicants."
          trailing={<span className="shrink-0 rounded-full bg-[#FFF1E8] px-2.5 py-1 text-xs font-semibold text-[#C24E00]">{skillFields.length} selected</span>}
        />
        <fieldset disabled={locked} className="min-w-0 space-y-4 p-5 sm:p-7">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              role="combobox"
              aria-label="Search canonical skills"
              aria-autocomplete="list"
              aria-expanded={Boolean(skillSearch)}
              aria-controls="drive-skill-suggestions"
              placeholder="Search canonical skills to add..."
              className={cn(inputClassName, "pl-10")}
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSkillSearch("");
                // Enter adds the top suggestion instead of submitting the form.
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (skillSearch && searchedSkills[0]) handleAddSkill(searchedSkills[0]);
                }
              }}
            />
            {skillSearch && (
              <div
                id="drive-skill-suggestions"
                role="listbox"
                aria-label="Canonical skill suggestions"
                className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 origin-top overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(16,38,74,0.14)] animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {taxonomyLoading ? (
                  <div className="space-y-2 p-3" aria-label="Loading skills">
                    <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                ) : taxonomyError ? (
                  <p className="px-3 py-4 text-sm text-slate-500">Skills could not be loaded. Try again in a moment.</p>
                ) : searchedSkills.length ? (
                  searchedSkills.slice(0, 10).map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#FFF1E8] focus-visible:bg-[#FFF1E8] focus-visible:outline-none"
                      onClick={() => handleAddSkill(skill)}
                    >
                      <span>
                        <span className="block font-medium text-[#10264A]">{skill.name}</span>
                        {skill.description && <span className="mt-0.5 block line-clamp-1 text-xs text-slate-500">{skill.description}</span>}
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-[#FF6500]" />
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-slate-500">No matching canonical skills found.</p>
                )}
              </div>
            )}
          </div>

          {skillFields.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {skillFields.map((field, index) => (
                <div key={field.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors hover:border-[#FFC9A3]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#FFE0CC] bg-white px-3 py-1.5 text-sm font-semibold text-[#10264A]">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">{field.skillName || "Unknown Skill"}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${field.skillName || "skill"}`}
                      onClick={() => removeSkill(index)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input type="hidden" {...form.register(`skills.${index}.skillId`)} />
                  <input type="hidden" {...form.register(`skills.${index}.skillName`)} />
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3">
                    <label className="space-y-1.5 text-xs font-medium text-slate-600">
                      Minimum level
                      <Input type="number" min="1" max="5" aria-label={`${field.skillName} minimum level`} className="h-10 rounded-lg border-slate-200 bg-white" {...form.register(`skills.${index}.minimumLevel`)} />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium text-slate-600">
                      Requirement
                      <select
                        aria-label={`${field.skillName} requirement type`}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-[#10264A] outline-none transition focus:border-[#FF9A5C] focus:ring-4 focus:ring-[#FF6500]/10"
                        {...form.register(`skills.${index}.isOptional`, {
                          setValueAs: (value) => value === "true" || value === true,
                        })}
                      >
                        <option value="false">Required</option>
                        <option value="true">Optional</option>
                      </select>
                    </label>
                  </div>
                  {form.formState.errors.skills?.[index]?.minimumLevel?.message && (
                    <p className="mt-1.5 text-xs text-rose-600">{form.formState.errors.skills[index]?.minimumLevel?.message}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center sm:flex-row sm:py-5 sm:text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#FF6500] shadow-sm ring-1 ring-[#FFE0CC]">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                No specific skills required. Use the search bar above to add canonical skill requirements.
              </p>
            </div>
          )}
          <p className="text-xs leading-5 text-slate-500">Choose canonical skills to keep requirements consistent across placement drives. You can set a minimum level and mark each skill optional.</p>
        </fieldset>
        <StepFooter
          onBack={() => goTo(1)}
          onCancel={cancel}
          isSaving={isSaving}
          finalSave={locked ? undefined : () => void saveDraft()}
          labels={footerLabels}
          summary={
            <>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{eligibilityCount} of 4 eligibility criteria</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />{skillFields.length} skills</span>
            </>
          }
        />
      </section>

      {form.formState.isDirty && (
        <p className="flex items-center justify-end gap-1.5 px-1 text-xs text-amber-700" aria-live="polite">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Unsaved changes
        </p>
      )}
    </form>
  );
}

function ProgressSteps({
  current,
  furthest,
  hasError,
  onSelect,
}: {
  current: StepIndex;
  furthest: StepIndex;
  hasError: (step: StepIndex) => boolean;
  onSelect: (step: StepIndex) => void;
}) {
  return (
    <nav aria-label="Drive setup steps" className="rounded-[20px] border border-[#E7EBF0] bg-white p-2 shadow-[0_6px_24px_-14px_rgba(16,38,74,0.12)] sm:p-2.5">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((stepItem, index) => {
          const s = index as StepIndex;
          const isCurrent = s === current;
          const isError = !isCurrent && s <= furthest && hasError(s);
          const isComplete = !isCurrent && !isError && s <= furthest;
          return (
            <li key={stepItem.title} className={cn("flex min-w-0 items-center gap-1 sm:gap-2", isCurrent ? "flex-[1.4]" : "flex-1")}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${stepItem.title}`}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF6500]/15 sm:gap-3 sm:pr-6",
                  isCurrent ? "bg-[#FFF1E8]" : "hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isCurrent && "bg-[#FF6500] text-white shadow-[0_6px_14px_-6px_rgba(255,101,0,0.9)]",
                    isError && "bg-rose-50 text-rose-600 ring-1 ring-rose-200",
                    isComplete && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
                    !isCurrent && !isError && !isComplete && "bg-white text-[#10264A] ring-1 ring-slate-300",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
                </span>
                <span className={cn("min-w-0", !isCurrent && "hidden sm:block")}>
                  <span
                    className={cn(
                      "block truncate text-xs font-semibold sm:text-[15px]",
                      isCurrent ? "text-[#FF6500] underline decoration-2 underline-offset-4" : "text-[#10264A]",
                    )}
                  >
                    <span className="sm:hidden">{stepItem.short}</span>
                    <span className="hidden sm:inline">{stepItem.title}</span>
                  </span>
                  <span className="hidden text-[11px] font-medium text-slate-500 md:block">
                    {isCurrent ? "In progress" : isError ? "Needs attention" : isComplete ? "Completed" : "Upcoming"}
                  </span>
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <span aria-hidden="true" className={cn("hidden h-px min-w-4 flex-1 sm:block", s < furthest ? "bg-emerald-300" : "bg-slate-200")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  title,
  description,
  trailing,
}: {
  id: string;
  icon: typeof BriefcaseBusiness;
  title: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[#FF6500] ring-1 ring-[#FFE0CC]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-lg font-bold text-[#10264A] sm:text-xl">{title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
      </div>
      {trailing}
    </div>
  );
}

function StepFooter({
  onBack,
  onCancel,
  onSave,
  isSaving,
  next,
  finalSave,
  summary,
  labels,
}: {
  onBack?: () => void;
  onCancel: () => void;
  onSave?: () => void;
  isSaving: boolean;
  next?: { label: string; onClick: () => void };
  finalSave?: () => void;
  summary?: React.ReactNode;
  labels: { save: string; final: string; cancel: string };
}) {
  const spinner = <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
  const primaryClassName =
    "h-11 rounded-xl bg-[#FF6500] px-6 font-semibold text-white shadow-[0_10px_22px_-12px_rgba(255,101,0,0.9)] hover:bg-[#E85C00]";
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} className="h-11 rounded-xl px-4 font-semibold text-[#10264A] hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
        )}
        {onSave && (
          <Button
            type="button"
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="h-11 rounded-xl border-[#FFB98A] bg-[#FFF6F0] px-5 font-semibold text-[#10264A] hover:border-[#FF9A5C] hover:bg-[#FFEBDD]"
          >
            {isSaving ? spinner : <Save className="h-4 w-4" />}{labels.save}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-xl border-slate-300 px-5 font-semibold text-[#10264A] hover:bg-slate-50">
          {labels.cancel}
        </Button>
      </div>
      {summary && <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 lg:flex">{summary}</div>}
      {next && (
        <Button type="button" onClick={next.onClick} className={primaryClassName}>
          {next.label}<ArrowRight className="h-4 w-4" />
        </Button>
      )}
      {finalSave && (
        <Button type="button" onClick={finalSave} disabled={isSaving} className={primaryClassName}>
          {isSaving ? <>{spinner}Saving...</> : <><Save className="h-4 w-4" />{labels.final}<ArrowRight className="h-4 w-4" /></>}
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  counter,
  icon: Icon,
  iconTop,
  trailingIcon: TrailingIcon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  counter?: string;
  icon?: React.ElementType;
  iconTop?: boolean;
  trailingIcon?: React.ElementType;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = React.isValidElement<{ className?: string }>(children)
    ? React.cloneElement(
        children as React.ReactElement<{
          id?: string;
          className?: string;
          "aria-invalid"?: boolean;
          "aria-describedby"?: string;
          "aria-required"?: boolean;
        }>,
        {
          id,
          className: cn(children.props.className, Icon && "pl-11"),
          "aria-invalid": Boolean(error),
          "aria-describedby": describedBy,
          "aria-required": required || undefined,
        },
      )
    : children;
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#10264A]">
        {label}{required && <span className="ml-1 text-[#FF6500]" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn("pointer-events-none absolute left-3.5 z-10 h-[18px] w-[18px] text-slate-500", iconTop ? "top-3.5" : "top-1/2 -translate-y-1/2")}
          />
        )}
        {control}
        {TrailingIcon && (
          <TrailingIcon aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}
      </div>
      {(error || hint || counter) && (
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <p id={`${id}-error`} className="text-xs font-medium text-rose-600">{error}</p>
          ) : hint ? (
            <p id={`${id}-hint`} className="text-xs leading-4 text-slate-500">{hint}</p>
          ) : <span />}
          {counter && <p className="shrink-0 text-xs tabular-nums text-slate-500">{counter}</p>}
        </div>
      )}
    </div>
  );
}
