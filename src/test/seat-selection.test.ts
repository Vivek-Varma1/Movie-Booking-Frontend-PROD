import { describe, expect, it } from "vitest";
import { restoreSeatSelection, toggleSeatSelection } from "@/lib/seat-selection";
import type { SeatLayout } from "@/types";
describe("seat selection rules", () => {
  it("allows ten seats and rejects an eleventh", () => {
    const nine = Array.from({ length: 9 }, (_, i) => String(i));
    const ten = toggleSeatSelection(nine, "9");
    expect(ten.selected).toHaveLength(10);
    expect(ten.limitReached).toBe(false);
    expect(toggleSeatSelection(ten.selected, "10")).toEqual({ selected: ten.selected, limitReached: true });
  });
  it("toggles an already selected seat off", () => {
    expect(toggleSeatSelection(["A1", "A2"], "A1").selected).toEqual(["A2"]);
  });
  it("restores only existing selectable seats and never occupied seats", () => {
    const layout: SeatLayout = { showId: "1", tiers: [{ name: "Executive", price: 150, rows: [{ label: "A", cells: [{ id: "1", label: "A", number: 1, status: "AVAILABLE" }, null, { id: "2", label: "A", number: 2, status: "OCCUPIED" }, { id: "3", label: "A", number: 3, status: "BEST" }] }] }] };
    expect(restoreSeatSelection(layout, ["1", "2", "3", "missing", "1"])).toEqual(["1", "3"]);
  });
});