import { handleDashboardTokenPost } from "@/app/api/dashboard/tokens/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compatibility route for older clients. New dashboard code uses
// /api/dashboard/tokens.
export async function POST(request: Request) {
  return handleDashboardTokenPost(request);
}
