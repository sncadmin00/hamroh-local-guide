import { Star } from "lucide-react";
import { useFeaturedReviews } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

export function FeaturedReviews() {
  const { t } = useI18n();
  const { data: reviews = [], isLoading } = useFeaturedReviews();
  if (isLoading || reviews.length < 3) return null;

  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("reviews.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("reviews.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="flex flex-col rounded-2xl bg-card ring-1 ring-border p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <blockquote className="text-sm text-foreground/85 leading-relaxed line-clamp-5 flex-1">
                "{r.comment}"
              </blockquote>
              <figcaption className="mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.authorName}</span>
                {r.guideName && (
                  <>
                    {" · "}
                    <span>
                      {t("reviews.about")} {r.guideName}
                    </span>
                  </>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
