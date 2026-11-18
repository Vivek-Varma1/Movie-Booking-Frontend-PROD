import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Film, LoaderCircle } from "lucide-react";
import { TicketCard } from "@/components/booking/TicketCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { getBooking, getTicket, isTicketNotFound, type Booking, type Ticket } from "@/services/bookings";
import { getShow } from "@/services/shows";
import { getMovie } from "@/services/api";
import { getErrorMessage } from "@/services/payments";
import { appConfig } from "@/theme/theme";

export const Route = createFileRoute("/booking/success/$bookingId")({ component: BookingSuccessPage });

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const parsed = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+05:30`);
  return Number.isNaN(parsed.getTime()) ? "Show time unavailable" : new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", ...options }).format(parsed);
}
function formatTime(value: string) { return formatDate(value, { hour: "2-digit", minute: "2-digit", hour12: true }).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase()); }
function money(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value); }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function BookingSuccessPage() {
  const { bookingId } = Route.useParams();
  const { user, isAuthenticated, isReady, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [poster, setPoster] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (isReady && !isAuthenticated) openAuthModal({ onSuccess: () => void navigate({ to: "/booking/success/$bookingId", params: { bookingId }, replace: true }) });
  }, [isReady, isAuthenticated, openAuthModal, navigate, bookingId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setLoading(true); setError(""); setBooking(null); setTicket(null); setPoster("");
    void (async () => {
      try {
        const data = await getBooking(bookingId);
        if (!active) return;
        setBooking(data);
        if (data.bookingStatus !== "CONFIRMED") { setLoading(false); return; }
        try {
          const found = await getTicket(bookingId);
          if (active) setTicket(found);
        } catch (firstError) {
          if (!isTicketNotFound(firstError)) throw firstError;
          let found: Ticket | null = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            await sleep(1000);
            if (!active) return;
            try { found = await getTicket(bookingId); break; }
            catch (retryError) { if (!isTicketNotFound(retryError)) throw retryError; }
          }
          if (active) setTicket(found);
        }
        try {
          const show = await getShow(String(data.showId));
          if (show.movieId) {
            const movie = await getMovie(String(show.movieId));
            if (active) setPoster(movie.posterUrl);
          }
        } catch { /* Poster details are optional; the ticket remains usable without them. */ }
      } catch (cause) { if (active) setError(getErrorMessage(cause)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [isAuthenticated, bookingId, reload]);

  if (isReady && !isAuthenticated) return null;
  const pending = booking?.bookingStatus === "CONFIRMED" && !ticket && !error;
  return <div className="min-h-screen bg-page">
    <header className="flex h-header items-center justify-between border-b border-subtle bg-surface px-6 max-sm:px-4">
      <Link to="/" aria-label={appConfig.appName} className="flex items-center gap-2 text-xl font-extrabold"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary"><Film className="size-5" /></span><span className="max-sm:hidden">{appConfig.appName}</span></Link>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold sm:text-lg">Booking confirmed</h1>
      <span aria-label={user?.name ? `${user.name} account` : "Account"} className="flex size-10 items-center justify-center rounded-full bg-page-muted font-semibold text-text-secondary">{user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}</span>
    </header>
    <main className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
      {booking?.bookingStatus === "CONFIRMED" && <section className="mb-6 flex w-full items-start gap-3 rounded-card border border-success/20 bg-success/5 p-4 sm:p-5" aria-label="Booking confirmed"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><Check className="size-6" strokeWidth={2.5} /></span><div><h2 className="font-bold text-text-primary">Booking confirmed</h2><p className="mt-1 text-sm text-text-secondary">A confirmation email has been sent to {user?.email ?? "your email"}.</p></div></section>}

      {loading && <div className="flex min-h-64 w-full flex-col items-center justify-center gap-3 text-center" role="status"><LoaderCircle className="size-8 animate-spin text-accent" /><p className="text-sm text-text-secondary">{pending ? "Preparing your ticket..." : "Loading your booking..."}</p></div>}
      {!loading && error && <section className="w-full rounded-card border border-subtle bg-surface px-6 py-12 text-center"><h2 className="text-xl font-bold">Ticket unavailable</h2><p role="alert" className="mt-2 text-sm text-text-secondary">{error}</p><Button className="mt-5" onClick={() => setReload((value) => value + 1)}>Try again</Button></section>}
      {!loading && booking && booking.bookingStatus !== "CONFIRMED" && <section className="w-full rounded-card border border-subtle bg-surface px-6 py-12 text-center"><h2 className="text-xl font-bold">Booking {booking.bookingStatus.toLowerCase().replaceAll("_", " ")}</h2><p className="mt-2 text-sm text-text-secondary">Your booking is not confirmed yet.</p><Button asChild className="mt-5"><Link to="/">Back to home</Link></Button></section>}
      {!loading && pending && <section className="w-full rounded-card border border-subtle bg-surface px-6 py-12 text-center"><h2 className="text-lg font-semibold">Your booking is confirmed</h2><p className="mt-2 text-sm text-text-secondary">Your ticket will appear in My bookings shortly.</p><Button asChild variant="outline" className="mt-5"><Link to="/">Back to home</Link></Button></section>}

      {!loading && ticket && booking && <TicketCard booking={booking} ticket={ticket} poster={poster} mode="success" />}
    </main>
  </div>;
}
