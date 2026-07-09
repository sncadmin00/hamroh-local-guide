import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Cron: scan public.calendar_events (type='reminder') whose starts_at falls
 * within [now, now + windowMinutes] and insert an in-app notification for the
 * owning guide. Dedup: skip if a notification with the same entity_id already
 * exists (type='calendar_reminder').
 *
 * Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY> — same pattern as booking-reminders.
 * Body (optional): { windowMinutes?: number }  // default 30
 */
export const Route = createFileRoute('/api/public/hooks/calendar-reminders')({
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

        let windowMinutes = 30
        try {
          const body = (await request.json()) as { windowMinutes?: number }
          if (typeof body?.windowMinutes === 'number' && body.windowMinutes > 0 && body.windowMinutes <= 1440) {
            windowMinutes = Math.floor(body.windowMinutes)
          }
        } catch { /* empty body ok */ }

        const now = new Date()
        const until = new Date(now.getTime() + windowMinutes * 60_000)

        const { data: events, error } = await supabase
          .from('calendar_events')
          .select('id, guide_id, title, starts_at, notes, location')
          .eq('type', 'reminder')
          .gte('starts_at', now.toISOString())
          .lte('starts_at', until.toISOString())
          .limit(500)

        if (error) {
          console.error('calendar-reminders query failed', error)
          return Response.json({ error: 'Query failed' }, { status: 500 })
        }
        if (!events?.length) return Response.json({ processed: 0, queued: 0 })

        let queued = 0
        for (const ev of events) {
          try {
            // Resolve owner (guide.user_id)
            const { data: guide } = await supabase
              .from('guides')
              .select('user_id, name')
              .eq('id', ev.guide_id as string)
              .maybeSingle()
            const uid = guide?.user_id as string | undefined
            if (!uid) continue

            // Dedup: already notified for this event?
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', uid)
              .eq('type', 'calendar_reminder')
              .eq('entity_id', ev.id as string)
              .limit(1)
              .maybeSingle()
            if (existing) continue

            const startsAt = new Date(ev.starts_at as string)
            const hhmm = startsAt.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Tashkent',
            })
            const bodyParts = [hhmm]
            if (ev.location) bodyParts.push(ev.location as string)
            if (ev.notes) bodyParts.push(ev.notes as string)

            const { error: insErr } = await supabase.from('notifications').insert({
              user_id: uid,
              type: 'calendar_reminder',
              entity_id: ev.id,
              entity_type: null,
              title: (ev.title as string) || 'Напоминание',
              body: bodyParts.join(' • '),
              icon: '⏰',
              link: '/guide',
              category: 'system',
            })
            if (insErr) {
              console.error('calendar-reminders insert failed', ev.id, insErr)
              continue
            }
            queued++
          } catch (e) {
            console.error('calendar-reminders error', ev.id, e)
          }
        }

        return Response.json({ processed: events.length, queued, windowMinutes })
      },
    },
  },
})
