import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMyBookings, updateBookingStatus, submitReview } from "@/lib/bookings.functions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarCheck2, Video, Star, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "My bookings · Fanmeeet" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const fetchBookings = useServerFn(listMyBookings);
  const { data, isLoading } = useQuery({ queryKey: ["my-bookings"], queryFn: () => fetchBookings() });
  const qc = useQueryClient();
  const update = useServerFn(updateBookingStatus);
  const updateMut = useMutation({
    mutationFn: (vars: { bookingId: string; status: "confirmed" | "completed" | "cancelled" | "declined" }) =>
      update({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-bookings"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  const bookings = data?.bookings ?? [];
  const userId = data?.userId;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold">My bookings</h1>
      <p className="mt-1 text-muted-foreground">Upcoming and past sessions.</p>

      {bookings.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-card p-12 text-center shadow-card">
          <CalendarCheck2 className="mx-auto h-12 w-12 text-primary" />
          <h3 className="mt-4 font-display text-2xl font-bold">No bookings yet</h3>
          <p className="mt-2 text-muted-foreground">Browse creators and book your first session.</p>
          <Button variant="hero" className="mt-6" asChild><Link to="/browse">Browse creators</Link></Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => {
            const isCreator = b.creator_id === userId;
            const other = isCreator ? b.fan : b.creator;
            return (
              <div key={b.id} className="rounded-2xl bg-card p-5 shadow-card sm:flex sm:items-center sm:gap-5">
                <Avatar className="h-14 w-14"><AvatarImage src={other.avatar_url ?? undefined} /><AvatarFallback>{other.display_name?.slice(0,2)}</AvatarFallback></Avatar>
                <div className="mt-3 flex-1 sm:mt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold">{b.package_title}</p>
                    <StatusBadge status={b.status} />
                    <span className="text-xs text-muted-foreground">{isCreator ? `with ${other.display_name}` : `with ${other.display_name}`}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {format(new Date(b.scheduled_at), "EEE, d MMM yyyy · HH:mm")} · {b.duration_minutes} min · KES {b.total_kes.toLocaleString()}
                  </p>
                  {b.mpesa_reference && <p className="mt-1 text-xs text-muted-foreground">M-Pesa ref: {b.mpesa_reference}</p>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
                  {b.status === "confirmed" && b.payment_status === "paid" && (
                    <Button asChild variant="hero" size="sm"><Link to="/room/$bookingId" params={{ bookingId: b.id }}><Video className="h-4 w-4" /> Join room</Link></Button>
                  )}
                  {isCreator && b.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateMut.mutate({ bookingId: b.id, status: "confirmed" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ bookingId: b.id, status: "declined" })}>Decline</Button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ bookingId: b.id, status: "completed" })}>Mark complete</Button>
                  )}
                  {b.status === "completed" && !isCreator && <ReviewButton bookingId={b.id} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-foreground",
    confirmed: "bg-accent text-accent-foreground",
    completed: "bg-secondary text-secondary-foreground",
    cancelled: "bg-destructive/15 text-destructive",
    declined: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-muted text-foreground"}`}>{status}</span>;
}

function ReviewButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => submit({ data: { bookingId, rating, comment } }),
    onSuccess: () => { toast.success("Thanks for the review!"); qc.invalidateQueries({ queryKey: ["my-bookings"] }); setOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Star className="h-4 w-4" /> Leave review</Button>;
  return (
    <div className="w-full rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex gap-1">{[1,2,3,4,5].map((n) => (
        <button key={n} onClick={() => setRating(n)}><Star className={`h-5 w-5 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`} /></button>
      ))}</div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="How was it?" className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-sm" rows={2} />
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Submit</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
