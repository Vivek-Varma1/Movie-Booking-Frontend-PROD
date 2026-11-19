import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Inbox, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { getApiErrorMessage } from "../lib/api-error";
import { useAdminBookingsQuery } from "../lib/queries";
import type { AdminBooking, AdminBookingStatus } from "../services/bookings";
import { Route } from "@/routes/admin.bookings";

const statusOptions: { value: AdminBookingStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAYMENT_STARTED", label: "Payment pending" },
  { value: "CREATED", label: "Created" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
  { value: "FAILED", label: "Failed" },
];
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
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
function wallClockDate(value: string) {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!parts) return null;
  return new Date(
    Date.UTC(
      Number(parts[1]),
      Number(parts[2]) - 1,
      Number(parts[3]),
      Number(parts[4]),
      Number(parts[5]),
      Number(parts[6] ?? 0),
    ),
  );
}
function formatWallTime(value: string) {
  const date = wallClockDate(value);
  if (!date) return value;
  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
  return `${day} · ${time}`;
}
function statusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}
function csvCell(value: string | number | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AdminBookingsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const rootNavigate = useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const params = useMemo(
    () => ({
      ...(search.status ? { status: search.status } : {}),
      ...(search.q ? { q: search.q } : {}),
      ...(search.from ? { from: search.from } : {}),
      ...(search.to ? { to: search.to } : {}),
      page: search.page,
      size: search.size,
    }),
    [search.status, search.q, search.from, search.to, search.page, search.size],
  );
  const bookingsQuery = useAdminBookingsQuery(params);
  const bookings = bookingsQuery.data?.items ?? [];

  useEffect(() => setSearchInput(search.q ?? ""), [search.q]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = searchInput.trim();
      if (q !== (search.q ?? "")) {
        void navigate({
          search: (previous) => {
            const next = { ...previous, page: 0 };
            if (q) next.q = q;
            else delete next.q;
            return next;
          },
        });
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [navigate, search.q, searchInput]);
  useEffect(() => {
    if (!bookingsQuery.error) return;
    toast.error(getApiErrorMessage(bookingsQuery.error));
    if (statusCode(bookingsQuery.error) === 403) void rootNavigate({ to: "/", replace: true });
  }, [bookingsQuery.error, rootNavigate]);

  const updateSearch = (patch: {
    status?: AdminBookingStatus | null;
    from?: string | null;
    to?: string | null;
  }) =>
    void navigate({
      search: (previous) => {
        const next = { ...previous, page: 0 };
        for (const key of ["status", "from", "to"] as const) {
          if (key in patch) {
            const value = patch[key];
            if (value) next[key] = value as never;
            else delete next[key];
          }
        }
        return next;
      },
    });
  const clearFilters = () => {
    setSearchInput("");
    void navigate({ search: () => ({ page: 0, size: search.size }) });
  };
  const hasFilters = !!(search.q || search.status || search.from || search.to);
  const exportCsv = () => {
    const headings = [
      "Booking #",
      "Customer",
      "Email",
      "Movie",
      "Theatre",
      "Screen",
      "Show time",
      "Seats",
      "Amount",
      "Status",
      "Booked at",
      "Ticket number",
    ];
    const lines = bookings.map((booking) =>
      [
        `#${booking.bookingId}`,
        booking.userName ?? booking.userEmail.split("@")[0],
        booking.userEmail,
        booking.movieName,
        booking.theatreName,
        booking.screenName,
        formatWallTime(booking.showStartTime),
        booking.seats.join(" "),
        money(booking.totalAmount),
        statusStyle[booking.status].label,
        formatWallTime(booking.bookedAt),
        booking.ticketNumber ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[headings.map(csvCell).join(","), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bookings-${new Intl.DateTimeFormat("en-CA").format(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<AdminBooking>[] = [
    {
      id: "booking",
      header: "Booking #",
      accessor: (booking) => String(booking.bookingId),
      render: (booking) => <span className="font-mono font-semibold">#{booking.bookingId}</span>,
      sortable: false,
    },
    {
      id: "customer",
      header: "Customer",
      accessor: (booking) =>
        booking.userName ?? booking.userEmail.split("@")[0] ?? booking.userEmail,
      render: (booking) => (
        <div className="min-w-40">
          <p className="font-semibold text-text-primary">
            {booking.userName ?? booking.userEmail.split("@")[0]}
          </p>
          <p className="text-xs text-text-muted">{booking.userEmail}</p>
        </div>
      ),
      sortable: false,
    },
    { id: "movie", header: "Movie", accessor: (booking) => booking.movieName, sortable: false },
    {
      id: "venue",
      header: "Theatre / Screen",
      accessor: (booking) => `${booking.theatreName} / ${booking.screenName}`,
      render: (booking) => (
        <div className="min-w-36">
          <p>{booking.theatreName}</p>
          <p className="text-xs text-text-muted">{booking.screenName}</p>
        </div>
      ),
      sortable: false,
    },
    {
      id: "showTime",
      header: "Show time",
      accessor: (booking) => booking.showStartTime,
      render: (booking) => (
        <span className="whitespace-nowrap">{formatWallTime(booking.showStartTime)}</span>
      ),
      sortable: false,
    },
    {
      id: "seats",
      header: "Seats",
      accessor: (booking) => booking.seats.join(" "),
      render: (booking) => (
        <div className="flex min-w-28 flex-wrap gap-1">
          {booking.seats.slice(0, 3).map((seat) => (
            <span
              key={seat}
              className="rounded-md border border-subtle bg-page-muted px-1.5 py-0.5 text-xs"
            >
              {seat}
            </span>
          ))}
          {booking.seats.length > 3 && (
            <span className="rounded-md bg-page-muted px-1.5 py-0.5 text-xs text-text-secondary">
              +{booking.seats.length - 3}
            </span>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (booking) => booking.totalAmount,
      render: (booking) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">
          {money(booking.totalAmount)}
        </span>
      ),
      sortable: false,
    },
    {
      id: "status",
      header: "Status",
      accessor: (booking) => booking.status,
      render: (booking) => (
        <StatusBadge tone={statusStyle[booking.status].tone}>
          {statusStyle[booking.status].label}
        </StatusBadge>
      ),
      sortable: false,
    },
    {
      id: "bookedAt",
      header: "Booked at",
      accessor: (booking) => booking.bookedAt,
      render: (booking) => (
        <span className="whitespace-nowrap text-sm">{formatWallTime(booking.bookedAt)}</span>
      ),
      sortable: false,
    },
  ];

  return (
    <>
      <PageHeader title="Bookings" subtitle="All customer orders and their payment status" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 space-y-1.5 text-sm text-text-secondary">
          <span>Search bookings</span>
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search email, name, movie, booking # or ticket no."
          />
        </label>
        <label className="space-y-1.5 text-sm text-text-secondary">
          <span>Status</span>
          <select
            value={search.status ?? ""}
            onChange={(event) =>
              updateSearch({
                status: (event.target.value || null) as AdminBookingStatus | null,
              })
            }
            className="h-10 min-w-40 rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary"
          >
            <option value="">All</option>
            {statusOptions.slice(1).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm text-text-secondary">
          <span>From</span>
          <Input
            type="date"
            value={search.from ?? ""}
            onChange={(event) => updateSearch({ from: event.target.value || null })}
            className="w-40"
          />
        </label>
        <label className="space-y-1.5 text-sm text-text-secondary">
          <span>To</span>
          <Input
            type="date"
            value={search.to ?? ""}
            onChange={(event) => updateSearch({ to: event.target.value || null })}
            className="w-40"
          />
        </label>
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        <Button variant="outline" onClick={exportCsv} disabled={!bookings.length}>
          Export CSV
        </Button>
      </div>
      <DataTable
        rows={bookings}
        columns={columns}
        rowKey={(booking) => booking.bookingId}
        hideSearch
        loading={bookingsQuery.isPending}
        error={bookingsQuery.error ? getApiErrorMessage(bookingsQuery.error) : undefined}
        onRetry={() => void bookingsQuery.refetch()}
        emptyTitle="No bookings match these filters"
        emptyIcon={<Inbox className="size-9 text-text-muted" />}
        emptyAction={
          hasFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
        onRowClick={setSelected}
        actions={(booking) => [{ label: "View details", onSelect: () => setSelected(booking) }]}
        serverPagination={{
          page: search.page,
          pageSize: search.size,
          totalItems: bookingsQuery.data?.totalItems ?? 0,
          totalPages: bookingsQuery.data?.totalPages ?? 0,
          onPageChange: (page) => void navigate({ search: (previous) => ({ ...previous, page }) }),
          onPageSizeChange: (size) =>
            void navigate({
              search: (previous) => ({ ...previous, page: 0, size: size as 20 | 50 }),
            }),
        }}
      />
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-subtle bg-surface sm:max-w-xl"
        >
          {selected && (
            <>
              <SheetHeader className="border-b border-subtle pb-5 pr-8 text-left">
                <SheetTitle>Booking #{selected.bookingId}</SheetTitle>
                <SheetDescription>Read-only booking details</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                <StatusBadge tone={statusStyle[selected.status].tone}>
                  {statusStyle[selected.status].label}
                </StatusBadge>
                <section className="space-y-2">
                  <h3 className="font-semibold text-text-primary">Customer</h3>
                  <p className="font-medium">
                    {selected.userName ?? selected.userEmail.split("@")[0]}
                  </p>
                  <a
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                    href={`mailto:${selected.userEmail}`}
                  >
                    <Mail className="size-4" />
                    {selected.userEmail}
                  </a>
                  {selected.userPhone && (
                    <a
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                      href={`tel:${selected.userPhone}`}
                    >
                      <Phone className="size-4" />
                      {selected.userPhone}
                    </a>
                  )}
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-text-primary">Movie and show</h3>
                  <p>{selected.movieName}</p>
                  <p className="text-sm text-text-secondary">
                    {selected.theatreName} · {selected.screenName}
                  </p>
                  <p className="text-sm font-semibold">{formatWallTime(selected.showStartTime)}</p>
                </section>
                <section>
                  <h3 className="mb-2 font-semibold text-text-primary">Seats</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.seats.map((seat) => (
                      <span
                        key={seat}
                        className="rounded-md border border-subtle bg-page-muted px-3 py-1.5 text-sm font-semibold"
                      >
                        {seat}
                      </span>
                    ))}
                  </div>
                </section>
                <dl className="grid grid-cols-2 gap-4 border-t border-subtle pt-5">
                  <div>
                    <dt className="text-xs text-text-muted">Amount</dt>
                    <dd className="mt-1 font-semibold">{money(selected.totalAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Booked at</dt>
                    <dd className="mt-1 text-sm">{formatWallTime(selected.bookedAt)}</dd>
                  </div>
                </dl>
                {selected.ticketNumber && (
                  <section className="space-y-2 border-t border-subtle pt-5">
                    <h3 className="font-semibold text-text-primary">Ticket number</h3>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all font-mono text-sm">
                        {selected.ticketNumber}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Copy ticket number"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(selected.ticketNumber!)
                            .then(() => toast.success("Ticket number copied"))
                            .catch(() => toast.error("Could not copy ticket number"));
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                    <Button variant="link" asChild className="h-auto px-0">
                      <Link
                        to="/ticket/verify/$ticketNumber"
                        params={{ ticketNumber: selected.ticketNumber }}
                      >
                        Open ticket page
                      </Link>
                    </Button>
                  </section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
