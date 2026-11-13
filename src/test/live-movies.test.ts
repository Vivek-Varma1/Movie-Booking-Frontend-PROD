import { beforeEach, describe, expect, it, vi } from "vitest";
import { appConfig } from "@/theme/theme";
import { toMovie } from "@/services/movie-adapter";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/http", () => ({ http: { get } }));

import { getMovies, getMovie } from "@/services/api";

const response = {
  id: 4, movieName: "Korean Kanakaraju", language: "TELUGU",
  durationInMinutes: 145, certificate: "UA13", releaseDate: "2026-08-07",
  posterUrl: "https://res.cloudinary.com/ywllogan/image/upload/v1786511225/movies/posters/cn6epwletnevxfi363cl.jpg",
};

describe("deployed movie service", () => {
  beforeEach(() => { get.mockReset(); });

  it("uses the supplied backend by default rather than fake movies", () => {
    expect(appConfig.useMock).toBe(false);
    expect(appConfig.apiBaseUrl).toBe("https://movie-booking-service-rabbitmq.onrender.com/api");
  });

  it("sends the required cityId and normalizes the live list", async () => {
    get.mockResolvedValue({ data: [response] });
    const movies = await getMovies();
    expect(get).toHaveBeenCalledWith("/movies", { params: { cityId: "1" } });
    expect(movies).toHaveLength(1);
    expect(movies[0]).toMatchObject({ id: "4", title: "Korean Kanakaraju", languages: ["Telugu"], durationMins: 145, posterUrl: response.posterUrl });
  });

  it("does not substitute mock data when the live API fails", async () => {
    get.mockRejectedValue(new Error("Network Error"));
    await expect(getMovies()).rejects.toThrow("Network Error");
  });

  it("maps detail fields without fabricating missing summary fields", async () => {
    expect(toMovie(response)).toMatchObject({ genres: [], description: "", cast: [] });
    get.mockResolvedValue({ data: { ...response, genres: ["HORROR", "COMEDY"], synopsis: "Actual backend synopsis" } });
    expect(await getMovie("4")).toMatchObject({ genres: ["Horror", "Comedy"], description: "Actual backend synopsis" });
    expect(get).toHaveBeenCalledWith("/movies/4");
  });
});