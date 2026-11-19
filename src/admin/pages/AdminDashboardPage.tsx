import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, CalendarClock, Check, Film, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { TheatreFormDialog } from "../components/TheatreFormDialog";
import { CityFormDialog } from "../components/CityFormDialog";
import { MovieFormDialog } from "./MoviesPage";
import { AddShowsDialog } from "./ShowsPage";
import {
  adminTheatreQuery,
  useAdminBookingsQuery,
  useAdminCitiesQuery,
  useAdminMoviesQuery,
  useAdminShowsQuery,
  useAdminStatsQuery,
  useAdminTheatresQuery,
} from "../lib/queries";
import { getApiErrorMessage } from "../lib/api-error";
import { languageOptions, showSlotOptions } from "../types/enums";
import type { ShowResponse } from "../types";
import type { AdminBookingStatus } from "../services/bookings";

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const timeLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
};
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};
const bookedAtLabel = (value: string) => {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!parts) return value;
  const date = new Date(
    Date.UTC(
      Number(parts[1]),
      Number(parts[2]) - 1,
      Number(parts[3]),
      Number(parts[4]),
      Number(parts[5]),
    ),
  );
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
};
const labelFor = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const dateFromDay = (value: string) => new Date(`${value}T00:00:00Z`);
const chartDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    dateFromDay(value),
  );
const fullChartDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateFromDay(value));
const statusStyle: Record<
  AdminBookingStatus,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  CONFIRMED: { label: "Confirmed", tone: "success" },
  PAYMENT_STARTED: { label: "Payment pending", tone: "warning" },
  CREATED: { label: "Created", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  FAILED: { label: "Failed", tone: "danger" },
};
function errorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}

function StatCard({
  title,
  value,
  caption,
  loading,
  link,
}: {
  title: string;
  value: string;
  caption?: string;
  loading: boolean;
  link?: string;
}) {
  const content = (
    <Card className="h-full">
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm text-text-secondary">{title}</p>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-28" />
        ) : (
          <p className="mt-2 text-xl font-bold tabular-nums text-text-primary sm:text-2xl">
            {value}
          </p>
        )}
        {caption && <p className="mt-1 text-xs text-text-muted">{caption}</p>}
      </CardContent>
    </Card>
  );
  return link ? (
    <Link
      to={link as "/admin/bookings"}
      search={{ status: "PAYMENT_STARTED", page: 0, size: 20 }}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: { revenue: number; bookings: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length || !payload[0]?.payload || !label) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-subtle bg-surface p-3 shadow-movie">
      <p className="text-sm font-semibold text-text-primary">{fullChartDate(label)}</p>
      <p className="mt-1 text-sm text-text-secondary">Revenue: {money(point.revenue)}</p>
      <p className="text-sm text-text-secondary">Bookings: {point.bookings}</p>
    </div>
  );
}

function RevenueChart({
  daily,
  loading,
  error,
  onRetry,
}: {
  daily: { date: string; revenue: number; bookings: number }[];
  loading: boolean;
  error?: string | undefined;
  onRetry: () => void;
}) {
  if (error)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by day</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            className="rounded-md border border-subtle bg-page-muted p-4 text-sm text-text-secondary"
          >
            {error}
            <Button variant="outline" size="sm" className="ml-3" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by day</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : daily.every((item) => item.revenue === 0) ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-text-muted">
            No sales in this period
          </div>
        ) : (
          <div className="h-[280px] w-full" role="img" aria-label="Revenue by day bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border-subtle)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={chartDate}
                  tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tickFormatter={compactMoney}
                  tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="var(--color-accent)"
                  stroke="var(--color-accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const moviesQuery = useAdminMoviesQuery();
  const showsQuery = useAdminShowsQuery();
  const theatresQuery = useAdminTheatresQuery();
  const citiesQuery = useAdminCitiesQuery();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const statsQuery = useAdminStatsQuery(days);
  const recentQuery = useAdminBookingsQuery({ page: 0, size: 5 });
  const navigate = useNavigate();
  const movies = moviesQuery.data ?? [];
  const shows = useMemo(() => showsQuery.data ?? [], [showsQuery.data]);
  const theatres = theatresQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const screenQueries = useQueries({
    queries: theatres.map((theatre) => adminTheatreQuery(theatre.id)),
  });
  const today = localDate(new Date());
  const upcoming = useMemo(() => {
    const now = Date.now();
    return shows
      .filter((show) => new Date(show.startTime).getTime() >= now && show.status !== "CANCELLED")
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [shows]);
  const listErrors = [
    moviesQuery.error,
    showsQuery.error,
    theatresQuery.error,
    citiesQuery.error,
  ].filter(Boolean);
  const screenQueryError = screenQueries.find((query) => query.error)?.error;
  const setup = [
    cities.length > 0,
    theatres.length > 0,
    screenQueries.some((query) => (query.data?.screens.length ?? 0) > 0),
    movies.length > 0,
    shows.length > 0,
  ];
  const [movieDialog, setMovieDialog] = useState(false);
  const [showsDialog, setShowsDialog] = useState(false);
  const [theatreDialog, setTheatreDialog] = useState(false);
  const [cityDialog, setCityDialog] = useState(false);
  const stats = statsQuery.data;
  const daily = stats?.daily ?? [];
  const maximumMovieRevenue = Math.max(
    ...(stats?.topMovies ?? []).map((movie) => movie.revenue),
    0,
  );

  useEffect(() => {
    const errors = [statsQuery.error, recentQuery.error].filter(Boolean);
    if (!errors.length) return;
    const forbidden = errors.find((error) => errorStatus(error) === 403);
    if (forbidden) {
      toast.error(getApiErrorMessage(forbidden));
      void navigate({ to: "/", replace: true });
      return;
    }
    errors.forEach((error) => toast.error(getApiErrorMessage(error)));
  }, [statsQuery.error, recentQuery.error, navigate]);

  const upcomingColumns: Column<ShowResponse>[] = [
    { id: "movieName", header: "Movie", accessor: (show) => show.movieName },
    {
      id: "venue",
      header: "Theatre / Screen",
      accessor: (show) => `${show.theatreName} / ${show.screenName}`,
    },
    {
      id: "startTime",
      header: "Date & time",
      accessor: (show) => show.startTime,
      render: (show) => (
        <span className="whitespace-nowrap">
          {dateLabel(show.startTime)} · {timeLabel(show.startTime)}
        </span>
      ),
    },
    {
      id: "showSlot",
      header: "Slot",
      accessor: (show) => labelFor(showSlotOptions, show.showSlot),
    },
  ];
  const allComplete = setup.every(Boolean);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A live overview of your catalogue and schedule." />
      {listErrors.length > 0 && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-subtle bg-page-muted p-4 text-sm text-text-secondary"
        >
          <p>
            Some dashboard data could not be loaded:{" "}
            {[moviesQuery.error, showsQuery.error, theatresQuery.error, citiesQuery.error]
              .filter(Boolean)
              .map((error) => getApiErrorMessage(error))
              .join("; ")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void Promise.all([
                moviesQuery.refetch(),
                showsQuery.refetch(),
                theatresQuery.refetch(),
                citiesQuery.refetch(),
              ]);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary">Performance</h2>
        <div
          role="group"
          aria-label="Revenue date range"
          className="inline-flex rounded-lg border border-subtle bg-surface p-1"
        >
          {([7, 30, 90] as const).map((range) => (
            <Button
              key={range}
              size="sm"
              variant={days === range ? "secondary" : "ghost"}
              aria-pressed={days === range}
              className={
                days === range
                  ? "bg-nav-active text-nav-active-text hover:bg-nav-active hover:text-nav-active-text"
                  : "text-text-secondary"
              }
              onClick={() => setDays(range)}
            >
              {range} days
            </Button>
          ))}
        </div>
      </div>
      <section
        aria-label="Admin revenue statistics"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatCard
          title="Revenue"
          value={stats ? money(stats.revenue) : "—"}
          caption={`Last ${days} days`}
          loading={statsQuery.isPending}
        />
        <StatCard
          title="Today's revenue"
          value={stats ? money(stats.revenueToday) : "—"}
          loading={statsQuery.isPending}
        />
        <StatCard
          title="Tickets sold"
          value={stats ? new Intl.NumberFormat("en-IN").format(stats.ticketsSold) : "—"}
          loading={statsQuery.isPending}
        />
        <StatCard
          title="Confirmed bookings"
          value={stats ? new Intl.NumberFormat("en-IN").format(stats.confirmedBookings) : "—"}
          loading={statsQuery.isPending}
        />
        <StatCard
          title="Pending payments"
          value={stats ? new Intl.NumberFormat("en-IN").format(stats.pendingPayments) : "—"}
          loading={statsQuery.isPending}
          link="/admin/bookings"
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <RevenueChart
          daily={daily}
          loading={statsQuery.isPending}
          error={statsQuery.error ? getApiErrorMessage(statsQuery.error) : undefined}
          onRetry={() => void statsQuery.refetch()}
        />
        <Card>
          <CardHeader>
            <CardTitle>Top movies</CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isPending ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : statsQuery.error ? (
              <div role="alert" className="text-sm text-text-secondary">
                Could not load top movies.
                <Button variant="link" onClick={() => void statsQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : !stats?.topMovies.length ? (
              <p className="py-10 text-center text-sm text-text-muted">
                No movie revenue in this period
              </p>
            ) : (
              <ol className="space-y-4">
                {stats.topMovies.slice(0, 5).map((movie, index) => (
                  <li key={`${movie.movieName}-${movie.language}`} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-page-muted text-xs font-semibold text-text-secondary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {movie.movieName}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-page-muted px-2 py-0.5 text-xs text-text-secondary">
                            {labelFor(languageOptions, movie.language)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {money(movie.revenue)}
                          </p>
                          <p className="text-xs text-text-muted">{movie.bookings} bookings</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-page-muted">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{
                            width: `${maximumMovieRevenue > 0 ? Math.max(2, (movie.revenue / maximumMovieRevenue) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
      <Card className="mt-5">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Recent bookings</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/bookings" search={{ page: 0, size: 20 }}>
              View all
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : recentQuery.error ? (
            <div
              role="alert"
              className="rounded-md border border-subtle bg-page-muted p-4 text-sm text-text-secondary"
            >
              {getApiErrorMessage(recentQuery.error)}
              <Button
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => void recentQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : !recentQuery.data?.items.length ? (
            <p className="py-8 text-center text-sm text-text-muted">No recent bookings</p>
          ) : (
            <ul className="divide-y divide-subtle">
              {recentQuery.data.items.map((booking) => (
                <li
                  key={booking.bookingId}
                  className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {booking.movieName}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {booking.userName ?? booking.userEmail.split("@")[0]} · {booking.userEmail}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <span className="whitespace-nowrap text-sm font-semibold">
                      {money(booking.totalAmount)}
                    </span>
                    <StatusBadge tone={statusStyle[booking.status].tone}>
                      {statusStyle[booking.status].label}
                    </StatusBadge>
                  </div>
                  <time className="text-xs text-text-muted sm:text-right">
                    {bookedAtLabel(booking.bookedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Upcoming shows</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/shows">All shows</Link>
            </Button>
          </div>
          <DataTable
            rows={upcoming.slice(0, 8)}
            columns={upcomingColumns}
            rowKey={(show) => show.showId}
            loading={showsQuery.isLoading}
            error={showsQuery.error ? getApiErrorMessage(showsQuery.error) : undefined}
            onRetry={() => void showsQuery.refetch()}
            emptyTitle="No upcoming shows"
            searchColumns={upcomingColumns}
          />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Button className="w-full justify-start" onClick={() => setMovieDialog(true)}>
              <Plus className="size-4" />
              Add movie
            </Button>
            <Button className="w-full justify-start" onClick={() => setShowsDialog(true)}>
              <Plus className="size-4" />
              Add shows
            </Button>
            <Button className="w-full justify-start" onClick={() => setTheatreDialog(true)}>
              <Plus className="size-4" />
              Add theatre
            </Button>
            <Button className="w-full justify-start" onClick={() => setCityDialog(true)}>
              <Plus className="size-4" />
              Add city
            </Button>
          </CardContent>
        </Card>
      </section>

      {!allComplete && (
        <Card className="mt-7">
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Add a city", to: "/admin/cities", done: setup[0] },
                { label: "Add a theatre", to: "/admin/theatres", done: setup[1] },
                { label: "Add a screen", to: "/admin/theatres", done: setup[2] },
                { label: "Add a movie", to: "/admin/movies", done: setup[3] },
                { label: "Add shows", to: "/admin/shows", done: setup[4] },
              ].map((step, index) => (
                <li key={step.label}>
                  <Link
                    to={step.to}
                    className="flex min-h-14 items-center gap-3 rounded-md border border-subtle p-3 text-sm text-text-primary hover:bg-page-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${step.done ? "border-success bg-success/10 text-success" : "border-subtle text-text-muted"}`}
                    >
                      {step.done ? <Check className="size-4" /> : index + 1}
                    </span>
                    <span>{step.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
            {screenQueryError && (
              <p role="status" className="mt-3 text-sm text-text-secondary">
                Screen setup status could not be checked: {getApiErrorMessage(screenQueryError)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <MovieFormDialog open={movieDialog} onOpenChange={setMovieDialog} movie={null} />
      <AddShowsDialog
        open={showsDialog}
        onOpenChange={setShowsDialog}
        movies={movies}
        theatres={theatres}
        shows={shows}
      />
      <TheatreFormDialog
        open={theatreDialog}
        onOpenChange={setTheatreDialog}
        cities={cities}
        citiesLoading={citiesQuery.isLoading}
      />
      <CityFormDialog open={cityDialog} onOpenChange={setCityDialog} cities={cities} />
    </>
  );
}
