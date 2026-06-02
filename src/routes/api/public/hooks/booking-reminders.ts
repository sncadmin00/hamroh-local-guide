import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail } from '@/lib/email/enqueue.server'

const APP_BASE_URL = 'https://hamrohim.com'

export const Route = createFileRoute('/api/public/hooks/booking-reminders')({
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

        // Bookings happening tomorrow (UTC date)
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)

        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, guide_id, customer_name, customer_email, experience, date, start_time, status, locale')
          .eq('date', tomorrow)
          .eq('status', 'confirmed')
          .limit(200)

        if (error) {
          console.error('reminders query failed', error)
          return Response.json({ error: 'Query failed' }, { status: 500 })
        }
        if (!bookings?.length) return Response.json({ processed: 0 })

        let queued = 0
        for (const b of bookings) {
          try {
            if (!b.customer_email) continue
            const idem = `booking-reminder-${b.id}`
            const { data: already } = await supabase
              .from('email_send_log')
              .select('id')
              .eq('template_name', 'booking-reminder-client')
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
              templateName: 'booking-reminder-client',
              recipientEmail: b.customer_email as string,
              templateData: {
                customerName: b.customer_name,
                guideName: guide?.name,
                experience: b.experience,
                date: b.date,
                startTime: b.start_time,
                bookingUrl: `${APP_BASE_URL}/my-bookings`,
                locale: (b.locale as string) ?? 'ru',
              },
              idempotencyKey: idem,
            })
            if (ok) queued++
          } catch (e) {
            console.error('reminder error', b.id, e)
          }
        }

        return Response.json({ processed: bookings.length, queued })
      },
    },
  },
})
