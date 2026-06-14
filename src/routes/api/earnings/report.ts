import { createFileRoute } from "@tanstack/react-router";
import {
  loadReportData,
  verifyReportToken,
  buildReportCsv,
  buildReportPdf,
  type ReportKind,
} from "@/lib/earnings-report.server";

export const Route = createFileRoute("/api/earnings/report")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const guideId = url.searchParams.get("guide_id") ?? "";
        const kind = (url.searchParams.get("kind") ?? "") as ReportKind;
        const period = url.searchParams.get("period") ?? "";
        const format = (url.searchParams.get("format") ?? "pdf").toLowerCase();
        const token = url.searchParams.get("token");

        if (!/^[0-9a-f-]{36}$/i.test(guideId)) return new Response("Bad request", { status: 400 });
        if (!["monthly", "annual", "tax"].includes(kind)) return new Response("Bad request", { status: 400 });
        if (!period || period.length > 10) return new Response("Bad request", { status: 400 });
        if (!verifyReportToken({ guideId, kind, period }, token)) {
          return new Response("Invalid token", { status: 401 });
        }

        const data = await loadReportData({ guideId, kind, period });
        if (!data) return new Response("Not found", { status: 404 });

        const filename = `hamroh-${kind}-${data.guide.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}-${period}`;

        if (format === "csv") {
          const csv = buildReportCsv(data);
          return new Response(csv, {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="${filename}.csv"`,
              "Cache-Control": "private, no-store",
            },
          });
        }

        const bytes = await buildReportPdf(data, { origin: url.origin });
        return new Response(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename}.pdf"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
