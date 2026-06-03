import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";

export function HomeFaq() {
  const { t } = useI18n();
  const qs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
  ];

  return (
    <section className="px-6 py-16 md:py-20 bg-secondary/40">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("faq.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("faq.subtitle")}</p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {qs.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
