import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, logout, verifyOtp } from "@/services/api";
import { http } from "@/services/http";
import { onUnauthorized } from "@/lib/auth-storage";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

afterEach(() => vi.restoreAllMocks());

describe("Spring Boot cookie authentication", () => {
  it("sends credentials and never adds a stored bearer token", async () => {
    localStorage.setItem("cv_auth", JSON.stringify({ token: "legacy-test-token" }));
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({ data: {}, status: 200, statusText: "OK", headers: {}, config }));
    await http.get("/auth/me", { adapter });
    const config = adapter.mock.calls[0]?.[0];
    expect(config?.withCredentials).toBe(true);
    expect(config?.headers.Authorization).toBeUndefined();
    localStorage.clear();
  });
  it("verifies via verify-otp and keeps only the returned user", async () => {
    const user = { id: 7, name: "Test", email: "test@example.com", phoneNumber: null, role: "ADMIN" as const };
    const post = vi.spyOn(http, "post").mockResolvedValue({ data: { token: "ignored", user } } as AxiosResponse);
    const get = vi.spyOn(http, "get");
    expect(await verifyOtp(user.email, "123456")).toEqual({ user });
    expect(post).toHaveBeenCalledWith("/auth/verify-otp", { email: user.email, otp: "123456" });
    expect(get).not.toHaveBeenCalled();
  });
  it("treats /auth/me 401 as a signed-out session without inventing a user", async () => {
    vi.spyOn(http, "get").mockRejectedValue({ response: { status: 401 } });
    expect(await getCurrentUser()).toBeNull();
  });
  it.each([403, 500, undefined])("silently treats a failed startup check (%s) as anonymous", async (status) => {
    vi.spyOn(http, "get").mockRejectedValue(status ? { response: { status } } : new Error("Network"));
    expect(await getCurrentUser()).toBeNull();
  });
  it("opens authentication for a protected 403 and leaves session checks silent", async () => {
    const unauthorized = vi.fn(); const off = onUnauthorized(unauthorized);
    const adapter = async (config: InternalAxiosRequestConfig) => { throw { config, response: { status: 403 } }; };
    await http.get("/auth/me", { adapter }).catch(() => {});
    expect(unauthorized).not.toHaveBeenCalled();
    await http.get("/bookings", { adapter }).catch(() => {});
    expect(unauthorized).toHaveBeenCalledWith(403); off();
  });
  it("ends the cookie session through the API", async () => {
    const post = vi.spyOn(http, "post").mockResolvedValue({ data: {} } as AxiosResponse);
    await logout();
    expect(post).toHaveBeenCalledWith("/auth/logout");
  });
  it("opens auth for a protected request 401 but not an incorrect OTP", async () => {
    const unauthorized = vi.fn();
    const off = onUnauthorized(unauthorized);
    const adapter = async (config: InternalAxiosRequestConfig) => { throw { config, response: { status: 401 } }; };
    await http.get("/auth/me", { adapter }).catch(() => {});
    await http.post("/auth/verify", {}, { adapter }).catch(() => {});
    expect(unauthorized).not.toHaveBeenCalled();
    await http.get("/bookings", { adapter }).catch(() => {});
    expect(unauthorized).toHaveBeenCalledTimes(1);
    off();
  });
});