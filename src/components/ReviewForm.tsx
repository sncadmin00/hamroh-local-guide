import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitReview, getMyReviewForBooking } from "@/lib/reviews.functions";

export function ReviewForm({ bookingId, guideName }: { bookingId: string; guideName?: string }) {
  const fetchMine = useServerFn(getMyReviewForBooking);
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ["my-review", bookingId],
    queryFn: () => fetchMine({ data: { bookingId } }),
  });

  const [rating, setRating] = useState<number>(existing.data?.rating ?? 5);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState<string>(existing.data?.comment ?? "");
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      submit({ data: { bookingId, rating, comment: comment.trim() } }),
    onSuccess: () => {
      toast.success("Thanks for your review!");
      qc.invalidateQueries({ queryKey: ["my-review", bookingId] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <span>Review submitted</span>
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
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {mut.isPending ? "Saving…" : existing.data ? "Update review" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
