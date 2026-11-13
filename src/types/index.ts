export interface CastMember { name: string; photoUrl: string; role: string }
export interface Trailer { id: string; title: string; thumbnailUrl: string; duration: string; videoUrl?: string }
export interface GalleryImage { id: string; imageUrl: string }

export interface Movie {
  id: string;
  title: string;
  certificate: string;
  languages: string[];
  durationMins: number;
  genres: string[];
  description: string;
  releaseDate: string;
  posterUrl: string;
  backdropUrl: string;
  cast: CastMember[];
  trailers: Trailer[];
  gallery: GalleryImage[];
}

export interface Theatre {
  id: string;
  name: string;
  logoUrl: string;
  address: string;
  distanceKm?: number;
  cancellable?: boolean;
}

export type ShowAvailability = "AVAILABLE" | "FILLING_FAST" | "ALMOST_FULL";

export interface Show {
  id: string;
  movieId: string;
  theatreId: string;
  startTime: string;
  availability?: ShowAvailability;
  availableSeats?: number;
  minimumPrice?: number;
  screenName?: string;
}

/** Shows grouped with their theatre (convenience shape returned by getShows). */
export interface TheatreShows { theatre: Theatre; shows: Show[] }

export type SeatStatus = "AVAILABLE" | "OCCUPIED" | "BEST";
export interface SeatCell { id: string; label: string; number: number; status: SeatStatus }
export interface SeatRow { label: string; cells: (SeatCell | null)[] }
export interface SeatTier { name: string; price: number; rows: SeatRow[] }
export interface SeatLayout { showId: string; tiers: SeatTier[] }

export interface User { id: string | number; email: string; name?: string; phoneNumber?: string | null; role?: "USER" | "ADMIN" }
export interface AuthResponse { user: User }
