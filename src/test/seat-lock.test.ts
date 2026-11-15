import { describe, expect, it } from "vitest";
import { formatCountdown, parseSeatLockDeadline, readSeatLockDeadline, remainingLockSeconds } from "@/lib/seat-lock";

describe("seat-lock deadlines", () => {
  it("parses timezone-aware ISO timestamps with offsets", () => {
    expect(parseSeatLockDeadline("2026-11-15T12:30:00+05:30")).toBe(Date.parse("2026-11-15T07:00:00Z"));
    expect(parseSeatLockDeadline("2026-11-15T07:00:00Z")).toBe(Date.parse("2026-11-15T07:00:00Z"));
  });

  it("distinguishes Unix seconds from milliseconds", () => {
    expect(parseSeatLockDeadline(1_800_000_000)).toBe(1_800_000_000_000);
    expect(parseSeatLockDeadline(1_800_000_000_000)).toBe(1_800_000_000_000);
    expect(parseSeatLockDeadline("1800000000")).toBe(1_800_000_000_000);
  });

  it("rejects ambiguous local date-times and malformed values", () => {
    expect(parseSeatLockDeadline("2026-11-15T12:30:00")).toBeNull();
    expect(parseSeatLockDeadline("not-a-timestamp")).toBeNull();
    expect(parseSeatLockDeadline(undefined)).toBeNull();
  });

  it("preserves the original deadline and calculates remaining time from the current clock", () => {
    const deadline = "2026-11-15T12:10:00+05:30";
    expect(readSeatLockDeadline(JSON.stringify({ lockedUntil: deadline }))).toBe(deadline);
    const epoch = parseSeatLockDeadline(deadline)!;
    const start = epoch - 600_000;
    expect(remainingLockSeconds(epoch, start)).toBe(600);
    expect(remainingLockSeconds(epoch, start + 30_000)).toBe(570);
    expect(formatCountdown(remainingLockSeconds(epoch, start + 30_000))).toBe("09:30");
    expect(remainingLockSeconds(epoch, epoch + 1)).toBe(0);
  });
});
