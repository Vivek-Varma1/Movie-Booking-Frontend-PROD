import { Link } from "@tanstack/react-router";
import type { Movie } from "@/types";

export function MovieCard({ movie }: { movie: Movie }) {
  return <Link to="/movies/$movieId" params={{ movieId: movie.id }} className="group block min-w-0 overflow-hidden rounded-card border border-subtle bg-surface transition duration-150 hover:-translate-y-1 hover:shadow-movie focus-visible:outline-2 focus-visible:outline-accent">
    <img src={movie.posterUrl} alt={`${movie.title} poster`} width={384} height={512} loading="lazy" className="aspect-[3/4] w-full object-cover" />
    <div className="p-3"><h3 className="truncate text-base font-bold text-text-primary" title={movie.title}>{movie.title}</h3><p className="mt-1 text-xs font-semibold text-text-secondary">{movie.certificate} <span className="mx-1 text-text-muted">|</span> {movie.languages[0]}</p></div>
  </Link>;
}