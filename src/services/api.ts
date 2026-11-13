import type { AuthResponse, Movie, SeatLayout, TheatreShows, User } from "@/types";
import { appConfig } from "@/theme/theme";
import { http } from "./http";
import { toMovie, type MovieResponse } from "./movie-adapter";
import { toTheatreShows, type MovieDateShowsResponse } from "./show-adapter";
import { toSeatLayout } from "./seat-adapter";
import type { ShowDetails } from "./show-details";
import { mockMovies, mockSeatLayout, mockShows, mockTheatres } from "./mock-data";

const delay = <T,>(v: T, ms = 300) => new Promise<T>((res) => setTimeout(() => res(v), ms));
let mockUser: User | null = null;
const mockIdentityKey = "cv_mock_identity";
function mockIdentity(email: string): User {
  return { id: "demo", name: "Demo", email, phoneNumber: null, role: email === "admin@demo.com" ? "ADMIN" : "USER" };
}

const mock = {
  getMovies: () => delay(mockMovies),
  getMovie: (id: string) => {
    const m = mockMovies.find((x) => x.id === id);
    return m ? delay(m) : Promise.reject(new Error("Movie not found"));
  },
  getShows: (movieId: string, date: string): Promise<TheatreShows[]> => {
    const shows = mockShows(movieId, date);
    return delay(
      mockTheatres
        .map((theatre) => ({ theatre, shows: shows.filter((s) => s.theatreId === theatre.id) }))
        .filter((g) => g.shows.length),
    );
  },
  getSeatLayout: (showId: string) => delay(mockSeatLayout(showId)),
  sendOtp: (_email: string) => delay({ success: true }),
  verifyOtp: (email: string, otp: string): Promise<AuthResponse> => {
    if (otp !== "123456") return Promise.reject(new Error("Invalid OTP"));
    mockUser = mockIdentity(email);
    try { sessionStorage.setItem(mockIdentityKey, email); } catch { /* Mock storage may be unavailable. */ }
    return delay({ user: mockUser });
  },
  getCurrentUser: () => {
    try { const email = sessionStorage.getItem(mockIdentityKey); if (email) mockUser = mockIdentity(email); } catch { /* SSR or storage disabled. */ }
    return delay(mockUser);
  },
  logout: () => { mockUser = null; try { sessionStorage.removeItem(mockIdentityKey); } catch { /* Storage disabled. */ } return delay(undefined); },
};

const real = {
  getMovies: () => http.get<MovieResponse[]>("/movies", { params: { cityId: appConfig.defaultCityId } }).then((r) => r.data.map(toMovie)),
  getMovie: (id: string) => http.get<MovieResponse>(`/movies/${id}`).then((r) => toMovie(r.data)),
  getShows: (movieId: string, date: string) =>
    http.get<MovieDateShowsResponse>(`/movies/${movieId}/shows`, { params: { cityId: appConfig.defaultCityId, showDate: date } }).then((r) => toTheatreShows(r.data, movieId)),
  getSeatLayout: (showId: string) => http.get<unknown>(`/shows/${showId}/seats`).then((r) => toSeatLayout(r.data, showId)),
  sendOtp: (email: string) => http.post<{ success: boolean }>("/auth/send-otp", { email }).then((r) => r.data),
  verifyOtp: async (email: string, otp: string): Promise<AuthResponse> => {
    const { data } = await http.post<AuthResponse>("/auth/verify-otp", { email, otp });
    // Never retain the response token: the backend owns the HttpOnly cookie.
    return { user: data.user };
  },
  getCurrentUser: async (): Promise<User | null> => {
    try { return (await http.get<User>("/auth/me")).data; }
    catch {
      return null;
    }
  },
  logout: () => http.post("/auth/logout").then(() => undefined),
};

const impl = appConfig.useMock ? mock : real;

export const getMovies = (): Promise<Movie[]> => impl.getMovies();
export const getMovie = (id: string): Promise<Movie> => impl.getMovie(id);
export const getShows = (movieId: string, date: string): Promise<TheatreShows[]> => impl.getShows(movieId, date);
export const getSeatLayout = (showId: string): Promise<SeatLayout> => impl.getSeatLayout(showId);
export const getShow = (showId: string): Promise<ShowDetails> => appConfig.useMock ? Promise.resolve({ showId, movieId: showId.split("_")[0] ?? "" }) : http.get<ShowDetails>(`/shows/${showId}`).then((r) => r.data);
export const sendOtp = (email: string) => impl.sendOtp(email);
export const verifyOtp = (email: string, otp: string): Promise<AuthResponse> => impl.verifyOtp(email, otp);
export const getCurrentUser = (): Promise<User | null> => impl.getCurrentUser();
export const logout = (): Promise<void> => impl.logout();
