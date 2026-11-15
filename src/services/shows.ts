import { appConfig } from "@/theme/theme";
import { http } from "./http";
import type { ShowDetails } from "./show-details";
import { mockTheatres } from "./mock-data";

export interface TheatreInfo { id: string | number; name: string; address?: string; cityName?: string }
const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 180));
export const lockSeats = (showId: string, showSeatIds: number[]) => appConfig.useMock
  ? delay({ lockedSeatIds: showSeatIds, lockedUntil: new Date(Date.now() + 10 * 60_000).toISOString() })
  : http.post<{ lockedSeatIds: number[]; lockedUntil: string | number }>("/shows/lock", { showId, showSeatIds }).then((r) => r.data);
export const getShow = (showId: string) => {
  if (!appConfig.useMock) return http.get<ShowDetails>(`/shows/${showId}`).then((r) => r.data);
  const [movieId, theatreId, date, time] = showId.split("_");
  const theatre = mockTheatres.find((item) => item.id === theatreId);
  const startTime = date && time ? new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00+05:30`).toISOString() : undefined;
  const endTime = startTime ? new Date(new Date(startTime).getTime() + 142 * 60_000).toISOString() : undefined;
  return delay<ShowDetails>({ showId, ...(movieId ? { movieId } : {}), ...(theatreId ? { theatreId } : {}), ...(theatre?.name ? { theatreName: theatre.name } : {}), ...(startTime ? { startTime } : {}), ...(endTime ? { endTime } : {}), screenName: "Screen 1" });
};
export const getTheatre = (id: string | number) => appConfig.useMock ? delay(mockTheatres.find((item) => item.id === String(id)) ? { id, name: mockTheatres.find((item) => item.id === String(id))!.name, address: mockTheatres.find((item) => item.id === String(id))!.address } : { id, name: "Cinema" }) : http.get<TheatreInfo>(`/theatres/${id}`).then((r) => r.data);
