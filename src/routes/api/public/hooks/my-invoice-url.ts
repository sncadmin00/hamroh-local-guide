/**
 * Return a signed URL to download the invoice/receipt PDF for a single booking.
 *
 * Auth: Authorization: Bearer <supabase user access_token>.
 * Method: POST
 * Body: { booking_id: string (uuid) }
 * Response: { url: string, filename: string, expires_in: number }
 *
 * Access rules:
 *   - Caller must be the client (bookings.user_id) OR the guide (guides.user_id)
 *     linked to the booking.
 *   - Booking must be in status 'confirmed' or 'completed' — same rule as web
 *     (getBookingPdf in booking-pdf.functions.ts).
 *
 * The returned URL points at the existing public streaming endpoint
 *   GET /api/public/bookings/:id/pdf?token=<HMAC>
 * which renders the invoice on demand (amount, commission, date, tourist, tour).
 * Nothing is stored — treat `expires_in` (~1 hour) as a UX hint and re-request
 * if the user opens the link later.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { signBookingPdfToken } from "@/lib/booking-pdf.server";

function cors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const bodySchema = z.object({
  booking_id: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/hooks/my-invoice-url")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json(
            { error: "Unauthorized", message: "Missing bearer token" },
            { status: 401, headers: cors() },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json(
            { error: "ServerError", message: "Supabase env missing" },
            { status: 500, headers: cors() },
          );
        }

        const sb = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json(
            { error: "Unauthorized", message: "Invalid or expired token" },
            { status: 401, headers: cors() },
          );
        }
        const userId = userRes.user.id;

        let raw: unknown = {};
        try {
          const t = await request.text();
          raw = t ? JSON.parse(t) : {};
        } catch {
          return Response.json(
            { error: "BadRequest", message: "Invalid JSON body" },
            { status: 400, headers: cors() },
          );
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "BadRequest", message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400, headers: cors() },
          );
        }

        const bookingId = parsed.data.booking_id;

        const { data: row, error: rowErr } = await sb
          .from("bookings")
          .select("id, user_id, guide_id, status, guides(user_id)")
          .eq("id", bookingId)
          .maybeSingle();
        if (rowErr || !row) {
          return Response.json(
            { error: "NotFound", message: "Booking not found" },
            { status: 404, headers: cors() },
          );
        }

        const guideUserId = (row as any).guides?.user_id ?? null;
        if ((row as any).user_id !== userId && guideUserId !== userId) {
          return Response.json(
            { error: "Forbidden", message: "You do not have access to this booking" },
            { status: 403, headers: cors() },
          );
        }

        const status = (row as any).status as string;
        if (status !== "confirmed" && status !== "completed") {
          return Response.json(
            {
              error: "InvoiceUnavailable",
              message: "Invoice is available only for confirmed or completed bookings",
              status,
            },
            { status: 409, headers: cors() },
          );
        }

        const origin = new URL(request.url).origin;
        const signed = signBookingPdfToken(bookingId);
        const link = `${origin}/api/public/bookings/${bookingId}/pdf?token=${signed}`;
        const filename = `hamroh-invoice-${bookingId.slice(0, 8)}.pdf`;

        return Response.json(
          {
            url: link,
            filename,
            expires_in: 3600,
          },
          { headers: cors() },
        );
      },
    },
  },
});
