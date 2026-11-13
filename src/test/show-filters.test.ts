import { describe, expect, it } from "vitest";
import { bookingDate, nextSevenDates, isPastShow, filterTheatreShows } from "@/lib/show-filters";
import type { Show, TheatreShows } from "@/types";

const show = (id: string, time: string): Show => ({ id, movieId: "4", theatreId: "1", startTime: `2026-10-20T${time}:00+05:30`, availability: "AVAILABLE" });
const groups: TheatreShows[] = [{ theatre: { id: "1", name: "Theatre", logoUrl: "", address: "" }, shows: [show("before", "16:59"), show("five", "17:00"), show("after", "18:15")] }];
describe("showtime selection rules", () => {
  it("defaults to today's date in the cinema timezone", () => {
    expect(bookingDate(new Date("2026-10-19T20:00:00Z"))).toBe("2026-10-20");
  });
  it("offers exactly the next seven days including today across month boundaries", () => {
    expect(nextSevenDates("2026-10-29")).toEqual(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
  });
  it("disables past shows today but not later shows or future-date shows", () => {
    const now = new Date("2026-10-20T17:00:00+05:30");
    expect(isPastShow(show("past", "16:59"), "2026-10-20", now)).toBe(true);
    expect(isPastShow(show("later", "18:15"), "2026-10-20", now)).toBe(false);
    expect(isPastShow({ ...show("future", "09:00"), startTime: "2026-10-21T09:00:00+05:30" }, "2026-10-21", now)).toBe(false);
  });
  it("After 5 PM removes earlier times from the listing", () => {
    expect(filterTheatreShows(groups, { afterFive: true, availableOnly: false, favouritesOnly: false }, [])[0]?.shows.map((s) => s.id)).toEqual(["five", "after"]);
  });
});