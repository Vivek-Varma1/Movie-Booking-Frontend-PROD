import { Link } from "@tanstack/react-router";
import { Heart, Info, Navigation, Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isPastShow, SHOW_TIME_ZONE } from "@/lib/show-filters";
import type { TheatreShows } from "@/types";

const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: SHOW_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: true });
const statusClasses = { AVAILABLE: "text-primary", FILLING_FAST: "text-status-filling", ALMOST_FULL: "text-status-almost-full" };

export function TheatreShowCard({ group, date, now, favourite, onFavourite }: { group: TheatreShows; date: string; now: Date; favourite: boolean; onFavourite: () => void }) {
  const { theatre, shows } = group;
  const [logoFailed, setLogoFailed] = useState(false);
  return <article className="grid gap-5 rounded-card bg-surface p-4 sm:grid-cols-[320px_minmax(0,1fr)] sm:gap-6">
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-subtle bg-page-muted text-text-secondary">
        {theatre.logoUrl && !logoFailed ? <img src={theatre.logoUrl} alt="" className="size-full object-cover" onError={() => setLogoFailed(true)} /> : <Building2 className="size-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1"><h2 className="min-w-0 flex-1 break-words text-base font-bold leading-6">{theatre.name}</h2>
          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-6 shrink-0 rounded-full text-text-muted hover:bg-page-muted hover:text-text-primary" aria-label={`Information about ${theatre.name}`} title="Theatre information"><Info className="size-3.5" /></Button></PopoverTrigger><PopoverContent className="text-sm" align="start"><p className="font-bold">{theatre.name}</p><p className="mt-2 text-text-secondary">{theatre.address || "Address not provided"}</p><p className="mt-2 text-text-muted">{theatre.cancellable === undefined ? "Cancellation policy not provided" : theatre.cancellable ? "Cancellable" : "Non-cancellable"}</p></PopoverContent></Popover>
          <Button variant="ghost" size="icon" className={cn("size-6 shrink-0 rounded-full hover:bg-page-muted hover:text-text-primary", favourite ? "text-status-almost-full" : "text-text-muted")} aria-label={`${favourite ? "Remove" : "Add"} ${theatre.name} ${favourite ? "from" : "to"} favourites`} title={favourite ? "Remove favourite" : "Add favourite"} aria-pressed={favourite} onClick={onFavourite}><Heart className={cn("size-4", favourite && "fill-current")} /></Button>
        </div>
        {theatre.distanceKm !== undefined && <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary"><Navigation className="size-3" />{theatre.distanceKm.toFixed(1)} km away</p>}
        {theatre.cancellable !== undefined && <p className="mt-2 text-xs text-text-muted">{theatre.cancellable ? "Cancellable" : "Non-cancellable"}</p>}
        {theatre.distanceKm === undefined && theatre.address && <p className="mt-2 text-xs leading-5 text-text-secondary">{theatre.address}</p>}
      </div>
    </div>
    <div className="flex flex-wrap content-start gap-3 sm:pt-1">
      {shows.map((show) => {
        const past = isPastShow(show, date, now);
        const soldOut = show.availableSeats === 0;
        const label = timeFormat.format(new Date(show.startTime));
        const className = cn("h-11 w-[140px] rounded-lg border-subtle bg-surface text-base font-semibold shadow-none hover:bg-page-muted hover:text-text-primary max-sm:w-auto max-sm:flex-[0_0_calc((100%-24px)/3)]", show.availability ? statusClasses[show.availability] : "text-text-secondary", (past || soldOut) && "text-text-muted opacity-60");
        const title = past ? "Show already started" : soldOut ? "Sold out" : [show.screenName, show.availability?.replace(/_/g, " "), show.availableSeats === undefined ? undefined : `${show.availableSeats} seats available`].filter(Boolean).join(" · ");
        return past || soldOut ? <Button key={show.id} variant="outline" disabled className={className} title={title} aria-label={`${label} — ${title}`}>{label}</Button> : <Button key={show.id} variant="outline" asChild className={className}><Link to="/shows/$showId/seats" params={{ showId: show.id }} title={title}>{label}</Link></Button>;
      })}
    </div>
  </article>;
}