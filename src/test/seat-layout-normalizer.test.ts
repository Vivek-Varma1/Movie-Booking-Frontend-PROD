import { describe, expect, it } from "vitest";
import { normalizeSeatLayout } from "@/lib/seat-layout-normalizer";

describe("seat layout normalizer", () => {
  it("normalizes row-based service layouts by category and show seat id", () => {
    const layout = normalizeSeatLayout({
      showId: 51,
      rows: [
        { row: "A", seats: [
          { showSeatId: 31253, seatId: 2757, seatNumber: 1, seatLabel: "A1", seatCategory: "RECLINER", price: 400, status: "AVAILABLE" },
          { showSeatId: 31254, seatId: 2758, seatNumber: 2, seatLabel: "A2", seatCategory: "RECLINER", price: 400, status: "BOOKED" },
        ] },
        { row: "B", seats: [
          { showSeatId: 31273, seatId: 2777, seatNumber: 1, seatLabel: "B1", seatCategory: "PREMIUM", price: 250, status: "AVAILABLE" },
        ] },
      ],
    }, "51");

    expect(layout.tiers).toHaveLength(2);
    expect(layout.tiers[0]).toMatchObject({
      name: "Recliner",
      price: 400,
      rows: [{ label: "A", cells: [
        { id: "31253", showSeatId: "31253", seatId: "2757", label: "A1", number: 1, status: "AVAILABLE" },
        { id: "31254", status: "OCCUPIED" },
      ] }],
    });
    expect(layout.tiers[1]).toMatchObject({ name: "Premium", price: 250, rows: [{ label: "B" }] });
  });

  it("treats unsupported statuses as unavailable and skips malformed seats", () => {
    const layout = normalizeSeatLayout({
      rows: [
        { row: "A", seats: [
          { showSeatId: "1", seatNumber: 1, seatLabel: "A1", seatCategory: "REGULAR", price: 100, status: "BLOCKED" },
          { showSeatId: "2", seatNumber: 2, seatLabel: "A2", seatCategory: "REGULAR", price: 100, status: "MAYBE" },
          { showSeatId: "3", seatNumber: 3, seatLabel: "A3", seatCategory: "REGULAR", price: 100, status: "UNAVAILABLE" },
          { showSeatId: "4", seatNumber: 4, seatLabel: "A4", seatCategory: "REGULAR", price: 100, status: "AVAILABLE" },
          { showSeatId: "4", seatNumber: 5, seatLabel: "duplicate", seatCategory: "REGULAR", price: 100, status: "AVAILABLE" },
          { seatNumber: 6, seatLabel: "invalid", seatCategory: "REGULAR", price: 100, status: "AVAILABLE" },
        ] },
        { row: "B", seats: [] },
      ],
    }, "51");

    expect(layout.tiers[0]?.rows[0]?.cells).toEqual([
      expect.objectContaining({ id: "1", status: "OCCUPIED" }),
      expect.objectContaining({ id: "2", status: "OCCUPIED" }),
      expect.objectContaining({ id: "3", status: "OCCUPIED" }),
      expect.objectContaining({ id: "4", status: "AVAILABLE" }),
    ]);
  });
});
