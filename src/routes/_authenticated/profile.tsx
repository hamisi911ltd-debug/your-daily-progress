import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { setStoredToken } from "@/integrations/cloudflare/auth";
import {
  Camera, Instagram, Link2, Facebook, User, MapPin, FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile · Fanmeeet" }] }),
  component: ProfilePage,
});

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.17a8.18 8.18 0 004.79 1.53V7.26a4.85 4.85 0 01-1.02-.57z" />
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.166 2C8.625 2 6.29 4.23 6.29 7.78v.83c-.45.1-.91.06-1.34-.12-.28-.12-.54-.08-.7.12-.2.24-.19.56.01.8.54.65 1.4 1.08 2.33 1.24-.08.42-.22.83-.42 1.2-.73 1.37-2.14 2.4-3.78 2.8-.18.05-.3.2-.3.38 0 .15.09.28.23.34.77.3 1.57.52 2.38.66.08.7.67 1.22 1.36 1.22.46 0 .86-.18 1.2-.45.66.97 1.73 1.6 2.92 1.64.05 0 .1.01.15.01s.1 0 .15-.01c1.19-.04 2.26-.67 2.92-1.64.34.27.74.45 1.2.45.69 0 1.28-.52 1.36-1.22.81-.14 1.61-.36 2.38-.66.14-.06.23-.19.23-.34 0-.18-.12-.33-.3-.38-1.64-.4-3.05-1.43-3.78-2.8-.2-.37-.34-.78-.42-1.2.93-.16 1.79-.59 2.33-1.24.2-.24.21-.56.01-.8-.16-.2-.42-.24-.7-.12-.43.18-.89.22-1.34.12v-.83C17.71 4.23 15.4 2 12.166 2z" />
    </svg>
  );
}

async function compressImage(file: File, maxW: number, maxH: number, quality = 0.82): Promise<string> {
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

function ProfilePage() {
  const fetchProfile = useServerFn(getMyProfile);
  const doUpdate = useServerFn(updateProfile);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const profile = (data as any)?.profile;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [facebook, setFacebook] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setInstagram(profile.instagram_url ?? "");
      setTiktok(profile.tiktok_url ?? "");
      setSnapchat(profile.snapchat_url ?? "");
      setFacebook(profile.facebook_url ?? "");
      setAvatarPreview(profile.avatar_url ?? null);
    }
  }, [profile]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    try {
      const compressed = await compressImage(file, 400, 400, 0.82);
      setAvatarPreview(compressed);
      setAvatarFile(compressed);
    } catch {
      toast.error("Could not process image");
    }
  }

  const mut = useMutation({
    mutationFn: () =>
      doUpdate({
        data: {
          displayName: displayName || undefined,
          bio: bio || undefined,
          location: location || undefined,
          avatarUrl: avatarFile !== null ? avatarFile : undefined,
          instagramUrl: instagram || undefined,
          tiktokUrl: tiktok || undefined,
          snapchatUrl: snapchat || undefined,
          facebookUrl: facebook || undefined,
        },
      }),
    onSuccess: (result: any) => {
      if (result?.token) {
        setStoredToken(result.token);
        window.dispatchEvent(new Event("cc:auth:change"));
      }
      setAvatarFile(null);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profile updated!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="text-muted-foreground">Loading profile…</span>
      </div>
    );
  }

  const initials = (displayName || "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold">My Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your public profile, photo, and social links.</p>

      {/* Avatar upload */}
      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="h-28 w-28 ring-4 ring-primary/20">
            <AvatarImage src={avatarPreview ?? undefined} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WEBP · Max 10MB</p>
      </div>

      {/* Profile fields */}
      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
        className="mt-10 space-y-6"
      >
        {/* Basic info */}
        <div className="rounded-2xl bg-card p-6 shadow-card space-y-5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Basic Info
          </h2>
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="mt-1"
              placeholder="Your full name"
            />
          </div>
          <div>
            <Label htmlFor="bio" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1 resize-none"
              placeholder="Tell people a little about yourself…"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>
          <div>
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              className="mt-1"
              placeholder="e.g. Nairobi, Kenya"
            />
          </div>
        </div>

        {/* Social links */}
        <div className="rounded-2xl bg-card p-6 shadow-card space-y-5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> Social Media Links
          </h2>
          <p className="text-sm text-muted-foreground -mt-3">Link your social accounts so fans can follow you everywhere.</p>

          <div>
            <Label htmlFor="instagram" className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" /> Instagram
            </Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              maxLength={200}
              className="mt-1"
              placeholder="https://instagram.com/yourhandle"
            />
          </div>

          <div>
            <Label htmlFor="tiktok" className="flex items-center gap-2">
              <TikTokIcon className="h-4 w-4" /> TikTok
            </Label>
            <Input
              id="tiktok"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              maxLength={200}
              className="mt-1"
              placeholder="https://tiktok.com/@yourhandle"
            />
          </div>

          <div>
            <Label htmlFor="snapchat" className="flex items-center gap-2">
              <SnapchatIcon className="h-4 w-4 text-yellow-400" /> Snapchat
            </Label>
            <Input
              id="snapchat"
              value={snapchat}
              onChange={(e) => setSnapchat(e.target.value)}
              maxLength={200}
              className="mt-1"
              placeholder="https://snapchat.com/add/yourhandle"
            />
          </div>

          <div>
            <Label htmlFor="facebook" className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" /> Facebook
            </Label>
            <Input
              id="facebook"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              maxLength={200}
              className="mt-1"
              placeholder="https://facebook.com/yourpage"
            />
          </div>
        </div>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
