import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, RotateCcw } from "lucide-react";
import { MovieShows } from "@/components/movie/MovieShows";
import { Button } from "@/components/ui/button";
import { movieQuery, showDatesQuery, showsQuery } from "@/hooks/queries";
import { bookingDate } from "@/lib/show-filters";
import { appConfig } from "@/theme/theme";
import { useCity } from "@/components/city/CityContext";

export const Route = createFileRoute("/movies/$movieId/shows")({
  validateSearch: (search: { date?: unknown; afterFive?: unknown; availableOnly?: unknown; favouritesOnly?: unknown }) => ({
    date: typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : "",
    afterFive: search.afterFive === true || search.afterFive === "true",
    availableOnly: search.availableOnly === true || search.availableOnly === "true",
    favouritesOnly: search.favouritesOnly === true || search.favouritesOnly === "true",
  }),
  pendingMs: 100,
  pendingComponent: ShowsSkeleton,
  errorComponent: ShowsError,
  notFoundComponent: () => <div className="shows-container py-20 text-center"><h1 className="text-2xl font-bold">Movie not found</h1><Button asChild variant="outline" className="mt-5"><Link to="/">Browse movies</Link></Button></div>,
  head: () => {
    const title = `Movie showtimes — ${appConfig.appName}`;
    const description = "Choose a date, theatre and showtime for your next movie.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: ShowsPage,
});

function ShowsPage() {
  const { movieId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { selectedCity, loading: cityLoading, error: cityError, retry: retryCities } = useCity();
  const cityId = selectedCity ? String(selectedCity.cityId) : "";
  const movieResult = useQuery({ ...movieQuery(movieId), enabled: !!cityId, staleTime: 60_000 });
  const datesResult = useQuery({ ...showDatesQuery(movieId, cityId), enabled: !!cityId });
  const dates = datesResult.data ?? [];
  const date = dates.includes(search.date) ? search.date : dates[0] ?? "";
  const showsResult = useQuery({ ...showsQuery(movieId, date, cityId), enabled: !!cityId && !!date });
  const today = bookingDate(new Date());
  if (cityLoading) return <ShowsSkeleton />;
  if (cityError) return <div role="alert" className="shows-container py-24 text-center"><h1 className="text-2xl font-bold">Cities couldn’t load</h1><p className="mt-3 text-text-secondary">{cityError}</p><Button className="mt-6" onClick={retryCities}><RotateCcw />Try again</Button></div>;
  if (!selectedCity) return <div className="shows-container py-24 text-center"><h1 className="text-2xl font-bold">No cities available</h1><p className="mt-3 text-text-secondary">The service has not returned any cities yet.</p></div>;
  if (movieResult.isPending || datesResult.isPending) return <ShowsSkeleton />;
  if (movieResult.isError || datesResult.isError) return <ShowsError error={movieResult.error ?? datesResult.error ?? new Error("Showtimes couldn’t load")} reset={() => { void (movieResult.isError ? movieResult.refetch() : datesResult.refetch()); }} />;
  if (!movieResult.data) return <div className="shows-container py-24 text-center"><h1 className="text-2xl font-bold">Movie not found</h1><Button asChild variant="outline" className="mt-5"><Link to="/">Browse movies</Link></Button></div>;
  if (dates.length === 0) return <div className="shows-container py-24 text-center"><CalendarDays className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">No show dates available</h1><p className="mt-2 text-text-secondary">There are no show dates for {selectedCity.name} yet.</p><Button asChild variant="outline" className="mt-5"><Link to="/">Browse movies</Link></Button></div>;
  if (showsResult.isPending) return <ShowsSkeleton />;
  if (showsResult.isError) return <ShowsError error={showsResult.error} reset={() => { void showsResult.refetch(); }} />;
  return <MovieShows movie={movieResult.data} groups={showsResult.data ?? []} dates={dates} cityId={cityId} today={today} date={date} initialNow={new Date().toISOString()} filters={search} onDate={(nextDate) => navigate({ search: { ...search, date: nextDate }, resetScroll: false })} onFilters={(filters) => navigate({ search: { ...search, ...filters }, replace: true, resetScroll: false })} />;
}
function ShowsSkeleton() {
  return <div aria-busy="true" aria-label="Loading showtimes" className="animate-pulse"><div className="shows-container py-8"><div className="flex gap-6"><div className="h-32 w-24 rounded-lg bg-page-muted" /><div className="flex-1 space-y-4 pt-2"><div className="h-8 w-3/4 rounded bg-page-muted" /><div className="h-4 w-40 rounded bg-page-muted" /><div className="h-4 w-24 rounded bg-page-muted" /></div></div><div className="mt-7 flex gap-4">{Array.from({ length: 7 }, (_, index) => <div key={index} className="size-14 shrink-0 rounded-xl bg-page-muted" />)}</div></div><div className="bg-page-muted py-5"><div className="shows-container space-y-3">{[0, 1, 2].map((index) => <div key={index} className="h-28 rounded-card bg-surface" />)}</div></div></div>;
}
function ShowsError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <div role="alert" className="shows-container py-24 text-center"><CalendarDays className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">Showtimes couldn’t load</h1><p className="mt-3 text-text-secondary">{error instanceof Error && error.message === "Network Error" ? "The movie service has not allowed access from this website, or is temporarily unreachable." : "The schedule is temporarily unavailable. Please try again."}</p><Button className="mt-6" onClick={() => router.invalidate()}><RotateCcw />Try again</Button></div>;
}
