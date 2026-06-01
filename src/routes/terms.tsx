import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal-content";

const URL = "https://hamroh-local-guide.lovable.app/terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Hamroh" },
      { name: "description", content: "Read the Terms of Service for using Hamroh." },
      { property: "og:title", content: "Terms of Service — Hamroh" },
      { property: "og:description", content: "Read the Terms of Service for using Hamroh." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <LegalPage doc={LEGAL.terms} />,
});
