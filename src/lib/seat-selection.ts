import type { SeatLayout } from "@/types";
export const MAX_SELECTED_SEATS = 10;
export function toggleSeatSelection(selected: string[], id: string): { selected: string[]; limitReached: boolean } {
  if (selected.includes(id)) return { selected: selected.filter((seat) => seat !== id), limitReached: false };
  if (selected.length >= MAX_SELECTED_SEATS) return { selected, limitReached: true };
  return { selected: [...selected, id], limitReached: false };
}
export function restoreSeatSelection(layout: SeatLayout, ids: string[]): string[] {
  const allowed = new Set(layout.tiers.flatMap((tier) => tier.rows.flatMap((row) => row.cells.filter((seat) => seat && seat.status !== "OCCUPIED").map((seat) => seat?.id))));
  return [...new Set(ids)].filter((id) => allowed.has(id)).slice(0, MAX_SELECTED_SEATS);
}