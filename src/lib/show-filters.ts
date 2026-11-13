import type { Show, TheatreShows } from "@/types";

export const SHOW_TIME_ZONE = "Asia/Kolkata";
export function bookingDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOW_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function nextSevenDates(today: string): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00+05:30`);
    date.setUTCDate(date.getUTCDate() + index);
    return bookingDate(date);
  });
}
export function isPastShow(show: Show, selectedDate: string, now: Date): boolean {
  return selectedDate === bookingDate(now) && new Date(show.startTime).getTime() <= now.getTime();
}
export function showHour(show: Show): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: SHOW_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(new Date(show.startTime)));
}
export function filterTheatreShows(groups: TheatreShows[], filters: { afterFive: boolean; availableOnly: boolean; favouritesOnly: boolean }, favourites: string[]): TheatreShows[] {
  return groups.filter(({ theatre }) => !filters.favouritesOnly || favourites.includes(theatre.id)).map((group) => ({
    ...group,
    shows: group.shows.filter((show) => (!filters.afterFive || showHour(show) >= 17) && (!filters.availableOnly || show.availableSeats === undefined || show.availableSeats > 0)),
  })).filter((group) => group.shows.length > 0);
}