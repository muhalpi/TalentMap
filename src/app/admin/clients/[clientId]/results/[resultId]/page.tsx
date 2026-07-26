import { notFound } from "next/navigation";

import { requireInternalAdminSession } from "@/auth/guards";
import { ResultDetailReport } from "@/components/dashboard/result-detail-report";
import { getClientResultDetail } from "@/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminResultDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; resultId: string }>;
}) {
  await requireInternalAdminSession();

  const { clientId, resultId } = await params;
  const result = await getClientResultDetail(clientId, resultId);

  if (!result) {
    notFound();
  }

  return (
    <ResultDetailReport
      result={result}
      backHref={`/admin/clients/${clientId}?tab=results`}
      exportHref={`/api/admin/clients/${clientId}/results/export?resultId=${encodeURIComponent(result.id)}`}
      participantHref={null}
    />
  );
}
