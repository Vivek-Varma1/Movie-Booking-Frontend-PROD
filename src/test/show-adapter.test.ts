import { describe, expect, it, vi } from "vitest";
import { toTheatreShows } from "@/services/show-adapter";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/http", () => ({ http: { get } }));
import { getShowDates, getShows } from "@/services/api";
describe("live showtime contract", () => {
  it("loads available movie dates for the selected city", async () => {
    get.mockResolvedValue({ data: { showDates: ["2026-10-20", "2026-10-21"] } });
    await expect(getShowDates("4", "12")).resolves.toEqual(["2026-10-20", "2026-10-21"]);
    expect(get).toHaveBeenCalledWith("/movies/4/show-dates", { params: { cityId: "12" } });
  });
  it("passes cityId and showDate to the uploaded controller", async () => {
    get.mockResolvedValue({ data: { showDate: "2026-10-20", theatres: [] } });
    expect(await getShows("4", "2026-10-20", "2")).toEqual([]);
    expect(get).toHaveBeenCalledWith("/movies/4/shows", { params: { cityId: "2", showDate: "2026-10-20" } });
  });
  it("normalizes real IDs and local times without inventing booking facts", () => {
    const group = toTheatreShows({ showDate: "2026-10-20", theatres: [{ theatreId: 8, theatreName: "Real theatre", shows: [{ showId: 12, startTime: "2026-10-20T18:15:00" }] }] }, "4")[0];
    expect(group?.shows[0]).toEqual({ id: "12", movieId: "4", theatreId: "8", startTime: "2026-10-20T18:15:00+05:30" });
    expect(group?.theatre).toEqual({ id: "8", name: "Real theatre", address: "", logoUrl: "" });
  });
});
