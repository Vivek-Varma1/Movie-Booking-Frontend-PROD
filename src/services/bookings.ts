import { appConfig } from "@/theme/theme";
import { http } from "./http";

export interface BookingSeat { showSeatId: number; seatLabel: string; price: number }
export type BookingStatus = "CREATED" | "PAYMENT_STARTED" | "CONFIRMED" | "FAILED" | "CANCELLED" | "EXPIRED";
export interface Booking { bookingId: string | number; userId?: string | number; showId: string | number; movieName: string; theatreName: string; screenName: string; bookingStatus: BookingStatus; totalAmount: number; bookedAt: string; lockedUntil?: string | number; seats: BookingSeat[]; showStartTime?: string; posterUrl?: string }
export interface BookingResponse extends Booking { userId: string | number }
export interface Ticket { ticketId: string | number; ticketNumber: string; movieName: string; theatreName: string; screenName: string; startDateTime: string; seats: string[]; issuedAt: string }
interface TicketApiResponse { ticketId?: string | number; id?: string | number; ticketNumber: string; movie: string; theatre: string; screen: string; showTime: string; seats: string[]; issuedAt: string; qrCode: string }
const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 180));
const bookings = new Map<string, Booking>();
let sequence = 1;
const sampleBookings: BookingResponse[] = [
  { bookingId: 1201, userId: "mock-user", showId: "m4_t2_2026-11-25_1830", movieName: "Vizag Nights", theatreName: "PVR Inorbit", screenName: "Screen 2", bookingStatus: "CONFIRMED", totalAmount: 650, bookedAt: "2026-11-10T09:00:00+05:30", seats: [{ showSeatId: 1, seatLabel: "H7", price: 250 }, { showSeatId: 2, seatLabel: "H8", price: 250 }], showStartTime: "2026-11-25T13:00:00Z" },
  { bookingId: 1202, userId: "mock-user", showId: "m2_t1_2026-11-10_1930", movieName: "Godavari Express", theatreName: "AMB Cinemas", screenName: "Screen 1", bookingStatus: "CONFIRMED", totalAmount: 300, bookedAt: "2026-11-02T13:20:00+05:30", seats: [{ showSeatId: 3, seatLabel: "D5", price: 300 }], showStartTime: "2026-11-10T14:00:00Z" },
  { bookingId: 1203, userId: "mock-user", showId: "m3_t3_2026-11-20_2030", movieName: "Pushpa Returns", theatreName: "Sarada Cinemas", screenName: "Screen 4", bookingStatus: "CREATED", totalAmount: 450, bookedAt: "2026-11-18T10:00:00+05:30", seats: [{ showSeatId: 4, seatLabel: "F9", price: 450 }] },
  { bookingId: 1204, userId: "mock-user", showId: "m3_t3_2026-11-20_2030", movieName: "Pushpa Returns", theatreName: "Sarada Cinemas", screenName: "Screen 4", bookingStatus: "PAYMENT_STARTED", totalAmount: 300, bookedAt: "2026-11-17T19:12:00+05:30", seats: [{ showSeatId: 5, seatLabel: "G3", price: 300 }] },
  { bookingId: 1205, userId: "mock-user", showId: "m4_t2_2026-11-16_1530", movieName: "Vizag Nights", theatreName: "PVR Inorbit", screenName: "Screen 2", bookingStatus: "FAILED", totalAmount: 500, bookedAt: "2026-11-16T14:00:00+05:30", seats: [{ showSeatId: 6, seatLabel: "A2", price: 500 }] },
  { bookingId: 1206, userId: "mock-user", showId: "m2_t1_2026-11-15_1100", movieName: "Godavari Express", theatreName: "AMB Cinemas", screenName: "Screen 1", bookingStatus: "CANCELLED", totalAmount: 300, bookedAt: "2026-11-15T09:20:00+05:30", seats: [{ showSeatId: 7, seatLabel: "E6", price: 300 }] },
  { bookingId: 1207, userId: "mock-user", showId: "m3_t3_2026-11-14_1930", movieName: "Pushpa Returns", theatreName: "Sarada Cinemas", screenName: "Screen 4", bookingStatus: "EXPIRED", totalAmount: 450, bookedAt: "2026-11-14T18:30:00+05:30", seats: [{ showSeatId: 8, seatLabel: "C4", price: 450 }] },
];
export function createBooking(showId: string, showSeatIds: number[], details: { movieName?: string; theatreName?: string; screenName?: string; seats: BookingSeat[] }) {
  if (!appConfig.useMock) return http.post<Booking>("/bookings", { showId, showSeatIds }).then((r) => r.data);
  const booking: Booking = { bookingId: sequence++, showId, movieName: details.movieName ?? "Movie", theatreName: details.theatreName ?? "Cinema", screenName: details.screenName ?? "Screen 1", bookingStatus: "PAYMENT_STARTED", totalAmount: details.seats.reduce((sum, seat) => sum + seat.price, 0), bookedAt: new Date().toISOString(), seats: details.seats };
  bookings.set(String(booking.bookingId), booking);
  return delay(booking);
}
export const cancelBooking = (id: string | number) => {
  if (!appConfig.useMock) return http.post(`/bookings/${id}/cancel`).then(() => undefined);
  setMockBookingStatus(String(id), "CANCELLED");
  return delay(undefined);
};
export const getBooking = (id: string | number) => {
  if (!appConfig.useMock) return http.get<Booking>(`/bookings/${id}`).then((r) => r.data);
  const booking = bookings.get(String(id)) ?? sampleBookings.find((item) => String(item.bookingId) === String(id));
  return booking ? delay(booking) : Promise.reject(new Error("Booking not found"));
};
export const getMyBookings = (): Promise<BookingResponse[]> => appConfig.useMock
  ? delay([...new Map([...sampleBookings, ...bookings.values()].map((booking) => [String(booking.bookingId), { ...booking, userId: booking.userId ?? "mock-user" }])).values()])
  : http.get<BookingResponse[]>("/bookings/me").then((response) => response.data);
const mockTicketNumber = (id: string | number) => {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const idPart = String(id).replace(/\D/g, "").slice(-7).padStart(7, "0");
  return `TKT-${date}-${idPart}1`;
};
export const getTicket = (id: string | number): Promise<Ticket> => {
  if (!appConfig.useMock) return http.get<TicketApiResponse>(`/tickets/booking/${id}`).then(({ data }) => {
    const ticketId = data.ticketId ?? data.id ?? data.qrCode.match(/\/tickets\/(\d+)\/qr(?:[/?#]|$)/i)?.[1];
    if (ticketId === undefined) throw new Error("Ticket response did not include a ticket ID");
    return { ticketId, ticketNumber: data.ticketNumber, movieName: data.movie, theatreName: data.theatre, screenName: data.screen, startDateTime: data.showTime, seats: data.seats, issuedAt: data.issuedAt };
  });
  const booking = bookings.get(String(id)) ?? sampleBookings.find((item) => String(item.bookingId) === String(id));
  if (!booking || booking.bookingStatus !== "CONFIRMED") return Promise.reject(Object.assign(new Error("Ticket is not ready"), { response: { status: 404 } }));
  const [, , date, time] = String(booking.showId).split("_");
  const startDateTime = date && time ? new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00+05:30`).toISOString() : new Date().toISOString();
  return delay({ ticketId: booking.bookingId, ticketNumber: mockTicketNumber(booking.bookingId), movieName: booking.movieName, theatreName: booking.theatreName, screenName: booking.screenName, startDateTime, seats: booking.seats.map((seat) => seat.seatLabel), issuedAt: new Date().toISOString() });
};
export const isTicketNotFound = (error: unknown) => !!error && typeof error === "object" && "response" in error && (error as { response?: { status?: number } }).response?.status === 404;
export function setMockBookingStatus(id: string, status: BookingStatus) {
  const booking = bookings.get(id) ?? sampleBookings.find((item) => String(item.bookingId) === id);
  if (booking) bookings.set(id, { ...booking, bookingStatus: status });
}
