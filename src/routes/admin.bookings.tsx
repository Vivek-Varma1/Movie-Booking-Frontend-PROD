import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { RequireAdmin } from "@/admin/components/RequireAdmin";
import type { AdminBookingStatus } from "@/admin/services/bookings";
import { appConfig } from "@/theme/theme";

const Page = lazy(() => import("@/admin/pages/AdminBookingsPage"));
const validStatuses: AdminBookingStatus[] = [
  "CREATED",
  "PAYMENT_STARTED",
  "CONFIRMED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
];

export const Route = createFileRoute("/admin/bookings")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed: {
      status?: AdminBookingStatus;
      q?: string;
      from?: string;
      to?: string;
      page: number;
      size: 20 | 50;
    } = {
      page:
        Number.isInteger(Number(search["page"])) && Number(search["page"]) >= 0
          ? Number(search["page"])
          : 0,
      size: Number(search["size"]) === 50 ? 50 : 20,
    };
    if (
      typeof search["status"] === "string" &&
      validStatuses.includes(search["status"] as AdminBookingStatus)
    )
      parsed.status = search["status"] as AdminBookingStatus;
    if (typeof search["q"] === "string") parsed.q = search["q"];
    if (typeof search["from"] === "string") parsed.from = search["from"];
    if (typeof search["to"] === "string") parsed.to = search["to"];
    return parsed;
  },
  head: () => {
    const title = `Bookings — ${appConfig.appName} Admin`;
    return { meta: [{ title }, { name: "robots", content: "noindex,nofollow" }] };
  },
  component: () => (
    <RequireAdmin>
      <Suspense
        fallback={
          <div
            className="flex min-h-48 items-center justify-center text-text-muted"
            role="status"
            aria-label="Loading bookings"
          >
            <LoaderCircle className="size-7 animate-spin" />
          </div>
        }
      >
        <Page />
      </Suspense>
    </RequireAdmin>
  ),
});
