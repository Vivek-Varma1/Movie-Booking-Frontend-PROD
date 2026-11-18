import { useState } from "react";
import type { MovieEdition } from "@/lib/groupMovies";
import { setPreferredLanguage } from "@/lib/groupMovies";

export function LanguageSwitcher({
  editions,
  selectedId,
  appearance = "light",
  onSelect,
}: {
  editions: MovieEdition[];
  selectedId: string;
  appearance?: "light" | "dark";
  onSelect: (edition: MovieEdition) => void | Promise<void>;
}) {
  const [pendingId, setPendingId] = useState("");
  if (editions.length <= 1) return null;
  const dark = appearance === "dark";
  const unselected = dark
    ? "border-on-hero/35 bg-on-hero/10 text-on-hero hover:bg-on-hero/20"
    : "border-subtle bg-surface text-text-secondary hover:bg-page-muted";
  const selected = dark
    ? "border-on-hero bg-on-hero text-hero-dark"
    : "border-primary bg-primary text-on-primary";
  const choose = async (edition: MovieEdition) => {
    if (edition.id === selectedId || pendingId) return;
    setPreferredLanguage(edition.language);
    setPendingId(edition.id);
    try {
      await onSelect(edition);
    } finally {
      setPendingId("");
    }
  };
  return (
    <div className="space-y-2" aria-label="Choose language edition">
      <p className={`text-xs font-semibold ${dark ? "text-on-hero/75" : "text-text-secondary"}`}>
        Language
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Language">
        {editions.map((edition) => {
          const active = edition.id === selectedId;
          return (
            <button
              key={edition.id}
              type="button"
              aria-pressed={active}
              disabled={!!pendingId}
              onClick={() => void choose(edition)}
              className={`min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 ${active ? selected : unselected}`}
            >
              {edition.language || "Other"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
