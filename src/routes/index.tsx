import { createFileRoute, useNavigate, useRouter, type ErrorComponentProps, type SearchSchemaInput } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, RotateCcw, SlidersHorizontal, Film } from "lucide-react";
import { appConfig } from "@/theme/theme";
import { moviesQuery } from "@/hooks/queries";
import { MovieCard } from "@/components/movie/MovieCard";
import { HeroCarousel } from "@/components/movie/HeroCarousel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { filterMovies, weeklyReleases } from "@/lib/movie-filters";

export const Route = createFileRoute("/")({
  validateSearch: (search: SearchSchemaInput & { q?: unknown; release?: unknown; language?: unknown; genre?: unknown }) => ({
    q: typeof search.q === "string" ? search.q : "",
    release: search.release === "new" || search.release === "re" ? search.release : "",
    language: typeof search.language === "string" ? search.language : "",
    genre: typeof search.genre === "string" ? search.genre : "",
  }),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(moviesQuery()); },
  pendingMs: 100,
  pendingComponent: HomeSkeleton,
  errorComponent: HomeError,
  notFoundComponent: () => <div className="home-container py-20 text-center">No movies found.</div>,
  head: () => ({
    meta: [
      { title: `${appConfig.appName} — Book movie tickets` },
      { name: "description", content: `Book movie tickets in ${appConfig.defaultCity} and nearby theatres.` },
      { property: "og:title", content: `${appConfig.appName} — Book movie tickets` },
      { property: "og:description", content: "Browse movies, pick showtimes and choose your seats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: movies } = useSuspenseQuery(moviesQuery());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const update = (key: "release" | "language" | "genre", value: string) => navigate({ search: (prev) => ({ ...prev, [key]: value }), resetScroll: false });
  const today = new Date();
  const releases = weeklyReleases(movies, today);
  const filtered = filterMovies(movies, search, today);
  const languages = [...new Set(movies.flatMap((m) => m.languages))];
  const genres = [...new Set(movies.flatMap((m) => m.genres))];
  const hasFilters = !!(search.q || search.release || search.language || search.genre);
  const chip = "h-9 rounded-lg border-subtle bg-surface px-4 text-sm font-semibold text-text-secondary shadow-none hover:bg-page-muted hover:text-text-primary";
  if (!movies.length) return <div className="home-container py-24 text-center"><Film className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">No movies showing just yet</h1><p className="mt-2 text-text-secondary">Check back soon for the next big release.</p></div>;
  return <>
    <HeroCarousel movies={movies} />
    <div className="home-container pb-16">
      {!search.q && <section className="pt-6" aria-labelledby="weekly-heading"><h2 id="weekly-heading" className="mb-6 text-2xl font-bold">This Week’s Releases</h2>{releases.length ? <div className="release-grid">{releases.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div> : <p className="py-6 text-text-secondary">No new releases this week. Explore all movies below.</p>}</section>}
      <section className="mt-10" aria-labelledby="all-heading"><div className="mb-5 flex items-center justify-between gap-3"><h2 id="all-heading" className="text-2xl font-bold">{search.q ? "Search results" : "All Movies"}</h2><span className="text-sm text-text-muted">{filtered.length} movies</span></div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Popover><PopoverTrigger asChild><Button variant="outline" className={cn(chip, (search.language || search.genre) && "border-primary bg-filter-tint text-text-primary")}><SlidersHorizontal />Filters<ChevronDown /></Button></PopoverTrigger><PopoverContent align="start" className="w-72"><label className="block text-sm font-semibold">Language<select aria-label="Language" value={search.language} onChange={(e) => update("language", e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-subtle bg-surface px-3 text-text-primary"><option value="">All languages</option>{languages.map((l) => <option key={l}>{l}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">Genre<select aria-label="Genre" value={search.genre} onChange={(e) => update("genre", e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-subtle bg-surface px-3 text-text-primary"><option value="">All genres</option>{genres.map((g) => <option key={g}>{g}</option>)}</select></label></PopoverContent></Popover>
          <Button variant="outline" aria-pressed={search.release === "new"} className={cn(chip, search.release === "new" && "border-primary bg-filter-tint text-text-primary")} onClick={() => update("release", search.release === "new" ? "" : "new")}>New Releases</Button>
          <Button variant="outline" aria-pressed={search.release === "re"} className={cn(chip, search.release === "re" && "border-primary bg-filter-tint text-text-primary")} onClick={() => update("release", search.release === "re" ? "" : "re")}>Re-Releases</Button>
          {hasFilters && <Button variant="ghost" className="h-9 text-text-secondary hover:bg-page-muted hover:text-text-primary" onClick={() => navigate({ search: { q: "", release: "", language: "", genre: "" }, resetScroll: false })}><RotateCcw />Clear</Button>}
        </div>
        {filtered.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{filtered.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div> : <div className="py-16 text-center"><SearchEmpty /><h3 className="mt-4 text-xl font-bold">No matching movies</h3><p className="mt-2 text-text-secondary">Try another title or clear your filters.</p></div>}
      </section>
    </div>
  </>;
}

function SearchEmpty() { return <Film className="mx-auto size-10 text-text-muted" />; }
function HomeSkeleton() {
  return <div aria-busy="true" aria-label="Loading movies" className="animate-pulse"><div className="home-container flex h-[560px] items-center justify-between gap-12"><div className="w-1/2 space-y-5"><div className="h-12 w-3/4 rounded-lg bg-page-muted" /><div className="h-6 w-full rounded-lg bg-page-muted" /><div className="h-20 rounded-lg bg-page-muted" /></div><div className="aspect-[3/4] w-[334px] rounded-card bg-page-muted max-sm:w-32" /></div><div className="home-container grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[3/5] rounded-card bg-page-muted" />)}</div></div>;
}
function HomeError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const blocked = error instanceof Error && error.message === "Network Error";
  return <div role="alert" className="home-container py-24 text-center"><Film className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">The movies couldn’t load</h1><p className="mt-2 text-text-secondary">{blocked ? "The movie service is unreachable or has not allowed access from this website." : "Please try again in a moment."}</p><Button className="mt-6" onClick={() => router.invalidate()}><RotateCcw />Try again</Button></div>;
}
