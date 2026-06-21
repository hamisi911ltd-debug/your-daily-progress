import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getTokenPayload, setStoredToken } from "@/integrations/cloudflare/auth";
import {
  signIn, signUp,
  googleSignIn, getGoogleAuthUrl,
  facebookSignIn, getFacebookAuthUrl,
  tiktokSignIn, getTikTokAuthUrl,
} from "@/lib/auth.functions";
import { requestPasswordReset } from "@/lib/password-reset.functions";
import {
  ShieldCheck, Cookie, Users, Mic2, Eye, EyeOff,
  Phone, Mail, CheckCircle2, ExternalLink,
} from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  returnTo: z.string().optional(),
  // Google, Facebook and TikTok all redirect back to this same /auth page with
  // generic OAuth2 "code"/"state" params — the provider is resolved client-side
  // by matching `state` against whichever `<provider>_oauth_state` was stashed
  // in sessionStorage when the flow was started (see startOAuth below).
  code: z.string().optional(),
  state: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Fanmeeet" },
      { name: "description", content: "Sign in or create your Fanmeeet account." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

// ── Social brand icons ────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function MetaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.17a8.18 8.18 0 004.79 1.53V7.26a4.85 4.85 0 01-1.02-.57z" />
    </svg>
  );
}

// ── Legal content ─────────────────────────────────────────────────────────────

function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-foreground/80">
      <p className="text-xs text-muted-foreground">Last updated: 14 June 2026</p>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">1. About Fanmeeet</h3>
        <p>Fanmeeet is a Kenyan online marketplace that enables fans to book private, paid live video sessions with creators. By creating an account, you agree to these Terms in full.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">2. Eligibility</h3>
        <p>You must be at least 18 years old. By registering, you confirm all information is accurate and you have legal capacity to enter into these terms.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">3. Bookings & Payments</h3>
        <p>All session fees are paid in advance via M-Pesa. Funds are held in secure escrow and released within 48 hours of a completed session. Fanmeeet charges 12.5% platform fee.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">4. Cancellations & Refunds</h3>
        <p>Creator cancels = full refund. Fan cancels &gt;24h = 75% refund. Fan cancels &lt;24h = no refund. No-shows forfeit the full amount.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">5. Session Rules</h3>
        <p>Sessions are private 1:1 video calls. Recording or redistribution without consent is prohibited. Harassment or illegal activity results in immediate account termination.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">6. Governing Law</h3>
        <p>These terms are governed by the laws of Kenya. Disputes shall be resolved in the courts of Nairobi County.</p>
      </section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-foreground/80">
      <p className="text-xs text-muted-foreground">Last updated: 14 June 2026</p>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">1. What We Collect</h3>
        <p>Name, email, phone number (M-Pesa), profile photo, social media links, and session booking details. Also anonymised usage analytics.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">2. How We Use It</h3>
        <p>To operate your account, facilitate bookings and payments, send confirmations, and improve the platform. We do not sell your data.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">3. Social Login</h3>
        <p>When you sign in with Google, Facebook, Instagram, or TikTok, we only access your public profile and email. We do not post on your behalf.</p>
      </section>
      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">4. Your Rights</h3>
        <p>Under the Kenya Data Protection Act 2019, you may access, correct, or delete your data. Email <span className="font-semibold text-primary">privacy@fanmeeet.com</span>.</p>
      </section>
    </div>
  );
}

// ── Forgot password modal ─────────────────────────────────────────────────────

function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ resetUrl: string | null } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestPasswordReset({ data: { email } });
      setResult(res as any);
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setEmail("");
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Reset your password</DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div>
              <Label htmlFor="reset-email">Email address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <p className="font-semibold">Reset link ready</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.resetUrl
                    ? "Use the link below to reset your password. In production, this would be sent to your email."
                    : "If an account exists with that email, a reset link has been sent."}
                </p>
              </div>
            </div>
            {result.resetUrl && (
              <a
                href={result.resetUrl}
                className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition"
              >
                <ExternalLink className="h-4 w-4" /> Open reset link
              </a>
            )}
            <Button variant="outline" className="w-full" onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Social login button helper ────────────────────────────────────────────────

function SocialButton({
  icon,
  label,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-muted disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AuthPage() {
  const { mode, returnTo, code, state: oauthState } = Route.useSearch();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [selectedRole, setSelectedRole] = useState<"fan" | "creator">("fan");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState("");
  const [terms, setTerms] = useState(false);
  const [cookies, setCookies] = useState(false);
  const [openDoc, setOpenDoc] = useState<"terms" | "privacy" | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"google" | "facebook" | "tiktok" | null>(null);

  useEffect(() => {
    if (getTokenPayload()) navigate({ to: (returnTo as any) ?? "/bookings" });
  }, []);

  // ── OAuth callbacks ──

  async function handleOAuthCallback(
    provider: "google" | "facebook" | "tiktok",
    code: string
  ) {
    sessionStorage.removeItem(`${provider}_oauth_state`);
    setSocialBusy(provider);

    const redirectUri = `${window.location.origin}/auth`;
    try {
      let token: string;
      if (provider === "google") {
        const r = await googleSignIn({ data: { code, redirectUri } });
        token = (r as any).token;
      } else if (provider === "facebook") {
        const r = await facebookSignIn({ data: { code, redirectUri } });
        token = (r as any).token;
      } else {
        const r = await tiktokSignIn({ data: { code, redirectUri } });
        token = (r as any).token;
      }
      setStoredToken(token);
      window.dispatchEvent(new Event("cc:auth:change"));
      toast.success("Signed in successfully!");
      navigate({ to: (returnTo as any) ?? "/bookings" });
    } catch (err: any) {
      toast.error(err?.message ?? `${provider} sign-in failed`);
      setSocialBusy(null);
    }
  }

  useEffect(() => {
    if (!code) return;
    // Resolve which provider this callback belongs to by matching the returned
    // `state` against whichever provider's state we stashed before redirecting.
    const provider = (["google", "facebook", "tiktok"] as const).find(
      (p) => oauthState && sessionStorage.getItem(`${p}_oauth_state`) === oauthState
    );
    if (!provider) {
      toast.error("Invalid or expired sign-in attempt. Please try again.");
      return;
    }
    handleOAuthCallback(provider, code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ── Social login initiators ──

  async function startOAuth(provider: "google" | "facebook" | "tiktok") {
    setSocialBusy(provider);
    try {
      let urlData: { url: string | null };
      if (provider === "google") urlData = await getGoogleAuthUrl() as any;
      else if (provider === "facebook") urlData = await getFacebookAuthUrl() as any;
      else urlData = await getTikTokAuthUrl() as any;

      if (!urlData?.url) {
        toast.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured yet.`);
        setSocialBusy(null);
        return;
      }

      const state = crypto.randomUUID();
      sessionStorage.setItem(`${provider}_oauth_state`, state);
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth`);
      window.location.href = `${urlData.url}&redirect_uri=${redirectUri}&state=${state}`;
    } catch {
      toast.error("Could not start social sign-in");
      setSocialBusy(null);
    }
  }

  // ── Email/password submit ──

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { token, isCreator } = await signUp({ data: { name, email, password, phone: phone || undefined, role: selectedRole } }) as any;
        setStoredToken(token);
        window.dispatchEvent(new Event("cc:auth:change"));
        toast.success("Welcome to Fanmeeet!");
        navigate({ to: isCreator ? "/become-creator" : ((returnTo as any) ?? "/bookings") });
      } else {
        const { token } = await signIn({ data: { email, password } }) as any;
        setStoredToken(token);
        window.dispatchEvent(new Event("cc:auth:change"));
        toast.success("Welcome back!");
        navigate({ to: (returnTo as any) ?? "/bookings" });
      }
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const anySocialBusy = socialBusy !== null;
  const canSubmit = !busy && !anySocialBusy && (!isSignup || (terms && cookies));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-secondary py-12">
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-md px-4">

        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/logo-mark.png" alt="Fanmeeet" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-lg font-bold text-foreground">Fanmeeet</span>
        </Link>

        <div className="rounded-3xl bg-card p-8 shadow-pop">
          <h1 className="font-display text-3xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Join thousands of fans and creators on Fanmeeet."
              : "Sign in to book and manage your sessions."}
          </p>

          {/* Social sign-in buttons */}
          <div className="mt-6 space-y-2">
            <SocialButton
              icon={<GoogleIcon />}
              label="Continue with Google"
              onClick={() => startOAuth("google")}
              loading={socialBusy === "google"}
              disabled={anySocialBusy && socialBusy !== "google"}
            />
            <div className="grid grid-cols-2 gap-2">
              <SocialButton
                icon={<MetaIcon />}
                label="Facebook"
                onClick={() => startOAuth("facebook")}
                loading={socialBusy === "facebook"}
                disabled={anySocialBusy && socialBusy !== "facebook"}
              />
              <SocialButton
                icon={<TikTokIcon />}
                label="TikTok"
                onClick={() => startOAuth("tiktok")}
                loading={socialBusy === "tiktok"}
                disabled={anySocialBusy && socialBusy !== "tiktok"}
              />
            </div>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or continue with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Role selector (signup only) */}
          {isSignup && (
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-foreground">I am joining as a…</p>
              <div className="grid grid-cols-2 gap-3">
                {(["fan", "creator"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all ${
                      selectedRole === r
                        ? "border-primary bg-primary/8 shadow-card"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {r === "fan"
                      ? <Users className={`h-6 w-6 ${selectedRole === r ? "text-primary" : "text-muted-foreground"}`} />
                      : <Mic2 className={`h-6 w-6 ${selectedRole === r ? "text-primary" : "text-muted-foreground"}`} />
                    }
                    <div>
                      <p className="font-semibold text-sm capitalize">{r}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r === "fan" ? "Book sessions with creators" : "Earn from your expertise"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Wanjiku Mwangi" className="mt-1" />
              </div>
            )}

            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} placeholder="you@example.com" className="pl-9" />
              </div>
            </div>

            {isSignup && (
              <div>
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  Phone number <span className="text-destructive">*</span>
                </Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
                    placeholder="0712 345 678"
                    className="pl-9"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Required for M-Pesa payments</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder={isSignup ? "At least 8 characters" : ""}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Consent (signup only) */}
            {isSignup && (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-secondary/60 p-4">
                {[
                  {
                    id: "terms", checked: terms, onChange: setTerms,
                    label: <span><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />I agree to the{" "}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpenDoc("terms"); }} className="font-semibold text-primary underline underline-offset-2">Terms of Service</button>
                      {" "}and{" "}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpenDoc("privacy"); }} className="font-semibold text-primary underline underline-offset-2">Privacy Policy</button>
                    </span>,
                  },
                  {
                    id: "cookies", checked: cookies, onChange: setCookies,
                    label: <span><Cookie className="mr-1 inline h-3.5 w-3.5 text-primary" />I accept cookies to personalise my experience</span>,
                  },
                ].map(({ id, checked, onChange, label }) => (
                  <label key={id} className="flex cursor-pointer items-start gap-3 group">
                    <div className="mt-0.5 flex-shrink-0">
                      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${checked ? "border-primary bg-primary" : "border-border bg-input group-hover:border-primary/60"}`}>
                        {checked && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    </div>
                    <span className="text-sm leading-snug text-foreground/80">{label}</span>
                  </label>
                ))}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!canSubmit}>
              {busy
                ? "Please wait…"
                : isSignup
                  ? selectedRole === "creator" ? "Create creator account" : "Create fan account"
                  : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              onClick={() => { setIsSignup(!isSignup); setTerms(false); setCookies(false); }}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>

      {/* Legal dialogs */}
      <Dialog open={openDoc !== null} onOpenChange={(o) => { if (!o) setOpenDoc(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {openDoc === "terms" ? "Terms of Service" : "Privacy Policy"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {openDoc === "terms" ? <TermsContent /> : <PrivacyContent />}
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <Button variant="hero" onClick={() => {
              if (openDoc === "terms") setTerms(true);
              if (openDoc === "privacy") { setTerms(true); setCookies(true); }
              setOpenDoc(null);
            }}>
              I have read and agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
