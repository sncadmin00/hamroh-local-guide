import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, MapPin, Calendar, Link2, Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


import { getPublicDiary, type PublicDiary } from "@/lib/public-diary.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const diaryQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-diary", id],
    queryFn: async () => {
      const d = await getPublicDiary({ data: { id } });
      if (!d) throw notFound();
      return d as PublicDiary;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/diary/$id")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(diaryQuery(params.id)),
  head: ({ loaderData }) => {
    const d = loaderData as PublicDiary | undefined;
    const title = d?.title ? `${d.title} — Travel diary · Hamroh` : "Travel diary · Hamroh";
    const desc = d
      ? `${d.city ?? ""}${d.start_date ? ` · ${d.start_date}` : ""}${d.end_date ? ` — ${d.end_date}` : ""}`.trim() ||
        "A travel diary shared on Hamroh."
      : "A travel diary shared on Hamroh.";
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: desc },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (d?.cover_url) {
      meta.push({ property: "og:image", content: d.cover_url });
      meta.push({ name: "twitter:image", content: d.cover_url });
    }
    return { meta };
  },
  component: PublicDiaryPage,
  errorComponent: DiaryError,
  notFoundComponent: DiaryNotFound,
});

function DiaryShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-[900px] mx-auto px-4 md:px-8 py-8 md:py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}

function DiaryNotFound() {
  return (
    <DiaryShell>
      <div className="text-center py-20">
        <BookOpen className="h-10 w-10 mx-auto opacity-40 mb-4" />
        <h1 className="text-2xl md:text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Diary is private
        </h1>
        <p className="text-sm text-muted-foreground">
          This travel diary is not shared publicly, or the link is no longer valid.
        </p>
      </div>
    </DiaryShell>
  );
}

function DiaryError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <DiaryShell>
      <div className="text-center py-20">
        <h1 className="text-xl mb-2">Couldn't load this diary</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-full px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </DiaryShell>
  );
}

function PublicDiaryPage() {
  const { id } = Route.useParams();
  const { data: diary } = useSuspenseQuery(diaryQuery(id));

  const dateRange = [diary.start_date, diary.end_date].filter(Boolean).join(" — ");

  return (
    <DiaryShell>
      {diary.cover_url && (
        <div className="rounded-3xl overflow-hidden mb-8 aspect-[16/7] bg-secondary">
          <img src={diary.cover_url} alt={diary.title ?? "Diary cover"} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-4 w-4" style={{ color: "#1F9BB4" }} />
        <span
          className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "#1F9BB4" }}
        >
          Travel diary
        </span>
      </div>

      <h1
        className="text-3xl md:text-5xl tracking-tight mb-4"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        {diary.title || "Untitled diary"}
      </h1>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-10">
        {diary.city && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {diary.city}
          </span>
        )}
        {dateRange && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> {dateRange}
          </span>
        )}
      </div>

      {diary.stats && (
        <div className="flex flex-wrap gap-4 mb-6 text-xs text-muted-foreground">
          <span>{diary.stats.places ?? 0} places</span>
          <span>{diary.stats.tours ?? 0} tours</span>
          <span>{diary.stats.guides ?? 0} guides</span>
          <span>{diary.stats.photos ?? 0} photos</span>
        </div>
      )}

      <ShareRow title={diary.title || "Travel diary"} diaryId={diary.id} />



      <div className="space-y-10">
        {diary.days.length === 0 && (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        )}
        {diary.days.map((d, i) => (
          <article
            key={i}
            className="rounded-2xl p-5 md:p-7"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-baseline gap-3 mb-3">
              <span
                className="text-2xl md:text-3xl"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Day {d.day ?? i + 1}
              </span>
              {(d.label || d.date) && (
                <span className="text-sm text-muted-foreground">{d.label || d.date}</span>
              )}
            </div>

            {d.notes && (
              <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap mb-4">
                {d.notes}
              </p>
            )}

            {d.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {d.photos.map((src, j) => (
                  <div key={j} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                    <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {(d.places?.length || d.tours?.length || d.guides?.length) ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {d.places?.map((p, j) => (
                  <span key={`p${j}`} className="inline-flex items-center gap-1 rounded-full px-3 py-1"
                    style={{ background: "var(--secondary)" }}>
                    <MapPin className="h-3 w-3" /> {p.name}
                  </span>
                ))}
                {d.tours?.map((t, j) => (
                  <span key={`t${j}`} className="inline-flex rounded-full px-3 py-1"
                    style={{ background: "var(--secondary)" }}>{t.title}</span>
                ))}
                {d.guides?.map((g, j) => (
                  <span key={`g${j}`} className="inline-flex rounded-full px-3 py-1"
                    style={{ background: "var(--secondary)" }}>{g.name}</span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </DiaryShell>
  );
}

function ShareRow({ title, diaryId }: { title: string; diaryId: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = `https://hamroh-local-guide.lovable.app/diary/${diaryId}`;
  const text = `${title} — Travel diary on Hamroh`;
  const enc = encodeURIComponent;

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handleShareClick = async () => {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav?.share) {
      try {
        await nav.share({ title, text, url });
        return;
      } catch {
        // fall through to popover
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div className="mb-10">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={handleShareClick}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--secondary)", color: "var(--foreground)" }}
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="flex flex-col">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--secondary)]"
              >
                {l.label}
              </a>
            ))}
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--secondary)]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="mt-2 px-3 pb-1 text-[11px] text-muted-foreground">
            For Instagram — copy the link and paste in story or DM.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}


