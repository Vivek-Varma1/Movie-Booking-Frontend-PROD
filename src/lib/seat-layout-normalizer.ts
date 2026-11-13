import type { SeatCell, SeatLayout, SeatStatus, SeatTier } from "@/types";

type RawSeat = {
  showSeatId?: unknown;
  seatId?: unknown;
  seatNumber?: unknown;
  seatLabel?: unknown;
  seatCategory?: unknown;
  price?: unknown;
  status?: unknown;
};

type RawRow = { row?: unknown; seats?: unknown };
type RawServiceLayout = { showId?: unknown; rows?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStatus(status: unknown): SeatStatus {
  if (status === "AVAILABLE") return "AVAILABLE";
  if (status === "BEST") return "BEST";
  return "OCCUPIED";
}

function categoryName(category: string): string {
  return category
    .toLowerCase()
    .replace(/(^|_)(\w)/g, (_, separator: string, character: string) => `${separator ? " " : ""}${character.toUpperCase()}`);
}

function normalizeServiceLayout(data: RawServiceLayout, showId: string): SeatLayout {
  if (!Array.isArray(data.rows)) throw new Error("The service seat layout rows are invalid.");

  const groups = new Map<string, SeatTier>();
  const seenIds = new Set<string>();

  for (const value of data.rows) {
    if (!isRecord(value)) continue;
    const rawRow = value as RawRow;
    if (typeof rawRow.row !== "string" || !Array.isArray(rawRow.seats)) continue;
    const cellsByTier = new Map<string, (SeatCell | null)[]>();

    for (const value of rawRow.seats) {
      if (!isRecord(value)) continue;
      const rawSeat = value as RawSeat;
      if (typeof rawSeat.showSeatId !== "number" && typeof rawSeat.showSeatId !== "string") continue;
      if (typeof rawSeat.seatNumber !== "number" || !Number.isFinite(rawSeat.seatNumber)) continue;
      if (typeof rawSeat.price !== "number" || !Number.isFinite(rawSeat.price)) continue;
      if (typeof rawSeat.seatCategory !== "string" || !rawSeat.seatCategory) continue;

      const id = String(rawSeat.showSeatId);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const tierKey = `${rawSeat.seatCategory}:${rawSeat.price}`;
      const cells = cellsByTier.get(tierKey) ?? [];
      const cell: SeatCell = {
        id,
        label: typeof rawSeat.seatLabel === "string" && rawSeat.seatLabel ? rawSeat.seatLabel : `${rawRow.row}${rawSeat.seatNumber}`,
        number: rawSeat.seatNumber,
        status: normalizeStatus(rawSeat.status),
      };
      if (typeof rawSeat.seatId === "number" || typeof rawSeat.seatId === "string") cell.seatId = String(rawSeat.seatId);
      cell.showSeatId = id;
      cells.push(cell);
      cellsByTier.set(tierKey, cells);
    }

    for (const [tierKey, cells] of cellsByTier) {
      const [category, priceText] = tierKey.split(":");
      const price = Number(priceText);
      const tier = groups.get(tierKey) ?? { name: categoryName(category ?? "Seats"), price, rows: [] };
      tier.rows.push({ label: rawRow.row, cells });
      groups.set(tierKey, tier);
    }
  }

  return { showId, tiers: [...groups.values()] };
}

function isSeatLayout(data: unknown): data is SeatLayout {
  return isRecord(data) && Array.isArray(data.tiers);
}

export function normalizeSeatLayout(data: unknown, showId: string): SeatLayout {
  if (isSeatLayout(data)) return data;
  if (!isRecord(data)) {
    throw new Error("The service seat layout format is not supported yet.");
  }
  const serviceLayout = data as RawServiceLayout;
  if (!Array.isArray(serviceLayout.rows)) throw new Error("The service seat layout format is not supported yet.");
  return normalizeServiceLayout(serviceLayout, showId);
}
