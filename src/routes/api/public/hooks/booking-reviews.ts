import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail } from '@/lib/email/enqueue.server'

const APP_BASE_URL = 'https://hamrohim.com'

export const Route = createFileRoute('/api/public/hooks/booking-reviews')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get('authorization') ?? request.headers.get('apikey')
        if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server misconfigured' }, { status: 500 })
        }
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        // Bookings that happened yesterday (UTC date)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)

        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, guide_id, customer_name, customer_email, experience, date, status')
          .eq('date', yesterday)
          .eq('status', 'confirmed')
          .limit(200)

        if (error) {
          console.error('reviews query failed', error)
          return Response.json({ error: 'Query failed' }, { status: 500 })
        }
        if (!bookings?.length) return Response.json({ processed: 0 })

        let queued = 0
        for (const b of bookings) {
          try {
            const { data: already } = await supabase
              .from('email_send_log')
              .select('id')
              .eq('template_name', 'booking-review-request')
              .eq('recipient_email', b.customer_email)
              .limit(1)
              .maybeSingle()
            if (already) continue

            const { data: guide } = await supabase
              .from('guides')
              .select('name')
              .eq('id', b.guide_id as string)
              .maybeSingle()

            const ok = await enqueueTransactionalEmail({
              supabase,
              templateName: 'booking-review-request',
              recipientEmail: b.customer_email as string,
              templateData: {
                customerName: b.customer_name,
                guideName: guide?.name,
                experience: b.experience,
                reviewUrl: `${APP_BASE_URL}/my-bookings`,
              },
              idempotencyKey: `booking-review-${b.id}`,
            })
            if (ok) queued++
          } catch (e) {
            console.error('review error', b.id, e)
          }
        }

        return Response.json({ processed: bookings.length, queued })
      },
    },
  },
})
