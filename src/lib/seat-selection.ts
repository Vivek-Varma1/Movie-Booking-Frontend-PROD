import type { SeatLayout } from "@/types";
export const MAX_SELECTED_SEATS = 10;
export function toggleSeatSelection(
  selected: string[],
  id: string,
): { selected: string[]; limitReached: boolean } {
  if (selected.includes(id))
    return { selected: selected.filter((seat) => seat !== id), limitReached: false };
  if (selected.length >= MAX_SELECTED_SEATS) return { selected, limitReached: true };
  return { selected: [...selected, id], limitReached: false };
}
export function restoreSeatSelection(
  layout: SeatLayout,
  ids: string[],
  ownedLockedIds: string[] = [],
): string[] {
  const seats = layout.tiers.flatMap((tier) =>
    tier.rows.flatMap((row) =>
      row.cells.filter((seat): seat is NonNullable<typeof seat> => seat !== null),
    ),
  );
  const known = new Set(seats.map((seat) => seat.id));
  const allowed = new Set(
    seats.filter((seat) => seat.status === "AVAILABLE").map((seat) => seat.id),
  );
  const ownedLocked = new Set(ownedLockedIds);
  return [...new Set(ids)]
    .filter((id) => known.has(id) && (allowed.has(id) || ownedLocked.has(id)))
    .slice(0, MAX_SELECTED_SEATS);
}
