"use client";

import { useState, useTransition } from "react";
import { Check, Clipboard, Loader2, RefreshCw, X } from "lucide-react";

import {
  getTokenActionError,
  getTokenActionNetworkError,
} from "./token-action-response";

interface ReissuedAccess {
  accessUrl: string;
  accessCode: string;
  expiresAt: string;
}

export function TokenReissueButton({
  tokenId,
  endpointBase = "/api/dashboard/tokens",
  assessmentLabel = "assessment",
}: {
  tokenId: string;
  endpointBase?: string;
  assessmentLabel?: string;
}) {
  const [generated, setGenerated] = useState<ReissuedAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (generated) {
      setDialogOpen(true);
      return;
    }

    rotateAccess();
  }

  function rotateAccess() {
    startTransition(async () => {
      setError(null);
      setCopied(false);

      try {
        const response = await fetch(`${endpointBase}/${tokenId}/reissue`, {
          method: "POST",
        });

        if (!response.ok) {
          setError(
            await getTokenActionError(
              response,
              "Unable to rotate assessment access.",
            ),
          );
          setDialogOpen(true);
          return;
        }

        const body = (await response.json()) as ReissuedAccess;
        setGenerated(body);
        setDialogOpen(true);
      } catch {
        setError(getTokenActionNetworkError("rotate"));
        setDialogOpen(true);
      }
    });
  }

  async function copyInvitation() {
    if (!generated) {
      return;
    }

    await navigator.clipboard.writeText(
      `Assessment: ${generated.accessUrl}\nAccess code: ${generated.accessCode}`,
    );
    setCopied(true);
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={
          generated
            ? `View rotated ${assessmentLabel} access`
            : `Rotate ${assessmentLabel} access code`
        }
        title={
          generated
            ? `View rotated ${assessmentLabel} access`
            : `Rotate ${assessmentLabel} access code`
        }
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="animate-spin" size={14} />
        ) : generated ? (
          <Check size={14} />
        ) : (
          <RefreshCw size={14} />
        )}
      </button>

      {dialogOpen && (generated || error) ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 px-4 py-6">
          <section className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-[0_23px_52px_rgb(0_0_0/0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-accent">
                  {generated ? "New participant access" : "Rotation failed"}
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  {generated ? "Access code rotated" : "Access was not rotated"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                aria-label="Close"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground/65 hover:border-accent hover:text-accent"
              >
                <X size={15} />
              </button>
            </div>

            {generated ? (
              <>
                <p className="mt-3 text-sm leading-6 text-foreground/60">
                  The previous code and its participant sessions are no longer
                  valid. In-progress answers remain saved.
                </p>
                <div className="mt-4 space-y-3 rounded-lg border border-border bg-background p-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                      Shared assessment URL
                    </p>
                    <a
                      href={generated.accessUrl}
                      className="mt-1 block break-all font-mono text-sm leading-6 text-accent hover:text-accent-strong"
                    >
                      {generated.accessUrl}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                      New access code
                    </p>
                    <p className="mt-1 break-all font-mono text-base font-semibold tracking-wide">
                      {generated.accessCode}
                    </p>
                  </div>
                </div>
                <p className="mt-3 font-mono text-xs text-foreground/55">
                  Expires {new Date(generated.expiresAt).toLocaleString()}
                </p>
              </>
            ) : (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground/70 hover:border-accent hover:text-accent"
              >
                Close
              </button>
              {generated ? (
                <button
                  type="button"
                  onClick={copyInvitation}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
                >
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied ? "Copied" : "Copy invitation"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
