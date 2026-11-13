import { useAuth } from '@/components/auth/AuthContext';
import type { User } from '@/types';
export const isAdmin = (user: User | null | undefined) => user?.role === 'ADMIN';
export const useIsAdmin = () => isAdmin(useAuth().user);
