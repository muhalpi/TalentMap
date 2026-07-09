"use client";

import { useState, useTransition } from "react";
import { Check, Clipboard, Loader2, RefreshCw, X } from "lucide-react";

interface ReissuedToken {
  participantUrl: string;
  token: string;
  expiresAt: string;
}

export function TokenReissueButton({ tokenId }: { tokenId: string }) {
  const [generated, setGenerated] = useState<ReissuedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (generated) {
      setDialogOpen(true);
      return;
    }

    reissueToken();
  }

  function reissueToken() {
    startTransition(async () => {
      setError(null);
      setCopied(false);

      const response = await fetch(`/api/dashboard/tokens/${tokenId}/reissue`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to reissue token.");
        setDialogOpen(true);
        return;
      }

      setGenerated(body);
      setDialogOpen(true);
    });
  }

  async function copyUrl() {
    if (!generated) {
      return;
    }

    await navigator.clipboard.writeText(generated.participantUrl);
    setCopied(true);
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={generated ? "View reissued URL" : "Reissue token URL"}
        title={generated ? "View reissued URL" : "Reissue token URL"}
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
                  {generated ? "New participant URL" : "Reissue failed"}
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  {generated ? "URL reissued" : "Token was not reissued"}
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
                  The previous URL is no longer valid.
                </p>
                <a
                  href={generated.participantUrl}
                  className="mt-4 block break-all rounded-lg border border-border bg-background p-3 font-mono text-sm leading-6 text-accent hover:text-accent-strong"
                >
                  {generated.participantUrl}
                </a>
                <p className="mt-3 font-mono text-xs text-foreground/55">
                  Expires {new Date(generated.expiresAt).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="mt-4 rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger">
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
                  onClick={copyUrl}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
                >
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied ? "Copied" : "Copy URL"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
