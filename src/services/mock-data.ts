import type { Movie, SeatCell, SeatLayout, SeatRow, Show, ShowAvailability, Theatre } from "@/types";
import poster1 from "@/assets/m1-poster.jpg";
import poster2 from "@/assets/m2-poster.jpg";
import poster3 from "@/assets/m3-poster.jpg";
import poster4 from "@/assets/m4-poster.jpg";
import poster5 from "@/assets/m5-poster.jpg";
import poster6 from "@/assets/m6-poster.jpg";
import poster7 from "@/assets/m7-poster.jpg";

const posters = [poster1, poster2, poster3, poster4, poster5, poster6, poster7];

const img = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const castPool: [string, string][] = [
  ["Prabhas", "Hero"], ["Mahesh Babu", "Hero"], ["Allu Arjun", "Hero"], ["Jr NTR", "Hero"],
  ["Samantha", "Heroine"], ["Rashmika Mandanna", "Heroine"], ["Pooja Hegde", "Heroine"],
  ["Prakash Raj", "Supporting"], ["Brahmanandam", "Comedian"], ["Ramya Krishnan", "Supporting"],
];

const base: Array<Omit<Movie, "cast" | "trailers" | "gallery" | "posterUrl" | "backdropUrl">> = [
  { id: "m1", title: "Kalki Rising", certificate: "UA", languages: ["Telugu", "Hindi", "Tamil"], durationMins: 178, genres: ["Sci-Fi", "Action"], description: "In a dystopian future, a bounty hunter crosses paths with a prophecy that could save the last city on earth.", releaseDate: "2026-10-02" },
  { id: "m2", title: "Godavari Express", certificate: "U", languages: ["Telugu"], durationMins: 142, genres: ["Drama", "Family"], description: "A train journey along the Godavari reunites three estranged brothers for one last trip home.", releaseDate: "2026-10-09" },
  { id: "m3", title: "Pushpa Returns", certificate: "A", languages: ["Telugu", "Hindi", "Malayalam"], durationMins: 165, genres: ["Action", "Crime"], description: "The red-sandalwood smuggler is back, and this time the forest isn't big enough for his enemies.", releaseDate: "2026-09-25" },
  { id: "m4", title: "Vizag Nights", certificate: "UA", languages: ["Telugu", "Tamil"], durationMins: 131, genres: ["Thriller"], description: "A cab driver in Visakhapatnam becomes the only witness to a crime nobody wants solved.", releaseDate: "2026-10-16" },
  { id: "m5", title: "Bava Bammardi", certificate: "U", languages: ["Telugu"], durationMins: 138, genres: ["Comedy", "Romance"], description: "Two brothers-in-law plan the perfect wedding and get everything hilariously wrong.", releaseDate: "2026-10-16" },
  { id: "m6", title: "Amaravati", certificate: "UA", languages: ["Telugu", "Kannada"], durationMins: 158, genres: ["Historical", "Drama"], description: "The epic tale of the Satavahana queen who defended the city of gods.", releaseDate: "2026-08-29" },
  { id: "m7", title: "Rocket Raju", certificate: "U", languages: ["Telugu", "Hindi"], durationMins: 124, genres: ["Animation", "Family"], description: "A village boy from Srikakulam builds a rocket out of scrap to reach his late grandfather's star.", releaseDate: "2026-10-23" },
];

export const mockMovies: Movie[] = base.map((m, i) => ({
  ...m,
  posterUrl: posters[i] ?? poster1,
  backdropUrl: posters[i] ?? poster1,
  cast: Array.from({ length: 6 }, (_, k) => {
    const [name, role] = castPool[(i + k) % castPool.length] ?? ["Cast", "Supporting"];
    return { name, role, photoUrl: img(`cast-${name}`, 200, 200) };
  }),
  trailers: Array.from({ length: 3 }, (_, k) => ({
    id: `${m.id}-t${k}`,
    title: k === 0 ? "Official Trailer" : `Teaser ${k}`,
    thumbnailUrl: img(`${m.id}-trailer-${k}`, 640, 360),
    duration: `${2 - (k ? 1 : 0)}:${(15 + k * 11).toString().padStart(2, "0")}`,
  })),
  gallery: Array.from({ length: 6 }, (_, k) => ({ id: `${m.id}-g${k}`, imageUrl: img(`${m.id}-g${k}`, 800, 500) })),
}));

export const mockTheatres: Theatre[] = [
  { id: "t1", name: "Sri Lakshmi Theatre: Ponduru", logoUrl: img("t1", 80, 80), address: "Main Road, Ponduru", distanceKm: 0.8, cancellable: true },
  { id: "t2", name: "PVR: CMR Central, Srikakulam", logoUrl: img("t2", 80, 80), address: "Day & Night Junction, Srikakulam", distanceKm: 18.4, cancellable: true },
  { id: "t3", name: "Sarada Cinemas 4K Dolby", logoUrl: img("t3", 80, 80), address: "GT Road, Srikakulam", distanceKm: 17.1, cancellable: false },
  { id: "t4", name: "INOX: Chitralaya Mall, Vizianagaram", logoUrl: img("t4", 80, 80), address: "Cantonment, Vizianagaram", distanceKm: 42.6, cancellable: true },
  { id: "t5", name: "Venkateswara Picture Palace", logoUrl: img("t5", 80, 80), address: "Rajam Road, Ponduru", distanceKm: 2.3, cancellable: false },
];

// Deterministic pseudo-random so mocks are stable across renders/SSR.
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const times = ["09:30", "12:45", "15:50", "18:45", "21:55"];
const avail: ShowAvailability[] = ["AVAILABLE", "FILLING_FAST", "ALMOST_FULL"];

export function mockShows(movieId: string, date: string): Show[] {
  const r = rng(movieId + date);
  return mockTheatres.flatMap((t) =>
    times
      .filter(() => r() > 0.25)
      .map((time) => ({
        id: `${movieId}_${t.id}_${date}_${time.replace(":", "")}`,
        movieId,
        theatreId: t.id,
        startTime: new Date(`${date}T${time}:00+05:30`).toISOString(),
        availability: avail[Math.floor(r() * 3)] ?? "AVAILABLE",
      })),
  );
}

export function mockSeatLayout(showId: string): SeatLayout {
  const r = rng(showId);
  const cols = 24;
  const gaps = new Set([4, 19]); // aisles after these indexes
  const tier = (name: string, price: number, labels: string[], best: boolean): SeatLayout["tiers"][number] => ({
    name,
    price,
    rows: labels.map<SeatRow>((label) => {
      const cells: (SeatCell | null)[] = [];
      let n = 0;
      for (let c = 0; c < cols; c++) {
        if (gaps.has(c)) { cells.push(null); continue; }
        n++;
        const roll = r();
        const status = roll < 0.35 ? "OCCUPIED" : best && c > 6 && c < 18 && roll > 0.6 ? "BEST" : "AVAILABLE";
        cells.push({ id: `${label}${n}`, label, number: n, status });
      }
      return { label, cells };
    }),
  });
  return {
    showId,
    tiers: [
      tier("Recliner", 350, ["N", "M"], false),
      tier("Prime", 220, ["L", "K", "J", "H", "G", "F"], true),
      tier("Classic", 150, ["E", "D", "C", "B", "A"], false),
    ],
  };
}
