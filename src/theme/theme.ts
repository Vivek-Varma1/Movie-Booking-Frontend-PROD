// Single source of truth for design tokens. Every value can be overridden via VITE_* env vars.
const env = import.meta.env as Record<string, string | undefined>;
const read = (key: string, fallback: string) => env[key] || fallback;

export const appConfig = {
  appName: read("VITE_APP_NAME", "Cineverse"),
  defaultCity: read("VITE_DEFAULT_CITY", "Srikakulam"),
  defaultCityId: read("VITE_DEFAULT_CITY_ID", "1"),
  defaultState: read("VITE_DEFAULT_STATE", "Andhra Pradesh"),
  fontFamily: read("VITE_FONT_FAMILY", "Figtree"),
  apiBaseUrl: read("VITE_API_BASE_URL", "https://movie-booking-service-rabbitmq.onrender.com/api"),
  useMock: read("VITE_USE_MOCK", "false") === "true",
  termsUrl: read("VITE_TERMS_URL", ""),
  privacyUrl: read("VITE_PRIVACY_URL", ""),
};

/** env key -> [css variable, default] */
const tokenDefs: Record<string, [string, string]> = {
  VITE_COLOR_SUCCESS: ["--color-success", "#1A9B5B"],
  VITE_COLOR_WARNING: ["--color-warning", "#C9A21A"],
  VITE_COLOR_INFO: ["--color-info", "#1F6FD6"],
  VITE_COLOR_CAT_REGULAR: ["--color-cat-regular", "#E8E8E8"],
  VITE_COLOR_CAT_PREMIUM: ["--color-cat-premium", "#CFE3FF"],
  VITE_COLOR_CAT_RECLINER: ["--color-cat-recliner", "#FFD9B0"],
  VITE_ADMIN_SIDEBAR_WIDTH: ["--admin-sidebar-width", "248px"],
  VITE_COLOR_PAGE_BG: ["--color-page-bg", "#FFFFFF"],
  VITE_COLOR_PAGE_BG_MUTED: ["--color-page-bg-muted", "#F0F0F0"],
  VITE_COLOR_SURFACE: ["--color-surface", "#FFFFFF"],
  VITE_COLOR_BORDER: ["--color-border-subtle", "#E3E3E3"],
  VITE_COLOR_TEXT_PRIMARY: ["--color-text-primary", "#1C1C1C"],
  VITE_COLOR_TEXT_SECONDARY: ["--color-text-secondary", "#5F5F5F"],
  VITE_COLOR_TEXT_MUTED: ["--color-text-muted", "#9A9A9A"],
  VITE_COLOR_PRIMARY: ["--color-brand-primary", "#141414"],
  VITE_COLOR_ON_PRIMARY: ["--color-on-primary", "#FFFFFF"],
  VITE_COLOR_ACCENT: ["--color-brand-accent", "#6C47FF"],
  VITE_COLOR_ACCENT_SOFT: ["--color-accent-soft", "#C4B5FD"],
  VITE_COLOR_BANNER_FROM: ["--color-banner-from", "#C03BE8"],
  VITE_COLOR_BANNER_TO: ["--color-banner-to", "#5B2FD0"],
  VITE_COLOR_NAV_ACTIVE_BG: ["--color-nav-active-bg", "#DDEEFB"],
  VITE_COLOR_NAV_ACTIVE_TEXT: ["--color-nav-active-text", "#1F6FD6"],
  VITE_COLOR_SEAT_AVAILABLE_BORDER: ["--color-seat-available-border", "#1C1C1C"],
  VITE_COLOR_SEAT_OCCUPIED_BG: ["--color-seat-occupied-bg", "#F6F6F6"],
  VITE_COLOR_SEAT_OCCUPIED_BORDER: ["--color-seat-occupied-border", "#E3E3E3"],
  VITE_COLOR_SEAT_OCCUPIED_ICON: ["--color-seat-occupied-icon", "#9A9A9A"],
  VITE_COLOR_SEAT_BEST_FROM: ["--color-seat-best-from", "#E3F0FF"],
  VITE_COLOR_SEAT_BEST_TO: ["--color-seat-best-to", "#9CCBFF"],
  VITE_COLOR_SEAT_BEST_BORDER: ["--color-seat-best-border", "#5AA7F0"],
  VITE_COLOR_SEAT_SELECTED: ["--color-seat-selected", "#6C47FF"],
  VITE_COLOR_SCROLL_THUMB: ["--color-scroll-thumb", "#9A9A9A"],
  VITE_COLOR_SCREEN_EDGE: ["--color-screen-edge", "#9B88D5"],
  VITE_SHADOW_SEAT_BEST: ["--shadow-seat-best", "0 0 6px color-mix(in oklab, var(--color-seat-best-border) 35%, transparent)"],
  VITE_COLOR_STATUS_AVAILABLE: ["--color-status-available", "#141414"],
  VITE_COLOR_STATUS_FILLING: ["--color-status-filling", "#C9B51A"],
  VITE_COLOR_STATUS_ALMOST_FULL: ["--color-status-almost-full", "#E4572E"],
  VITE_COLOR_HERO_DARK: ["--color-hero-dark", "#1A1A1A"],
  VITE_COLOR_ON_HERO: ["--color-on-hero", "#FFFFFF"],
  VITE_GRADIENT_DETAIL_HERO: ["--gradient-detail-hero", "linear-gradient(90deg, color-mix(in oklab, var(--color-hero-dark) 97%, transparent) 0%, color-mix(in oklab, var(--color-hero-dark) 88%, transparent) 48%, color-mix(in oklab, var(--color-hero-dark) 45%, transparent) 100%)"],
  VITE_COLOR_DANGER: ["--color-danger", "#D92D20"],
  VITE_COLOR_AUTH_OVERLAY: ["--color-auth-overlay", "color-mix(in oklab, var(--color-hero-dark) 65%, transparent)"],
  VITE_COLOR_AUTH_DISABLED: ["--color-auth-disabled", "#D8D8D8"],
  VITE_GRADIENT_AUTH_BANNER: ["--gradient-auth-banner", "linear-gradient(180deg, var(--color-banner-from), var(--color-banner-to))"],
  VITE_AUTH_PATTERN: ["--auth-pattern", "repeating-linear-gradient(45deg, transparent 0 42px, color-mix(in oklab, var(--color-on-primary) 10%, transparent) 42px 43px, transparent 43px 84px), repeating-linear-gradient(-45deg, transparent 0 42px, color-mix(in oklab, var(--color-on-primary) 10%, transparent) 42px 43px, transparent 43px 84px)"],
  VITE_SHADOW_AUTH: ["--shadow-auth", "0 24px 80px color-mix(in oklab, var(--color-hero-dark) 25%, transparent)"],
  VITE_COLOR_FILTER_TINT: ["--color-filter-tint", "oklch(0.975 0 0)"],
  VITE_SHADOW_HEADER: ["--shadow-header", "0 2px 12px oklch(0.15 0 0 / 0.035)"],
  VITE_SHADOW_POSTER: ["--shadow-poster", "0 18px 48px oklch(0.15 0 0 / 0.18)"],
  VITE_SHADOW_MOVIE: ["--shadow-movie", "0 8px 24px oklch(0.15 0 0 / 0.10)"],
  VITE_RADIUS_CARD: ["--radius-card", "16px"],
  VITE_RADIUS_BUTTON: ["--radius-button", "12px"],
  VITE_RADIUS_SEAT: ["--radius-seat", "6px"],
  VITE_HEADER_HEIGHT: ["--header-height", "76px"],
};

export const themeVars: Record<string, string> = Object.fromEntries(
  Object.entries(tokenDefs).map(([key, [cssVar, def]]) => [cssVar, read(key, def)]),
);
themeVars["--font-app"] = `"${appConfig.fontFamily}", ui-sans-serif, system-ui, sans-serif`;

/** CSS text for SSR injection so first paint is themed. */
export const themeCss = `:root{${Object.entries(themeVars)
  .map(([k, v]) => `${k}:${v};`)
  .join("")}}`;

export const fontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
  appConfig.fontFamily,
)}:wght@400;500;600;700;800&display=swap`;

/** Writes all tokens onto :root at startup (client). */
export function applyTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeVars)) root.style.setProperty(k, v);
}
