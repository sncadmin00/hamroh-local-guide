import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Hamroh'
const SENDER_DOMAIN = 'notify.hamrohim.com'
const FROM_DOMAIN = 'hamrohim.com'
const APP_BASE_URL = 'https://hamrohim.com'
const TEMPLATE_NAME = 'unread-chat-message'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getOrCreateUnsubToken(
  supabase: any,
  email: string,
): Promise<string | null> {
  const normalized = email.toLowerCase()
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalized)
    .maybeSingle()

  if (existing && !existing.used_at) return existing.token as string
  if (existing && existing.used_at) return null

  const token = generateToken()
  await supabase
    .from('email_unsubscribe_tokens')
    .upsert({ token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })

  const { data: stored } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .maybeSingle()
  return (stored?.token as string) ?? token
}


export const Route = createFileRoute('/api/public/hooks/chat-notifications')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get('authorization') ?? request.headers.get('apikey') ?? ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()
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

        // Find unread messages older than 1 minute that haven't been notified yet
        const cutoff = new Date(Date.now() - 60 * 1000).toISOString()
        const { data: messages, error } = await supabase
          .from('booking_messages')
          .select('id, booking_id, sender_id, sender_role, body, created_at')
          .is('read_at', null)
          .is('notification_sent_at', null)
          .lte('created_at', cutoff)
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) {
          console.error('Failed to load unread messages', error)
          return Response.json({ error: 'Query failed' }, { status: 500 })
        }

        if (!messages || messages.length === 0) {
          return Response.json({ processed: 0 })
        }

        const tpl = TEMPLATES[TEMPLATE_NAME]
        let queued = 0
        let skipped = 0

        for (const msg of messages) {
          try {
            // Load booking + guide info
            const { data: booking } = await supabase
              .from('bookings')
              .select('id, guide_id, user_id, customer_email, customer_name, experience, locale')
              .eq('id', msg.booking_id)
              .maybeSingle()

            if (!booking) {
              await supabase
                .from('booking_messages')
                .update({ notification_sent_at: new Date().toISOString() })
                .eq('id', msg.id)
              skipped++
              continue
            }

            // Resolve recipient (the other party) + sender name + recipient locale
            let recipientEmail: string | null = null
            let recipientName: string | undefined
            let senderName: string | undefined
            let recipientLocale = 'ru'
            let recipientUserId: string | null = null

            if (msg.sender_role === 'client') {
              // notify guide → use guide.locale
              const { data: guide } = await supabase
                .from('guides')
                .select('user_id, name, locale, notification_email')
                .eq('id', booking.guide_id)
                .maybeSingle()
              if (guide?.user_id) {
                recipientUserId = guide.user_id as string
                const customEmail = (guide as any).notification_email as string | null
                if (customEmail) {
                  recipientEmail = customEmail
                } else {
                  const { data: userRes } = await supabase.auth.admin.getUserById(
                    guide.user_id as string,
                  )
                  recipientEmail = userRes?.user?.email ?? null
                }
                recipientName = (guide.name as string) || undefined
                recipientLocale = (guide.locale as string) || 'ru'
              }
              senderName = booking.customer_name as string | undefined
            } else {
              // sender is guide → notify client, use booking.locale
              recipientEmail = booking.customer_email as string | null
              recipientName = booking.customer_name as string | undefined
              recipientLocale = (booking.locale as string) || 'ru'
              recipientUserId = (booking.user_id as string | null) ?? null
              const { data: guide } = await supabase
                .from('guides')
                .select('name')
                .eq('id', booking.guide_id)
                .maybeSingle()
              senderName = (guide?.name as string) || 'Your guide'
            }

            // In-app notification — independent of email deliverability.
            // entity=booking so mobile opens MyBookings by booking.id;
            // when the dedicated chat screen ships this same tap opens it.
            if (recipientUserId) {
              const preview = (msg.body as string).length > 140
                ? (msg.body as string).slice(0, 140) + '…'
                : (msg.body as string)
              try {
                await supabase.from('notifications').insert({
                  user_id: recipientUserId,
                  type: 'chat_message',
                  entity_id: booking.id,
                  entity_type: 'booking',
                  title: senderName ? `New message from ${senderName}` : 'New message',
                  body: preview,
                  icon: '💬',
                  link: `/messages/${booking.id}`,
                  category: 'bookings',
                })
              } catch (e) {
                console.error('chat_message notification insert failed', e)
              }
            }


            if (!recipientEmail) {
              await supabase
                .from('booking_messages')
                .update({ notification_sent_at: new Date().toISOString() })
                .eq('id', msg.id)
              skipped++
              continue
            }

            // Suppression check
            const { data: suppressed } = await supabase
              .from('suppressed_emails')
              .select('id')
              .eq('email', recipientEmail.toLowerCase())
              .maybeSingle()

            if (suppressed) {
              await supabase
                .from('booking_messages')
                .update({ notification_sent_at: new Date().toISOString() })
                .eq('id', msg.id)
              skipped++
              continue
            }

            const unsubscribeToken = await getOrCreateUnsubToken(supabase, recipientEmail)
            if (!unsubscribeToken) {
              await supabase
                .from('booking_messages')
                .update({ notification_sent_at: new Date().toISOString() })
                .eq('id', msg.id)
              skipped++
              continue
            }

            const preview =
              (msg.body as string).length > 180
                ? (msg.body as string).slice(0, 180) + '…'
                : (msg.body as string)

            const templateData = {
              recipientName,
              senderName,
              messagePreview: preview,
              bookingExperience: booking.experience as string,
              bookingUrl: `${APP_BASE_URL}/messages/${booking.id}`,
              locale: recipientLocale,
            }

            const element = React.createElement(tpl.component, templateData)
            const html = await render(element)
            const plainText = await render(element, { plainText: true })

            const subject =
              typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

            const messageId = crypto.randomUUID()

            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: TEMPLATE_NAME,
              recipient_email: recipientEmail,
              status: 'pending',
            })

            const { error: enqueueError } = await supabase.rpc('enqueue_email', {
              queue_name: 'transactional_emails',
              payload: {
                message_id: messageId,
                to: recipientEmail,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text: plainText,
                purpose: 'transactional',
                label: TEMPLATE_NAME,
                idempotency_key: `chat-msg-${msg.id}`,
                unsubscribe_token: unsubscribeToken,
                queued_at: new Date().toISOString(),
              },
            })

            if (enqueueError) {
              console.error('Failed to enqueue chat notification', enqueueError)
              continue
            }

            await supabase
              .from('booking_messages')
              .update({ notification_sent_at: new Date().toISOString() })
              .eq('id', msg.id)

            queued++
          } catch (err) {
            console.error('Error processing message', msg.id, err)
          }
        }

        return Response.json({ processed: messages.length, queued, skipped })
      },
    },
  },
})
