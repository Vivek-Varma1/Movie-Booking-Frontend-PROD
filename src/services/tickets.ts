import { appConfig } from "@/theme/theme";
import { http } from "./http";

export type TicketVerificationStatus = "VALID" | "USED" | "EXPIRED" | "INVALID";
export interface TicketVerification {
  ticketNumber: string;
  status: TicketVerificationStatus;
  movieName: string;
  theatreName: string;
  screenName: string;
  showStartTime: string;
  seats: string[];
  usedAt: string | null;
}
const mockQrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/><path d="M10 10h60v60H10zm10 10v40h40V20zM130 10h60v60h-60zm10 10v40h40V20zM10 130h60v60H10zm10 10v40h40v-40zM90 10h20v20H90zm0 40h20v20H90zm40 40h20v20h-20zm30 0h30v20h-30zM90 90h20v30H90zm30 30h20v20h-20zm30 10h20v20h-20zm-60 20h20v20H90zm30 20h20v20h-20zm40 10h30v20h-30z"/></svg>`;
export async function getTicketQr(ticketId: string | number): Promise<Blob> {
  if (appConfig.useMock) return new Blob([mockQrSvg], { type: "image/svg+xml" });
  return (
    await http.get<Blob>(`/tickets/${encodeURIComponent(ticketId)}/qr`, { responseType: "blob" })
  ).data;
}
const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 160));
const checkedInTickets = new Map<string, string>();
const mockTicketPattern = /^TKT-\d{8}-[A-Z0-9]{8}$/i;
function missingTicket() {
  return Object.assign(new Error("Ticket not found"), {
    response: { status: 404, data: { message: "Ticket not found" } },
  });
}
function conflict(message: string) {
  return Object.assign(new Error(message), { response: { status: 409, data: { message } } });
}
function mockTicket(ticketNumber: string): TicketVerification {
  const number = ticketNumber.toUpperCase();
  const statusDigit = number.slice(-1);
  const usedAt =
    checkedInTickets.get(number) ?? (statusDigit === "2" ? "2026-11-15T09:00:00+05:30" : null);
  const status: TicketVerificationStatus =
    checkedInTickets.has(number) || statusDigit === "2"
      ? "USED"
      : statusDigit === "1"
        ? "VALID"
        : statusDigit === "3"
          ? "EXPIRED"
          : "INVALID";
  return {
    ticketNumber: number,
    status,
    movieName: "The Last Horizon",
    theatreName: "PVR Inorbit",
    screenName: "Screen 2",
    showStartTime: "2026-11-25T13:00:00Z",
    seats: ["H7", "H8"],
    usedAt,
  };
}

export async function verifyTicket(ticketNumber: string): Promise<TicketVerification> {
  if (!appConfig.useMock)
    return (
      await http.get<TicketVerification>(`/tickets/verify/${encodeURIComponent(ticketNumber)}`)
    ).data;
  if (
    !mockTicketPattern.test(ticketNumber) ||
    !["1", "2", "3", "4"].includes(ticketNumber.slice(-1))
  )
    throw missingTicket();
  return delay(mockTicket(ticketNumber));
}

export async function checkInTicket(ticketNumber: string): Promise<TicketVerification> {
  if (!appConfig.useMock)
    return (
      await http.post<TicketVerification>(
        `/admin/tickets/${encodeURIComponent(ticketNumber)}/check-in`,
      )
    ).data;
  const current = await verifyTicket(ticketNumber);
  if (current.status === "USED")
    throw conflict(`Ticket already used at ${current.usedAt ?? "an earlier time"}.`);
  if (current.status === "EXPIRED") throw conflict("Check-in opens 120 minutes before the show.");
  if (current.status !== "VALID") throw conflict("This ticket cannot be checked in.");
  const usedAt = new Date().toISOString();
  checkedInTickets.set(ticketNumber.toUpperCase(), usedAt);
  return delay({ ...current, status: "USED", usedAt });
}
