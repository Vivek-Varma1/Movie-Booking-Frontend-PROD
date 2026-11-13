import { resource } from './resource';
import type { MovieResponse } from '../types';
export const moviesApi = resource<MovieResponse>('/movies', 'id');
