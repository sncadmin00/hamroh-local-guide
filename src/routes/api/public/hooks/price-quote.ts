/**
 * Public price-quote endpoint. Runs the same server-authoritative pricing
 * math as createBookingCore, without creating a booking. Safe to call from
 * clients (web + mobile) to display the exact final amount before confirm.
 *
 * Read-only: no auth required, no side effects.
 */
import { createFileRoute } from '@tanstack/react-router'
import { quoteBookingCore, quoteSchema } from '@/lib/booking-core.server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const Route = createFileRoute('/api/public/hooks/price-quote')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: any
        try {
          body = await request.json()
        } catch {
          return Response.json(
            { error: 'ValidationError', message: 'Invalid JSON' },
            { status: 400, headers: CORS },
          )
        }
        const input = body?.input ?? body
        const parsed = quoteSchema.safeParse(input)
        if (!parsed.success) {
          return Response.json(
            {
              error: 'ValidationError',
              message: parsed.error.issues[0]?.message ?? 'Invalid input',
              issues: parsed.error.issues,
            },
            { status: 400, headers: CORS },
          )
        }
        try {
          const quote = await quoteBookingCore(parsed.data)
          return Response.json({ quote }, { status: 200, headers: CORS })
        } catch (e: any) {
          const message = e?.message ?? 'Server error'
          const isValidation = /(Tour|group|price|language)/i.test(message)
          return Response.json(
            { error: isValidation ? 'ValidationError' : 'ServerError', message },
            { status: isValidation ? 400 : 500, headers: CORS },
          )
        }
      },
    },
  },
})
