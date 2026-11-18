import { Link } from "@tanstack/react-router";
import type { Movie } from "@/types";
import type { MovieGroup } from "@/lib/groupMovies";
import { setPreferredLanguage } from "@/lib/groupMovies";

export function MovieCard({ movie, group }: { movie: Movie; group?: MovieGroup }) {
  const languages = group?.editions.map((edition) => edition.language).filter(Boolean) ?? movie.languages;
  const subtitle = languages.slice(0, 3).join(", ");
  const remainder = Math.max(0, languages.length - 3);
  const title = group?.title ?? movie.title;
  const certificate = group?.certificate ?? movie.certificate;
  return <Link to="/movies/$movieId" params={{ movieId: movie.id }} onClick={() => setPreferredLanguage(movie.languages[0] ?? group?.editions[0]?.language ?? "")} className="group block min-w-0 overflow-hidden rounded-card border border-subtle bg-surface transition duration-150 hover:-translate-y-1 hover:shadow-movie focus-visible:outline-2 focus-visible:outline-accent">
    <img src={group?.posterUrl || movie.posterUrl} alt={`${title} poster`} width={384} height={512} loading="lazy" className="aspect-[3/4] w-full object-cover" />
    <div className="p-3"><h3 className="truncate text-base font-bold text-text-primary" title={title}>{title}</h3><p className="mt-1 truncate text-xs font-semibold text-text-secondary">{certificate} <span className="mx-1 text-text-muted">|</span> {subtitle}{remainder > 0 && <span> +{remainder}</span>}</p></div>
  </Link>;
}
