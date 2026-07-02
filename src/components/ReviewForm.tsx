import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitReview, getMyReviewForBooking } from "@/lib/reviews.functions";
import { supabase } from "@/integrations/supabase/client";

const MAX_PHOTOS = 6;

type PhotoItem = {
  path: string; // storage path in traveler-media bucket
  url: string; // signed URL or object URL for preview
};

export function ReviewForm({ bookingId, guideName }: { bookingId: string; guideName?: string }) {
  const fetchMine = useServerFn(getMyReviewForBooking);
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const existing = useQuery({
    queryKey: ["my-review", bookingId],
    queryFn: () => fetchMine({ data: { bookingId } }),
  });

  const [rating, setRating] = useState<number>(5);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate form once when existing review + open dialog
  useEffect(() => {
    if (!open || hydrated) return;
    if (existing.data) {
      setRating(existing.data.rating ?? 5);
      setComment(existing.data.comment ?? "");
      const items: PhotoItem[] = (existing.data.photos ?? []).map((p, i) => ({
        path: p,
        url: existing.data!.photoUrls?.[i] ?? "",
      }));
      setPhotos(items);
    }
    setHydrated(true);
  }, [open, hydrated, existing.data]);

  const mut = useMutation({
    mutationFn: () =>
      submit({
        data: {
          bookingId,
          rating,
          comment: comment.trim(),
          photos: photos.map((p) => p.path),
        },
      }),
    onSuccess: () => {
      toast.success("Thanks for your review!");
      qc.invalidateQueries({ queryKey: ["my-review", bookingId] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["guide-reviews"] });
      qc.invalidateQueries({ queryKey: ["tour-reviews"] });
      setOpen(false);
      setHydrated(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) {
        toast.error("Please sign in to upload photos.");
        return;
      }
      const uploaded: PhotoItem[] = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image`);
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name}: max 15 MB`);
          continue;
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${userId}/review/${bookingId}/photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("traveler-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { data: signed, error: sErr } = await supabase.storage
          .from("traveler-media")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (sErr || !signed?.signedUrl) {
          toast.error(`${file.name}: could not sign preview URL`);
          continue;
        }
        uploaded.push({ path, url: signed.signedUrl });
      }
      if (uploaded.length > 0) setPhotos((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removePhoto(idx: number) {
    const target = photos[idx];
    if (!target) return;
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    // Best-effort storage cleanup; RLS ensures user can only touch their folder
    try {
      await supabase.storage.from("traveler-media").remove([target.path]);
    } catch {
      /* ignore */
    }
  }

  // Already left a review — compact view
  if (existing.data && !open) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < (existing.data?.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
            />
          ))}
        </span>
        <span>Review submitted{existing.data.photos.length > 0 ? ` · ${existing.data.photos.length} photo${existing.data.photos.length === 1 ? "" : "s"}` : ""}</span>
        <button onClick={() => setOpen(true)} className="text-primary hover:underline">
          Edit
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:underline"
      >
        <Star className="h-3.5 w-3.5" /> Leave a review
      </button>
    );
  }

  const display = hover ?? rating;

  return (
    <div className="mt-3 rounded-xl ring-1 ring-border/60 bg-card p-3">
      <p className="text-sm font-medium">
        Rate your trip{guideName ? ` with ${guideName}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            aria-label={`${n} stars`}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 transition-colors ${n <= display ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Share what made the experience great (optional)…"
        className="mt-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />

      {/* Photos block */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Add photos <span className="opacity-70">({photos.length}/{MAX_PHOTOS})</span>
          </p>
          {uploading && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
            </span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <div
              key={p.path}
              className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-border/60 bg-muted"
            >
              {p.url ? (
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                  photo
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-secondary disabled:opacity-50"
              aria-label="Add photo"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setHydrated(false);
          }}
          className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || uploading}
          className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {mut.isPending ? "Saving…" : existing.data ? "Update review" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
