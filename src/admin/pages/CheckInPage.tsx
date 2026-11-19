import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AlertCircle, Camera, CheckCircle2, Clock3, QrCode, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TicketVerifyCard,
  type TicketVerificationView,
} from "@/components/tickets/TicketVerifyCard";
import { extractTicketNumber } from "@/lib/tickets";
import { isTicketNotFound } from "@/services/bookings";
import { verifyTicket, type TicketVerification } from "@/services/tickets";
import { getErrorMessage } from "@/services/payments";
import { PageHeader } from "../components/PageHeader";

type RecentResult = "Checked in" | "Already used" | "Rejected";
interface RecentEntry {
  ticketNumber: string;
  movieName: string;
  time: string;
  result: RecentResult;
}
const scannerElementId = "ticket-check-in-scanner";

export default function CheckInPage() {
  const [cameraRequested, setCameraRequested] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [result, setResult] = useState<TicketVerificationView | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const lastScannedRef = useRef(new Map<string, number>());
  const cameraWasUsedRef = useRef(false);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Camera may already have stopped after a decode or page blur.
    }
  }, []);

  const addRecent = useCallback((entry: RecentEntry) => {
    setRecent((current) =>
      [entry, ...current.filter((item) => item.ticketNumber !== entry.ticketNumber)].slice(0, 10),
    );
  }, []);

  const lookup = useCallback(
    async (ticketNumber: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setCameraRequested(false);
      void stopScanner();
      setLoading(true);
      setLookupError("");
      setInputError("");
      setResult(null);
      try {
        const verified = await verifyTicket(ticketNumber);
        if (!mountedRef.current) return;
        setResult(verified);
        if (verified.status === "USED")
          addRecent({
            ticketNumber,
            movieName: verified.movieName,
            time: new Date().toISOString(),
            result: "Already used",
          });
        else if (verified.status !== "VALID")
          addRecent({
            ticketNumber,
            movieName: verified.movieName,
            time: new Date().toISOString(),
            result: "Rejected",
          });
      } catch (error) {
        if (!mountedRef.current) return;
        if (isTicketNotFound(error)) {
          setResult({ ticketNumber, status: "NOT_FOUND" });
          addRecent({
            ticketNumber,
            movieName: "Unknown ticket",
            time: new Date().toISOString(),
            result: "Rejected",
          });
        } else setLookupError(getErrorMessage(error));
      } finally {
        busyRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    [addRecent, stopScanner],
  );

  const acceptScannedText = useCallback(
    async (text: string) => {
      if (busyRef.current) return;
      const ticketNumber = extractTicketNumber(text);
      if (!ticketNumber) {
        setInputError("That QR code isn't a Cineverse ticket");
        return;
      }
      const now = Date.now();
      const previous = lastScannedRef.current.get(ticketNumber) ?? 0;
      if (now - previous < 3000) return;
      lastScannedRef.current.set(ticketNumber, now);
      cameraWasUsedRef.current = true;
      await stopScanner();
      setCameraRequested(false);
      setInput(ticketNumber);
      await lookup(ticketNumber);
    },
    [lookup, stopScanner],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!cameraRequested) return;
    let active = true;
    const scanner = new Html5Qrcode(scannerElementId, { verbose: false });
    scannerRef.current = scanner;
    setCameraError("");
    void scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height, 300);
            return { width: size, height: size };
          },
          aspectRatio: 1,
        },
        (decodedText) => {
          void acceptScannedText(decodedText);
        },
        () => undefined,
      )
      .then(() => {
        if (!active) {
          void scanner
            .stop()
            .catch(() => undefined)
            .finally(() => scanner.clear());
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        scannerRef.current = null;
        setCameraRequested(false);
        setCameraError("Camera needs HTTPS and permission. Enter the ticket number instead.");
        void scanner
          .stop()
          .catch(() => undefined)
          .finally(() => scanner.clear());
        if (error instanceof Error) console.warn("Ticket camera could not start", error.message);
      });
    return () => {
      active = false;
      void stopScanner();
    };
  }, [acceptScannedText, cameraRequested, stopScanner]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) setCameraRequested(false);
    };
    const stopWhenBlurred = () => setCameraRequested(false);
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("blur", stopWhenBlurred);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("blur", stopWhenBlurred);
      mountedRef.current = false;
      void stopScanner();
    };
  }, [stopScanner]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    const ticketNumber = extractTicketNumber(input);
    if (!ticketNumber) {
      setInputError("That doesn't look like a ticket number");
      return;
    }
    cameraWasUsedRef.current = false;
    void lookup(ticketNumber);
  };

  const onCheckedIn = (updated: TicketVerification) => {
    setResult(updated);
    addRecent({
      ticketNumber: updated.ticketNumber,
      movieName: updated.movieName,
      time: updated.usedAt ?? new Date().toISOString(),
      result: "Checked in",
    });
  };

  const scanNext = () => {
    setResult(null);
    setLookupError("");
    setInputError("");
    setInput("");
    lastScannedRef.current.clear();
    if (cameraWasUsedRef.current) {
      cameraWasUsedRef.current = false;
      setCameraRequested(true);
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="Ticket check-in" subtitle="Scan or enter a ticket to admit guests" />
      <div className="grid gap-4 md:grid-cols-2">
        <section
          className="rounded-card border border-subtle bg-surface p-5 sm:p-6"
          aria-labelledby="scan-heading"
        >
          <h2 id="scan-heading" className="text-lg font-bold text-text-primary">
            Scan with camera
          </h2>
          {!cameraRequested ? (
            <Button
              className="mt-4 w-full"
              disabled={loading || !!result}
              onClick={() => {
                setInputError("");
                cameraWasUsedRef.current = true;
                setCameraRequested(true);
              }}
            >
              <Camera className="size-4" />
              Start camera
            </Button>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-xl border border-subtle bg-page-muted p-2">
                <div
                  id={scannerElementId}
                  className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-lg"
                  aria-label="Live ticket QR scanner"
                />
              </div>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => setCameraRequested(false)}
              >
                Stop camera
              </Button>
            </>
          )}
          {cameraError && (
            <p className="mt-3 text-sm text-text-muted" role="status">
              {cameraError}
            </p>
          )}
          {inputError === "That QR code isn't a Cineverse ticket" && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" />
              {inputError}
            </p>
          )}
        </section>
        <section
          className="rounded-card border border-subtle bg-surface p-5 sm:p-6"
          aria-labelledby="manual-heading"
        >
          <h2 id="manual-heading" className="text-lg font-bold text-text-primary">
            Enter ticket number
          </h2>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label htmlFor="ticket-number" className="sr-only">
              Ticket number or scanned link
            </label>
            <Input
              ref={inputRef}
              id="ticket-number"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setInputError("");
              }}
              placeholder="TKT-20261118-AB12CD34, or paste the scanned link"
              autoComplete="off"
              aria-invalid={!!inputError && inputError !== "That QR code isn't a Cineverse ticket"}
              aria-describedby={
                inputError && inputError !== "That QR code isn't a Cineverse ticket"
                  ? "ticket-number-error"
                  : undefined
              }
            />
            {inputError && inputError !== "That QR code isn't a Cineverse ticket" && (
              <p id="ticket-number-error" role="alert" className="text-sm text-danger">
                {inputError}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <RotateCcw className="size-4 animate-spin" />
              ) : (
                <QrCode className="size-4" />
              )}
              Look up
            </Button>
          </form>
        </section>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-text-muted">
        <Clock3 className="size-4 shrink-0" />
        Check-in opens 2 hours before the show. Each ticket can be used once.
      </p>

      <section className="mt-6" aria-live="polite">
        {loading && (
          <div
            className="animate-pulse rounded-card border border-subtle bg-surface p-6"
            role="status"
            aria-label="Looking up ticket"
          >
            <div className="h-16 rounded-lg bg-page-muted" />
            <div className="mt-5 h-5 w-2/3 rounded bg-page-muted" />
            <div className="mt-3 h-4 w-1/2 rounded bg-page-muted" />
          </div>
        )}
        {!loading && lookupError && (
          <div className="rounded-card border border-danger/20 bg-surface p-5" role="alert">
            <p className="font-semibold text-danger">Could not load this ticket</p>
            <p className="mt-1 text-sm text-text-secondary">{lookupError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                const number = extractTicketNumber(input);
                if (number) void lookup(number);
              }}
            >
              <RotateCcw className="size-4" />
              Try again
            </Button>
            <Button className="ml-2" onClick={scanNext}>
              <QrCode className="size-4" />
              Scan next ticket
            </Button>
          </div>
        )}
        {!loading && result && (
          <div className="space-y-4">
            <TicketVerifyCard
              result={result}
              showCheckIn
              onCheckedIn={onCheckedIn}
              onScanNext={scanNext}
            />
            {((result.status === "USED" &&
              (result.usedAt ||
                recent.some(
                  (item) =>
                    item.ticketNumber === result.ticketNumber && item.result === "Checked in",
                ))) ||
              result.status === "EXPIRED" ||
              result.status === "INVALID" ||
              result.status === "NOT_FOUND") && (
              <Button className="w-full sm:w-auto" onClick={scanNext}>
                <QrCode className="size-4" />
                Scan next ticket
              </Button>
            )}
          </div>
        )}
      </section>

      <section
        className="mt-8 rounded-card border border-subtle bg-surface p-5 sm:p-6"
        aria-labelledby="recent-heading"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-heading" className="text-lg font-bold text-text-primary">
            Recent check-ins
          </h2>
          {recent.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setRecent([])}>
              <Trash2 className="size-4" />
              Clear
            </Button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">
            <CheckCircle2 className="mx-auto mb-2 size-6" />
            No check-ins in this session yet.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-subtle">
            {recent.map((item) => (
              <li
                key={item.ticketNumber}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {item.movieName}
                  </p>
                  <p className="font-mono text-xs text-text-muted">
                    {item.ticketNumber} ·{" "}
                    {new Intl.DateTimeFormat("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(item.time))}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.result === "Checked in" ? "bg-success/10 text-success" : item.result === "Already used" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}
                >
                  {item.result}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
