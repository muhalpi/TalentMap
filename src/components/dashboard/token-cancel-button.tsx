"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";

import {
  getTokenActionError,
  getTokenActionNetworkError,
} from "./token-action-response";

export function TokenCancelButton({
  tokenId,
  endpointBase = "/api/dashboard/tokens",
  assessmentLabel = "assessment",
}: {
  tokenId: string;
  endpointBase?: string;
  assessmentLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function cancelAccess() {
    const confirmed = window.confirm(
      `Cancel this ${assessmentLabel} access? The participant will no longer be able to resume it, and its reserved quota will be released.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`${endpointBase}/${tokenId}/cancel`, {
          method: "POST",
        });

        if (!response.ok) {
          window.alert(
            await getTokenActionError(
              response,
              "Unable to cancel assessment access.",
            ),
          );
          return;
        }

        router.refresh();
      } catch {
        window.alert(getTokenActionNetworkError("cancel"));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={cancelAccess}
      disabled={isPending}
      aria-label={`Cancel ${assessmentLabel} access`}
      title={`Cancel ${assessmentLabel} access`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground/60 transition-colors hover:border-danger/60 hover:bg-danger/5 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="animate-spin" size={14} aria-hidden="true" />
      ) : (
        <Ban size={14} aria-hidden="true" />
      )}
    </button>
  );
}
