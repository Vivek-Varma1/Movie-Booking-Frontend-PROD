import { appConfig } from "@/theme/theme";
import { http } from "@/services/http";

export type AdminBookingStatus =
  "CREATED" | "PAYMENT_STARTED" | "CONFIRMED" | "FAILED" | "CANCELLED" | "EXPIRED";

export interface AdminBooking {
  bookingId: string | number;
  status: AdminBookingStatus;
  totalAmount: number;
  bookedAt: string;
  userId: string | number;
  userName: string | null;
  userEmail: string;
  userPhone: string | null;
  movieName: string;
  theatreName: string;
  screenName: string;
  showStartTime: string;
  seats: string[];
  ticketNumber: string | null;
}

export interface AdminBookingsParams {
  status?: AdminBookingStatus;
  q?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

export interface AdminBookingsPage {
  items: AdminBooking[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

const statuses: AdminBookingStatus[] = [
  "CONFIRMED",
  "PAYMENT_STARTED",
  "CREATED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
];
const movies: [string, string][] = [
  ["The Last Horizon", "English"],
  ["Godavari Express", "Telugu"],
  ["Moonlit Road", "Hindi"],
  ["Pushpa Returns", "Telugu"],
  ["City of Echoes", "Tamil"],
  ["A Summer Promise", "Malayalam"],
];
const theatres = ["PVR Inorbit", "AMB Cinemas", "Sarada Cinemas", "Asian CineSquare"];
const pad = (value: number) => String(value).padStart(2, "0");
const dateTime = (date: Date, hour: number, minute: number) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}:00`;
const localDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const makeMockBookings = (): AdminBooking[] => {
  const now = new Date();
  return Array.from({ length: 40 }, (_, index) => {
    const booked = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (index % 30),
      8 + (index % 12),
      (index * 7) % 60,
    );
    const show = new Date(
      booked.getFullYear(),
      booked.getMonth(),
      booked.getDate() + (index % 18),
      10 + (index % 11),
      (index * 5) % 60,
    );
    const [movieName] = movies[index % movies.length]!;
    const status = statuses[index % statuses.length]!;
    return {
      bookingId: 1201 + index,
      status,
      totalAmount: [300, 450, 650, 900, 1200][index % 5]!,
      bookedAt: dateTime(booked, booked.getHours(), booked.getMinutes()),
      userId: 501 + (index % 17),
      userName:
        index % 7 === 0
          ? null
          : (["Ananya Rao", "Rahul Mehta", "Priya Nair", "Arjun Reddy"][index % 4] ?? null),
      userEmail: [
        "ananya.rao@example.com",
        "rahul.mehta@example.com",
        "priya.nair@example.com",
        "arjun.reddy@example.com",
      ][index % 4]!,
      userPhone: index % 5 === 0 ? null : `+91 98${pad(10 + index)} 45${pad(20 + index)}`,
      movieName,
      theatreName: theatres[index % theatres.length]!,
      screenName: `Screen ${(index % 5) + 1}`,
      showStartTime: dateTime(show, show.getHours(), show.getMinutes()),
      seats: index % 4 === 0 ? ["G8", "G9", "G10", "G11"] : index % 3 === 0 ? ["C5", "C6"] : ["F7"],
      ticketNumber:
        status === "CONFIRMED"
          ? `TKT-${localDate(booked).replaceAll("-", "")}-${String(50100000 + index).slice(-8)}`
          : null,
    } satisfies AdminBooking;
  }).sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
};
const mockBookings = makeMockBookings();
const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 180));

export async function getAdminBookings(params: AdminBookingsParams): Promise<AdminBookingsPage> {
  if (!appConfig.useMock) {
    return (await http.get<AdminBookingsPage>("/admin/bookings", { params })).data;
  }
  const query = params.q?.trim().toLowerCase() ?? "";
  const filtered = mockBookings.filter((booking) => {
    if (params.status && booking.status !== params.status) return false;
    if (params.from && booking.bookedAt.slice(0, 10) < params.from) return false;
    if (params.to && booking.bookedAt.slice(0, 10) > params.to) return false;
    if (
      query &&
      ![
        booking.userEmail,
        booking.userName ?? "",
        booking.movieName,
        String(booking.bookingId),
        booking.ticketNumber ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    )
      return false;
    return true;
  });
  const start = params.page * params.size;
  return wait({
    items: filtered.slice(start, start + params.size),
    page: params.page,
    size: params.size,
    totalItems: filtered.length,
    totalPages: Math.ceil(filtered.length / params.size),
  });
}
