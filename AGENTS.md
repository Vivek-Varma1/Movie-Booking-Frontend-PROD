<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Design tokens: raw values only in src/theme/theme.ts (env-overridable, injected as :root vars); src/styles.css only maps semantic names. Why: single source of truth, no literals in components.
- Data access goes through src/services/api.ts (mock vs axios switched by VITE_USE_MOCK) and TanStack Query hooks in src/hooks/queries.ts. Why: swap backend without touching UI.
- Live movie responses are normalized in src/services/movie-adapter.ts and city-scoped movie queries include the configured city ID. Why: backend DTO fields differ from UI fields and city caches must not mix.
- Routing uses TanStack Router; public booking pages remain public, checkout prompts login, and admin routes use a lazy layout with a loading-aware role gate. Why: keep route generation safe and admin UI out of public page chunks.
- Home primes movies through the Query loader and subscribes with useSuspenseQuery; search and filters use validated URL search parameters so navigation preserves state.
- MovieCard and HeroCarousel share normalized movie DTOs and use backend poster URLs in live mode; generated posters are restricted to explicit mock mode. Why: production must display the user's actual catalogue, never fallback sample movies.
- Movie details use one HorizontalScroller for all media rows and controlled Radix dialogs for videos/images; embed URLs are allowlisted in src/lib/video.ts. Why: consistent overflow/focus behavior and no arbitrary executable embeds from API data.
- Movie detail loaders return their fetched movie as Query initialData with a short freshness window. Why: the server-rendered record must hydrate interactively without requiring an immediate duplicate cross-origin fetch.
- Movie showtimes normalize the date-scoped backend envelope in src/services/show-adapter.ts, include city in Query keys and keep date/filters in URL search; interpret local show timestamps in the cinema timezone. Why: API DTOs differ from UI grouping, city schedules must not mix and date selection must survive navigation.
- Missing theatre policy, distance and seat availability remain unknown rather than invented; absent logos use a building icon. Why: booking information must reflect actual service data.
- Seat selection bypasses the global navigation shell and owns a full-viewport header/canvas/footer; saved intent is validated and limited to selectable seats. Why: two-axis seat scrolling must not scroll the page, and stale intent must not select occupied seats.
- The global auth modal owns email/OTP steps and optional on-success continuation; live sessions are revalidated through the API cookie session, with user data only in memory and no bearer storage. Why: guest selection survives sign-in and server authentication remains authoritative.
- Seat service DTOs pass through a strict adapter and unsupported formats show an error rather than fake seats. Why: production never displays invented inventory.
- OTP entry uses the existing input-otp primitive; resend eligibility uses an absolute deadline. Why: paste/backspace/autofill stay consistent and background timers do not extend the cooldown.
- Admin contracts and enum options live in src/admin/types, and the sole admin-role predicate lives in src/admin/lib/auth. Why: avoid divergent payloads and role checks.
- Admin services reuse the shared cookie-enabled axios client with mock/live selection and central query keys; controller paths remain unverified until provided, and placeholder pages do not call them. Why: the foundation must not issue guessed production mutations.
- Authentication stores only the in-memory user from verify-otp, rechecks the cookie at startup, and handles anonymous versus authenticated permission failures in the provider. Why: tokens never enter frontend storage and role-denied users are not prompted to sign in again.
