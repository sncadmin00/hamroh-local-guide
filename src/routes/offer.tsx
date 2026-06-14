import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";
import { getCurrentOffer } from "@/lib/legal-offer.functions";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [
      { title: "Public Offer · Hamroh" },
      { name: "description", content: "Hamroh public offer governing relations between guides, clients and the platform." },
    ],
  }),
  component: OfferPage,
});

type OfferData = Awaited<ReturnType<typeof getCurrentOffer>>;

function pickContent(o: OfferData, lang: string) {
  if (lang === "ru") return o.content_ru;
  if (lang === "uz") return o.content_uz;
  return o.content_en;
}

// Minimal markdown → HTML (headings + paragraphs + bold). Content is admin-controlled.
function mdToHtml(md: string): string {
  const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const lines = md.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      const text = escape(para.join(" ")).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      out.push(`<p>${text}</p>`);
      para = [];
    }
  };
  for (const line of lines) {
    if (/^#\s/.test(line)) { flush(); out.push(`<h1>${escape(line.replace(/^#\s/, ""))}</h1>`); }
    else if (/^##\s/.test(line)) { flush(); out.push(`<h2>${escape(line.replace(/^##\s/, ""))}</h2>`); }
    else if (/^-\s/.test(line)) {
      flush();
      const last = out[out.length - 1];
      const item = escape(line.replace(/^-\s/, "")).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (last && last.startsWith("<ul>")) {
        out[out.length - 1] = last.replace(/<\/ul>$/, `<li>${item}</li></ul>`);
      } else {
        out.push(`<ul><li>${item}</li></ul>`);
      }
    } else if (line.trim() === "") {
      flush();
    } else {
      para.push(line);
    }
  }
  flush();
  return out.join("\n");
}

function OfferPage() {
  const { lang } = useI18n();
  const getFn = useServerFn(getCurrentOffer);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getFn()
      .then((o) => setOffer(o as OfferData))
      .catch((e) => setErr(e.message));
  }, [getFn]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {!offer && !err && (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin inline" />
          </div>
        )}
        {err && <p className="text-destructive text-sm">{err}</p>}
        {offer && (
          <>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Version {offer.version} · {new Date(offer.published_at).toLocaleDateString()}</p>
            <article
              className="prose prose-neutral mt-4 max-w-none prose-headings:font-display prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-p:text-foreground/90 prose-li:text-foreground/90"
              dangerouslySetInnerHTML={{ __html: mdToHtml(pickContent(offer, lang)) }}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
