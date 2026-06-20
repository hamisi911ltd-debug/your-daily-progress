import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyCreatorProfile, upsertPackage } from "@/lib/creator-onboarding.functions";
import { getMyGallery, addGalleryPhoto, deleteGalleryPhoto } from "@/lib/gallery.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Package, Video, MapPin, Layers, Images, Upload, Trash2, X } from "lucide-react";

const SESSION_TYPE_LABELS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  online:     { icon: <Video className="h-3.5 w-3.5" />,  label: "Online (Zoom)",  color: "bg-primary/10 text-primary" },
  "in-person":{ icon: <MapPin className="h-3.5 w-3.5" />, label: "In-person",      color: "bg-accent/20 text-accent-foreground" },
  hybrid:     { icon: <Layers className="h-3.5 w-3.5" />, label: "Hybrid",         color: "bg-secondary/20 text-secondary-foreground" },
};

type DashTab = "packages" | "gallery";

async function compressImage(file: File, maxW: number, maxH: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
      if (h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

export const Route = createFileRoute("/_authenticated/creator-dashboard")({
  head: () => ({ meta: [{ title: "Creator dashboard · Fanmeeet" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchMine = useServerFn(getMyCreatorProfile);
  const { data, isLoading } = useQuery({ queryKey: ["my-creator-profile"], queryFn: () => fetchMine() });
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<DashTab>("packages");

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!(data as any)?.isCreator) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="font-display text-3xl font-bold">You haven't applied yet</h1>
        <p className="mt-2 text-muted-foreground">Set up your creator profile to start receiving bookings.</p>
        <Button asChild variant="hero" className="mt-6"><Link to="/become-creator">Become a creator</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Creator dashboard</h1>
          <p className="mt-1 text-muted-foreground">{(data as any).profile?.headline}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/bookings">Incoming bookings</Link></Button>
          {(data as any).profile?.user_id && (
            <Button asChild variant="ghost">
              <Link to="/creators/$creatorId" params={{ creatorId: (data as any).profile.user_id }}>View public profile</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 rounded-2xl bg-secondary/60 p-1">
        <button
          onClick={() => setTab("packages")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${tab === "packages" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Package className="h-4 w-4" /> Session Packages
        </button>
        <button
          onClick={() => setTab("gallery")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${tab === "gallery" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Images className="h-4 w-4" /> Photo Gallery
        </button>
      </div>

      {tab === "packages" && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Session packages</h2>
            <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> New package</Button>
          </div>

          {showForm && <PackageForm onDone={() => setShowForm(false)} />}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(data as any).packages.length === 0 && !showForm && (
              <div className="col-span-full rounded-2xl bg-card p-8 text-center shadow-card">
                <Package className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-3 font-display text-lg font-bold">No packages yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add at least one package so fans can book you.</p>
              </div>
            )}
            {(data as any).packages.map((p: any) => {
              const st = SESSION_TYPE_LABELS[p.session_type ?? "online"] ?? SESSION_TYPE_LABELS.online;
              return (
                <div key={p.id} className="rounded-2xl bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-lg font-bold">{p.title}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.duration_minutes} min · KES {p.price_kes.toLocaleString()}</p>
                  {p.description && <p className="mt-2 text-sm text-foreground/80">{p.description}</p>}
                  {p.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </p>
                  )}
                  <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.active ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "gallery" && <GalleryManager />}
    </div>
  );
}

function GalleryManager() {
  const fetchGallery = useServerFn(getMyGallery);
  const doAdd = useServerFn(addGalleryPhoto);
  const doDelete = useServerFn(deleteGalleryPhoto);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-gallery"],
    queryFn: () => fetchGallery(),
  });
  const photos: any[] = (data as any)?.photos ?? [];

  const deleteMut = useMutation({
    mutationFn: (photoId: string) => doDelete({ data: { photoId } }),
    onSuccess: () => { toast.success("Photo deleted"); qc.invalidateQueries({ queryKey: ["my-gallery"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be under 15MB");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      await doAdd({ data: { imageUrl: compressed, caption: caption || undefined } });
      setCaption("");
      qc.invalidateQueries({ queryKey: ["my-gallery"] });
      toast.success("Photo added to gallery!");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Photo Gallery</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Share photos with your fans · Max 30 photos</p>
        </div>
      </div>

      {/* Upload area */}
      <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <div className="flex-1 w-full">
            <Label htmlFor="gallery-caption">Caption (optional)</Label>
            <Input
              id="gallery-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="Add a caption for your photo…"
              className="mt-1"
            />
          </div>
          <div className="flex-shrink-0 pt-5">
            <Button
              type="button"
              variant="hero"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || photos.length >= 30}
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Add photo
                </>
              )}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileSelect}
          />
        </div>
        {photos.length >= 30 && (
          <p className="mt-3 text-center text-sm text-muted-foreground">Gallery is full (30/30). Delete some photos to add more.</p>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">{photos.length}/30 photos · JPG, PNG, WEBP · Max 15MB each</p>
      </div>

      {/* Gallery grid */}
      {isLoading ? (
        <p className="mt-6 text-center text-muted-foreground">Loading gallery…</p>
      ) : photos.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-card p-10 text-center shadow-card">
          <Images className="mx-auto h-12 w-12 text-primary/40" />
          <p className="mt-3 font-display text-lg font-bold">No photos yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first photo to show fans what you're about.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo: any) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-secondary shadow-card">
              <img
                src={photo.image_url}
                alt={photo.caption ?? "Gallery photo"}
                className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
                onClick={() => setLightbox(photo.image_url)}
              />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                  <p className="text-xs text-white line-clamp-2">{photo.caption}</p>
                </div>
              )}
              <button
                onClick={() => {
                  if (window.confirm("Delete this photo?")) deleteMut.mutate(photo.id);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Gallery photo"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

function PackageForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("2500");
  const [sessionType, setSessionType] = useState<"online" | "in-person" | "hybrid">("online");
  const [location, setLocation] = useState("");
  const upsert = useServerFn(upsertPackage);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          title,
          description: desc,
          durationMinutes: parseInt(duration, 10),
          priceKes: parseInt(price, 10),
          sessionType,
          location: location || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Package created");
      qc.invalidateQueries({ queryKey: ["my-creator-profile"] });
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="mt-6 grid gap-4 rounded-2xl bg-card p-6 shadow-card sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
      </div>
      <div className="sm:col-span-2">
        <Label>Description</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} />
      </div>
      <div>
        <Label>Duration (min)</Label>
        <Input type="number" min={10} max={240} value={duration} onChange={(e) => setDuration(e.target.value)} required />
      </div>
      <div>
        <Label>Price (KES)</Label>
        <Input type="number" min={100} max={500000} value={price} onChange={(e) => setPrice(e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <Label>Session type</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["online", "in-person", "hybrid"] as const).map((t) => {
            const st = SESSION_TYPE_LABELS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSessionType(t)}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                  sessionType === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                }`}
              >
                {st.icon} {st.label}
              </button>
            );
          })}
        </div>
      </div>
      {(sessionType === "in-person" || sessionType === "hybrid") && (
        <div className="sm:col-span-2">
          <Label>Meeting location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={200}
            placeholder="e.g. Nairobi CBD, ABC Place, 3rd Floor"
            required={sessionType === "in-person"}
          />
        </div>
      )}
      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" variant="hero" disabled={mut.isPending}>Save package</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
