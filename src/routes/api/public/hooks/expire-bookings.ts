import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail } from '@/lib/email/enqueue.server'
import { sendTelegramMessage } from '@/lib/telegram-notifications.server'

const APP_BASE_URL = 'https://hamrohim.com'

export const Route = createFileRoute('/api/public/hooks/expire-bookings')({
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

        const nowIso = new Date().toISOString()
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, guide_id, customer_name, customer_email, customer_telegram_chat_id, experience, date, start_time, locale, slot_id, user_id')
          .eq('status', 'pending')
          .not('expires_at', 'is', null)
          .lte('expires_at', nowIso)
          .limit(100)

        if (error) {
          console.error('expire query failed', error)
          return Response.json({ error: 'Query failed' }, { status: 500 })
        }
        if (!bookings?.length) return Response.json({ expired: 0 })

        let expired = 0
        for (const b of bookings) {
          try {
            const { error: updErr } = await supabase
              .from('bookings')
              .update({
                status: 'expired',
                expired_at: nowIso,
                cancellation_reason: 'Guide did not respond in time',
              })
              .eq('id', b.id)
              .eq('status', 'pending')
            if (updErr) {
              console.error('expire update failed', b.id, updErr)
              continue
            }
            // Free up slot if any
            if (b.slot_id) {
              await supabase
                .from('guide_availability_slots')
                .update({ is_booked: false, booking_id: null })
                .eq('id', b.slot_id as string)
            }
            expired++

            // Notify client by email
            if (b.customer_email) {
              try {
                await enqueueTransactionalEmail({
                  supabase,
                  templateName: 'booking-expired-client',
                  recipientEmail: b.customer_email as string,
                  templateData: {
                    customerName: b.customer_name,
                    experience: b.experience,
                    date: b.date,
                    startTime: b.start_time,
                    bookingUrl: `${APP_BASE_URL}/my-bookings`,
                    locale: (b.locale as string) ?? 'ru',
                  },
                  idempotencyKey: `booking-expired-${b.id}`,
                })
              } catch (e) {
                console.error('expire email enqueue failed', b.id, e)
              }
            }

            // Telegram ping to client
            if (b.customer_telegram_chat_id) {
              try {
                await sendTelegramMessage({
                  chatId: Number(b.customer_telegram_chat_id),
                  text:
                    `⌛ Your booking request for "${b.experience}" on ${b.date} expired because the guide did not respond in time. ` +
                    `You can choose another guide here: ${APP_BASE_URL}/my-bookings`,
                })
              } catch (e) {
                console.error('expire telegram failed', b.id, e)
              }
            }
          } catch (e) {
            console.error('expire loop error', b.id, e)
          }
        }

        return Response.json({ expired })
      },
    },
  },
})
