import type { Movie } from "@/types";
import { youtubeVideoId } from "@/lib/video";

/** Public DTO returned by the deployed Spring movie controller. */
export interface MovieResponse {
  id: number | string;
  movieName: string;
  language: string;
  durationInMinutes: number;
  certificate: string;
  releaseDate: string;
  posterUrl: string;
  genres?: string[];
  synopsis?: string;
  trailerUrl?: string;
}

const displayName = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function toMovie(dto: MovieResponse): Movie {
  const videoId = dto.trailerUrl ? youtubeVideoId(dto.trailerUrl) : undefined;
  return {
    id: String(dto.id),
    title: dto.movieName,
    certificate: dto.certificate,
    languages: dto.language ? [displayName(dto.language)] : [],
    durationMins: dto.durationInMinutes,
    genres: (dto.genres ?? []).map(displayName),
    description: dto.synopsis ?? "",
    releaseDate: dto.releaseDate,
    posterUrl: dto.posterUrl,
    backdropUrl: dto.posterUrl,
    cast: [],
    trailers: dto.trailerUrl ? [{ id: `trailer-${dto.id}`, title: `${dto.movieName} — Official Trailer`, thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : dto.posterUrl, duration: "", videoUrl: dto.trailerUrl }] : [],
    gallery: dto.posterUrl ? [{ id: `poster-${dto.id}`, imageUrl: dto.posterUrl }] : [],
  };
}