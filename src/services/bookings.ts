import { appConfig } from "@/theme/theme";
import { http } from "./http";

export interface BookingSeat { showSeatId: number; seatLabel: string; price: number }
export interface Booking { bookingId: string | number; showId: string | number; movieName: string; theatreName: string; screenName: string; bookingStatus: string; totalAmount: number; bookedAt: string; lockedUntil?: string | number; seats: BookingSeat[] }
export interface Ticket { ticketNumber: string; movieName: string; theatreName: string; screenName: string; startDateTime: string; seats: string[]; issuedAt: string; qrUrl: string }
interface TicketApiResponse {
  ticketNumber: string;
  movie: string;
  theatre: string;
  screen: string;
  showTime: string;
  seats: string[];
  issuedAt: string;
  qrCode: string;
}
const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 180));
const bookings = new Map<string, Booking>();
let sequence = 1;
export function createBooking(showId: string, showSeatIds: number[], details: { movieName?: string; theatreName?: string; screenName?: string; seats: BookingSeat[] }) {
  if (!appConfig.useMock) return http.post<Booking>("/bookings", { showId, showSeatIds }).then((r) => r.data);
  const booking: Booking = { bookingId: sequence++, showId, movieName: details.movieName ?? "Movie", theatreName: details.theatreName ?? "Cinema", screenName: details.screenName ?? "Screen 1", bookingStatus: "PAYMENT_STARTED", totalAmount: details.seats.reduce((sum, seat) => sum + seat.price, 0), bookedAt: new Date().toISOString(), seats: details.seats };
  bookings.set(String(booking.bookingId), booking);
  return delay(booking);
}
export const cancelBooking = (id: string | number) => appConfig.useMock ? delay(undefined) : http.post(`/bookings/${id}/cancel`).then(() => undefined);
export const getBooking = (id: string | number) => appConfig.useMock ? bookings.has(String(id)) ? delay(bookings.get(String(id))!) : Promise.reject(new Error("Booking not found")) : http.get<Booking>(`/bookings/${id}`).then((r) => r.data);
const placeholderQr = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='white'/%3E%3Cpath fill='%231c1c1c' d='M10 10h60v60H10zm10 10v40h40V20zM130 10h60v60h-60zm10 10v40h40V20zM10 130h60v60H10zm10 10v40h40v-40zM90 10h20v20H90zm0 40h20v20H90zm40 40h20v20h-20zm30 0h30v20h-30zM90 90h20v30H90zm30 30h20v20h-20zm30 10h20v20h-20zm-60 20h20v20H90zm30 20h20v20h-20zm40 10h30v20h-30z'/%3E%3C/svg%3E";
// export const getTicket = (id: string | number): Promise<Ticket> => {
//   if (!appConfig.useMock) return http.get<Ticket>(`/tickets/booking/${id}`).then((r) => r.data);
//   const booking = bookings.get(String(id));
//   if (!booking || booking.bookingStatus !== "CONFIRMED") return Promise.reject(Object.assign(new Error("Ticket is not ready"), { response: { status: 404 } }));
//   const showId = String(booking.showId);
//   const [, , date, time] = showId.split("_");
//   const startDateTime = date && time ? new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00+05:30`).toISOString() : new Date().toISOString();
//   return delay({ ticketNumber: `CV-${booking.bookingId}-001`, movieName: booking.movieName, theatreName: booking.theatreName, screenName: booking.screenName, startDateTime, seats: booking.seats.map((seat) => seat.seatLabel), issuedAt: new Date().toISOString(), qrUrl: placeholderQr });
// };
export const getTicket = (id: string | number): Promise<Ticket> => {
  if (!appConfig.useMock) {
    return http
      .get<TicketApiResponse>(`/tickets/booking/${id}`)
      .then((response) => {
        const data = response.data;

        return {
          ticketNumber: data.ticketNumber,
          movieName: data.movie,
          theatreName: data.theatre,
          screenName: data.screen,
          startDateTime: data.showTime,
          seats: data.seats,
          issuedAt: data.issuedAt,
          qrUrl: data.qrCode,
        };
      });
  }

  // Keep your existing mock implementation below.
  const booking = bookings.get(String(id));

  if (!booking || booking.bookingStatus !== "CONFIRMED") {
    return Promise.reject(
      Object.assign(new Error("Ticket is not ready"), {
        response: { status: 404 },
      })
    );
  }

  const showId = String(booking.showId);
  const [, , date, time] = showId.split("_");

  const startDateTime =
    date && time
      ? new Date(
          `${date}T${time.slice(0, 2)}:${time.slice(2)}:00+05:30`
        ).toISOString()
      : new Date().toISOString();

  return delay({
    ticketNumber: `CV-${booking.bookingId}-001`,
    movieName: booking.movieName,
    theatreName: booking.theatreName,
    screenName: booking.screenName,
    startDateTime,
    seats: booking.seats.map((seat) => seat.seatLabel),
    issuedAt: new Date().toISOString(),
    qrUrl: placeholderQr,
  });
};
export const isTicketNotFound = (error: unknown) => !!error && typeof error === "object" && "response" in error && (error as { response?: { status?: number } }).response?.status === 404;
export function setMockBookingStatus(id: string, status: string) { const booking = bookings.get(id); if (booking) bookings.set(id, { ...booking, bookingStatus: status }); }
