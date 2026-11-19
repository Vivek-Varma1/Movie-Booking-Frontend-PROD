import { appConfig } from "@/theme/theme";
import { http } from "@/services/http";

export interface DailyRevenueStat {
  date: string;
  revenue: number;
  bookings: number;
}
export interface TopMovieStat {
  movieName: string;
  language: string;
  revenue: number;
  bookings: number;
}
export interface AdminStats {
  days: number;
  revenue: number;
  revenueToday: number;
  confirmedBookings: number;
  ticketsSold: number;
  pendingPayments: number;
  daily: DailyRevenueStat[];
  topMovies: TopMovieStat[];
}

const pad = (value: number) => String(value).padStart(2, "0");
const localDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const mockStats = (days: number): AdminStats => {
  const daily = Array.from({ length: days }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (days - index - 1));
    const bookings = (index * 7 + 3) % 16;
    return { date: localDate(day), bookings, revenue: bookings * (300 + (index % 4) * 125) };
  });
  const revenue = daily.reduce((total, day) => total + day.revenue, 0);
  const confirmedBookings = daily.reduce((total, day) => total + day.bookings, 0);
  return {
    days,
    revenue,
    revenueToday: daily.at(-1)?.revenue ?? 0,
    confirmedBookings,
    ticketsSold: confirmedBookings + Math.floor(confirmedBookings * 0.42),
    pendingPayments: 8,
    daily,
    topMovies: [
      {
        movieName: "The Last Horizon",
        language: "ENGLISH",
        revenue: revenue * 0.28,
        bookings: Math.ceil(confirmedBookings * 0.25),
      },
      {
        movieName: "Godavari Express",
        language: "TELUGU",
        revenue: revenue * 0.22,
        bookings: Math.ceil(confirmedBookings * 0.2),
      },
      {
        movieName: "Pushpa Returns",
        language: "TELUGU",
        revenue: revenue * 0.18,
        bookings: Math.ceil(confirmedBookings * 0.17),
      },
      {
        movieName: "Moonlit Road",
        language: "HINDI",
        revenue: revenue * 0.13,
        bookings: Math.ceil(confirmedBookings * 0.14),
      },
      {
        movieName: "City of Echoes",
        language: "TAMIL",
        revenue: revenue * 0.09,
        bookings: Math.ceil(confirmedBookings * 0.1),
      },
    ],
  };
};

export async function getAdminStats(days: number): Promise<AdminStats> {
  if (!appConfig.useMock)
    return (await http.get<AdminStats>("/admin/stats", { params: { days } })).data;
  return new Promise((resolve) => setTimeout(() => resolve(mockStats(days)), 180));
}
