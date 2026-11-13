import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import * as api from "@/services/api";
import { appConfig } from "@/theme/theme";

export const moviesQuery = () => queryOptions({ queryKey: ["movies", appConfig.defaultCityId], queryFn: api.getMovies });
export const movieQuery = (id: string) => queryOptions({ queryKey: ["movie", id], queryFn: () => api.getMovie(id) });
export const showsQuery = (movieId: string, date: string) =>
  queryOptions({ queryKey: ["shows", appConfig.defaultCityId, movieId, date], queryFn: () => api.getShows(movieId, date), staleTime: 30_000 });
export const seatLayoutQuery = (showId: string) =>
  queryOptions({ queryKey: ["seats", showId], queryFn: () => api.getSeatLayout(showId) });
export const showQuery = (showId: string) => queryOptions({ queryKey: ["show", showId], queryFn: () => api.getShow(showId) });

export const useMovies = () => useQuery(moviesQuery());
export const useMovie = (id: string) => useQuery(movieQuery(id));
export const useShows = (movieId: string, date: string) => useQuery(showsQuery(movieId, date));
export const useSeatLayout = (showId: string) => useQuery(seatLayoutQuery(showId));
export const useSendOtp = () => useMutation({ mutationFn: (email: string) => api.sendOtp(email) });
export const useVerifyOtp = () =>
  useMutation({ mutationFn: ({ email, otp }: { email: string; otp: string }) => api.verifyOtp(email, otp) });
