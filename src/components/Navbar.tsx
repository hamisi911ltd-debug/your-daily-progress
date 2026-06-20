import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, CalendarCheck2, User, ShieldAlert } from "lucide-react";
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

  const isAdmin = user?.roles?.includes("admin") ?? false;
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .toString()
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo-mark.png" alt="Fanmeeet" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-base font-bold text-foreground">Fanmeeet</span>
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
                    <AvatarImage src={user.user_metadata?.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
                  </span>
                  {isAdmin && (
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" aria-label="Admin" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" /> My profile
                  </Link>
                </DropdownMenuItem>
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
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <ShieldAlert className="mr-2 h-4 w-4 text-red-500" />
                        <span className="font-semibold text-red-600">Admin dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
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
