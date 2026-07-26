import { notFound } from "next/navigation";

import { requireClientSession } from "@/auth/guards";
import { ResultDetailReport } from "@/components/dashboard/result-detail-report";
import { getClientResultDetail } from "@/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const session = await requireClientSession();
  const { resultId } = await params;
  const result = await getClientResultDetail(session.clientId, resultId);

  if (!result) {
    notFound();
  }

  return <ResultDetailReport result={result} />;
}
