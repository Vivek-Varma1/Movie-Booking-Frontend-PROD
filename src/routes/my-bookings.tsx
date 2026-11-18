import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Film, Ticket, TicketCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { useAuth } from "@/components/auth/AuthContext";
import { getErrorMessage } from "@/services/payments";
import type { Booking, BookingStatus } from "@/services/bookings";
import { movieQuery, myBookingsQuery, showQuery } from "@/hooks/queries";

export const Route = createFileRoute("/my-bookings")({ component: MyBookingsPage });
type Tab = "upcoming" | "past" | "not-completed";
const dateValue = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => {
  const date = dateValue(value);
  return date
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...options }).format(date)
    : "Show time unavailable";
};
const formatBookedAt = (value: string) =>
  `${formatDate(value, { day: "numeric", month: "short", year: "numeric" })}, ${formatDate(value, { hour: "2-digit", minute: "2-digit", hour12: true }).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())}`;
const statusInfo: Record<
  BookingStatus,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  CONFIRMED: { label: "Confirmed", tone: "success" },
  PAYMENT_STARTED: { label: "Payment not completed", tone: "warning" },
  CREATED: { label: "Payment not completed", tone: "warning" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  FAILED: { label: "Failed", tone: "danger" },
};
const tabs: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "not-completed", label: "Not completed" },
];

function BookingCard({ booking, showStartTime }: { booking: Booking; showStartTime?: string }) {
  const showId = String(booking.showId);
  const needsShow = !booking.showStartTime || !booking.posterUrl;
  const show = useQuery({ ...showQuery(showId), enabled: needsShow, staleTime: 5 * 60_000 });
  const movieId = show.data?.movieId ? String(show.data.movieId) : "";
  const movie = useQuery({
    ...movieQuery(movieId),
    enabled: !booking.posterUrl && !!movieId,
    staleTime: 5 * 60_000,
  });
  const posterUrl = booking.posterUrl || movie.data?.posterUrl;
  const startTime = booking.showStartTime || showStartTime || show.data?.startTime;
  const posterPending = !booking.posterUrl && (show.isLoading || (!!movieId && movie.isLoading));
  const showPending = !startTime && show.isLoading;
  const details = movie.data;
  const certificate = details?.certificate
    ? details.certificate.replace(/^UA(13|16)$/, "UA$1+")
    : "";
  const language = details?.languages?.[0] ?? "";
  const status = statusInfo[booking.bookingStatus];
  const time = startTime
    ? `${formatDate(startTime, { weekday: "short", day: "numeric", month: "short" })} · ${formatDate(startTime, { hour: "2-digit", minute: "2-digit", hour12: true }).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())}`
    : "Show time unavailable";
  return (
    <article className="overflow-hidden rounded-card border border-subtle bg-surface shadow-none transition-shadow hover:shadow-header">
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${booking.movieName} poster`}
            className="h-[76px] w-14 shrink-0 rounded-lg object-cover sm:h-[88px] sm:w-16"
          />
        ) : posterPending ? (
          <div
            aria-label="Loading movie poster"
            className="h-[76px] w-14 shrink-0 animate-pulse rounded-lg bg-page-muted sm:h-[88px] sm:w-16"
          />
        ) : (
          <div className="flex h-[76px] w-14 shrink-0 items-center justify-center rounded-lg bg-page-muted text-text-muted sm:h-[88px] sm:w-16">
            <Film className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-text-primary sm:text-lg">
                {booking.movieName}
              </h2>
              {(certificate || language) && (
                <p className="mt-0.5 text-sm text-text-secondary">
                  {[certificate, language].filter(Boolean).join(" | ")}
                </p>
              )}
            </div>
            <BookingStatusBadge tone={status.tone}>{status.label}</BookingStatusBadge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {booking.theatreName} · {booking.screenName}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary">
            {showPending ? (
              <span
                className="inline-block h-4 w-44 animate-pulse rounded bg-page-muted"
                aria-label="Loading show time"
              />
            ) : (
              time
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-subtle px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          {booking.seats.map((seat) => (
            <Badge key={seat.showSeatId} variant="secondary">
              {seat.seatLabel}
            </Badge>
          ))}
          <span>
            {booking.seats.length} {booking.seats.length === 1 ? "ticket" : "tickets"}
          </span>
          <span className="font-semibold text-text-primary">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(booking.totalAmount)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 bg-card-footer-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs text-text-muted">
          Booked on {formatBookedAt(booking.bookedAt)} <span className="mx-1">·</span> Booking ID #
          {booking.bookingId}
        </p>
        {booking.bookingStatus === "CONFIRMED" ? (
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/my-bookings/$bookingId" params={{ bookingId: String(booking.bookingId) }}>
              <TicketCheck className="size-4" />
              View ticket
            </Link>
          </Button>
        ) : (
          <p className="text-xs text-text-muted">No payment was received for this order.</p>
        )}
      </div>
    </article>
  );
}

function BookingSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-card border border-subtle bg-surface"
      aria-hidden="true"
    >
      <div className="flex gap-4 p-5">
        <div className="h-[88px] w-16 rounded-lg bg-page-muted" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-5 w-2/3 rounded bg-page-muted" />
          <div className="h-4 w-1/2 rounded bg-page-muted" />
          <div className="h-4 w-3/4 rounded bg-page-muted" />
        </div>
      </div>
      <div className="border-t border-subtle bg-page-muted px-5 py-4">
        <div className="h-4 w-1/2 rounded bg-surface" />
      </div>
    </div>
  );
}

export function MyBookingsPage() {
  const { isAuthenticated, isReady, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const isTicketRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/my-bookings/"),
  });
  const bookingsQuery = useQuery({
    ...myBookingsQuery(),
    enabled: isAuthenticated && !isTicketRoute,
    refetchOnWindowFocus: true,
  });
  const [tab, setTab] = useState<Tab>("upcoming");
  const initializedTab = useRef(false);
  const bookings = bookingsQuery.data ?? [];
  const showIds = [
    ...new Set(
      bookings
        .filter((booking) => !booking.showStartTime || !booking.posterUrl)
        .map((booking) => String(booking.showId)),
    ),
  ];
  const showQueries = useQueries({
    queries: showIds.map((showId) => ({ ...showQuery(showId), enabled: isAuthenticated })),
  });
  const times = new Map(
    showIds.map((showId, index) => [showId, showQueries[index]?.data?.startTime]),
  );
  const pendingShowIds = new Set(showIds.filter((_, index) => showQueries[index]?.isLoading));
  const showQueriesPending = showQueries.some((query) => query.isLoading);
  const buckets = (() => {
    const now = Date.now();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    const notCompleted: Booking[] = [];
    for (const booking of bookings) {
      if (booking.bookingStatus !== "CONFIRMED") {
        notCompleted.push(booking);
        continue;
      }
      const start = dateValue(booking.showStartTime || times.get(String(booking.showId)));
      if (!start) {
        if (pendingShowIds.has(String(booking.showId))) upcoming.push(booking);
        continue;
      }
      if (start.getTime() > now) upcoming.push(booking);
      else past.push(booking);
    }
    upcoming.sort(
      (a, b) =>
        (dateValue(a.showStartTime || times.get(String(a.showId)))?.getTime() ?? 0) -
        (dateValue(b.showStartTime || times.get(String(b.showId)))?.getTime() ?? 0),
    );
    past.sort(
      (a, b) =>
        (dateValue(b.showStartTime || times.get(String(b.showId)))?.getTime() ?? 0) -
        (dateValue(a.showStartTime || times.get(String(a.showId)))?.getTime() ?? 0),
    );
    notCompleted.sort(
      (a, b) => (dateValue(b.bookedAt)?.getTime() ?? 0) - (dateValue(a.bookedAt)?.getTime() ?? 0),
    );
    return { upcoming, past, "not-completed": notCompleted };
  })();
  useEffect(() => {
    if (!isTicketRoute && isReady && !isAuthenticated)
      openAuthModal({ onSuccess: () => void navigate({ to: "/my-bookings", replace: true }) });
  }, [isReady, isAuthenticated, openAuthModal, navigate, isTicketRoute]);
  useEffect(() => {
    if (!bookingsQuery.isSuccess || initializedTab.current || showQueriesPending) return;
    initializedTab.current = true;
    if (!buckets.upcoming.length && buckets.past.length) setTab("past");
  }, [bookingsQuery.isSuccess, buckets.upcoming.length, buckets.past.length, showQueriesPending]);
  useEffect(() => {
    if (bookingsQuery.error) toast.error(getErrorMessage(bookingsQuery.error));
  }, [bookingsQuery.error]);
  if (isTicketRoute) return <Outlet />;
  if (isReady && !isAuthenticated) return null;
  const visible = buckets[tab];
  const emptyCopy: Record<Tab, string> = {
    upcoming: "No upcoming bookings",
    past: "No past bookings yet",
    "not-completed": "Nothing here",
  };
  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight text-text-primary">My bookings</h1>
        <p className="mt-1 text-sm text-text-secondary">Your tickets and past orders</p>
      </header>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Booking history">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`bookings-panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${tab === item.id ? "bg-nav-active text-nav-active-text" : "bg-surface text-text-secondary hover:bg-page-muted"}`}
          >
            {item.label}
            <span className="text-xs opacity-75">{buckets[item.id].length}</span>
          </button>
        ))}
      </div>
      <section
        id={`bookings-panel-${tab}`}
        role="tabpanel"
        aria-label={tabs.find((item) => item.id === tab)?.label}
        className="space-y-4"
      >
        {(!isReady || bookingsQuery.isLoading) && (
          <div className="space-y-4" role="status" aria-label="Loading bookings">
            <BookingSkeleton />
            <BookingSkeleton />
            <BookingSkeleton />
          </div>
        )}
        {bookingsQuery.isError && (
          <div className="rounded-card border border-subtle bg-surface p-6 text-center">
            <p className="font-semibold text-text-primary">Couldn't load your bookings</p>
            <p role="alert" className="mt-2 text-sm text-text-secondary">
              {getErrorMessage(bookingsQuery.error)}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => void bookingsQuery.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {bookingsQuery.isSuccess && visible.length === 0 && (
          <div className="rounded-card border border-subtle bg-surface px-6 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-page-muted text-text-muted">
              {tab === "upcoming" ? (
                <TicketCheck className="size-6" />
              ) : (
                <Ticket className="size-6" />
              )}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-text-primary">{emptyCopy[tab]}</h2>
            <Button asChild className="mt-5">
              <Link to="/">Browse movies</Link>
            </Button>
          </div>
        )}
        {bookingsQuery.isSuccess &&
          visible.map((booking) => {
            const resolvedTime = times.get(String(booking.showId));
            return (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                {...(resolvedTime ? { showStartTime: resolvedTime } : {})}
              />
            );
          })}
      </section>
    </main>
  );
}
