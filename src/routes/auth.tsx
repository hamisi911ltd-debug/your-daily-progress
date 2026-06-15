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
import { signIn, signUp } from "@/lib/auth.functions";
import { ShieldCheck, Cookie } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  returnTo: z.string().optional(),
});

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

function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-foreground/80">
      <p className="text-xs text-muted-foreground">Last updated: 14 June 2026</p>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">1. About CreatorConnect</h3>
        <p>CreatorConnect is a Kenyan online marketplace that enables fans to book private, paid live video sessions with creators, coaches, musicians, influencers, and other professionals ("Creators"). By creating an account, you agree to these Terms of Service in full.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">2. Eligibility</h3>
        <p>You must be at least 18 years old to use CreatorConnect. By registering, you confirm that all information you provide is accurate and that you have the legal capacity to enter into these terms.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">3. Bookings & Payments</h3>
        <p>All session fees are paid in advance via M-Pesa (Lipa na M-Pesa). Funds are held in secure escrow by CreatorConnect and released to the Creator within 48 hours of a completed session. CreatorConnect charges a platform fee of 12.5% on every transaction.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">4. Cancellations & Refunds</h3>
        <p>If a Creator cancels a confirmed session, you will receive a full refund within 3–5 business days. If you cancel more than 24 hours before the scheduled session, you will receive a 75% refund. Cancellations within 24 hours are non-refundable. No-shows by the fan forfeit the full amount.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">5. Session Rules</h3>
        <p>Sessions are private 1:1 video calls. You may not record, broadcast, or distribute session content without the express written consent of the other participant. Any form of harassment, solicitation, or illegal activity during a session will result in immediate account termination and may be reported to relevant authorities.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">6. Platform Role</h3>
        <p>CreatorConnect is a marketplace facilitator, not a party to the sessions themselves. We do not employ Creators, guarantee outcomes, or take responsibility for the advice or content shared during sessions. Use your own judgement when acting on any information received.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">7. Intellectual Property</h3>
        <p>All content on this platform — including the CreatorConnect brand, logo, and interface — is owned by CreatorConnect Ltd and protected under Kenyan and international intellectual property laws. You may not reproduce or distribute our content without permission.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">8. Termination</h3>
        <p>We reserve the right to suspend or terminate any account that violates these terms, engages in fraudulent activity, or causes harm to other users — without prior notice.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">9. Governing Law</h3>
        <p>These terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi County, Kenya.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">10. Contact</h3>
        <p>Questions? Email us at <span className="font-semibold text-primary">legal@creatorconnect.co.ke</span></p>
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
        <p>When you create an account or make a booking we collect: your full name, email address, Safaricom phone number (for M-Pesa), profile photo (optional), and session booking details. We also collect anonymised usage data (pages visited, clicks, session duration) through our analytics tools.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">2. How We Use Your Data</h3>
        <p>Your data is used to: create and manage your account, facilitate bookings and payments, send booking confirmations and reminders, improve the platform, and comply with Kenyan financial regulations. We do not sell your personal data to third parties.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">3. M-Pesa Payments</h3>
        <p>Payments are processed via Safaricom's Daraja API. Your M-Pesa PIN and full financial credentials are never seen or stored by CreatorConnect — they are handled exclusively by Safaricom's secure payment infrastructure.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">4. Cookies</h3>
        <p>We use essential cookies to keep you signed in and maintain your session. We use analytics cookies to understand how the platform is used and improve the experience. We do not use advertising or tracking cookies. You can manage cookies through your browser settings, but disabling essential cookies will affect platform functionality.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">5. Data Sharing</h3>
        <p>When you book a session, your display name and avatar are shared with the Creator to confirm the booking. Your email and phone number are never shared with Creators. We may share data with law enforcement if required by Kenyan law.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">6. Data Retention</h3>
        <p>We retain your account data for as long as your account is active. Booking and payment records are retained for 7 years as required by the Kenya Revenue Authority. You may request account deletion at any time by emailing us.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">7. Your Rights</h3>
        <p>Under the Kenya Data Protection Act 2019, you have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <span className="font-semibold text-primary">privacy@creatorconnect.co.ke</span>. We will respond within 14 days.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">8. Security</h3>
        <p>Passwords are hashed using industry-standard cryptographic algorithms and are never stored in plain text. All data is transmitted over HTTPS. We undergo regular security audits to protect your information.</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-bold text-foreground">9. Contact</h3>
        <p>For privacy enquiries: <span className="font-semibold text-primary">privacy@creatorconnect.co.ke</span></p>
      </section>
    </div>
  );
}

function AuthPage() {
  const { mode, returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [terms, setTerms] = useState(false);
  const [cookies, setCookies] = useState(false);
  const [openDoc, setOpenDoc] = useState<"terms" | "privacy" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getTokenPayload()) navigate({ to: (returnTo as any) ?? "/bookings" });
  }, [navigate, returnTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { token } = await signUp({ data: { name, email, password } });
        setStoredToken(token);
        window.dispatchEvent(new Event("cc:auth:change"));
        toast.success("Welcome to CreatorConnect!");
      } else {
        const { token } = await signIn({ data: { email, password } });
        setStoredToken(token);
        window.dispatchEvent(new Event("cc:auth:change"));
        toast.success("Welcome back!");
      }
      navigate({ to: (returnTo as any) ?? "/bookings" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && (!isSignup || (terms && cookies));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-secondary py-16">
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-md px-4">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="auth-logo-g" x1="2" y1="34" x2="34" y2="2" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e91e8c" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
            </defs>
            <rect width="36" height="36" rx="9" fill="url(#auth-logo-g)" />
            <path d="M25.5 12.5a9.5 9.5 0 1 0 0 11" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M22 15.5l4.2 2.5-4.2 2.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="font-display text-lg font-bold text-foreground">CreatorConnect</span>
        </Link>

        <div className="rounded-3xl bg-card p-8 shadow-pop">
          <h1 className="font-display text-3xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Join thousands of fans connecting with their favourite creators."
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

            {/* Terms + Cookie consent — signup only */}
            {isSignup && (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-secondary/60 p-4">
                {/* Terms of Service */}
                <label className="flex cursor-pointer items-start gap-3 group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${terms ? "border-primary bg-primary" : "border-border bg-input group-hover:border-primary/60"}`}>
                      {terms && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm leading-snug text-foreground/80">
                    <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenDoc("terms"); }}
                      className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      Terms of Service
                    </button>
                    {" "}and{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenDoc("privacy"); }}
                      className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>

                {/* Cookie consent */}
                <label className="flex cursor-pointer items-start gap-3 group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={cookies}
                      onChange={(e) => setCookies(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${cookies ? "border-primary bg-primary" : "border-border bg-input group-hover:border-primary/60"}`}>
                      {cookies && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm leading-snug text-foreground/80">
                    <Cookie className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    I accept cookies to personalise my experience and keep me signed in
                  </span>
                </label>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!canSubmit}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
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

      {/* Terms / Privacy document modal */}
      <Dialog open={openDoc !== null} onOpenChange={(open) => { if (!open) setOpenDoc(null); }}>
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
            <Button
              variant="hero"
              onClick={() => {
                if (openDoc === "terms") setTerms(true);
                if (openDoc === "privacy") { setTerms(true); setCookies(true); }
                setOpenDoc(null);
              }}
            >
              I have read and agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
