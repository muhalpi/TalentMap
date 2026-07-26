import { formatDate } from "@/components/dashboard/status";
import type {
  DashboardResultDetailDto,
  ResultSource,
} from "@/services/dashboard-service";

export function ResultSourceBadge({ source }: { source: ResultSource }) {
  if (source !== "xlsx_import") {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      Imported XLSX
    </span>
  );
}

export function ResultImportProvenance({
  result,
}: {
  result: DashboardResultDetailDto;
}) {
  if (result.source !== "xlsx_import") {
    return null;
  }

  const importer = result.importedBy?.name ?? result.importedBy?.email;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/60">
      <ResultSourceBadge source={result.source} />
      <span>
        Imported {formatDate(result.importedAt ?? result.submittedAt)}
        {importer ? ` by ${importer}` : ""}
      </span>
      {result.importedFileName ? (
        <span className="max-w-full truncate font-mono text-foreground/50">
          {result.importedFileName}
        </span>
      ) : null}
    </div>
  );
}
