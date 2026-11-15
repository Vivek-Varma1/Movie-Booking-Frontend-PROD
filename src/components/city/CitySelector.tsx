import { useState } from "react";
import { Check, ChevronDown, MapPin, RotateCcw } from "lucide-react";
import { useCity } from "@/components/city/CityContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function CitySelector() {
  const { cities, selectedCity, loading, error, selectCity, retry } = useCity();
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" aria-label="Select city" aria-expanded={open} className="h-10 min-w-0 justify-start gap-2 px-2 text-left hover:bg-page-muted sm:px-3"><MapPin className="size-5 shrink-0 text-accent" /><span className="min-w-0 max-w-28"><span className="block truncate text-sm font-bold leading-5">{loading ? "Loading cities…" : selectedCity?.name ?? "Choose city"}</span><span className="hidden text-xs font-normal text-text-secondary sm:block">Select your location</span></span><ChevronDown className="size-4 shrink-0 text-text-muted" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
      {loading ? <p className="p-5 text-center text-sm text-text-secondary" role="status">Loading cities…</p> : error ? <div className="p-4 text-center"><p role="alert" className="text-sm text-danger">Could not load cities.</p><Button variant="outline" size="sm" className="mt-3" onClick={retry}><RotateCcw />Retry</Button></div> : cities.length === 0 ? <p className="p-5 text-center text-sm text-text-secondary">No cities are available yet.</p> : <Command><CommandInput placeholder="Search cities…" aria-label="Search cities" /><CommandList><CommandEmpty>No matching cities.</CommandEmpty>{cities.map((city) => <CommandItem key={city.cityId} value={city.name} onSelect={() => { selectCity(city); setOpen(false); }}><MapPin className="text-text-muted" /><span>{city.name}</span>{selectedCity?.cityId === city.cityId && <Check className="ml-auto text-accent" />}</CommandItem>)}</CommandList></Command>}
    </PopoverContent>
  </Popover>;
}
