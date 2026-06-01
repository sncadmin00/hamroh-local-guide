import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";

type Doc = {
  en: { title: string; updated: string; sections: readonly (readonly [string, string])[] };
  ru: { title: string; updated: string; sections: readonly (readonly [string, string])[] };
  uz: { title: string; updated: string; sections: readonly (readonly [string, string])[] };
};

export function LegalPage({ doc }: { doc: Doc }) {
  const { lang } = useI18n();
  const d = doc[lang] ?? doc.en;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{d.updated}</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold">{d.title}</h1>
        <div className="mt-8 space-y-6">
          {d.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-display text-lg font-semibold">{h}</h2>
              <p className="mt-2 text-foreground/80 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
