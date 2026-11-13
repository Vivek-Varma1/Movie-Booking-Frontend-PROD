import { resource } from './resource';
import type { ShowResponse, CreateShowRequest } from '../types';
export const showsApi = resource<ShowResponse, CreateShowRequest>('/shows', 'showId');
