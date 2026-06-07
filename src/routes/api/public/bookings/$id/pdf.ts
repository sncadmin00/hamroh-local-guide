import { createFileRoute } from '@tanstack/react-router';
import {
  buildBookingPdf,
  loadFullBooking,
  verifyBookingPdfToken,
} from '@/lib/booking-pdf.server';
import { normalizePdfLocale } from '@/lib/booking-pdf-i18n';

export const Route = createFileRoute('/api/public/bookings/$id/pdf')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        const bookingId = params.id;

        // Basic uuid check
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
          return new Response('Not found', { status: 404 });
        }
        if (!verifyBookingPdfToken(bookingId, token)) {
          return new Response('Invalid token', { status: 401 });
        }

        const full = await loadFullBooking(bookingId);
        if (!full) return new Response('Not found', { status: 404 });

        if (full.booking.status !== 'confirmed' && full.booking.status !== 'completed') {
          return new Response('Booking is not confirmed yet', { status: 403 });
        }

        const bytes = await buildBookingPdf(full, {
          origin: url.origin,
          locale: normalizePdfLocale(url.searchParams.get('locale') ?? full.booking.locale),
        });

        return new Response(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="hamroh-booking-${bookingId.slice(0, 8)}.pdf"`,
            'Cache-Control': 'private, no-store',
          },
        });
      },
    },
  },
});
