import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { isAdmin } from "@/admin/lib/auth";
import {
  checkInTicket,
  type TicketVerification,
  type TicketVerificationStatus,
} from "@/services/tickets";
import { getErrorMessage } from "@/services/payments";

export type TicketVerificationView =
  TicketVerification | { ticketNumber: string; status: "NOT_FOUND" };
const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+05:30`);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...options }).format(date);
};
const formatTime = (value: string) =>
  formatDate(value, { hour: "2-digit", minute: "2-digit", hour12: true }).replace(
    /\b(am|pm)\b/i,
    (period) => period.toUpperCase(),
  );
const statusContent: Record<
  TicketVerificationStatus | "NOT_FOUND",
  { title: string; tone: string; icon: typeof CheckCircle2 }
> = {
  VALID: { title: "Valid ticket", tone: "success", icon: CheckCircle2 },
  USED: { title: "Already used", tone: "warning", icon: AlertCircle },
  EXPIRED: { title: "This show has ended", tone: "neutral", icon: Clock3 },
  INVALID: { title: "Not a valid ticket", tone: "danger", icon: XCircle },
  NOT_FOUND: { title: "Ticket not found", tone: "danger", icon: XCircle },
};
const bannerClass: Record<string, string> = {
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  neutral: "border-subtle bg-page-muted text-text-muted",
};

export function TicketVerifyCard({
  result,
  showCheckIn,
  onCheckedIn,
  onScanNext,
}: {
  result: TicketVerificationView;
  showCheckIn: boolean;
  onCheckedIn: (result: TicketVerification) => void;
  onScanNext?: () => void;
}) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [checkedInResult, setCheckedInResult] = useState<TicketVerification | null>(null);
  const displayResult = checkedInResult ?? result;
  const checkedIn = !!checkedInResult;
  const banner = checkedIn
    ? { ...statusContent.USED, title: "Checked in", tone: "success" }
    : statusContent[displayResult.status];
  const Icon = checkedIn ? ShieldCheck : banner.icon;
  const usedTime =
    displayResult.status === "USED" && displayResult.usedAt
      ? formatDate(displayResult.usedAt, { day: "numeric", month: "short" }) +
        `, ${formatTime(displayResult.usedAt)}`
      : "";
  const showTime =
    displayResult.status !== "NOT_FOUND"
      ? `${formatDate(displayResult.showStartTime, { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(displayResult.showStartTime)}`
      : "";
  const onCheckIn = async () => {
    setCheckingIn(true);
    setCheckInError("");
    try {
      const updated = await checkInTicket(displayResult.ticketNumber);
      setCheckedInResult(updated);
      queryClient.setQueryData(["ticketVerification", updated.ticketNumber], updated);
      onCheckedIn(updated);
      toast.success("Ticket checked in");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 403
      )
        toast.error("You don't have permission to check in tickets");
      const message = getErrorMessage(error);
      setCheckInError(message);
    } finally {
      setCheckingIn(false);
    }
  };
  return (
    <article className="w-full max-w-[480px] overflow-hidden rounded-card border border-subtle bg-surface shadow-movie">
      <div
        className={`flex items-center gap-3 border-b p-5 sm:p-6 ${bannerClass[banner.tone]}`}
        role="status"
        aria-live="polite"
      >
        <Icon className="size-8 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{banner.title}</h1>
          {usedTime && (
            <p className="mt-1 text-sm">
              {checkedIn ? `Checked in on ${usedTime}` : `Used on ${usedTime}`}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        {displayResult.status !== "NOT_FOUND" && (
          <>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{displayResult.movieName}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {displayResult.theatreName} · {displayResult.screenName}
              </p>
              <p className="mt-3 text-sm font-semibold text-text-primary">{showTime}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Seats
              </p>
              <div className="flex flex-wrap gap-2">
                {displayResult.seats.map((seat) => (
                  <span
                    key={seat}
                    className="rounded-md border border-subtle bg-page-muted px-3 py-1.5 text-sm font-semibold text-text-primary"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="border-t border-subtle pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Ticket number
          </p>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-text-primary">
            {displayResult.ticketNumber}
          </p>
        </div>
        {showCheckIn && displayResult.status === "VALID" && (
          <>
            {checkInError && (
              <p
                role="alert"
                className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger"
              >
                {checkInError}
              </p>
            )}
            <div
              className={checkInError && onScanNext ? "flex flex-col gap-2 sm:flex-row" : undefined}
            >
              <Button
                className={checkInError && onScanNext ? "w-full flex-1" : "w-full"}
                disabled={checkingIn}
                onClick={() => void onCheckIn()}
              >
                {checkingIn && <LoaderCircle className="size-4 animate-spin" />}Check in ticket
              </Button>
              {checkInError && onScanNext && (
                <Button className="w-full flex-1 sm:w-auto" onClick={onScanNext}>
                  Scan next ticket
                </Button>
              )}
            </div>
          </>
        )}
        {!isAuthenticated && displayResult.status === "VALID" && (
          <button
            type="button"
            className="w-full text-center text-sm text-text-muted underline-offset-4 hover:text-text-secondary hover:underline"
            onClick={() =>
              openAuthModal({
                onSuccess: () =>
                  void navigate({
                    to: "/ticket/verify/$ticketNumber",
                    params: { ticketNumber: result.ticketNumber },
                    replace: true,
                  }),
              })
            }
          >
            Staff? Sign in to check in
          </button>
        )}
      </div>
    </article>
  );
}
