import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import * as api from "@/services/api";
import { getMyBookings } from "@/services/bookings";

export const moviesQuery = (cityId: string, query = "") => queryOptions({ queryKey: ["movies", cityId, query.trim()], queryFn: () => api.getMovies(cityId, query.trim()) });
export const movieQuery = (id: string) => queryOptions({ queryKey: ["movie", id], queryFn: () => api.getMovie(id), staleTime: 5 * 60_000 });
export const showDatesQuery = (movieId: string, cityId: string) => queryOptions({ queryKey: ["show-dates", cityId, movieId], queryFn: () => api.getShowDates(movieId, cityId), staleTime: 30_000 });
export const showsQuery = (movieId: string, date: string, cityId: string) =>
  queryOptions({ queryKey: ["shows", cityId, movieId, date], queryFn: () => api.getShows(movieId, date, cityId), staleTime: 30_000 });
export const seatLayoutQuery = (showId: string) =>
  queryOptions({ queryKey: ["seats", showId], queryFn: () => api.getSeatLayout(showId) });
export const showQuery = (showId: string) => queryOptions({ queryKey: ["show", showId], queryFn: () => api.getShow(showId), staleTime: 5 * 60_000 });
export const myBookingsQuery = () => queryOptions({ queryKey: ["bookings", "me"], queryFn: getMyBookings, refetchOnWindowFocus: true });

export const useMovies = (cityId: string, query = "") => useQuery(moviesQuery(cityId, query));
export const useMovie = (id: string) => useQuery(movieQuery(id));
export const useMyBookings = (enabled = true) => useQuery({ ...myBookingsQuery(), enabled });
export const useShows = (movieId: string, date: string, cityId: string) => useQuery(showsQuery(movieId, date, cityId));
export const useSeatLayout = (showId: string) => useQuery(seatLayoutQuery(showId));
export const useSendOtp = () => useMutation({ mutationFn: (email: string) => api.sendOtp(email) });
export const useVerifyOtp = () =>
  useMutation({ mutationFn: ({ email, otp }: { email: string; otp: string }) => api.verifyOtp(email, otp) });
