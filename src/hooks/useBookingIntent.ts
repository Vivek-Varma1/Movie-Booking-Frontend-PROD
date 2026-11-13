import { useCallback, useEffect, useState } from "react";

export interface BookingIntent { showId: string | null; selectedSeatIds: string[] }
const KEY = "cv_booking_intent";
const empty: BookingIntent = { showId: null, selectedSeatIds: [] };

function read(): BookingIntent {
  try {
    const raw = sessionStorage.getItem(KEY);
    const value: unknown = raw ? JSON.parse(raw) : empty;
    if (!value || typeof value !== "object" || !("showId" in value) || !("selectedSeatIds" in value) || (value.showId !== null && typeof value.showId !== "string") || !Array.isArray(value.selectedSeatIds)) return empty;
    return { showId: value.showId, selectedSeatIds: value.selectedSeatIds.filter((id): id is string => typeof id === "string") };
  } catch {
    return empty;
  }
}

/** Booking intent persisted in sessionStorage (survives login redirects, not new tabs). */
export function useBookingIntent() {
  const [intent, setIntent] = useState<BookingIntent>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => { setIntent(read()); setReady(true); }, []);

  const save = useCallback((next: BookingIntent) => {
    setIntent(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  const clear = useCallback(() => {
    setIntent(empty);
    try { sessionStorage.removeItem(KEY); } catch { /* Keep the in-memory intent cleared. */ }
  }, []);

  return { intent, ready, setIntent: save, clear };
}
