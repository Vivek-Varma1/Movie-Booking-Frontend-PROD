import type { Movie } from "@/types";

export type MovieFilters = { q: string; release: string; language: string; genre: string };

export function filterMovies(movies: Movie[], filters: MovieFilters, today: Date) {
  return movies.filter((movie) => {
    const age = (today.getTime() - new Date(`${movie.releaseDate}T00:00:00`).getTime()) / 86400000;
    const matchesRelease = filters.release === "new" ? age >= 0 && age <= 14 : filters.release === "re" ? age > 30 : true;
    const text = [movie.title, ...movie.languages, ...movie.genres].join(" ").toLowerCase();
    return matchesRelease && text.includes(filters.q.trim().toLowerCase()) &&
      (!filters.language || movie.languages.includes(filters.language)) &&
      (!filters.genre || movie.genres.includes(filters.genre));
  });
}

export function weeklyReleases(movies: Movie[], today: Date) {
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return movies.filter((m) => { const release = new Date(`${m.releaseDate}T00:00:00`); return release >= start && release < end; });
}