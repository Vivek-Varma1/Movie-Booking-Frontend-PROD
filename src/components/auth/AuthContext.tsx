import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "@/types";
import { onUnauthorized } from "@/lib/auth-storage";
import * as api from "@/services/api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  isReady: boolean;
  isAuthenticated: boolean;
  login: (r: AuthResponse | User) => void;
  logout: () => void;
  loginOpen: boolean;
  openLogin: () => void;
  openAuthModal: (options?: { onSuccess?: () => void }) => void;
  returnToPreviousPage: () => void;
  closeLogin: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isReady, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const href = useRouterState({ select: (state) => state.location.href });
  const previousPage = useRef("/");
  useEffect(() => { if (href.split("?")[0] !== "/checkout") previousPage.current = href; }, [href]);
  const afterLogin = useRef<(() => void) | null>(null);
  const currentUser = useRef<User | null>(null);
  currentUser.current = auth?.user ?? null;

  useEffect(() => {
    let active = true;
    // Remove legacy bearer sessions; never read them or write new auth storage.
    try { localStorage.removeItem("cv_auth"); } catch { /* Storage can be disabled. */ }
    api.getCurrentUser().then((user) => { if (active) setAuth(user ? { user } : null); }).catch(() => {}).finally(() => { if (active) setReady(true); });
    const off = onUnauthorized((status) => {
      if (status === 403 && currentUser.current) {
        toast.error("You don't have permission for that");
        if (router.state.location.pathname.startsWith("/admin")) void router.navigate({ to: "/", replace: true });
        return;
      }
      setAuth(null);
      afterLogin.current = () => { void queryClient.invalidateQueries(); void router.invalidate(); };
      setLoginOpen(true);
    });
    return () => {
      off();
      active = false;
    };
  }, [queryClient, router]);

  const login = useCallback((r: AuthResponse | User) => {
    setAuth({ user: "user" in r ? r.user : r });
    setReady(true);
    setLoginOpen(false);
    const continuation = afterLogin.current;
    afterLogin.current = null;
    continuation?.();
  }, []);
  const logout = useCallback(async () => {
    await queryClient.cancelQueries();
    try {
      await api.logout();
      queryClient.clear();
      setAuth(null);
      if (router.state.location.pathname.startsWith("/admin")) void router.navigate({ to: "/", replace: true });
      if (router.state.location.pathname === "/checkout") router.history.replace(previousPage.current);
    } catch { toast.error("Couldn't sign out. Please try again."); }
  }, [queryClient, router]);
  const openAuthModal = useCallback((options?: { onSuccess?: () => void }) => {
    afterLogin.current = options?.onSuccess ?? null;
    setLoginOpen(true);
  }, []);
  const closeLogin = useCallback(() => { afterLogin.current = null; setLoginOpen(false); }, []);
  const returnToPreviousPage = useCallback(() => { router.history.replace(previousPage.current); }, [router]);

  const value = useMemo<AuthState>(
    () => ({
      user: auth?.user ?? null,
      status: !isReady ? "loading" : auth?.user ? "authenticated" : "anonymous",
      isReady,
      isAuthenticated: !!auth?.user,
      login,
      logout,
      loginOpen,
      openLogin: openAuthModal,
      openAuthModal,
      closeLogin,
      returnToPreviousPage,
    }),
    [auth, isReady, login, logout, loginOpen, openAuthModal, closeLogin, returnToPreviousPage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
