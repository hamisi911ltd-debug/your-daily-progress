import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, CalendarCheck2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate({ to: "/" });
  }

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .toString()
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="cc-logo-g" x1="2" y1="34" x2="34" y2="2" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e91e8c" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
            </defs>
            <rect width="36" height="36" rx="9" fill="url(#cc-logo-g)" />
            <path d="M25.5 12.5a9.5 9.5 0 1 0 0 11" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M22 15.5l4.2 2.5-4.2 2.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="font-display text-base font-bold text-foreground">CreatorConnect</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link
            to="/browse"
            className="rounded-full px-4 py-2 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: "rounded-full px-4 py-2 text-foreground bg-muted" }}
          >
            Browse creators
          </Link>
          <Link
            to="/become-creator"
            className="rounded-full px-4 py-2 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            Become a creator
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/60 bg-card p-1 pr-3 shadow-card transition hover:border-primary/50">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/bookings">
                    <CalendarCheck2 className="mr-2 h-4 w-4" /> My bookings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/creator-dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Creator dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
