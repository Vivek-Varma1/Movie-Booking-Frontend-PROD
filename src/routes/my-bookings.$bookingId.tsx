import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { TicketCard } from "@/components/booking/TicketCard";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { getBooking, getTicket, isTicketNotFound } from "@/services/bookings";
import { getErrorMessage } from "@/services/payments";
import { movieQuery, showQuery } from "@/hooks/queries";
import type { Booking } from "@/services/bookings";

export const Route = createFileRoute("/my-bookings/$bookingId")({ component: MyBookingTicketPage });
const bookingQuery = (id: string) => ({
  queryKey: ["booking", id] as const,
  queryFn: () => getBooking(id),
});
const ticketQuery = (id: string) => ({
  queryKey: ["ticket", id] as const,
  queryFn: () => getTicket(id),
  retry: false,
});
const messages: Record<
  Booking["bookingStatus"],
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  CONFIRMED: { label: "Confirmed", tone: "success" },
  CREATED: { label: "Payment not completed", tone: "warning" },
  PAYMENT_STARTED: { label: "Payment not completed", tone: "warning" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

function MyBookingTicketPage() {
  const { bookingId } = Route.useParams();
  const { isAuthenticated, isReady, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const bookingResult = useQuery({ ...bookingQuery(bookingId), enabled: isAuthenticated });
  const booking = bookingResult.data;
  const ticketResult = useQuery({
    ...ticketQuery(bookingId),
    enabled: isAuthenticated && !!booking,
  });
  const showId = booking ? String(booking.showId) : "";
  const show = useQuery({
    ...showQuery(showId),
    enabled: isAuthenticated && booking?.bookingStatus === "CONFIRMED" && !booking.posterUrl,
    staleTime: 5 * 60_000,
  });
  const movieId = show.data?.movieId ? String(show.data.movieId) : "";
  const movie = useQuery({
    ...movieQuery(movieId),
    enabled:
      isAuthenticated && booking?.bookingStatus === "CONFIRMED" && !booking.posterUrl && !!movieId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (isReady && !isAuthenticated)
      openAuthModal({
        onSuccess: () =>
          void navigate({ to: "/my-bookings/$bookingId", params: { bookingId }, replace: true }),
      });
  }, [isReady, isAuthenticated, openAuthModal, navigate, bookingId]);
  useEffect(() => {
    const error = ticketResult.error;
    if (error && !isTicketNotFound(error)) toast.error(getErrorMessage(error));
  }, [ticketResult.error]);
  useEffect(() => {
    if (bookingResult.error) toast.error(getErrorMessage(bookingResult.error));
  }, [bookingResult.error]);
  if (isReady && !isAuthenticated) return null;
  const message =
    ticketResult.error && !isTicketNotFound(ticketResult.error)
      ? getErrorMessage(ticketResult.error)
      : bookingResult.error
        ? getErrorMessage(bookingResult.error)
        : "";
  const poster = booking?.posterUrl || movie.data?.posterUrl;
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
      {(!isReady || bookingResult.isLoading || (!!booking && ticketResult.isLoading)) && (
        <div
          className="flex min-h-64 w-full flex-col items-center justify-center gap-3 text-center"
          role="status"
        >
          <LoaderCircle className="size-8 animate-spin text-accent" />
          <p className="text-sm text-text-secondary">Loading your ticket…</p>
        </div>
      )}
      {message && (
        <section className="w-full rounded-card border border-subtle bg-surface px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-text-primary">Ticket unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-text-secondary">
            {message}
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => {
              void bookingResult.refetch();
              if (booking?.bookingStatus === "CONFIRMED") void ticketResult.refetch();
            }}
          >
            Try again
          </Button>
        </section>
      )}
      {!bookingResult.isLoading &&
        !bookingResult.error &&
        booking &&
        ticketResult.isError &&
        isTicketNotFound(ticketResult.error) && (
          <section className="w-full rounded-card border border-subtle bg-surface px-6 py-12 text-center">
            <h1 className="text-xl font-bold text-text-primary">No ticket for this booking</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Booking status:{" "}
              <BookingStatusBadge tone={messages[booking.bookingStatus].tone}>
                {messages[booking.bookingStatus].label}
              </BookingStatusBadge>
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/my-bookings">Back to my bookings</Link>
            </Button>
          </section>
        )}
      {booking && ticketResult.data && (
        <TicketCard
          booking={booking}
          ticket={ticketResult.data}
          {...(poster ? { poster } : {})}
          mode="view"
        />
      )}
    </main>
  );
}
