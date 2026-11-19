import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Film, Info, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/AuthContext";
import { useBookingIntent } from "@/hooks/useBookingIntent";
import { restoreSeatSelection, toggleSeatSelection } from "@/lib/seat-selection";
import { SHOW_TIME_ZONE } from "@/lib/show-filters";
import { cn } from "@/lib/utils";
import { appConfig } from "@/theme/theme";
import type { Movie, SeatLayout, Show } from "@/types";
import type { ShowDetails } from "@/services/show-details";
import { createBooking, cancelBooking } from "@/services/bookings";
import { getErrorMessage } from "@/services/payments";
import { lockSeats } from "@/services/shows";
import { useQueryClient } from "@tanstack/react-query";
import { seatLayoutQuery } from "@/hooks/queries";
import { formatCountdown, parseSeatLockDeadline } from "@/lib/seat-lock";

function readActivePendingLock(showId: string): unknown {
  try {
    const bookingId = sessionStorage.getItem(`pendingBooking:${showId}`);
    if (!bookingId) return undefined;
    const raw = sessionStorage.getItem(`checkout:${bookingId}`);
    if (!raw) return undefined;
    const checkout = JSON.parse(raw) as { showId?: unknown; lockedUntil?: unknown };
    if (String(checkout.showId) !== showId) return undefined;
    const deadline = parseSeatLockDeadline(checkout.lockedUntil);
    return deadline !== null && deadline > Date.now() ? checkout.lockedUntil : undefined;
  } catch {
    return undefined;
  }
}

const seatBase =
  "relative size-8 min-w-8 shrink-0 overflow-hidden rounded-seat p-0 text-[11px] font-semibold shadow-none [&_svg]:size-3";
const seatStatus = {
  AVAILABLE:
    "border-[1.5px] border-seat-available bg-surface text-text-primary hover:bg-page-muted hover:text-text-primary",
  OCCUPIED:
    "border border-seat-occupied-border bg-seat-occupied text-seat-occupied-icon disabled:opacity-100",
  BEST: "border-[1.5px] border-seat-best-border bg-seat-best text-text-primary shadow-seat-best hover:text-text-primary",
};
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOW_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function SeatHeader({ movie, show }: { movie?: Movie; show?: ShowDetails }) {
  const { user, isAuthenticated, openLogin, logout } = useAuth();
  const time = show?.startTime
    ? new Date(
        /(?:Z|[+-]\d{2}:\d{2})$/.test(show.startTime) ? show.startTime : `${show.startTime}+05:30`,
      )
    : undefined;
  const subtitle =
    time && !Number.isNaN(time.getTime())
      ? `${new Intl.DateTimeFormat("en-GB", { timeZone: SHOW_TIME_ZONE, day: "numeric", month: "short" }).format(time)}, ${timeFormat.format(time)}${show?.theatreName ? ` at ${show.theatreName}` : ""}`
      : show?.theatreName;
  return (
    <header className="flex h-header shrink-0 items-center gap-4 border-b border-subtle bg-surface px-6 max-sm:px-4">
      <Link to="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary">
          <Film className="size-5" />
        </span>
        <span className="max-sm:hidden">{appConfig.appName}</span>
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-lg font-bold">
          {movie?.title || show?.movieName || "Select seats"}
        </h1>
        {subtitle && <p className="mt-1 truncate text-[13px] text-text-muted">{subtitle}</p>}
      </div>
      <Button
        variant="secondary"
        size="icon"
        className="size-10 shrink-0 rounded-full bg-page-muted text-text-secondary shadow-none"
        title={isAuthenticated ? `Sign out${user?.email ? ` (${user.email})` : ""}` : "Sign in"}
        aria-label={isAuthenticated ? "Sign out" : "Sign in"}
        onClick={isAuthenticated ? logout : openLogin}
      >
        <UserRound />
      </Button>
    </header>
  );
}

export function SeatBooking({
  layout,
  movie,
  show,
  siblingShows,
  cityId = "",
}: {
  layout: SeatLayout;
  movie?: Movie;
  show: ShowDetails;
  siblingShows: Show[];
  cityId?: string;
}) {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const queryClient = useQueryClient();
  const { intent, ready, setIntent } = useBookingIntent();
  const [selected, setSelected] = useState<string[]>([]);
  const [popping, setPopping] = useState<string[]>([]);
  const restoredShow = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<unknown>(undefined);
  const [ownedLockedSeatIds, setOwnedLockedSeatIds] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (lockedUntil === undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);
  useEffect(() => {
    if (!ready || restoredShow.current === layout.showId) return;
    restoredShow.current = layout.showId;
    const selectedIds = intent.showId === layout.showId ? intent.selectedSeatIds : [];
    const pendingLock = selectedIds.length ? readActivePendingLock(layout.showId) : undefined;
    const ownedIds = pendingLock === undefined ? [] : selectedIds;
    setOwnedLockedSeatIds(ownedIds);
    setLockedUntil(pendingLock);
    setSelected(restoreSeatSelection(layout, selectedIds, ownedIds));
  }, [ready, intent, layout]);
  useEffect(() => {
    const deadline = parseSeatLockDeadline(lockedUntil);
    if (ownedLockedSeatIds.length === 0 || deadline === null || deadline > Date.now()) return;
    setOwnedLockedSeatIds([]);
    setLockedUntil(undefined);
    const available = restoreSeatSelection(layout, selected);
    setSelected(available);
    setIntent({ showId: layout.showId, selectedSeatIds: available });
    void queryClient.invalidateQueries({ queryKey: seatLayoutQuery(layout.showId).queryKey });
  }, [lockedUntil, ownedLockedSeatIds, layout, now, queryClient, selected, setIntent]);
  const toggle = (id: string) => {
    const result = toggleSeatSelection(selected, id);
    if (result.limitReached) {
      toast("You can select up to 10 seats");
      return;
    }
    setSelected(result.selected);
    setIntent({ showId: layout.showId, selectedSeatIds: result.selected });
    if (result.selected.includes(id)) {
      setPopping((prev) => [...prev, id]);
      timers.current.push(
        setTimeout(() => setPopping((prev) => prev.filter((seat) => seat !== id)), 250),
      );
    }
  };
  const proceed = async () => {
    if (!selected.length || submitting) return;
    setIntent({ showId: layout.showId, selectedSeatIds: selected });
    const continueToCheckout = () => {
      void startBooking();
    };
    if (isAuthenticated) continueToCheckout();
    else openAuthModal({ onSuccess: continueToCheckout });
  };
  const startBooking = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const pendingKey = `pendingBooking:${layout.showId}`;
      const pending = sessionStorage.getItem(pendingKey);
      if (pending) {
        try {
          await cancelBooking(pending);
          await queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
        } catch {
          /* An expired booking does not block a new attempt. */
        }
        sessionStorage.removeItem(pendingKey);
      }
      const selectedSeats = layout.tiers.flatMap((tier) =>
        tier.rows.flatMap((row) =>
          row.cells
            .filter(
              (cell): cell is NonNullable<typeof cell> =>
                cell !== null && selected.includes(cell.id),
            )
            .map((cell) => {
              const parsedId = Number(cell.showSeatId ?? cell.id);
              const mockId =
                Array.from(`${layout.showId}:${cell.id}`).reduce(
                  (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
                  7,
                ) % 1_000_000_000;
              return {
                showSeatId: Number.isFinite(parsedId)
                  ? parsedId
                  : appConfig.useMock
                    ? mockId + 1
                    : Number.NaN,
                seatLabel: row.label + cell.number,
                category: tier.name,
                price: tier.price,
              };
            }),
        ),
      );
      if (selectedSeats.some((seat) => !Number.isFinite(seat.showSeatId)))
        throw new Error("Seat information is invalid. Please refresh and try again.");
      const ids = selectedSeats.map((seat) => seat.showSeatId);
      const lock = await lockSeats(String(layout.showId), ids);
      setLockedUntil(lock.lockedUntil);
      // Persist the backend's exact response before the booking request can delay navigation.
      sessionStorage.setItem(
        `seatLock:${layout.showId}`,
        JSON.stringify({ lockedUntil: lock.lockedUntil }),
      );
      const booking = await createBooking(String(layout.showId), ids, {
        ...((movie?.title ?? show.movieName) ? { movieName: movie?.title ?? show.movieName } : {}),
        ...(show.theatreName ? { theatreName: show.theatreName } : {}),
        ...(show.screenName ? { screenName: show.screenName } : {}),
        seats: selectedSeats,
      });
      sessionStorage.setItem(
        `checkout:${booking.bookingId}`,
        JSON.stringify({
          showId: layout.showId,
          cityId,
          lockedUntil: lock.lockedUntil,
          seats: selectedSeats.map(({ seatLabel, category, price }) => ({
            label: seatLabel,
            category,
            price,
          })),
        }),
      );
      sessionStorage.setItem(pendingKey, String(booking.bookingId));
      sessionStorage.removeItem(`seatLock:${layout.showId}`);
      await navigate({
        to: "/checkout/$bookingId",
        params: { bookingId: String(booking.bookingId) },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      await queryClient.invalidateQueries({ queryKey: seatLayoutQuery(layout.showId).queryKey });
    } finally {
      setSubmitting(false);
    }
  };
  const maxColumns = Math.max(
    0,
    ...layout.tiers.flatMap((tier) => tier.rows.map((row) => row.cells.length)),
  );
  const start = show.startTime
    ? new Date(
        /(?:Z|[+-]\d{2}:\d{2})$/.test(show.startTime) ? show.startTime : `${show.startTime}+05:30`,
      )
    : undefined;
  return (
    <div className="seat-viewport">
      <SeatHeader {...(movie ? { movie } : {})} show={show} />
      <div className="mx-auto flex w-full max-w-[1024px] shrink-0 items-center gap-6 px-6 py-4 max-sm:gap-4 max-sm:px-4">
        {start && !Number.isNaN(start.getTime()) && (
          <div className="shrink-0 text-sm">
            <p className="text-text-muted">
              {new Intl.DateTimeFormat("en-US", {
                timeZone: SHOW_TIME_ZONE,
                weekday: "short",
              }).format(start)}
            </p>
            <p className="mt-1 font-semibold">
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: SHOW_TIME_ZONE,
                day: "numeric",
                month: "short",
              }).format(start)}
            </p>
          </div>
        )}
        <div
          className="media-scroller flex min-w-0 gap-3 overflow-x-auto"
          aria-label="Other showtimes"
        >
          {(siblingShows.length
            ? siblingShows
            : start
              ? [{ id: layout.showId, startTime: start.toISOString() }]
              : []
          ).map((sibling) => (
            <Button
              key={sibling.id}
              variant="outline"
              className={cn(
                "h-[52px] w-28 shrink-0 rounded-xl border-subtle text-base font-semibold shadow-none hover:bg-page-muted hover:text-text-primary",
                sibling.id === layout.showId && "border-primary bg-page-muted",
              )}
              asChild
            >
              <Link
                to="/shows/$showId/seats"
                params={{ showId: sibling.id }}
                search={{ cityId }}
                aria-current={sibling.id === layout.showId ? "true" : undefined}
              >
                {timeFormat.format(new Date(sibling.startTime))}
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="seat-canvas" aria-label="Seat map" tabIndex={0}>
        {maxColumns > 0 ? (
          <div className="seat-block">
            {layout.tiers.map((tier, tierIndex) => (
              <section
                key={`${tier.name}-${tierIndex}`}
                className="mb-8"
                aria-label={`${tier.name}, ₹${tier.price}`}
              >
                <h2 className="mb-5 text-center text-base font-bold">
                  {tier.name.toUpperCase()} : ₹{tier.price}
                </h2>
                <div className="space-y-2">
                  {tier.rows.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="seat-row">
                      <span className="sticky left-0 z-10 flex h-8 w-8 shrink-0 items-center justify-center bg-surface text-base text-text-secondary">
                        {row.label}
                      </span>
                      {Array.from({ length: maxColumns }, (_, column) => {
                        const seat = row.cells[column];
                        if (!seat)
                          return (
                            <span key={column} className="size-8 shrink-0" aria-hidden="true" />
                          );
                        const active = selected.includes(seat.id);
                        const selectable =
                          seat.status === "AVAILABLE" || ownedLockedSeatIds.includes(seat.id);
                        return (
                          <Button
                            key={column}
                            variant="ghost"
                            disabled={!selectable}
                            aria-pressed={active}
                            aria-label={`Row ${row.label} seat ${seat.number}, ₹${tier.price}, ${active ? "selected" : seat.status.toLowerCase()}`}
                            title={`${row.label}${seat.number} · ₹${tier.price}`}
                            className={cn(
                              seatBase,
                              active
                                ? "border border-seat-selected bg-seat-selected text-on-primary hover:bg-seat-selected hover:text-on-primary"
                                : seatStatus[seat.status],
                            )}
                            onClick={() => toggle(seat.id)}
                          >
                            {selectable ? (
                              seat.number
                            ) : (
                              <span aria-hidden="true" className="text-base">
                                ×
                              </span>
                            )}
                            {active && popping.includes(seat.id) && movie?.posterUrl && (
                              <img
                                src={movie.posterUrl}
                                alt=""
                                className="seat-pop absolute inset-0 size-full object-cover"
                              />
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div className="cinema-screen" role="img" aria-label="Cinema screen" />
          </div>
        ) : (
          <div className="py-20 text-center text-text-secondary">
            No seats are available for this show.
          </div>
        )}
      </div>
      <footer className="flex min-h-[90px] shrink-0 items-center justify-center border-t border-subtle bg-surface px-4 py-3">
        {selected.length ? (
          <div
            key="selected"
            className="seat-footer-enter mx-auto flex w-full max-w-[990px] items-center justify-between gap-4"
          >
            <div>
              <p className="text-[13px] text-text-muted">
                {lockedUntil === undefined ? "Selected" : "Seats held until"}
              </p>
              <p className="mt-1 text-base font-bold">
                {lockedUntil === undefined
                  ? `${selected.length} ${selected.length === 1 ? "Seat" : "Seats"}`
                  : (() => {
                      const deadline = parseSeatLockDeadline(lockedUntil);
                      return deadline === null
                        ? "Checking lock time"
                        : formatCountdown(Math.max(0, Math.ceil((deadline - now) / 1000)));
                    })()}
              </p>
            </div>
            <Button
              disabled={submitting}
              className="h-11 w-[190px] rounded-xl bg-primary text-base font-semibold text-on-primary"
              onClick={() => void proceed()}
            >
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              {lockedUntil === undefined ? "Proceed" : "Creating booking"}
            </Button>
          </div>
        ) : (
          <div key="legend" className="seat-footer-enter">
            <p className="mb-3 text-center text-xs font-semibold text-accent">SCREEN THIS WAY</p>
            <TooltipProvider>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold max-sm:gap-x-3">
                <span className="flex items-center gap-2">
                  <span className="size-5 rounded-seat border border-seat-best-border bg-seat-best shadow-seat-best" />
                  Best Seats
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4 text-text-muted"
                        aria-label="About best seats"
                      >
                        <Info className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Recommended seats for the best viewing angle.</TooltipContent>
                  </Tooltip>
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-5 rounded-seat border border-seat-available bg-surface" />
                  Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-seat border border-seat-occupied-border bg-seat-occupied text-seat-occupied-icon">
                    ×
                  </span>
                  Occupied
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-5 rounded-seat bg-seat-selected" />
                  Selected
                </span>
              </div>
            </TooltipProvider>
          </div>
        )}
      </footer>
    </div>
  );
}
