import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { validateResetToken, resetPassword } from "@/lib/password-reset.functions";
import { Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password · Fanmeeet" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const doValidate = useServerFn(validateResetToken);
  const doReset = useServerFn(resetPassword);

  const [tokenState, setTokenState] = useState<"loading" | "valid" | "invalid">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setTokenState("invalid"); return; }
    doValidate({ data: { token } }).then((res: any) => {
      if (res.valid) {
        setEmail(res.email ?? "");
        setTokenState("valid");
      } else {
        setTokenState("invalid");
      }
    }).catch(() => setTokenState("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (!token) return;
    setBusy(true);
    try {
      await doReset({ data: { token, newPassword: password } });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-secondary py-16">
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-md px-4">

        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/logo-mark.png" alt="Fanmeeet" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-lg font-bold text-foreground">Fanmeeet</span>
        </Link>

        <div className="rounded-3xl bg-card p-8 shadow-pop">
          {tokenState === "loading" && (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-muted-foreground">Verifying link…</p>
            </div>
          )}

          {tokenState === "invalid" && (
            <div className="py-4 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 font-display text-2xl font-bold">Invalid or expired link</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This password reset link is no longer valid. Please request a new one.
              </p>
              <Button asChild variant="hero" className="mt-6 w-full">
                <Link to="/auth" search={{ mode: "signin" }}>Back to sign in</Link>
              </Button>
            </div>
          )}

          {tokenState === "valid" && !done && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold">Reset your password</h1>
                  {email && <p className="text-sm text-muted-foreground">{email}</p>}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="pwd">New password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="pwd"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      maxLength={72}
                      placeholder="At least 8 characters"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    maxLength={72}
                    placeholder="Repeat your new password"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Updating…" : "Set new password"}
                </Button>
              </form>
            </>
          )}

          {done && (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h1 className="mt-4 font-display text-2xl font-bold">Password updated!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <Button asChild variant="hero" className="mt-6 w-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
