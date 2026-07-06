import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail } from '@/lib/email/enqueue.server'

const APP_BASE_URL = 'https://hamrohim.com'

export const Route = createFileRoute('/api/public/hooks/booking-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get('authorization') ?? request.headers.get('apikey') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim()
        if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

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
          .select('id, guide_id, user_id, customer_name, customer_email, experience, date, start_time, status, locale')
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
            const { data: guide } = await supabase
              .from('guides')
              .select('name, user_id')
              .eq('id', b.guide_id as string)
              .maybeSingle()

            // In-app notifications — client and guide (independent of email)
            const recipients: string[] = []
            if (b.user_id) recipients.push(b.user_id as string)
            if (guide?.user_id) recipients.push(guide.user_id as string)
            for (const uid of recipients) {
              try {
                await supabase.from('notifications').insert({
                  user_id: uid,
                  type: 'booking_reminder',
                  entity_id: b.id,
                  entity_type: 'booking',
                  title: 'Tour tomorrow',
                  body: guide?.name
                    ? `${b.experience} with ${guide.name} — ${b.start_time ?? ''}`.trim()
                    : `${b.experience} — ${b.start_time ?? ''}`.trim(),
                  icon: '⏰',
                  link: '/my-bookings',
                  category: 'bookings',
                })
              } catch (e) {
                console.error('reminder notification insert failed', b.id, e)
              }
            }

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
