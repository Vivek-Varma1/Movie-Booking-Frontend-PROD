import { normalizeSeatLayout } from "@/lib/seat-layout-normalizer";
import type { SeatLayout, SeatTier } from "@/types";

export function toSeatLayout(data: unknown, showId: string): SeatLayout {
  if (!data || typeof data !== "object" || !("tiers" in data) || !Array.isArray(data.tiers)) return normalizeSeatLayout(data, showId);
  for (const tier of data.tiers) {
    if (!tier || typeof tier.name !== "string" || typeof tier.price !== "number" || !Array.isArray(tier.rows)) throw new Error("The seat tier is missing its price or rows.");
    for (const row of tier.rows) {
      if (typeof row.label !== "string" || !Array.isArray(row.cells)) throw new Error("The seat row format is incomplete.");
      for (const cell of row.cells) if (cell !== null && (cell.id === undefined || typeof cell.number !== "number" || !["AVAILABLE", "OCCUPIED", "BEST"].includes(cell.status))) throw new Error("The seat status or number is invalid.");
    }
  }
  const tiers: SeatTier[] = data.tiers.map((tier) => ({ name: tier.name, price: tier.price, rows: tier.rows.map((row: SeatTier["rows"][number]) => ({ label: row.label, cells: row.cells.map((cell) => cell ? { ...cell, id: String(cell.id), label: row.label } : null) })) }));
  return { showId, tiers };
}