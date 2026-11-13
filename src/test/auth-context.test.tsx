import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ getCurrentUser: vi.fn(), logout: vi.fn() }));
const router = vi.hoisted(() => ({ state: { location: { pathname: "/" } }, history: { replace: vi.fn() }, invalidate: vi.fn(), navigate: vi.fn() }));
vi.mock("@/services/api", () => api);
vi.mock("@tanstack/react-router", () => ({ useRouter: () => router, useRouterState: () => "/" }));
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { emitUnauthorized } from "@/lib/auth-storage";
const user = { id: 2, email: "test@example.com", name: "Test", role: "USER" as const };
const success = vi.fn();
function Probe() {
  const auth = useAuth();
  return <><span>{auth.isReady ? auth.user?.email ?? "signed out" : "loading"}</span><span>{auth.loginOpen ? "modal open" : "modal closed"}</span><button onClick={() => auth.openAuthModal({ onSuccess: success })}>Open</button><button onClick={() => auth.login({ user })}>Complete</button><button onClick={auth.closeLogin}>Close</button><button onClick={auth.logout}>Logout</button></>;
}
const mount = () => render(<QueryClientProvider client={new QueryClient()}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); router.state.location.pathname = "/"; api.getCurrentUser.mockResolvedValue(null); api.logout.mockResolvedValue(undefined); });
afterEach(cleanup);
describe("cookie session context", () => {
  it("restores the server user without persisting profiles, roles or tokens", async () => {
    api.getCurrentUser.mockResolvedValue(user);
    localStorage.setItem("cv_auth", "legacy");
    mount();
    await screen.findByText(user.email);
    expect(localStorage.length).toBe(0);
  });
  it("completes the continuation once and closes the modal without storing auth", async () => {
    mount(); await screen.findByText("signed out");
    fireEvent.click(screen.getByText("Open")); fireEvent.click(screen.getByText("Complete"));
    expect(screen.getByText("modal closed")).toBeInTheDocument();
    expect(success).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    fireEvent.click(screen.getByText("Complete"));
    expect(success).toHaveBeenCalledTimes(1);
  });
  it("clears cancelled continuations", async () => {
    mount(); await screen.findByText("signed out");
    fireEvent.click(screen.getByText("Open")); fireEvent.click(screen.getByText("Close")); fireEvent.click(screen.getByText("Complete"));
    expect(success).not.toHaveBeenCalled();
  });
  it("clears the in-memory user on logout", async () => {
    api.getCurrentUser.mockResolvedValue(user);
    mount(); await screen.findByText(user.email);
    fireEvent.click(screen.getByText("Logout"));
    await screen.findByText("signed out");
    expect(api.logout).toHaveBeenCalledTimes(1);
  });
  it("opens the modal when a protected request loses its session", async () => {
    api.getCurrentUser.mockResolvedValue(user);
    mount(); await screen.findByText(user.email);
    act(() => emitUnauthorized());
    await waitFor(() => expect(screen.getByText("modal open")).toBeInTheDocument());
    expect(screen.getByText("signed out")).toBeInTheDocument();
  });
  it("keeps an authenticated user on 403 and returns admin pages home", async () => {
    router.state.location.pathname = "/admin/movies";
    api.getCurrentUser.mockResolvedValue(user); mount(); await screen.findByText(user.email);
    act(() => emitUnauthorized(403));
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByText("modal closed")).toBeInTheDocument();
    expect(router.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });
  it("opens login on anonymous 403 and retries after sign-in", async () => {
    mount(); await screen.findByText("signed out");
    act(() => emitUnauthorized(403)); fireEvent.click(screen.getByText("Complete"));
    expect(router.invalidate).toHaveBeenCalledTimes(1);
  });
  it("redirects admin logout home and clears cached data", async () => {
    router.state.location.pathname = "/admin"; api.getCurrentUser.mockResolvedValue(user);
    const client = new QueryClient(); client.setQueryData(["private"], { secret: "test" });
    render(<QueryClientProvider client={client}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
    await screen.findByText(user.email); fireEvent.click(screen.getByText("Logout")); await screen.findByText("signed out");
    expect(client.getQueryData(["private"])).toBeUndefined();
    expect(router.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});