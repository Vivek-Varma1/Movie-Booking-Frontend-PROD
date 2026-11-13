import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SeatLayout } from "@/types";
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), auth: vi.fn(), toast: vi.fn(), authenticated: false }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to, params: _params, ...props }: any) => <a href={to} {...props}>{children}</a>, useNavigate: () => mocks.navigate }));
vi.mock("@/components/auth/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: mocks.authenticated, openAuthModal: mocks.auth, openLogin: vi.fn(), logout: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
import { SeatBooking } from "@/components/movie/SeatBooking";
const layout: SeatLayout = { showId: "12", tiers: [{ name: "Executive class", price: 150, rows: [{ label: "A", cells: [...Array.from({ length: 11 }, (_, i) => ({ id: String(i + 1), label: "A", number: i + 1, status: "AVAILABLE" as const })), null, { id: "occupied", label: "A", number: 12, status: "OCCUPIED" }] }] }] };
const mount = () => render(<SeatBooking layout={layout} show={{ showId: "12", startTime: "2026-10-21T18:15:00", theatreName: "Theatre" }} siblingShows={[]} />);
describe("seat booking continuation", () => {
  beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); mocks.authenticated = false; });
  afterEach(cleanup);
  it("saves guest seats and opens auth without leaving, then continues after success", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Row A seat 3, ₹150, available" }));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    expect(JSON.parse(sessionStorage.getItem("cv_booking_intent") ?? "{}")).toEqual({ showId: "12", selectedSeatIds: ["3"] });
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Row A seat 3, ₹150, selected" })).toHaveAttribute("aria-pressed", "true");
    mocks.auth.mock.calls[0]?.[0].onSuccess();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/checkout" });
  });
  it("restores same-show seats and sends authenticated users directly to checkout", async () => {
    sessionStorage.setItem("cv_booking_intent", JSON.stringify({ showId: "12", selectedSeatIds: ["3", "occupied"] }));
    mocks.authenticated = true;
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "Row A seat 3, ₹150, selected" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "Row A seat 12, ₹150, occupied" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/checkout" });
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("blocks the eleventh seat and shows the requested limit notice", () => {
    mount();
    for (let i = 1; i <= 11; i++) fireEvent.click(screen.getByRole("button", { name: `Row A seat ${i}, ₹150, available` }));
    expect(mocks.toast).toHaveBeenCalledWith("You can select up to 10 seats");
    expect(screen.getByRole("button", { name: "Row A seat 11, ₹150, available" })).toHaveAttribute("aria-pressed", "false");
  });
});