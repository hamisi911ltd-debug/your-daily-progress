import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { createBooking, mockMpesaPay } from "@/lib/bookings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Smartphone, ShieldCheck, Video, MapPin, Layers } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/book/$packageId")({
  head: () => ({ meta: [{ title: "Book session · CreatorConnect" }] }),
  validateSearch: z.object({
    sessionType: z.enum(["online", "in-person", "hybrid"]).optional(),
    location: z.string().optional(),
  }),
  component: BookPage,
});

const SESSION_TYPE_INFO: Record<string, { icon: React.ReactNode; label: string; note: string }> = {
  online:     { icon: <Video className="h-4 w-4" />,   label: "Online session",  note: "You'll join a private video room at the scheduled time." },
  "in-person":{ icon: <MapPin className="h-4 w-4" />,  label: "In-person",       note: "Meet at the location set by the creator." },
  hybrid:     { icon: <Layers className="h-4 w-4" />,  label: "Hybrid session",  note: "Choose online or in-person with the creator." },
};

function BookPage() {
  const { packageId } = Route.useParams();
  const { sessionType = "online", location } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<"schedule" | "pay" | "done">("schedule");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const sessionTypeInfo = SESSION_TYPE_INFO[sessionType] ?? SESSION_TYPE_INFO.online;

  const create = useServerFn(createBooking);
  const pay = useServerFn(mockMpesaPay);

  const createMut = useMutation({
    mutationFn: () =>
      create({ data: { packageId, scheduledAt: new Date(scheduledAt).toISOString(), note: note || undefined } }),
    onSuccess: (r) => { setBookingId(r.bookingId); setStep("pay"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const payMut = useMutation({
    mutationFn: () => pay({ data: { bookingId: bookingId!, phone } }),
    onSuccess: (r) => { setRef(r.mpesaReference); setStep("done"); toast.success("Payment received — your video room is ready!"); },
    onError: (e: any) => toast.error(e?.message ?? "Payment failed"),
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      {/* Step indicator */}
      <div className="mb-6 flex gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span className={step !== "schedule" ? "text-primary" : ""}>1 Schedule</span>·
        <span className={step === "pay" || step === "done" ? "text-primary" : ""}>2 Pay</span>·
        <span className={step === "done" ? "text-primary" : ""}>3 Done</span>
      </div>

      <div className="rounded-3xl bg-card p-8 shadow-pop">
        {/* Session type badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          {sessionTypeInfo.icon} {sessionTypeInfo.label}
        </div>

        {step === "schedule" && (
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-5">
            <h1 className="font-display text-3xl font-bold">Pick your time</h1>
            <p className="text-sm text-muted-foreground">{sessionTypeInfo.note}</p>
            <div>
              <Label htmlFor="when">When</Label>
              <Input
                id="when"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="note">Note for the creator (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What do you want to talk about?"
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={createMut.isPending}>
              Continue to payment
            </Button>
          </form>
        )}

        {step === "pay" && (
          <form onSubmit={(e) => { e.preventDefault(); payMut.mutate(); }} className="space-y-5">
            <h1 className="font-display text-3xl font-bold">Pay with M-Pesa</h1>
            <p className="text-sm text-muted-foreground">Enter your Safaricom number. You'll receive an STK push to confirm.</p>
            <div>
              <Label htmlFor="phone"><Smartphone className="mr-1 inline h-4 w-4" /> Safaricom number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="0712 345 678"
                pattern="^(\+?254|0)?7\d{8}$"
              />
            </div>
            <div className="rounded-xl bg-accent/15 p-4 text-sm">
              <ShieldCheck className="mb-1 inline h-4 w-4 text-accent-foreground" /> Funds are held in escrow until your session ends.
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={payMut.isPending}>
              {payMut.isPending ? "Confirming…" : "Pay now"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo mode: M-Pesa is simulated — wire Daraja API to go live.
            </p>
          </form>
        )}

        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-foreground">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">You're booked! 🎉</h1>
            <p className="mt-2 text-muted-foreground">
              Reference: <span className="font-mono">{ref}</span>
            </p>
            <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm font-medium text-primary flex items-center gap-2">
              {sessionTypeInfo.icon}
              {sessionType === "online" || sessionType === "hybrid"
                ? "Your private video room will be ready — join from My bookings at the scheduled time."
                : location
                  ? `Meet at: ${location}`
                  : "Meeting location will be confirmed by the creator."}
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-6 w-full"
              onClick={() => navigate({ to: "/bookings" })}
            >
              View my bookings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
