import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Armchair, RotateCcw } from "lucide-react";
import { SeatBooking, SeatHeader } from "@/components/movie/SeatBooking";
import { Button } from "@/components/ui/button";
import { movieQuery, seatLayoutQuery, showQuery, showsQuery } from "@/hooks/queries";
import { appConfig } from "@/theme/theme";
import type { Movie, Show } from "@/types";

export const Route = createFileRoute("/shows/$showId/seats")({
  loader: async ({ context, params }) => {
    const [layout, show] = await Promise.all([context.queryClient.ensureQueryData(seatLayoutQuery(params.showId)), context.queryClient.ensureQueryData(showQuery(params.showId))]);
    let movie: Movie | undefined;
    let siblingShows: Show[] = [];
    if (show.movieId !== undefined) {
      movie = await context.queryClient.ensureQueryData(movieQuery(String(show.movieId)));
      if (show.startTime && show.theatreId !== undefined) {
        const groups = await context.queryClient.ensureQueryData(showsQuery(String(show.movieId), show.startTime.slice(0, 10)));
        siblingShows = groups.find((group) => group.theatre.id === String(show.theatreId))?.shows ?? [];
      }
    }
    return { layout, show, ...(movie ? { movie } : {}), siblingShows };
  },
  pendingMs: 100,
  pendingComponent: SeatsSkeleton,
  errorComponent: SeatsError,
  notFoundComponent: () => <div className="seat-viewport"><SeatHeader /><div className="m-auto text-center"><h1 className="text-xl font-bold">Show not found</h1><Button variant="outline" asChild className="mt-5"><Link to="/">Browse movies</Link></Button></div></div>,
  head: ({ loaderData }) => {
    const movie = loaderData?.movie;
    const title = `Select seats${movie ? ` for ${movie.title}` : ""} — ${appConfig.appName}`;
    const description = `Choose your seats${movie ? ` for ${movie.title}` : " for your movie"} and continue to checkout.`;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: SeatsPage,
});
function SeatsPage() {
  const { showId } = Route.useParams();
  const initial = Route.useLoaderData();
  const { data: layout } = useSuspenseQuery({ ...seatLayoutQuery(showId), initialData: initial.layout, staleTime: 30_000 });
  const { data: show } = useSuspenseQuery({ ...showQuery(showId), initialData: initial.show, staleTime: 60_000 });
  return <SeatBooking key={showId} layout={layout} show={show} {...("movie" in initial && initial.movie ? { movie: initial.movie } : {})} siblingShows={initial.siblingShows} />;
}
function SeatsSkeleton() {
  return <div className="seat-viewport" aria-busy="true" aria-label="Loading seats"><SeatHeader /><div className="h-20 shrink-0 border-b border-subtle" /><div className="seat-canvas animate-pulse"><div className="mx-auto w-max py-8">{Array.from({ length: 12 }, (_, row) => <div key={row} className="mb-2 flex gap-2">{Array.from({ length: 18 }, (_, column) => <span key={column} className="size-8 rounded-seat bg-page-muted" />)}</div>)}</div></div><div className="h-header shrink-0 border-t border-subtle" /></div>;
}
function SeatsError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const missing = typeof error === "object" && error !== null && "response" in error && typeof error.response === "object" && error.response !== null && "status" in error.response && error.response.status === 404;
  return <div className="seat-viewport"><SeatHeader /><div role="alert" className="m-auto max-w-md px-6 text-center"><Armchair className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">{missing ? "This show is unavailable" : "Seats couldn’t load"}</h1><p className="mt-3 text-sm text-text-secondary">{missing ? "There is no seat layout for this show. Choose an available showtime." : "The movie service couldn’t provide a supported seat layout. Please try again."}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => router.invalidate()}><RotateCcw />Try again</Button><Button variant="outline" asChild><Link to="/">Browse movies</Link></Button></div></div></div>;
}
