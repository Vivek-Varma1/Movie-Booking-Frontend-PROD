export const adminKeys = {
  all: ["admin"] as const,
  movies: () => ["admin", "movies"] as const,
  shows: () => ["admin", "shows"] as const,
  theatres: () => ["admin", "theatres"] as const,
  theatre: (id: number) => ["admin", "theatres", id] as const,
  theatreScreens: (id: number) => ["admin", "theatres", id, "screens"] as const,
  cities: () => ["admin", "cities"] as const,
  users: () => ["admin", "users"] as const,
  bookings: (params: import("../services/bookings").AdminBookingsParams) =>
    ["admin", "bookings", params] as const,
  stats: (days: number) => ["admin", "stats", days] as const,
};
