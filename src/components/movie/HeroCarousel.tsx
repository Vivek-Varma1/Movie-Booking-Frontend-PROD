import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types";
import { cn } from "@/lib/utils";

export function HeroCarousel({ movies }: { movies: Movie[] }) {
  const slides = movies.slice(0, 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);
  if (!slides.length) return null;
  return <section aria-label="Featured movies" aria-roledescription="carousel" className="movie-hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}>
    {slides.map((movie, i) => <div key={movie.id} aria-hidden={i !== index} className={cn("hero-slide", i === index ? "z-10 opacity-100" : "pointer-events-none opacity-0")}>
      <img src={movie.backdropUrl} alt="" className="hero-backdrop" />
      <div className="hero-wash" />
      <div className="hero-content">
        <div className="min-w-0">
          <h1 className="hero-title">{movie.title}</h1>
          <p className="hero-genre mt-4">{movie.certificate} <span className="mx-2 text-text-muted">|</span> {movie.genres.length ? movie.genres.slice(0, 2).join(", ") : movie.languages.join(", ")}{movie.genres.length > 2 && <span> +{movie.genres.length - 2} more</span>}</p>
          {movie.description && <p className="hero-description mt-4 max-w-[700px] text-text-secondary">{movie.description}</p>}
          <Button asChild className="mt-7 h-16 w-[200px] rounded-card text-xl font-semibold shadow-none max-sm:mt-5 max-sm:h-12 max-sm:w-40 max-sm:text-base"><Link to="/movies/$movieId" params={{ movieId: movie.id }} tabIndex={i === index ? 0 : -1}>Book now</Link></Button>
        </div>
        <img src={movie.posterUrl} alt={`${movie.title} poster`} className="hero-poster" width={334} height={445} fetchPriority={i === 0 ? "high" : "auto"} />
      </div>
    </div>)}
    {slides.length > 1 && <><Button variant="outline" size="icon" title="Previous movie" aria-label="Previous movie" className="absolute left-5 top-1/2 z-20 size-10 -translate-y-1/2 rounded-full border-subtle bg-surface/80 text-text-primary hover:bg-surface hover:text-text-primary max-sm:left-2 max-sm:size-8" onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}><ArrowLeft /></Button>
    <Button variant="outline" size="icon" title="Next movie" aria-label="Next movie" className="absolute right-5 top-1/2 z-20 size-10 -translate-y-1/2 rounded-full border-subtle bg-surface/80 text-text-primary hover:bg-surface hover:text-text-primary max-sm:right-2 max-sm:size-8" onClick={() => setIndex((i) => (i + 1) % slides.length)}><ArrowRight /></Button></>}
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">{slides.map((movie, i) => <Button key={movie.id} variant="ghost" size="icon" aria-label={`Show ${movie.title}`} aria-pressed={index === i} title={movie.title} onClick={() => setIndex(i)} className="h-7 w-8 rounded-full hover:bg-transparent"><span className={cn("h-2 rounded-full transition-all", index === i ? "w-6 bg-primary" : "w-2 bg-text-muted/50")} /></Button>)}</div>
  </section>;
}