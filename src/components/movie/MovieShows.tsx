import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { TheatreShowCard } from "./TheatreShowCard";
import { cn } from "@/lib/utils";
import { filterTheatreShows, nextSevenDates, SHOW_TIME_ZONE } from "@/lib/show-filters";
import type { Movie, TheatreShows } from "@/types";

export interface ShowFilters { afterFive: boolean; availableOnly: boolean; favouritesOnly: boolean }
interface Props { movie: Movie; groups: TheatreShows[]; today: string; date: string; initialNow: string; filters: ShowFilters; onDate: (date: string) => void; onFilters: (filters: ShowFilters) => void }
const weekdayFormat = new Intl.DateTimeFormat("en-US", { timeZone: SHOW_TIME_ZONE, weekday: "short" });
const monthFormat = new Intl.DateTimeFormat("en-US", { timeZone: SHOW_TIME_ZONE, month: "short" });

export function MovieShows({ movie, groups, today, date, initialNow, filters, onDate, onFilters }: Props) {
  const [now, setNow] = useState(new Date(initialNow));
  const [favourites, setFavourites] = useState<string[]>([]);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const dates = nextSevenDates(today);
  const filtered = filterTheatreShows(groups, filters, favourites);
  const year = movie.releaseDate?.slice(0, 4);
  const hours = Math.floor(movie.durationMins / 60);
  const minutes = movie.durationMins % 60;
  return <>
    <section className="bg-surface">
      <div className="shows-container pb-5 pt-8 max-sm:pt-6">
        <div className="flex items-center gap-6 max-sm:gap-4">
          <img src={movie.posterUrl} alt={`${movie.title} poster`} className="h-32 w-24 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0"><h1 className="break-words text-[28px] font-bold leading-tight">{movie.title} {year && <span className="font-normal text-text-muted">({year})</span>}</h1><p className="mt-3 text-[13px] text-text-secondary">{[movie.certificate, `${hours}h ${minutes}m`].filter(Boolean).join(" | ")}</p><p className="mt-1.5 text-[13px] text-text-secondary">{movie.languages.join(", ")}</p>{movie.genres.length > 0 && <p className="mt-1.5 text-[13px] text-text-secondary">{movie.genres.join(", ")}</p>}</div>
        </div>
        <div className="media-scroller mt-7 flex gap-3 overflow-x-auto pb-2" role="group" aria-label="Select show date">
          {dates.map((value, index) => {
            const tileDate = new Date(`${value}T12:00:00+05:30`);
            const monthStart = index === 0 || dates[index - 1]?.slice(0, 7) !== value.slice(0, 7);
            return <div key={value} className="flex shrink-0 items-center gap-3">
              {monthStart && <span className="flex h-14 w-6 items-center justify-center rounded-lg bg-page-muted text-[10px] font-semibold text-text-muted"><span className="-rotate-90">{monthFormat.format(tileDate).toUpperCase()}</span></span>}
              {index > 0 && !monthStart && <span className="h-8 w-px bg-subtle" />}
              <Button variant="ghost" className={cn("h-14 w-14 flex-col gap-0 rounded-xl p-0 shadow-none hover:bg-page-muted hover:text-text-primary", date === value && "bg-primary text-on-primary hover:bg-primary/90 hover:text-on-primary")} onClick={() => onDate(value)} aria-pressed={date === value} aria-label={`${weekdayFormat.format(tileDate)}, ${value}${value === today ? ", today" : ""}`}><span className="text-lg font-bold leading-6">{value.slice(8).replace(/^0/, "")}</span><span className="text-xs font-medium">{weekdayFormat.format(tileDate)}</span></Button>
            </div>;
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Popover><PopoverTrigger asChild><Button variant="outline" className="h-9 rounded-lg border-subtle text-[13px] shadow-none hover:bg-page-muted hover:text-text-primary"><SlidersHorizontal />Filters<ChevronDown /></Button></PopoverTrigger><PopoverContent align="start" className="w-64 space-y-4"><h2 className="text-sm font-bold">Filters</h2>{([{ key: "availableOnly", label: "Available seats only" }, { key: "favouritesOnly", label: "Favourite theatres" }] as const).map(({ key, label }) => <label key={key} className="flex cursor-pointer items-center gap-3 text-sm"><Checkbox checked={filters[key]} onCheckedChange={(checked) => onFilters({ ...filters, [key]: checked === true })} />{label}</label>)}</PopoverContent></Popover>
          <Button variant="outline" aria-pressed={filters.afterFive} onClick={() => onFilters({ ...filters, afterFive: !filters.afterFive })} className={cn("h-9 rounded-lg border-subtle text-[13px] shadow-none hover:bg-page-muted hover:text-text-primary", filters.afterFive && "border-primary bg-page-muted font-semibold")}>After 5 PM</Button>
          {(filters.availableOnly || filters.favouritesOnly) && <Button variant="ghost" className="text-xs text-text-secondary hover:bg-page-muted hover:text-text-primary" onClick={() => onFilters({ afterFive: false, availableOnly: false, favouritesOnly: false })}>Clear filters</Button>}
        </div>
      </div>
    </section>
    <section className="min-h-[55vh] bg-page-muted py-5">
      <div className="shows-container">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-card bg-surface px-4 py-4 text-xs font-semibold max-sm:gap-x-4" aria-label="Show availability legend">{[{ label: "Available", color: "text-status-available", dot: "bg-status-available" }, { label: "Filling fast", color: "text-status-filling", dot: "bg-status-filling" }, { label: "Almost full", color: "text-status-almost-full", dot: "bg-status-almost-full" }].map((status) => <span key={status.label} className={cn("flex items-center gap-2", status.color)}><span className={cn("size-1.5 rounded-full", status.dot)} />{status.label}</span>)}</div>
        <div className="space-y-3">{filtered.map((group) => <TheatreShowCard key={group.theatre.id} group={group} date={date} now={now} favourite={favourites.includes(group.theatre.id)} onFavourite={() => setFavourites((prev) => prev.includes(group.theatre.id) ? prev.filter((id) => id !== group.theatre.id) : [...prev, group.theatre.id])} />)}</div>
        {filtered.length === 0 && <div className="py-16 text-center" role="status"><CalendarDays className="mx-auto size-10 text-text-muted" /><h2 className="mt-5 text-lg font-bold">{groups.length ? "No shows match your filters" : "No shows for this date"}</h2><p className="mt-2 text-sm text-text-secondary">{groups.length ? "Try another time or theatre." : "Choose another date to see available showtimes."}</p>{groups.length > 0 && <Button variant="outline" className="mt-5 hover:bg-surface hover:text-text-primary" onClick={() => onFilters({ afterFive: false, availableOnly: false, favouritesOnly: false })}>Clear filters</Button>}</div>}
      </div>
    </section>
  </>;
}