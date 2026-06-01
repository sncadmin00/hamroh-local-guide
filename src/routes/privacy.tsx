import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal-content";

const URL = "https://hamroh-local-guide.lovable.app/privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hamroh" },
      { name: "description", content: "How Hamroh collects and uses your personal data." },
      { property: "og:title", content: "Privacy Policy — Hamroh" },
      { property: "og:description", content: "How Hamroh collects and uses your personal data." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <LegalPage doc={LEGAL.privacy} />,
});
