import { describe, expect, it } from "vitest";
import { filterMovies, weeklyReleases } from "@/lib/movie-filters";
import { mockMovies } from "@/services/mock-data";

const today = new Date("2026-10-18T12:00:00");
const empty = { q: "", release: "", language: "", genre: "" };

describe("Home movie filtering", () => {
  it("searches movie titles without case sensitivity", () => {
    expect(filterMovies(mockMovies, { ...empty, q: "gODAVARI" }, today).map((m) => m.id)).toEqual(["m2"]);
  });
  it("filters by the selected language", () => {
    expect(filterMovies(mockMovies, { ...empty, language: "Kannada" }, today).map((m) => m.id)).toEqual(["m6"]);
  });
  it("filters by the selected genre", () => {
    expect(filterMovies(mockMovies, { ...empty, genre: "Thriller" }, today).map((m) => m.id)).toEqual(["m4"]);
  });
  it("only shows releases within the current calendar week", () => {
    expect(weeklyReleases(mockMovies, today).map((m) => m.id)).toEqual(["m4", "m5"]);
  });
});