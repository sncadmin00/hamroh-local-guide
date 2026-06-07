import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getRequest } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import {
  buildBookingPdf,
  loadFullBooking,
  signBookingPdfToken,
} from '@/lib/booking-pdf.server';
import { normalizePdfLocale } from '@/lib/booking-pdf-i18n';

// Returns a base64-encoded PDF for the authenticated user's confirmed booking.
// Used by the My Bookings download button.
export const getBookingPdf = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Verify the caller owns this booking OR is the guide for it.
    const { data: row } = await supabase
      .from('bookings')
      .select('id, user_id, guide_id, status, locale, guides(user_id)')
      .eq('id', data.id)
      .maybeSingle();
    if (!row) throw new Error('Booking not found');
    const guideUserId = (row as any).guides?.user_id ?? null;
    if (row.user_id !== userId && guideUserId !== userId) {
      throw new Error('Forbidden');
    }
    if (row.status !== 'confirmed' && row.status !== 'completed') {
      throw new Error('PDF is available only for confirmed bookings');
    }

    const full = await loadFullBooking(data.id);
    if (!full) throw new Error('Booking not found');

    const req = getRequest();
    const origin = new URL(req.url).origin;
    const bytes = await buildBookingPdf(full, {
      origin,
      locale: normalizePdfLocale(full.booking.locale),
    });

    // Convert to base64 for safe transport over the JSON RPC boundary.
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return {
      pdfBase64: base64,
      filename: `hamroh-booking-${String(data.id).slice(0, 8)}.pdf`,
    };
  });

// Returns a public, signed link to the PDF (used in emails). Auth-gated.
export const getBookingPdfShareUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from('bookings')
      .select('id, user_id, guide_id, guides(user_id)')
      .eq('id', data.id)
      .maybeSingle();
    if (!row) throw new Error('Booking not found');
    const guideUserId = (row as any).guides?.user_id ?? null;
    if (row.user_id !== userId && guideUserId !== userId) {
      throw new Error('Forbidden');
    }
    const req = getRequest();
    const origin = new URL(req.url).origin;
    return {
      url: `${origin}/api/public/bookings/${data.id}/pdf?token=${signBookingPdfToken(data.id)}`,
    };
  });
