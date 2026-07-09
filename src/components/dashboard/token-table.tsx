import type { DashboardTokenDto } from "@/services/dashboard-service";

import { TokenReissueButton } from "./token-reissue-button";
import { formatDate, tokenStatusClass } from "./status";

function tokenReference(row: DashboardTokenDto) {
  return (
    row.participantName ?? row.participantReference ?? row.tokenPreview ?? "token"
  );
}

function tokenReferenceDetail(row: DashboardTokenDto) {
  if (row.participantName) {
    return row.participantEmail ?? row.participantEmployeeId ?? row.tokenPreview;
  }

  return row.participantReference ? row.tokenPreview : null;
}

export function TokenTable({
  tokens,
  allowReissue = false,
}: {
  tokens: DashboardTokenDto[];
  allowReissue?: boolean;
}) {
  const gridClass = allowReissue
    ? "grid-cols-[minmax(0,1.1fr)_64px_100px_116px_58px]"
    : "grid-cols-[0.9fr_0.8fr_0.8fr_1fr]";

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className={allowReissue ? "min-w-[640px]" : "min-w-[720px]"}>
        <div
          className={`grid ${gridClass} items-center gap-3 border-b border-border bg-surface-muted px-4 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55`}
        >
          <span>Reference</span>
          <span>Test</span>
          <span>Status</span>
          <span>Expires</span>
          {allowReissue ? <span className="text-right">URL</span> : null}
        </div>
        {tokens.length ? (
          tokens.map((row) => {
            const referenceDetail = tokenReferenceDetail(row);

            return (
              <div
                key={row.id}
                className={`grid ${gridClass} items-center gap-3 border-b border-border px-4 py-3 last:border-b-0`}
              >
                <div className="min-w-0">
                  <p
                    className={`break-words text-sm ${
                      row.participantName ? "font-medium" : "font-mono"
                    }`}
                  >
                    {tokenReference(row)}
                  </p>
                  {referenceDetail ? (
                    <p className="mt-1 break-all font-mono text-xs text-foreground/50">
                      {referenceDetail}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm">{row.testKey.toUpperCase()}</span>
                <span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${tokenStatusClass(
                      row.status,
                    )}`}
                  >
                    {row.status}
                  </span>
                </span>
                <span className="font-mono text-sm text-foreground/65">
                  {formatDate(row.expiresAt)}
                </span>
                {allowReissue ? (
                  row.canReissue ? (
                    <TokenReissueButton tokenId={row.id} />
                  ) : (
                    <span
                      className="block text-right text-xs leading-5 text-foreground/35"
                      title="Only unused active links can be reissued."
                    >
                      -
                    </span>
                  )
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="px-5 py-8 text-sm text-foreground/60">
            No participant tokens have been generated yet.
          </p>
        )}
      </div>
    </div>
  );
}
