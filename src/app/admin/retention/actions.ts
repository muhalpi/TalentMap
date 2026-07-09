"use server";

import { revalidatePath } from "next/cache";

import { requireInternalAdminSession } from "@/auth/guards";
import { runRetentionSweep } from "@/services/retention-service";

export interface RetentionActionState {
  status: "idle" | "success" | "error";
  message: string;
}

const idleState: RetentionActionState = {
  status: "idle",
  message: "",
};

export async function runRetentionSweepAction(
  _previousState: RetentionActionState = idleState,
): Promise<RetentionActionState> {
  void _previousState;
  await requireInternalAdminSession();

  try {
    const result = await runRetentionSweep();

    revalidatePath("/admin/retention");

    return {
      status: "success",
      message: `Sweep complete: ${result.flaggedForDeletion} flagged, ${result.anonymizedDeleted} anonymized.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Retention sweep failed.",
    };
  }
}
