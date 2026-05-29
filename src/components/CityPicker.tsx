import { useEffect, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { CITIES, nearestCities } from "@/data/cities";
import type { City } from "@/data/guides";

type Value = "All" | City;

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function CityPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [suggested, setSuggested] = useState<City[] | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setSuggested(nearestCities(pos.coords.latitude, pos.coords.longitude, 3)),
      () => setSuggested(CITIES.slice(0, 3).map((c) => c.name)),
      { timeout: 5000, maximumAge: 1000 * 60 * 60 },
    );
  }, []);

  const select = (v: Value) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/70"
        >
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {value === "All" ? "All cities" : value}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search cities…" />
          <CommandList>
            <CommandEmpty>No cities found.</CommandEmpty>
            {suggested && suggested.length > 0 && (
              <>
                <CommandGroup heading="Suggested near you">
                  {suggested.map((c) => (
                    <CommandItem key={`s-${c}`} value={`suggested-${c}`} onSelect={() => select(c)}>
                      <MapPin className="mr-2 h-4 w-4 opacity-60" />
                      {c}
                      {value === c && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="All cities">
              <CommandItem value="All cities" onSelect={() => select("All")}>
                All cities
                {value === "All" && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {CITIES.map((c) => (
                <CommandItem key={c.name} value={c.name} onSelect={() => select(c.name)}>
                  {c.name}
                  {value === c.name && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
