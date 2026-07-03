import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar } from "lucide-react";

export const Route = createFileRoute("/explore/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("articles")
      .select("title, excerpt, cover_url, published_at")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    return { meta: data as { title: string; excerpt: string; cover_url: string | null; published_at: string | null } | null };
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const title = m ? `${m.title} — Hamroh` : "Article — Hamroh";
    const description = m?.excerpt?.slice(0, 160) || "Read a travel story from Hamroh.";
    const url = `https://hamroh-local-guide.lovable.app/explore/${params.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
    ];
    if (m?.cover_url) {
      meta.push({ property: "og:image", content: m.cover_url });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
      meta.push({ name: "twitter:image", content: m.cover_url });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (m) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: m.title,
          description,
          image: m.cover_url || undefined,
          datePublished: m.published_at || undefined,
          url,
          publisher: {
            "@type": "Organization",
            name: "Hamroh",
            url: "https://hamroh-local-guide.lovable.app",
          },
          mainEntityOfPage: url,
        }),
      });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-3xl font-semibold">Article not found</h1>
        <Link to="/explore" className="mt-4 inline-block text-primary hover:underline">Back to Explore</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Couldn't load article</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/explore" className="mt-4 inline-block text-primary hover:underline">Back to Explore</Link>
      </div>
    </div>
  ),
});

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string | null;
  body_md: string;
  published_at: string | null;
};

function renderMarkdown(md: string): string {
  // Lightweight markdown: paragraphs + line breaks. Escapes HTML.
  const escaped = md.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setArticle((data as Article) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!article) throw notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {article.cover_url && (
          <div className="w-full aspect-[21/9] max-h-[480px] overflow-hidden bg-secondary">
            <img src={article.cover_url} alt={article.title} className="h-full w-full object-cover" />
          </div>
        )}
        <article className="container mx-auto max-w-3xl px-4 py-12">
          <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Explore
          </Link>
          <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold leading-tight">{article.title}</h1>
          {article.published_at && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(article.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
          {article.excerpt && <p className="mt-6 text-lg text-muted-foreground">{article.excerpt}</p>}
          <div
            className="prose prose-neutral dark:prose-invert mt-8 max-w-none [&_p]:leading-relaxed [&_p]:my-4 text-foreground"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body_md) }}
          />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
