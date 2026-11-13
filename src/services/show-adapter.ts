import type { ShowAvailability, TheatreShows } from "@/types";

interface ShowResponse {
  id?: number | string;
  showId?: number | string;
  startTime: string;
  availability?: ShowAvailability;
  availableSeats?: number;
  minimumPrice?: number;
  screenName?: string;
}
export interface MovieDateShowsResponse {
  showDate: string;
  theatres: Array<{
    theatreId: number | string;
    theatreName: string;
    address?: string;
    logoUrl?: string;
    distanceKm?: number;
    cancellable?: boolean;
    shows: ShowResponse[];
  }>;
}
export function toTheatreShows(dto: MovieDateShowsResponse, movieId: string): TheatreShows[] {
  return dto.theatres.map((theatre) => ({
    theatre: { id: String(theatre.theatreId), name: theatre.theatreName, address: theatre.address ?? "", logoUrl: theatre.logoUrl ?? "", ...(theatre.distanceKm !== undefined ? { distanceKm: theatre.distanceKm } : {}), ...(theatre.cancellable !== undefined ? { cancellable: theatre.cancellable } : {}) },
    shows: theatre.shows.map((show) => {
      const id = show.showId ?? show.id;
      if (id === undefined || !show.startTime) throw new Error("The showtime response is missing its ID or start time.");
      const startTime = /(?:Z|[+-]\d{2}:\d{2})$/.test(show.startTime) ? show.startTime : `${show.startTime}+05:30`;
      if (Number.isNaN(new Date(startTime).getTime())) throw new Error("The showtime response contains an invalid start time.");
      const availability = ["AVAILABLE", "FILLING_FAST", "ALMOST_FULL"].includes(show.availability ?? "") ? show.availability : undefined;
      return { id: String(id), movieId, theatreId: String(theatre.theatreId), startTime, ...(availability ? { availability } : {}), ...(show.availableSeats !== undefined ? { availableSeats: show.availableSeats } : {}), ...(show.minimumPrice !== undefined ? { minimumPrice: show.minimumPrice } : {}), ...(show.screenName ? { screenName: show.screenName } : {}) };
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  }));
}