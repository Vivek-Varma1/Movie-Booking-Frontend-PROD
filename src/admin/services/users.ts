import { resource } from './resource';
import type { UserResponse } from '../types';
export const usersApi = resource<UserResponse>('/users', 'id');
