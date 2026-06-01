import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://hamroh-local-guide.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/guides", changefreq: "daily", priority: "0.9" },
          { path: "/explore", changefreq: "weekly", priority: "0.8" },
          { path: "/how-it-works", changefreq: "monthly", priority: "0.6" },
          { path: "/become-a-guide", changefreq: "monthly", priority: "0.7" },
          { path: "/faq", changefreq: "monthly", priority: "0.5" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const { data: guides } = await supabaseAdmin
            .from("guides")
            .select("slug, updated_at");
          for (const g of guides ?? []) {
            if (!g.slug) continue;
            entries.push({
              path: `/guides/${g.slug}`,
              lastmod: g.updated_at ? new Date(g.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch (e) {
          console.error("sitemap guides fetch", e);
        }

        try {
          const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("slug, updated_at")
            .eq("published", true);
          for (const a of articles ?? []) {
            entries.push({
              path: `/explore/${a.slug}`,
              lastmod: a.updated_at ? new Date(a.updated_at).toISOString() : undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.error("sitemap articles fetch", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
