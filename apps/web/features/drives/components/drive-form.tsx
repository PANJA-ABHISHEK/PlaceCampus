"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDrive,
  useUpdateDrive,
} from "@/features/drives/hooks/use-drives";
import {
  PlacementDrive,
  CreatePlacementDriveDto,
} from "@placecampus/shared-types";
import { Plus, Trash2, Search } from "lucide-react";
import { useTaxonomy } from "@/features/skills/hooks/use-skills";

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

export function DriveForm({ initialData }: { initialData?: PlacementDrive }) {
  const router = useRouter();
  const createMutation = useCreateDrive();
  const updateMutation = useUpdateDrive();
  const { data: taxonomy } = useTaxonomy();
  const [skillSearch, setSkillSearch] = useState("");

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
      minimumCGPA: initialData?.requirements?.minimumCGPA || "",
      maximumBacklogs:
        initialData?.requirements?.maximumBacklogs !== undefined
          ? initialData.requirements.maximumBacklogs
          : "",
      graduationYear: initialData?.requirements?.graduationYear || "",
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

  const onSubmit = async (data: FormValues) => {
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
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        skills: data.skills.map((s) => ({
          skillId: s.skillId,
          skillName: s.skillName,
          minimumLevel: Number(s.minimumLevel),
          isOptional: s.isOptional,
        })),
      },
    };

    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        router.push(`/placement/drives/${initialData.id}`);
      } else {
        const res = await createMutation.mutateAsync(payload);
        router.push(`/placement/drives/${res.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save drive.");
    }
  };

  const searchedSkills = taxonomy
    ? taxonomy.filter(
        (s) =>
          s.active &&
          (s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
            s.synonyms.some((syn) =>
              syn.toLowerCase().includes(skillSearch.toLowerCase()),
            )),
      )
    : [];

  const handleAddSkill = (skill: { id: string; name: string }) => {
    if (skillFields.some((f) => f.skillId === skill.id)) {
      return; // Already added
    }
    appendSkill({
      skillId: skill.id,
      skillName: skill.name,
      minimumLevel: 3,
      isOptional: false,
    });
    setSkillSearch("");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* 1. Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-heading border-b pb-2">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Company Name *</label>
            <Input
              {...form.register("companyName")}
              placeholder="e.g. Google"
            />
            {form.formState.errors.companyName && (
              <p className="text-xs text-red-500">
                {form.formState.errors.companyName.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Role Title *</label>
            <Input
              {...form.register("roleTitle")}
              placeholder="e.g. Software Engineer"
            />
            {form.formState.errors.roleTitle && (
              <p className="text-xs text-red-500">
                {form.formState.errors.roleTitle.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Description *</label>
          <Textarea
            {...form.register("description")}
            placeholder="Job description, responsibilities, etc."
            rows={4}
          />
          {form.formState.errors.description && (
            <p className="text-xs text-red-500">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Location</label>
            <Input
              {...form.register("location")}
              placeholder="e.g. Bangalore"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Work Mode</label>
            <Input {...form.register("workMode")} placeholder="e.g. Hybrid" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Package/CTC</label>
            <Input {...form.register("package")} placeholder="e.g. 15 LPA" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Application Start</label>
            <Input type="date" {...form.register("applicationStart")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Application Deadline</label>
            <Input type="date" {...form.register("applicationDeadline")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Drive Date</label>
            <Input type="date" {...form.register("driveDate")} />
          </div>
        </div>
      </div>

      {/* 2. Academic Requirements */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-heading border-b pb-2">
          Eligibility Requirements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Min CGPA</label>
            <Input
              type="number"
              step="0.1"
              {...form.register("minimumCGPA")}
              placeholder="e.g. 7.5"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Max Backlogs</label>
            <Input
              type="number"
              {...form.register("maximumBacklogs")}
              placeholder="e.g. 0"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Graduation Year</label>
            <Input
              type="number"
              {...form.register("graduationYear")}
              placeholder="e.g. 2027"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Depts (comma separated)
            </label>
            <Input
              {...form.register("allowedDepartments")}
              placeholder="e.g. CSE, IT"
            />
          </div>
        </div>
      </div>

      {/* 3. Skill Requirements */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-heading border-b pb-2">
          Skill Requirements
        </h3>

        {/* Skill Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search canonical skills to add..."
            className="pl-9"
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
          />
          {skillSearch && searchedSkills.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded-md max-h-60 overflow-y-auto">
              {searchedSkills.slice(0, 10).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm flex justify-between items-center"
                  onClick={() => handleAddSkill(s)}
                >
                  <span className="font-medium text-heading">{s.name}</span>
                  <Plus className="w-4 h-4 text-orange-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Skills List */}
        {skillFields.length > 0 ? (
          <div className="border rounded-md divide-y overflow-hidden">
            <div className="bg-muted p-2 grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase">
              <div className="col-span-4">Canonical Skill</div>
              <div className="col-span-3">Min Level (1-5)</div>
              <div className="col-span-3">Required/Optional</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {skillFields.map((field, index) => (
              <div
                key={field.id}
                className="p-2 grid grid-cols-12 gap-2 items-center bg-white"
              >
                <div className="col-span-4 font-medium text-sm text-heading pl-2">
                  {field.skillName || "Unknown Skill"}
                  <input
                    type="hidden"
                    {...form.register(`skills.${index}.skillId`)}
                  />
                  <input
                    type="hidden"
                    {...form.register(`skills.${index}.skillName`)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    className="h-8 w-24"
                    {...form.register(`skills.${index}.minimumLevel`)}
                  />
                </div>
                <div className="col-span-3 flex items-center">
                  <select
                    className="h-8 border rounded px-2 text-sm bg-white"
                    {...form.register(`skills.${index}.isOptional`, {
                      setValueAs: (v) => v === "true" || v === true,
                    })}
                  >
                    <option value="false">REQUIRED</option>
                    <option value="true">OPTIONAL</option>
                  </select>
                </div>
                <div className="col-span-2 text-right pr-2">
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
            No specific skills required. Use the search bar above to add
            canonical skill requirements.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Link href="/placement/drives">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : "Save Draft"}
        </Button>
      </div>
    </form>
  );
}
