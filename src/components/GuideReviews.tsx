import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { listGuideReviews } from "@/lib/reviews.functions";

export function GuideReviews({ guideId }: { guideId: string }) {
  const fetchReviews = useServerFn(listGuideReviews);
  const q = useQuery({
    queryKey: ["guide-reviews", guideId],
    queryFn: () => fetchReviews({ data: { guideId } }),
  });

  const reviews = q.data ?? [];
  if (q.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading reviews…</p>;
  }
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl bg-card ring-1 ring-border/60 p-4">
          {r.tourSlug && r.tourTitle && (
            <Link
              to="/tours/$slug"
              params={{ slug: r.tourSlug }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Tour: {r.tourTitle}
            </Link>
          )}
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm font-medium">{r.authorName}</p>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                />
              ))}
            </div>
          </div>
          {r.comment && (
            <p className="mt-2 text-sm text-foreground/80 whitespace-pre-line">{r.comment}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
