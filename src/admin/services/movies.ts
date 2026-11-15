import { http } from '@/services/http';
import type { MovieResponse } from '../types';

export const moviesApi = {
  list: async (): Promise<MovieResponse[]> => (await http.get<MovieResponse[]>('/movies/admin')).data,
  create: async (input: FormData): Promise<MovieResponse> => (await http.post<MovieResponse>('/movies', input)).data,
  update: async (id: string | number, input: FormData): Promise<MovieResponse> => (await http.patch<MovieResponse>(`/movies/${id}`, input)).data,
  updateStatus: async (id: string | number, movieStatus: MovieResponse['movieStatus']): Promise<MovieResponse> =>
    (await http.patch<MovieResponse>(`/movies/${id}`, { movieStatus })).data,
  remove: async (id: string | number): Promise<void> => http.delete(`/movies/${id}`).then(() => undefined),
};
