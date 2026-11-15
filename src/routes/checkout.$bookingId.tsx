import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Film, LoaderCircle, MapPin, Pencil, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/AuthContext";
import { getMovie } from "@/services/api";
import { createOrder, getErrorMessage, updateProfile, verifyPayment } from "@/services/payments";
import { cancelBooking, getBooking, type Booking } from "@/services/bookings";
import { getShow, getTheatre, type TheatreInfo } from "@/services/shows";
import { movieQuery, showQuery } from "@/hooks/queries";
import { appConfig } from "@/theme/theme";
import type { Movie } from "@/types";
import type { ShowDetails } from "@/services/show-details";
import { formatCountdown, parseSeatLockDeadline, readSeatLockDeadline, remainingLockSeconds } from "@/lib/seat-lock";

export const Route = createFileRoute("/checkout/$bookingId")({ component: CheckoutPage });
type CheckoutContext = { showId: string; lockedUntil?: unknown; seats: Array<{ label: string; category?: string; price: number }> };
type RazorResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (event: { error?: { description?: string } }) => void) => void } } }
let razorLoader: Promise<void> | undefined;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorLoader) razorLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Payment service could not be loaded."));
    script.onerror = () => { razorLoader = undefined; reject(new Error("Payment service could not be loaded.")); };
    document.head.appendChild(script);
  });
  return razorLoader;
}
function readCheckout(id: string): CheckoutContext | null { try { const raw = sessionStorage.getItem(`checkout:${id}`); if (!raw) return null; const parsed = JSON.parse(raw) as CheckoutContext; if (parsed.lockedUntil === undefined) parsed.lockedUntil = readSeatLockDeadline(sessionStorage.getItem(`seatLock:${parsed.showId}`)); return parsed; } catch { return null; } }
function money(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value); }
function zonedDate(value?: string) { if (!value) return null; const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+05:30`); return Number.isNaN(date.getTime()) ? null : date; }
function clock(date: Date) { return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(date); }
function CheckoutPage() {
  const { bookingId } = Route.useParams();
  const { user, isAuthenticated, isReady, openAuthModal, refreshUser } = useAuth();
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const [booking, setBooking] = useState<Booking | null>(null); const [show, setShow] = useState<ShowDetails | null>(null); const [movie, setMovie] = useState<Movie | null>(null); const [theatre, setTheatre] = useState<TheatreInfo | null>(null);
  const [context, setContext] = useState<CheckoutContext | null>(() => readCheckout(bookingId));
  const [error, setError] = useState(""); const [detailError, setDetailError] = useState(""); const [reload, setReload] = useState(0); const [busy, setBusy] = useState(false); const [confirming, setConfirming] = useState(false); const [confirmError, setConfirmError] = useState(""); const [paymentId, setPaymentId] = useState(""); const [failedPayment, setFailedPayment] = useState(""); const [now, setNow] = useState(Date.now()); const [expired, setExpired] = useState(false); const [expanded, setExpanded] = useState(false); const [editOpen, setEditOpen] = useState(false); const [name, setName] = useState(user?.name ?? ""); const [phone, setPhone] = useState(user?.phoneNumber ?? ""); const [profileError, setProfileError] = useState(""); const [testOpen, setTestOpen] = useState(false);
  const expiredRef = useRef(false); const paymentLock = useRef(false);
  useEffect(() => { if (isReady && !isAuthenticated) openAuthModal({ onSuccess: () => void navigate({ to: "/checkout/$bookingId", params: { bookingId } }) }); }, [isReady, isAuthenticated, openAuthModal, navigate, bookingId]);
  useEffect(() => {
    if (!isAuthenticated) return;
    let live = true;
    void (async () => {
      try {
        setError(""); setDetailError("");
        const saved = readCheckout(bookingId);
        const bookingPromise = getBooking(bookingId).then((data) => { if (live) setBooking(data); return data; });
        const cachedShow = saved?.showId ? queryClient.getQueryData<ShowDetails>(showQuery(saved.showId).queryKey) : undefined;
        const knownShowPromise = saved?.showId ? (cachedShow ? Promise.resolve(cachedShow) : getShow(saved.showId)).then((data) => { if (live) setShow(data); return data; }) : undefined;
        const data = await bookingPromise;
        if (!live) return;
        const provisionalLock = readSeatLockDeadline(sessionStorage.getItem(`seatLock:${data.showId}`));
        const savedDeadline = saved?.lockedUntil;
        const recoveredDeadline = parseSeatLockDeadline(savedDeadline) !== null ? savedDeadline : data.lockedUntil ?? provisionalLock;
        const resolvedContext: CheckoutContext = { ...(saved ?? { showId: String(data.showId), seats: data.seats.map((seat) => ({ label: seat.seatLabel, price: seat.price })) }), ...(recoveredDeadline !== undefined ? { lockedUntil: recoveredDeadline } : {}) };
        setContext(resolvedContext);
        const found = knownShowPromise ? await knownShowPromise : await getShow(String(data.showId)).then((result) => { if (live) setShow(result); return result; });
        if (!live) return;
        if (parseSeatLockDeadline(resolvedContext.lockedUntil) === null) setDetailError("The original seat-lock expiration is missing or invalid. The API must return an ISO-8601 timestamp with a timezone or a Unix timestamp.");
        else setDetailError("");
        const cachedMovie = found.movieId ? queryClient.getQueryData<Movie>(movieQuery(String(found.movieId)).queryKey) : undefined;
        const moviePromise = (found.movieId ? (cachedMovie ? Promise.resolve(cachedMovie) : getMovie(String(found.movieId))) : Promise.resolve(null)).then((value) => { if (live) setMovie(value); return value; });
        const theatrePromise = (found.theatreId ? getTheatre(found.theatreId) : Promise.resolve(null)).then((value) => { if (live) setTheatre(value); return value; });
        const [movieResult, theatreResult] = await Promise.allSettled([moviePromise, theatrePromise]);
        if (!live) return;
        if (movieResult.status === "rejected") setDetailError(getErrorMessage(movieResult.reason));
        if (theatreResult.status === "rejected") setDetailError(getErrorMessage(theatreResult.reason));
      } catch (e) { if (live) { const message = getErrorMessage(e); setError(message); toast.error(message); } }
    })();
    return () => { live = false; };
  }, [isAuthenticated, bookingId, reload, queryClient]);
  const lockedTime = parseSeatLockDeadline(context?.lockedUntil ?? booking?.lockedUntil);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const timeLeft = lockedTime === null ? null : remainingLockSeconds(lockedTime, now);
  const lockExpired = timeLeft === 0 && !!booking && booking.bookingStatus !== "CONFIRMED";
  useEffect(() => {
    if (timeLeft !== 0 || !booking || booking.bookingStatus === "CONFIRMED") return;
    setExpired(true);
    if (booking.bookingStatus !== "PAYMENT_STARTED" || expiredRef.current) return;
    expiredRef.current = true; void cancelBooking(bookingId).catch(() => {});
  }, [timeLeft, booking, bookingId]);
  const clearBookingContext = useCallback(() => { sessionStorage.removeItem(`checkout:${bookingId}`); if (context?.showId) { sessionStorage.removeItem(`pendingBooking:${context.showId}`); sessionStorage.removeItem(`seatLock:${context.showId}`); } }, [bookingId, context]);
  const success = useCallback(() => { clearBookingContext(); void navigate({ to: "/booking/success/$bookingId", params: { bookingId }, replace: true }); }, [clearBookingContext, navigate, bookingId]);
  const confirm = useCallback(async (response: RazorResponse) => {
    setConfirming(true); setConfirmError(""); setPaymentId(response.razorpay_payment_id);
    try { await verifyPayment({ bookingId: String(bookingId), ...response }); success(); }
    catch (e) { const message = getErrorMessage(e); setConfirmError(message); toast.error(message); }
    finally { setConfirming(false); }
  }, [bookingId, success]);
  const pay = useCallback(async () => {
    if (paymentLock.current || !booking || expired) return; paymentLock.current = true; setBusy(true); setFailedPayment("");
    try {
      const order = await createOrder(booking.bookingId);
      if (appConfig.useMock) { setBusy(false); paymentLock.current = false; setTestOpen(true); return; }
      await loadRazorpay();
      const Razorpay = window.Razorpay!;
      const instance = new Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId, name: appConfig.appName, description: `${booking.movieName} · ${context?.seats.map((seat) => seat.label).join(", ") ?? booking.seats.map((seat) => seat.seatLabel).join(", ")}`, prefill: { name: user?.name ?? "", email: user?.email ?? "", ...(user?.phoneNumber ? { contact: user.phoneNumber } : {}) }, theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--color-brand-accent").trim() }, modal: { ondismiss: () => { setBusy(false); paymentLock.current = false; toast("Payment cancelled. You can try again."); } }, handler: (response: RazorResponse) => { paymentLock.current = false; void confirm(response); } });
      instance.on("payment.failed", (event) => { setFailedPayment(event.error?.description || "Payment failed. Please try again."); setBusy(false); paymentLock.current = false; });
      instance.open();
    } catch (e) { setBusy(false); paymentLock.current = false; toast.error(getErrorMessage(e)); }
  }, [booking, context, user, expired, confirm]);
  const retryConfirmation = async () => {
    if (!paymentId || !booking) return;
    try { const latest = await getBooking(bookingId); if (latest.bookingStatus === "CONFIRMED") success(); else setConfirmError("We received your payment but could not confirm the booking. Please contact support."); }
    catch (e) { const message = getErrorMessage(e); setConfirmError(`${message} Contact support.`); toast.error(message); }
  };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setProfileError("");
    if (name.trim().length < 2 || name.trim().length > 50) { setProfileError("Name must be 2 to 50 characters."); return; }
    if (!/^\+?[1-9]\d{9,14}$/.test(phone.trim())) { setProfileError("Enter a valid phone number."); return; }
    setBusy(true); try { await updateProfile({ name: name.trim(), phoneNumber: phone.trim() }); await refreshUser(); await queryClient.invalidateQueries(); setEditOpen(false); }
    catch (e) { const message = getErrorMessage(e); setProfileError(message); toast.error(message); } finally { setBusy(false); }
  };
  if (isReady && !isAuthenticated) return null;
  if (confirming) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page text-center"><LoaderCircle className="size-10 animate-spin text-accent" /><h1 className="text-xl font-semibold">Confirming your payment...</h1><p className="text-sm text-text-secondary">Please keep this page open.</p></div>;
  if (error) return <div className="min-h-screen bg-page"><header className="flex h-header items-center justify-between border-b border-subtle bg-surface px-6"><Link to="/" className="flex items-center gap-2 font-extrabold"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary"><Film className="size-5" /></span>{appConfig.appName}</Link><h1 className="text-lg font-semibold">Review your booking</h1><span className="size-10 rounded-full bg-primary" /></header><div className="bg-notice-bg py-3 text-center text-sm text-text-secondary">{lockedTime === null ? "Checking seat-lock expiration…" : `Complete your booking in ${formatCountdown(Math.max(0, Math.ceil((lockedTime - now) / 1000)))} mins`}</div><main className="mx-auto max-w-xl px-6 py-20 text-center"><h2 className="text-2xl font-bold">Booking unavailable</h2><p role="alert" className="mt-3 text-text-secondary">{error}</p><Button className="mt-6" onClick={() => setReload((value) => value + 1)}>Retry</Button></main></div>;
  if (booking && booking.bookingStatus !== "PAYMENT_STARTED" && !lockExpired) return <main className="mx-auto max-w-xl px-6 py-20 text-center"><div className="rounded-card border border-subtle bg-surface p-8"><h1 className="text-xl font-bold">This booking can't be paid</h1><Button asChild className="mt-6"><Link to="/">Back to home</Link></Button></div></main>;
  const start = zonedDate(show?.startTime), end = zonedDate(show?.endTime); const today = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(new Date());
  const dateText = start ? (new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(start) === today ? `Today, ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(start)}` : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(start)) : "Show time";
  const meta = movie ? [movie.certificate, movie.languages?.[0]].filter(Boolean).join(" | ") : "";
  const seats = context?.seats.length ? context.seats : booking?.seats.map((seat) => ({ label: seat.seatLabel, price: seat.price })) ?? [];
  const total = booking?.totalAmount;
  const countdown = timeLeft === null ? null : formatCountdown(timeLeft);
  return <div className="min-h-screen bg-page pb-28 md:pb-8">
    <header className="flex h-header items-center justify-between border-b border-subtle bg-surface px-6 max-sm:px-4"><Link to="/" aria-label={appConfig.appName} className="flex items-center gap-2 text-xl font-extrabold"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary"><Film className="size-5" /></span><span className="max-sm:hidden">{appConfig.appName}</span></Link><h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Review your booking</h1><span aria-label={user?.name ? `${user.name} account` : "Account"} className="flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-on-primary">{user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}</span></header>
    <div className="flex min-h-12 items-center justify-center gap-1 bg-notice-bg px-4 text-center text-sm text-text-secondary" role="status">{lockExpired || expired ? <><span>Time's up</span><Button variant="link" className="font-semibold text-accent underline" asChild><Link to="/shows/$showId/seats" params={{ showId: context?.showId ?? String(booking?.showId ?? "") }}>Choose seats again</Link></Button></> : lockedTime === null ? <span>{detailError || (booking ? "Seat-lock expiration unavailable" : "Checking seat-lock expiration…")}</span> : <>Complete your booking in <span className="font-semibold text-success">{countdown}</span> mins</>}</div>
    <main className="mx-auto grid max-w-[992px] grid-cols-1 gap-8 px-4 py-8 md:grid-cols-[minmax(0,622fr)_minmax(280px,321fr)] md:gap-12 lg:px-0">
      {detailError && <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger bg-surface p-4 text-sm" role="alert"><p>{detailError}</p><div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>Retry</Button>{lockedTime === null && context?.showId && <Button variant="link" asChild><Link to="/shows/$showId/seats" params={{ showId: context.showId }}>Choose seats again</Link></Button>}</div></div>}
      <section className="overflow-hidden rounded-card border border-subtle bg-surface"><div className="flex items-start justify-between gap-4 p-6"><div className="min-w-0"><h2 className="text-[22px] font-bold">{booking?.movieName ?? <span className="inline-block h-7 w-48 animate-pulse rounded bg-page-muted" />}</h2>{meta ? <p className="mt-1 text-sm text-text-secondary">{meta}</p> : !movie && <span className="mt-2 block h-4 w-28 animate-pulse rounded bg-page-muted" />}<p className="mt-4 font-semibold">{theatre?.name ?? show?.theatreName ?? booking?.theatreName ?? <span className="inline-block h-5 w-40 animate-pulse rounded bg-page-muted" />}</p>{theatre?.address ? <p className="mt-1 flex items-start gap-1 text-sm text-text-muted"><MapPin className="mt-0.5 size-4 shrink-0" />{theatre.address}</p> : !show && <span className="mt-2 block h-4 w-52 animate-pulse rounded bg-page-muted" />}</div>{movie?.posterUrl ? <img className="h-[84px] w-16 shrink-0 rounded-lg object-cover" src={movie.posterUrl} alt={`${booking?.movieName ?? movie.title} poster`} /> : <span className="flex h-[84px] w-16 shrink-0 items-center justify-center rounded-lg bg-page-muted"><Film className="size-6 text-text-muted" /></span>}</div>
      <div className="border-t border-subtle px-6 py-4"><p className="text-sm font-bold">{start ? dateText : <span className="inline-block h-4 w-32 animate-pulse rounded bg-page-muted" />}</p><p className="mt-1 text-sm">{start ? clock(start) : <span className="inline-block h-4 w-36 animate-pulse rounded bg-page-muted" />}{end ? ` - ${clock(end)}` : start ? "" : null}<span className="text-text-muted">{start ? " (approx)" : ""}</span></p></div>
      <div className="border-t border-subtle px-6 py-4"><div className="flex justify-between text-sm font-bold"><span>{booking ? `${seats.length} ${seats.length === 1 ? "ticket" : "tickets"}` : <span className="inline-block h-4 w-16 animate-pulse rounded bg-page-muted" />}</span><span>{total === undefined ? <span className="inline-block h-4 w-20 animate-pulse rounded bg-page-muted" /> : money(total)}</span></div><p className="mt-2 text-sm text-text-muted">{seats.map((seat) => `${seat.category ? `${seat.category}-` : ""}${seat.label}`).join(", ") || <span className="inline-block h-4 w-36 animate-pulse rounded bg-page-muted" />}</p><p className="mt-1 text-xs font-semibold text-text-muted">{(theatre?.name ?? booking?.theatreName)?.toUpperCase() ?? <span className="inline-block h-3 w-32 animate-pulse rounded bg-page-muted" />}</p></div><div className="flex items-center gap-2 bg-card-footer-bg px-6 py-3 text-sm text-text-muted"><X className="size-4" />Cancellation is unavailable</div></section>
      <aside className="space-y-7"><section><h2 className="mb-3 text-lg font-bold">Payment summary</h2><div className="rounded-card border border-subtle bg-surface p-5"><button className="flex w-full items-center justify-between text-sm" aria-expanded={expanded} disabled={!booking} onClick={() => setExpanded((v) => !v)}><span className="flex items-center gap-1">Order amount <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span><span>{total === undefined ? <span className="inline-block h-4 w-20 animate-pulse rounded bg-page-muted" /> : money(total)}</span></button>{expanded && <div className="mt-3 space-y-2 border-t border-subtle pt-3 text-sm text-text-secondary">{seats.map((seat, i) => <div key={`${seat.label}-${i}`} className="flex justify-between"><span>{seat.label}</span><span>{money(seat.price)}</span></div>)}</div>}<div className="my-4 border-t border-subtle" /><div className="flex justify-between text-sm font-bold"><span>To be paid</span><span>{total === undefined ? <span className="inline-block h-4 w-20 animate-pulse rounded bg-page-muted" /> : money(total)}</span></div></div></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Your details</h2><button className="flex items-center gap-1 border-b border-dashed border-text-secondary text-sm text-text-secondary" onClick={() => { setName(user?.name ?? ""); setPhone(user?.phoneNumber ?? ""); setProfileError(""); setEditOpen(true); }}><Pencil className="size-3" />Edit</button></div><div className="flex items-start gap-3 rounded-card border border-subtle bg-surface p-4"><UserRound className="mt-1 size-5 text-text-secondary" /><div className="min-w-0 text-sm"><p className="font-semibold">{user?.name || "Your name"}</p><p className="mt-1 text-text-secondary">{user?.phoneNumber ? (/^\+/.test(user.phoneNumber) ? user.phoneNumber : `+91 ${user.phoneNumber}`) : "Add phone number"}</p><p className="mt-1 truncate text-text-muted">{user?.email}</p></div></div></section>
      {failedPayment && <div role="alert" className="rounded-lg border border-danger bg-surface p-4 text-sm"><p>{failedPayment}</p><Button variant="outline" className="mt-3" disabled={busy} onClick={() => void pay()}>Try again</Button></div>}
      {confirmError && <div role="alert" className="rounded-lg border border-danger bg-surface p-4 text-sm"><p className="font-semibold">We received your payment but could not confirm the booking</p><p className="mt-2 text-text-secondary">Payment ID: {paymentId}</p><p className="mt-2 text-text-secondary">{confirmError}</p><Button variant="outline" className="mt-3" disabled={busy} onClick={() => void retryConfirmation()}>Retry confirmation</Button></div>}
      </aside>
    </main>
    {!lockExpired && !expired && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-subtle bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mx-auto md:max-w-[992px] md:border-0 md:bg-transparent md:px-0 md:pt-0"><Button disabled={!booking || !context || lockedTime === null || timeLeft === 0 || busy || confirming || !!confirmError} className="flex h-[60px] w-full justify-between rounded-xl bg-primary px-5 text-on-primary disabled:opacity-60" onClick={() => void pay()}><span className="text-left"><span className="block font-bold">{total === undefined ? "—" : money(total)}</span><span className="text-[10px] tracking-wider">TOTAL</span></span><span className="flex items-center gap-2 text-lg font-semibold">{busy && <LoaderCircle className="size-5 animate-spin" />}Pay now</span></Button></div>}
    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent className="max-w-md bg-surface"><form onSubmit={(e) => void saveProfile(e)} className="space-y-4"><DialogHeader><DialogTitle className="text-xl">Edit your details</DialogTitle><DialogDescription>Update the name and phone number for your booking.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="profile-name">Name</Label><Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required /></div><div className="space-y-2"><Label htmlFor="profile-phone">Phone number</Label><Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required /></div>{profileError && <p role="alert" className="text-sm text-danger">{profileError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}Save</Button></div></form></DialogContent></Dialog>
    <Dialog open={testOpen} onOpenChange={setTestOpen}><DialogContent className="max-w-sm bg-surface"><DialogHeader><DialogTitle className="text-xl">Test payment</DialogTitle><DialogDescription>Choose a test payment result.</DialogDescription></DialogHeader><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { setTestOpen(false); toast("Payment cancelled. You can try again."); }}>Cancel</Button><Button variant="outline" onClick={() => { setTestOpen(false); setFailedPayment("Test payment failed."); }}>Failure</Button><Button onClick={() => { setTestOpen(false); void confirm({ razorpay_order_id: `test-${bookingId}`, razorpay_payment_id: `test-payment-${Date.now()}`, razorpay_signature: "test-signature" }); }}>Success</Button></div></DialogContent></Dialog>
  </div>;
}
