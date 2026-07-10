import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

type ExpoMessage = {
  to: string
  title?: string
  body?: string
  data?: Record<string, unknown>
  sound?: 'default'
  priority?: 'default' | 'high'
  channelId?: string
}

type ExpoTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

function iconTitleFallback(type: string): string {
  if (type.startsWith('booking_') || type === 'chat_message') return 'Hamroh'
  if (type.startsWith('guide_application')) return 'Hamroh'
  return 'Hamroh'
}

export const Route = createFileRoute('/api/public/hooks/notifications/push')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get('authorization') ?? request.headers.get('apikey') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim()
        const internal = process.env.INTERNAL_HOOK_SECRET
        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
        const ok = !!token && ((!!internal && token === internal) || (!!svc && token === svc))
        if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 })

        const url = import.meta.env.VITE_SUPABASE_URL
        if (!url || !svc) return Response.json({ error: 'Server misconfigured' }, { status: 500 })
        const supabase = createClient(url, svc, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        let payload: any = {}
        try { payload = await request.json() } catch {}
        const notificationId = payload?.notification_id as string | undefined
        if (!notificationId) return Response.json({ error: 'notification_id required' }, { status: 400 })

        const { data: n, error: nErr } = await supabase
          .from('notifications')
          .select('user_id, type, entity_id, entity_type, title, body, icon, link')
          .eq('id', notificationId)
          .maybeSingle()
        if (nErr || !n) return Response.json({ error: 'Notification not found' }, { status: 404 })

        const { data: tokens, error: tErr } = await supabase
          .from('push_tokens')
          .select('id, token, platform')
          .eq('user_id', n.user_id)
        if (tErr) return Response.json({ error: 'Token query failed' }, { status: 500 })
        if (!tokens?.length) return Response.json({ sent: 0, reason: 'no_tokens' })

        // Only Expo push tokens go to exp.host; others (raw FCM/APNs) skipped here
        const expoTokens = tokens.filter(
          (t) => typeof t.token === 'string' && t.token.startsWith('ExponentPushToken['),
        )
        if (!expoTokens.length) return Response.json({ sent: 0, reason: 'no_expo_tokens' })

        const title = n.title || iconTitleFallback(n.type as string)
        const body = n.body ?? undefined
        const data = {
          type: n.type,
          entity_id: n.entity_id,
          entity_type: n.entity_type,
          link: n.link,
          notification_id: notificationId,
        }

        const messages: ExpoMessage[] = expoTokens.map((t) => ({
          to: t.token as string,
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        }))

        // Expo accepts arrays up to 100
        const batches: ExpoMessage[][] = []
        for (let i = 0; i < messages.length; i += 100) batches.push(messages.slice(i, i + 100))

        let sent = 0
        const deadTokenIds: string[] = []

        for (const batch of batches) {
          try {
            const resp = await fetch(EXPO_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
              },
              body: JSON.stringify(batch),
            })
            if (!resp.ok) {
              console.error('Expo push HTTP error', resp.status, await resp.text())
              continue
            }
            const json = (await resp.json()) as { data?: ExpoTicket[] }
            const tickets = json?.data ?? []
            tickets.forEach((ticket, idx) => {
              if (ticket.status === 'ok') {
                sent++
              } else {
                const err = ticket.details?.error
                if (err === 'DeviceNotRegistered' || err === 'InvalidCredentials') {
                  const tokenObj = expoTokens.find((t) => t.token === batch[idx]?.to)
                  if (tokenObj) deadTokenIds.push(tokenObj.id as string)
                }
                console.warn('Expo ticket error', err, ticket.message)
              }
            })
          } catch (e) {
            console.error('Expo push batch failed', e)
          }
        }

        if (deadTokenIds.length) {
          try {
            await supabase.from('push_tokens').delete().in('id', deadTokenIds)
          } catch (e) {
            console.error('Failed to delete dead tokens', e)
          }
        }

        return Response.json({ sent, dead: deadTokenIds.length, total: expoTokens.length })
      },
    },
  },
})
