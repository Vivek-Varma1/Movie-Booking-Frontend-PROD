import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Film, LogOut, MapPin, Search, Ticket, UserRound } from "lucide-react";
import { useState } from "react";
import { appConfig } from "@/theme/theme";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAdmin } from "@/admin/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, openLogin, logout } = useAuth();
  const navigate = useNavigate();
  const q = useRouterState({ select: (s) => (s.location.search as { q?: string }).q ?? "" });
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const isSeatPage = useRouterState({ select: (s) => /^\/shows\/[^/]+\/seats\/?$/.test(s.location.pathname) || /^\/admin(?:\/|$)/.test(s.location.pathname) });
  if (isSeatPage) return <>{children}</>;
  const avatar = <Button variant="secondary" size="icon" aria-label={isAuthenticated ? "Account menu" : "Sign in"} title={isAuthenticated ? "Account menu" : "Sign in"} className="size-10 shrink-0 rounded-full bg-subtle text-text-secondary shadow-none hover:bg-page-muted" onClick={isAuthenticated ? undefined : openLogin}><UserRound className="size-5" /></Button>;
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 flex min-h-header items-center justify-between gap-5 border-b border-subtle bg-surface px-6 py-3 shadow-header max-sm:flex-wrap max-sm:gap-3 max-sm:px-4">
        <div className="flex shrink-0 items-center gap-6 max-lg:gap-4 max-sm:gap-3">
          <Link to="/" className="flex items-center gap-2 text-2xl font-extrabold text-text-primary max-sm:text-xl"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary"><Film className="size-5" /></span>{appConfig.appName}</Link>
          <span className="h-9 w-px bg-subtle max-sm:hidden" />
          <div className="flex items-center gap-2 max-sm:hidden"><MapPin className="size-5 text-accent" /><div><p className="text-base font-bold leading-5">{appConfig.defaultCity}</p><p className="mt-0.5 text-xs text-text-secondary">{appConfig.defaultCity}, {appConfig.defaultState}</p></div></div>
          <nav aria-label="Main navigation"><Button variant="ghost" asChild className="h-10 rounded-full bg-nav-active px-4 font-semibold text-nav-active-text hover:bg-nav-active hover:text-nav-active-text"><Link to="/" aria-current="page">Movies</Link></Button></nav>
        </div>
        <div className="flex items-center gap-5 max-sm:contents">
          <div className="relative w-[360px] max-lg:w-[280px] max-md:w-[220px] max-sm:order-3 max-sm:w-full"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-accent" /><input type="search" aria-label="Search for movies and theatres" placeholder="Search for movies and theatres" value={q} onChange={(e) => navigate({ to: "/", search: (prev) => ({ ...prev, q: e.target.value }), replace: true, resetScroll: false })} className="h-12 w-full rounded-xl border border-subtle bg-surface pl-12 pr-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/10" /></div>
          {isAuthenticated ? <DropdownMenu><DropdownMenuTrigger asChild>{avatar}</DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setBookingsOpen(true)}><Ticket />My Bookings</DropdownMenuItem>{isAdmin(user) && <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}><Film />Admin dashboard</DropdownMenuItem>}<DropdownMenuItem onSelect={logout}><LogOut />Logout</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : avatar}
        </div>
      </header>
      <main>{children}</main>
      <Dialog open={bookingsOpen} onOpenChange={setBookingsOpen}><DialogContent><DialogHeader><DialogTitle>My Bookings</DialogTitle></DialogHeader><div className="py-8 text-center"><Ticket className="mx-auto size-9 text-text-muted" /><p className="mt-4 font-semibold">No bookings yet</p><p className="mt-2 text-sm text-text-secondary">Your booked movie tickets will appear here.</p></div></DialogContent></Dialog>
    </div>
  );
}
