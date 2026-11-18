import type { Movie } from "@/types";
import { languageOptions } from "@/admin/types/enums";

export interface MovieEdition {
  id: string;
  language: string;
  certificate: string;
  durationInMinutes: number;
  releaseDate: string;
  posterUrl: string;
}
export interface MovieGroup {
  key: string;
  title: string;
  posterUrl: string;
  certificate: string;
  editions: MovieEdition[];
}

const languageLabels = new Map<string, string>(
  languageOptions.map(({ value, label }) => [value, label]),
);
const languageValue = (value: string) => value.trim().toUpperCase().replace(/[ -]+/g, "_");
export const getPreferredLanguage = () => {
  try {
    return typeof localStorage === "undefined"
      ? ""
      : (localStorage.getItem("preferredLanguage") ?? "");
  } catch {
    return "";
  }
};
export const setPreferredLanguage = (language: string) => {
  try {
    if (typeof localStorage !== "undefined" && language.trim())
      localStorage.setItem("preferredLanguage", language.trim());
  } catch {
    /* Browser storage may be unavailable. */
  }
};
export function normalizeTitle(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
}
function labelLanguage(value: string) {
  const normalized = languageValue(value);
  return languageLabels.get(normalized) ?? value.trim();
}
function editionFor(movie: Movie): MovieEdition {
  const language = movie.languages[0] ?? "";
  return {
    id: movie.id,
    language: labelLanguage(language),
    certificate: movie.certificate,
    durationInMinutes: movie.durationMins,
    releaseDate: movie.releaseDate,
    posterUrl: movie.posterUrl,
  };
}
export function groupMovies(list: Movie[]): MovieGroup[] {
  const groups = new Map<string, { title: string; movies: Movie[] }>();
  for (const movie of list) {
    const key = normalizeTitle(movie.title);
    const group = groups.get(key);
    if (group) group.movies.push(movie);
    else groups.set(key, { title: movie.title, movies: [movie] });
  }
  const preferred = languageValue(getPreferredLanguage());
  return [...groups].map(([key, group]) => {
    const editions = group.movies.map(editionFor).sort((a, b) => {
      const aPreferred = languageValue(a.language) === preferred;
      const bPreferred = languageValue(b.language) === preferred;
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
      return a.language.localeCompare(b.language, "en");
    });
    const primary = editions[0];
    return {
      key,
      title: group.title,
      posterUrl: editions.find((edition) => edition.posterUrl)?.posterUrl ?? "",
      certificate: primary?.certificate ?? "",
      editions,
    };
  });
}
export function getSiblings(list: Movie[], movieId: string): MovieEdition[] {
  return (
    groupMovies(list).find((group) => group.editions.some((edition) => edition.id === movieId))
      ?.editions ?? []
  );
}
