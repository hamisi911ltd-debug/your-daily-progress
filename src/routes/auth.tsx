import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getTokenPayload, setStoredToken } from "@/integrations/cloudflare/auth";
import { signIn, signUp } from "@/lib/auth.functions";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · CreatorConnect" },
      { name: "description", content: "Sign in or create your CreatorConnect account." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getTokenPayload()) navigate({ to: "/bookings" });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { token } = await signUp({ data: { name, email, password } });
        setStoredToken(token);
        toast.success("Welcome to CreatorConnect!");
      } else {
        const { token } = await signIn({ data: { email, password } });
        setStoredToken(token);
        toast.success("Welcome back!");
      }
      navigate({ to: "/bookings" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-secondary py-16">
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-md px-4">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src="/logo.png" alt="CreatorConnect" className="h-10 w-auto object-contain brightness-0 invert" />
        </Link>

        <div className="rounded-3xl bg-card p-8 shadow-pop">
          <h1 className="font-display text-3xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Start booking sessions today."
              : "Sign in to book and manage your sessions."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Wanjiku Mwangi"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
