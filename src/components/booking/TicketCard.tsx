import { Link } from "@tanstack/react-router";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Booking, Ticket } from "@/services/bookings";
import { verifyTicket } from "@/services/tickets";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { TicketQR } from "./TicketQR";

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const parsed = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+05:30`);
  return Number.isNaN(parsed.getTime())
    ? "Show time unavailable"
    : new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", ...options }).format(parsed);
}
function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function TicketCard({
  booking,
  ticket,
  poster,
  mode = "success",
}: {
  booking: Booking;
  ticket: Ticket;
  poster?: string;
  mode?: "success" | "view";
}) {
  const verification = useQuery({
    queryKey: ["ticketVerification", ticket.ticketNumber],
    queryFn: () => verifyTicket(ticket.ticketNumber),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
  return (
    <>
      {mode === "view" && (
        <div className="ticket-card-width mb-4 flex w-full items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-text-primary">Your ticket</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/my-bookings">Back to my bookings</Link>
          </Button>
        </div>
      )}
      <article className="ticket-card ticket-card-width w-full overflow-hidden rounded-card border border-subtle bg-surface shadow-movie">
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-4">
            {poster ? (
              <img
                src={poster}
                alt={`${ticket.movieName} poster`}
                className="h-24 w-16 shrink-0 rounded-lg border border-subtle object-cover sm:h-28 sm:w-[74px]"
              />
            ) : (
              <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-page-muted text-text-muted sm:h-28 sm:w-[74px]">
                <Film className="size-7" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-snug sm:text-xl">{ticket.movieName}</h2>
              <p className="mt-2 text-sm text-text-secondary">{ticket.theatreName}</p>
              <p className="text-sm text-text-secondary">{ticket.screenName}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-subtle pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Date &amp; time
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatDate(ticket.startDateTime, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
                ,{" "}
                {formatDate(ticket.startDateTime, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Seats</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {ticket.seats.map((seat) => (
                  <span
                    key={seat}
                    className="rounded-md border border-subtle bg-page-muted px-2.5 py-1 text-sm font-semibold"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-subtle pt-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Amount paid
              </p>
              <p className="mt-1 font-bold">{money(booking.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Ticket number
              </p>
              <p className="mt-1 font-mono text-sm font-semibold">{ticket.ticketNumber}</p>
              {verification.data?.status === "USED" && (
                <div className="mt-2">
                  <BookingStatusBadge tone="warning">Used</BookingStatusBadge>
                </div>
              )}
              {verification.data?.status === "EXPIRED" && (
                <p className="mt-2 text-xs text-text-muted">Show ended</p>
              )}
            </div>
          </div>
        </div>
        <div
          className="ticket-perforation relative border-t border-dashed border-subtle"
          aria-hidden="true"
        >
          <span className="ticket-notch ticket-notch-left" />
          <span className="ticket-notch ticket-notch-right" />
        </div>
        <div className="flex flex-col items-center px-5 pb-5 pt-6 sm:px-7 sm:pb-7">
          <TicketQR ticketId={ticket.ticketId} />
          <p className="mt-3 text-center text-xs text-text-muted">
            Show this QR code at the entrance
          </p>
          <p className="mt-4 text-xs text-text-muted">
            Issued{" "}
            {formatDate(ticket.issuedAt, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </article>
      <div className="ticket-card-width mt-6 flex w-full justify-center gap-3">
        {mode === "success" && (
          <Button variant="outline" asChild className="sm:min-w-40">
            <Link to="/">Back to home</Link>
          </Button>
        )}
        {verification.data?.status !== "USED" && (
          <Button className="w-full sm:w-auto sm:min-w-40" onClick={() => window.print()}>
            Print ticket
          </Button>
        )}
      </div>
    </>
  );
}
