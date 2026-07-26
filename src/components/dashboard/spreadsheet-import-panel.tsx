"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

interface ImportIssue {
  sheet: string;
  row: number;
  column?: string;
  message: string;
}

interface ImportResponse {
  imported?: number;
  error?: string;
  issues?: ImportIssue[];
  issueCount?: number;
}

interface TemplateLink {
  href: string;
  label: string;
}

export function SpreadsheetImportPanel({
  title,
  description,
  endpoint,
  templateLinks,
  participantId,
}: {
  title: string;
  description: string;
  endpoint: string;
  templateLinks: TemplateLink[];
  participantId?: string;
}) {
  const inputId = useId();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setResponse(null);
    const formData = new FormData();
    formData.append("file", file);
    if (participantId) {
      formData.append("participantId", participantId);
    }

    try {
      const result = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await result.json()) as ImportResponse;
      setResponse(payload);
      if (result.ok) {
        setFile(null);
        router.refresh();
      }
    } catch {
      setResponse({
        error: "The upload could not be completed. Check your connection and try again.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  const isSuccess = typeof response?.imported === "number";
  const visibleIssues = response?.issues?.slice(0, 12) ?? [];

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            {description}
          </p>
        </div>
        <FileSpreadsheet className="shrink-0 text-accent" size={21} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {templateLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground/75 hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Download size={15} />
            {link.label}
          </a>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <label htmlFor={inputId} className="block text-sm font-medium">
          Completed workbook
        </label>
        <input
          key={file?.name ?? "empty"}
          id={inputId}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResponse(null);
          }}
          className="mt-2 block min-h-11 w-full cursor-pointer rounded-lg border border-border bg-surface text-sm text-foreground/70 file:mr-3 file:min-h-11 file:border-0 file:border-r file:border-border file:bg-surface-muted file:px-3 file:text-sm file:font-medium file:text-foreground"
        />
        <p className="mt-2 text-xs leading-5 text-foreground/50">
          XLSX only, up to 10 MB. Imports are all-or-nothing, so invalid rows do not create partial data.
        </p>
        <button
          type="submit"
          disabled={!file || isUploading}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isUploading ? (
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          ) : (
            <Upload size={16} aria-hidden="true" />
          )}
          {isUploading ? "Checking workbook..." : "Upload XLSX"}
        </button>
      </form>

      <div className="mt-4" aria-live="polite">
        {isSuccess ? (
          <div className="flex gap-2 rounded-lg bg-success/10 px-3 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
            <p>
              Imported {response.imported} row{response.imported === 1 ? "" : "s"} successfully.
            </p>
          </div>
        ) : response?.error ? (
          <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-3">
            <div className="flex gap-2 text-sm font-medium text-danger">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <p>{response.error}</p>
            </div>
            {visibleIssues.length ? (
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto border-t border-danger/15 pt-3 text-xs leading-5 text-foreground/70">
                {visibleIssues.map((issue, index) => (
                  <li key={`${issue.sheet}:${issue.row}:${issue.column ?? ""}:${index}`}>
                    <span className="font-mono font-semibold text-foreground">
                      {issue.sheet} · row {issue.row}
                      {issue.column ? ` · ${issue.column}` : ""}
                    </span>{" "}
                    — {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {(response.issueCount ?? 0) > visibleIssues.length ? (
              <p className="mt-2 text-xs text-foreground/55">
                Showing {visibleIssues.length} of {response.issueCount} issues.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
