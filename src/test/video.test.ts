import { describe, expect, it } from "vitest";
import { videoEmbedUrl, youtubeVideoId } from "@/lib/video";
import { toMovie } from "@/services/movie-adapter";

describe("real movie trailers", () => {
  it("plays the deployed movie's YouTube short link", () => {
    expect(videoEmbedUrl("https://youtu.be/Y8hM0f3ltYs?si=wARSGbDf6KRGl4VH")).toBe("https://www.youtube-nocookie.com/embed/Y8hM0f3ltYs?autoplay=1&rel=0");
    expect(youtubeVideoId("https://www.youtube.com/watch?v=Y8hM0f3ltYs")).toBe("Y8hM0f3ltYs");
  });
  it("rejects executable and unknown embed origins", () => {
    expect(videoEmbedUrl("javascript:alert(1)")).toBeUndefined();
    expect(videoEmbedUrl("https://youtube.com.evil.test/watch?v=Y8hM0f3ltYs")).toBeUndefined();
    expect(videoEmbedUrl("https://youtu.be/invalid")).toBeUndefined();
  });
  it("exposes the real trailer and poster without inventing cast or duration", () => {
    const movie = toMovie({ id: 4, movieName: "Korean Kanakaraju", language: "TELUGU", durationInMinutes: 145, certificate: "UA13", releaseDate: "2026-08-07", posterUrl: "https://example.com/poster.jpg", trailerUrl: "https://youtu.be/Y8hM0f3ltYs" });
    expect(movie.trailers[0]?.videoUrl).toBe("https://youtu.be/Y8hM0f3ltYs");
    expect(movie.trailers[0]?.duration).toBe("");
    expect(movie.gallery[0]?.imageUrl).toBe(movie.posterUrl);
    expect(movie.cast).toEqual([]);
  });
});