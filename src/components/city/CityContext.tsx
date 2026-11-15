import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/AuthContext";
import { getCities, type City } from "@/services/cities";

const ANONYMOUS_KEY = "cv_city_preference:anonymous";
const userKey = (id: string | number) => `cv_city_preference:user:${id}`;
type CityState = { cities: City[]; selectedCity: City | null; loading: boolean; error: string; selectCity: (city: City) => void; retry: () => void };
const Context = createContext<CityState | null>(null);

function readPreference(key: string): City | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<City>;
    if ((typeof parsed.cityId === "number" || typeof parsed.cityId === "string") && typeof parsed.name === "string") return { cityId: Number(parsed.cityId), name: parsed.name };
  } catch { /* Storage may be unavailable or malformed. */ }
  return null;
}
function savePreference(key: string, city: City) { try { localStorage.setItem(key, JSON.stringify({ cityId: city.cityId, name: city.name })); } catch { /* Keep the in-memory selection. */ } }

export function CityProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const initialized = useRef(false);
  const userSelectedCity = useRef(false);
  const previousUserKey = useRef<string | null>(null);
  const identityKey = user ? String(user.id) : null;

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void getCities().then((items) => {
      if (!active) return;
      setCities(items);
      if (!items.length) { setSelectedCity(null); setLoading(false); return; }
      const valid = (value: City | null) => value && items.find((city) => city.cityId === value.cityId) || null;
      if (!initialized.current && isReady) {
        const preferred = identityKey ? readPreference(userKey(identityKey)) : null;
        setSelectedCity((userSelectedCity.current ? valid(selectedCity) : null) ?? valid(preferred) ?? valid(readPreference(ANONYMOUS_KEY)) ?? items[0] ?? null);
        initialized.current = true;
        previousUserKey.current = identityKey;
      } else if (selectedCity) {
        setSelectedCity(valid(selectedCity) ?? items[0] ?? null);
      }
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load cities."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // Auth readiness gates initial preference selection; retries refetch the catalog.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, isReady]);

  useEffect(() => {
    if (!initialized.current || !isReady || previousUserKey.current === identityKey) return;
    if (selectedCity) savePreference(identityKey ? userKey(identityKey) : ANONYMOUS_KEY, selectedCity);
    previousUserKey.current = identityKey;
  }, [identityKey, isReady, selectedCity]);

  const selectCity = useCallback((city: City) => {
    userSelectedCity.current = true;
    setSelectedCity(city);
    savePreference(identityKey ? userKey(identityKey) : ANONYMOUS_KEY, city);
    queryClient.removeQueries({ queryKey: ["movies"] });
    queryClient.removeQueries({ queryKey: ["shows"] });
    queryClient.removeQueries({ queryKey: ["show-dates"] });
    void router.invalidate();
  }, [identityKey, queryClient, router]);
  const value = useMemo<CityState>(() => ({ cities, selectedCity, loading, error, selectCity, retry: () => setAttempt((n) => n + 1) }), [cities, selectedCity, loading, error, selectCity]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCity() {
  const value = useContext(Context);
  if (!value) throw new Error("useCity must be used inside CityProvider");
  return value;
}
