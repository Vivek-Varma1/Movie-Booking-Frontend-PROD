import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, RotateCcw } from "lucide-react";
import { MovieShows } from "@/components/movie/MovieShows";
import { Button } from "@/components/ui/button";
import { movieQuery, showsQuery } from "@/hooks/queries";
import { bookingDate, nextSevenDates } from "@/lib/show-filters";
import { appConfig } from "@/theme/theme";

export const Route = createFileRoute("/movies/$movieId/shows")({
  validateSearch: (search: { date?: unknown; afterFive?: unknown; availableOnly?: unknown; favouritesOnly?: unknown }) => ({
    date: typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : "",
    afterFive: search.afterFive === true || search.afterFive === "true",
    availableOnly: search.availableOnly === true || search.availableOnly === "true",
    favouritesOnly: search.favouritesOnly === true || search.favouritesOnly === "true",
  }),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ context, params, deps }) => {
    const now = new Date();
    const today = bookingDate(now);
    const date = nextSevenDates(today).includes(deps.date) ? deps.date : today;
    const [movie, groups] = await Promise.all([context.queryClient.ensureQueryData(movieQuery(params.movieId)), context.queryClient.ensureQueryData(showsQuery(params.movieId, date))]);
    return { movie, groups, today, date, initialNow: now.toISOString() };
  },
  pendingMs: 100,
  pendingComponent: ShowsSkeleton,
  errorComponent: ShowsError,
  notFoundComponent: () => <div className="shows-container py-20 text-center"><h1 className="text-2xl font-bold">Movie not found</h1><Button asChild variant="outline" className="mt-5"><Link to="/">Browse movies</Link></Button></div>,
  head: ({ loaderData }) => {
    const movie = loaderData?.movie;
    const title = `${movie?.title ?? "Movie"} showtimes — ${appConfig.appName}`;
    const description = `Choose a date, theatre and showtime for ${movie?.title ?? "your next movie"} in ${appConfig.defaultCity}.`;
    const image = movie?.posterUrl.startsWith("https://") ? movie.posterUrl : undefined;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : [])] };
  },
  component: ShowsPage,
});

function ShowsPage() {
  const { movieId } = Route.useParams();
  const initial = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: movie } = useSuspenseQuery({ ...movieQuery(movieId), initialData: initial.movie, staleTime: 60_000 });
  const { data: groups } = useSuspenseQuery({ ...showsQuery(movieId, initial.date), initialData: initial.groups, staleTime: 60_000 });
  return <MovieShows movie={movie} groups={groups} today={initial.today} date={initial.date} initialNow={initial.initialNow} filters={search} onDate={(date) => navigate({ search: { ...search, date }, resetScroll: false })} onFilters={(filters) => navigate({ search: { ...search, ...filters }, replace: true, resetScroll: false })} />;
}
function ShowsSkeleton() {
  return <div aria-busy="true" aria-label="Loading showtimes" className="animate-pulse"><div className="shows-container py-8"><div className="flex gap-6"><div className="h-32 w-24 rounded-lg bg-page-muted" /><div className="flex-1 space-y-4 pt-2"><div className="h-8 w-3/4 rounded bg-page-muted" /><div className="h-4 w-40 rounded bg-page-muted" /><div className="h-4 w-24 rounded bg-page-muted" /></div></div><div className="mt-7 flex gap-4">{Array.from({ length: 7 }, (_, index) => <div key={index} className="size-14 shrink-0 rounded-xl bg-page-muted" />)}</div></div><div className="bg-page-muted py-5"><div className="shows-container space-y-3">{[0, 1, 2].map((index) => <div key={index} className="h-28 rounded-card bg-surface" />)}</div></div></div>;
}
function ShowsError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <div role="alert" className="shows-container py-24 text-center"><CalendarDays className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">Showtimes couldn’t load</h1><p className="mt-3 text-text-secondary">{error instanceof Error && error.message === "Network Error" ? "The movie service has not allowed access from this website, or is temporarily unreachable." : "The schedule is temporarily unavailable. Please try again."}</p><Button className="mt-6" onClick={() => router.invalidate()}><RotateCcw />Try again</Button></div>;
}
