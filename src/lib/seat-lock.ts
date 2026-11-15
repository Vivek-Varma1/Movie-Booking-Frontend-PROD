/** Parse supported API lock deadlines without assuming the browser timezone. */
export function parseSeatLockDeadline(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;
    return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return parseSeatLockDeadline(Number(trimmed));
  // A local date-time has no stable meaning across devices. Require the API to include Z or an offset.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(trimmed)) return null;
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function readSeatLockDeadline(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "lockedUntil" in parsed) return (parsed as { lockedUntil?: unknown }).lockedUntil;
    return parsed;
  } catch {
    return raw;
  }
}

export function formatCountdown(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function remainingLockSeconds(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
