import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Film, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { canCheckIn } from "@/admin/lib/auth";
import {
  TicketVerifyCard,
  type TicketVerificationView,
} from "@/components/tickets/TicketVerifyCard";
import { isTicketNotFound } from "@/services/bookings";
import { verifyTicket, type TicketVerification } from "@/services/tickets";
import { appConfig } from "@/theme/theme";
import { getErrorMessage } from "@/services/payments";

export const Route = createFileRoute("/ticket/verify/$ticketNumber")({
  component: TicketVerificationPage,
});

function TicketVerificationPage() {
  const { ticketNumber } = Route.useParams();
  const { user } = useAuth();
  const [checked, setChecked] = useState<Record<string, TicketVerification>>({});
  const query = useQuery<TicketVerificationView>({
    queryKey: ["ticketVerification", ticketNumber],
    queryFn: async () => {
      try {
        return await verifyTicket(ticketNumber);
      } catch (error) {
        if (isTicketNotFound(error)) return { ticketNumber, status: "NOT_FOUND" };
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
  const result = checked[ticketNumber] ?? query.data;
  return (
    <div className="min-h-screen bg-page">
      <header className="flex h-header items-center border-b border-subtle bg-surface px-4 sm:px-6">
        <Link
          to="/"
          aria-label={appConfig.appName}
          className="flex items-center gap-2 text-xl font-extrabold text-text-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Film className="size-5" />
          </span>
          <span>{appConfig.appName}</span>
        </Link>
      </header>
      <main className="mx-auto flex min-h-[calc(100dvh-var(--header-height))] w-full max-w-[480px] flex-col justify-center px-4 py-8 sm:px-6">
        {query.isPending && (
          <div
            className="w-full animate-pulse rounded-card border border-subtle bg-surface p-5 sm:p-6"
            role="status"
            aria-label="Loading ticket verification"
          >
            <div className="mb-5 h-16 rounded-lg bg-page-muted" />
            <div className="h-6 w-2/3 rounded bg-page-muted" />
            <div className="mt-3 h-4 w-1/2 rounded bg-page-muted" />
            <div className="mt-6 h-10 rounded bg-page-muted" />
          </div>
        )}
        {query.isError && (
          <section className="rounded-card border border-subtle bg-surface px-6 py-12 text-center">
            <h1 className="text-xl font-bold text-text-primary">Could not load this ticket</h1>
            <p role="alert" className="mt-2 text-sm text-text-secondary">
              {getErrorMessage(query.error)}
            </p>
            <Button variant="outline" className="mt-5" onClick={() => void query.refetch()}>
              <RotateCcw className="size-4" />
              Try again
            </Button>
          </section>
        )}
        {result && (
          <TicketVerifyCard
            key={ticketNumber}
            result={result}
            showCheckIn={canCheckIn(user)}
            onCheckedIn={(updated) =>
              setChecked((current) => ({ ...current, [ticketNumber]: updated }))
            }
          />
        )}
        {query.isFetching && !query.isPending && (
          <span className="sr-only">
            <LoaderCircle className="size-4 animate-spin" />
          </span>
        )}
      </main>
    </div>
  );
}
