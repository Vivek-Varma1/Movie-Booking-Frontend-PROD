import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { RequireStaff } from "@/admin/components/RequireStaff";

const Page = lazy(() => import("@/admin/pages/CheckInPage"));

export const Route = createFileRoute("/admin/check-in")({
  ssr: false,
  component: CheckInRoute,
});

function CheckInRoute() {
  return (
    <RequireStaff>
      <Suspense
        fallback={
          <div
            className="flex min-h-48 items-center justify-center text-text-muted"
            role="status"
            aria-label="Loading check-in"
          >
            <LoaderCircle className="size-7 animate-spin" />
          </div>
        }
      >
        <Page />
      </Suspense>
    </RequireStaff>
  );
}
