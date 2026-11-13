import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { RotateCcw, Film } from "lucide-react";
import { movieQuery } from "@/hooks/queries";
import { MovieDetails } from "@/components/movie/MovieDetails";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/theme/theme";

export const Route = createFileRoute("/movies/$movieId/")({
  loader: async ({ context, params }) => ({ movie: await context.queryClient.ensureQueryData(movieQuery(params.movieId)) }),
  pendingMs: 100,
  pendingComponent: MovieSkeleton,
  errorComponent: MovieError,
  head: ({ loaderData }) => {
    const movie = loaderData?.movie;
    const title = `${movie?.title ?? "Movie details"} — ${appConfig.appName}`;
    const description = movie?.description || `Trailers, posters and movie tickets for ${movie?.title ?? "your next movie"}.`;
    const image = movie?.backdropUrl.startsWith("https://") ? movie.backdropUrl : undefined;
    return { meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ] };
  },
  component: function MoviePage() {
    const { movieId } = Route.useParams();
    const { movie: initialMovie } = Route.useLoaderData();
    const { data: movie } = useSuspenseQuery({ ...movieQuery(movieId), initialData: initialMovie, staleTime: 60_000 });
    return <MovieDetails key={movie.id} movie={movie} />;
  },
});

function MovieSkeleton() {
  return <div aria-busy="true" aria-label="Loading movie details" className="animate-pulse"><div className="bg-hero-dark"><div className="detail-container flex min-h-[395px] items-center gap-12 py-10"><div className="flex-1 space-y-5"><div className="h-12 w-3/4 rounded-lg bg-on-hero/15" /><div className="h-5 w-1/2 rounded bg-on-hero/15" /><div className="h-20 rounded-lg bg-on-hero/15" /><div className="h-12 w-[171px] rounded-xl bg-on-hero/15" /></div><div className="aspect-[3/4] w-[200px] rounded-card bg-on-hero/15 max-sm:hidden" /></div></div><div className="detail-container space-y-12 py-10">{[0, 1, 2].map((index) => <div key={index}><div className="mb-6 h-6 w-40 rounded bg-page-muted" /><div className="h-28 rounded-lg bg-page-muted" /></div>)}</div></div>;
}
function MovieError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const message = error instanceof Error && error.message === "Network Error" ? "The movie service has not allowed access from this website, or is temporarily unreachable." : "This movie is unavailable. Please try again.";
  return <div role="alert" className="detail-container py-24 text-center"><Film className="mx-auto size-10 text-text-muted" /><h1 className="mt-5 text-2xl font-bold">The movie couldn’t load</h1><p className="mt-3 text-text-secondary">{message}</p><Button className="mt-6" onClick={() => router.invalidate()}><RotateCcw />Try again</Button></div>;
}
