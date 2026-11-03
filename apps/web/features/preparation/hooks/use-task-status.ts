import * as React from "react";
import { toast } from "sonner";
import type {
  PreparationItem,
  PreparationItemStatus,
} from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { useUpdatePreparationItemStatus } from "./use-preparation";
import { ITEM_STATUS_META } from "../lib/prep-meta";

/**
 * Item status changes through the existing PATCH endpoint, one at a time:
 * concurrent saves of the same plan document could overwrite each other.
 */
export function useTaskStatus() {
  const mutation = useUpdatePreparationItemStatus();
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  const change = (
    planId: string,
    item: PreparationItem,
    status: PreparationItemStatus,
  ) => {
    if (pendingKey || item.status === status) return;
    setPendingKey(`${planId}:${item.itemId}`);
    mutation.mutate(
      { planId, itemId: item.itemId, status },
      {
        onSuccess: (plan) => {
          const done = plan.status === "COMPLETED";
          toast.success(
            status === "COMPLETED"
              ? `${item.skillName} marked complete`
              : `${item.skillName}: ${ITEM_STATUS_META[status].label}`,
            {
              description: done
                ? "Every action is done. Plan completed!"
                : `Plan progress: ${plan.completionPercentage}%`,
            },
          );
        },
        onError: (error) =>
          toast.error("Couldn't update this action", {
            description:
              error instanceof ApiError ? error.message : "Please try again.",
          }),
        onSettled: () => setPendingKey(null),
      },
    );
  };

  return {
    change,
    busy: pendingKey !== null,
    isUpdating: (planId: string, itemId: string) =>
      pendingKey === `${planId}:${itemId}`,
  };
}
