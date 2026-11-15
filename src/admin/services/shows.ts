import { http } from '@/services/http';
import { appConfig } from '@/theme/theme';
import { resource } from './resource';
import type { ShowResponse, CreateShowRequest } from '../types';
const mockShows = resource<ShowResponse, CreateShowRequest>('/shows', 'showId');
export const showsApi = {
  list: async (): Promise<ShowResponse[]> => appConfig.useMock ? mockShows.list() : (await http.get<ShowResponse[]>('/shows')).data,
  create: async (input: CreateShowRequest): Promise<ShowResponse> => appConfig.useMock ? mockShows.create(input) : (await http.post<ShowResponse>('/shows', input)).data,
  remove: async (id: number): Promise<void> => appConfig.useMock ? mockShows.remove(id) : http.delete(`/shows/${id}`).then(() => undefined),
};
