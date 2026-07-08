/**
 * Internal booking-creation hook. Used by the mobile-facing edge function
 * (`supabase/functions/create-booking`) to run the exact same server-side
 * booking pipeline as the web app (`createBooking` server function).
 *
 * SECURITY: authenticated with the service role key — never expose to clients.
 * The mobile edge function verifies the end-user JWT and forwards a resolved
 * `user_id` (or null for guests).
 */
import { createFileRoute } from '@tanstack/react-router'
import { bookingSchema, createBookingCore } from '@/lib/booking-core.server'

export const Route = createFileRoute('/api/public/hooks/create-booking')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth =
          request.headers.get('authorization') ?? request.headers.get('apikey') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim()
        const internal = process.env.INTERNAL_HOOK_SECRET
        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
        let authorized = !!token && ((!!internal && token === internal) || (!!svc && token === svc))
        if (!authorized && token) {
          try {
            const parts = token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(
                Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'),
              )
              if (payload?.role === 'service_role') authorized = true
            }
          } catch {}
        }
        if (!authorized) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        let body: any
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const userId: string | null =
          typeof body?.user_id === 'string' && body.user_id.length > 0 ? body.user_id : null

        const parsed = bookingSchema.safeParse(body?.input)
        if (!parsed.success) {
          return Response.json(
            {
              error: 'ValidationError',
              message: parsed.error.issues[0]?.message ?? 'Invalid input',
              issues: parsed.error.issues,
            },
            { status: 400 },
          )
        }

        try {
          const booking = await createBookingCore(parsed.data, userId)
          return Response.json({ booking }, { status: 200 })
        } catch (e: any) {
          console.error('[create-booking hook]', e)
          const message = e?.message ?? 'Server error'
          if (e?.code === 'TIME_CONFLICT' || /TIME_CONFLICT/i.test(message)) {
            return Response.json(
              { error: 'TimeConflict', message: 'This time is already booked. Please choose another time.' },
              { status: 409 },
            )
          }
          // Known validation errors (thrown as Error from core) → 400
          const isValidation = /(offer|Tour|group|price|Slot|own tour)/i.test(message)
          return Response.json(
            { error: isValidation ? 'ValidationError' : 'ServerError', message },
            { status: isValidation ? 400 : 500 },
          )
        }
      },
    },
  },
})
