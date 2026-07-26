import { notFound } from "next/navigation";

import { requireClientSession } from "@/auth/guards";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import {
  getClientDashboardAnalytics,
  getClientDashboardByClientId,
} from "@/services/dashboard-service";

export default async function DashboardPage() {
  const session = await requireClientSession();
  const [dashboard, analytics] = await Promise.all([
    getClientDashboardByClientId(session.clientId),
    getClientDashboardAnalytics(session.clientId),
  ]);

  if (!dashboard) {
    notFound();
  }

  return (
    <DashboardOverview
      dashboard={dashboard}
      analytics={analytics}
      userEmail={session.email}
    />
  );
}
