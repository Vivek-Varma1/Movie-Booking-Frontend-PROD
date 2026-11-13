import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HorizontalScroller } from "./HorizontalScroller";
import { PosterLightbox, TrailerModal } from "./MovieMediaModal";
import type { Movie, Trailer } from "@/types";

export function MovieDetails({ movie }: { movie: Movie }) {
  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const release = new Date(`${movie.releaseDate}T00:00:00`);
  const releaseLabel = Number.isNaN(release.getTime()) ? undefined : release.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const duration = `${Math.floor(movie.durationMins / 60)}h ${movie.durationMins % 60}m`;
  const firstTrailer = movie.trailers[0];
  const playClass = "absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-on-hero/25 bg-hero-dark/50 text-on-hero";
  return <>
    <section className="relative isolate overflow-hidden bg-hero-dark text-on-hero" aria-labelledby="movie-title">
      <img src={movie.backdropUrl || movie.posterUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="detail-hero-wash absolute inset-0 -z-10" />
      <div className="detail-container grid min-h-[395px] grid-cols-[minmax(0,1fr)_200px] items-center gap-10 py-10 max-sm:grid-cols-1 max-sm:gap-6 max-sm:py-8">
        <div className="min-w-0">
          <h1 id="movie-title" className="break-words text-5xl font-bold leading-[1.1] max-sm:text-3xl">{movie.title}</h1>
          <p className="mt-4 flex flex-wrap gap-x-2 text-base text-on-hero/80"><span>{movie.certificate}</span><span aria-hidden="true">|</span><span>{movie.languages.join(", ")}</span><span aria-hidden="true">|</span><span>{duration}</span></p>
          {movie.description && <p className="mt-4 line-clamp-3 max-w-[720px] text-base leading-6 text-on-hero/85">{movie.description}</p>}
          {!!movie.genres.length && <div className="mt-4 flex flex-wrap gap-2">{movie.genres.map((genre) => <span key={genre} className="rounded-full bg-on-hero/15 px-3 py-1 text-xs font-semibold text-on-hero">{genre}</span>)}</div>}
          {releaseLabel && <p className="mt-4 text-[13px] text-on-hero/80">Released {releaseLabel}</p>}
          <Button asChild className="mt-5 h-12 w-[171px] rounded-xl bg-on-hero text-hero-dark shadow-none hover:bg-on-hero/90"><Link to="/movies/$movieId/shows" params={{ movieId: movie.id }} search={{ date: "", afterFive: false, availableOnly: false, favouritesOnly: false }}>Book Tickets</Link></Button>
        </div>
        <div className="relative w-[200px] justify-self-end max-sm:row-start-1 max-sm:w-[150px] max-sm:justify-self-center">
          <img src={movie.posterUrl} alt={`${movie.title} poster`} width={200} height={268} fetchPriority="high" className="aspect-[3/4] w-full rounded-card object-cover shadow-poster" />
          {firstTrailer && <Button variant="ghost" size="icon" className={`${playClass} hover:bg-hero-dark/70 hover:text-on-hero`} aria-label={`Play ${movie.title} trailer`} title="Play trailer" onClick={() => setTrailer(firstTrailer)}><Play className="size-5 fill-current" /></Button>}
        </div>
      </div>
    </section>
    <div className="detail-container space-y-12 py-10 pb-16">
      <section aria-labelledby="cast-heading"><h2 id="cast-heading" className="mb-6 text-lg font-bold">Cast &amp; Crew</h2>
        {movie.cast.length ? <HorizontalScroller label="Cast & Crew">{movie.cast.map((person, index) => <div key={`${person.name}-${index}`} className="w-24 shrink-0 text-center"><img src={person.photoUrl} alt={person.name} loading="lazy" className="size-24 rounded-full border border-subtle object-cover" /><p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-5">{person.name}</p>{person.role && <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{person.role}</p>}</div>)}</HorizontalScroller> : <p className="text-sm text-text-secondary">Cast and crew details are not available yet.</p>}
      </section>
      <section aria-labelledby="trailers-heading"><h2 id="trailers-heading" className="mb-6 text-lg font-bold">Trailers &amp; Videos</h2>
        {movie.trailers.length ? <HorizontalScroller label="Trailers & Videos">{movie.trailers.map((video) => <div key={video.id} className="w-[280px] max-w-full shrink-0"><Button variant="ghost" className="relative block aspect-video h-auto w-full overflow-hidden rounded-xl p-0 hover:bg-transparent" aria-label={`Play ${video.title}`} title={`Play ${video.title}`} onClick={() => setTrailer(video)}><img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" /><span className={playClass}><Play className="size-5 fill-current" /></span>{video.duration && <span className="absolute bottom-2 right-2 rounded-full bg-hero-dark/75 px-2 py-1 text-xs text-on-hero">{video.duration}</span>}</Button><p className="mt-3 line-clamp-2 text-sm leading-5 text-text-secondary">{video.title}</p></div>)}</HorizontalScroller> : <p className="text-sm text-text-secondary">No videos available yet.</p>}
      </section>
      <section aria-labelledby="gallery-heading"><h2 id="gallery-heading" className="mb-6 text-lg font-bold">Posters &amp; Wallpapers</h2>
        {movie.gallery.length ? <HorizontalScroller label="Posters & Wallpapers">{movie.gallery.map((image, index) => <Button key={image.id} variant="ghost" className="h-[220px] w-[165px] shrink-0 overflow-hidden rounded-xl p-0 hover:bg-transparent" aria-label={`View ${movie.title} poster ${index + 1}`} title="View poster" onClick={() => setImageIndex(index)}><img src={image.imageUrl} alt={`${movie.title} poster ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></Button>)}</HorizontalScroller> : <p className="text-sm text-text-secondary">No posters available yet.</p>}
      </section>
    </div>
    <TrailerModal trailer={trailer} onClose={() => setTrailer(null)} />
    <PosterLightbox images={movie.gallery} index={imageIndex} title={movie.title} onChange={setImageIndex} onClose={() => setImageIndex(null)} />
  </>;
}