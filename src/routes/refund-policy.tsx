import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal-content";

const URL = "https://hamroh-local-guide.lovable.app/refund-policy";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Hamroh" },
      { name: "description", content: "Hamroh's refund and cancellation rules." },
      { property: "og:title", content: "Refund Policy — Hamroh" },
      { property: "og:description", content: "Hamroh's refund and cancellation rules." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <LegalPage doc={LEGAL.refund} />,
});
