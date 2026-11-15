export * from './enums';

import type { Certificate, Genre, Language, MovieStatus, Role, SeatCategory, ShowSlot, ShowStatus } from './enums';
export interface CityResponse { cityId: number; name: string }
export interface TheatreSummary { id: number; name: string; address: string; cityId: number; cityName: string }
export interface TheatreResponse extends TheatreSummary { screens: ScreenSummary[] }
export interface ScreenSummary { id: number; name: string; totalSeats: number }
export interface CreateScreenRequest { name: string; lastRow: string; seatsPerRow: number; seatRules: { fromRow: string; toRow: string; seatCategory: SeatCategory }[] }
export interface MovieResponse { id: string | number; movieName: string; durationInMinutes: number; language: Language; genres: Genre[]; certificate: Certificate; movieStatus: MovieStatus; releaseDate: string; posterUrl: string; trailerUrl: string; synopsis: string }
export interface ShowResponse { showId: number; startTime: string; endTime: string; durationInMinutes: number; screenId: number; screenName: string; theatreId: number; theatreName: string; movieId: number; movieName: string; availableSeats: number; totalSeats: number; minimumPrice: number; status: ShowStatus; showSlot: ShowSlot }
export interface UserResponse { id: string | number; name: string; email: string; phoneNumber: string | null; role: Role }
export interface CreateShowRequest { movieId: number; screenId: number; showDate: string; showSlot: ShowSlot }
