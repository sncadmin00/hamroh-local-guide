/**
 * Public: available booking slots for a guide.
 * Mobile / web time pickers use this — same source as web (getGuideSlots).
 *
 * GET /api/public/guides/{guideId}/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   - from: optional, default = today (UTC)
 *   - to:   optional, default = from + 60 days
 * → { slots: [{ id, date, start_time, duration_minutes }] }
 *
 * Excludes slots where is_booked=true AND slots whose time interval
 * overlaps any active (pending/confirmed) booking for the same guide —
 * this covers the case where a booking was created without slot_id and
 * therefore didn't flip is_booked.
 *
 * Response contract:
 *   - id:               uuid
 *   - date:             'YYYY-MM-DD' (ISO date, guide's local calendar)
 *   - start_time:       'HH:MM:SS'   (24h, guide's local time)
 *   - duration_minutes: integer
 *
 * Sorted by (date asc, start_time asc). Max 200 rows.
 */
import { createFileRoute } from '@tanstack/react-router'

const UUID_RE = /^[0-9a-f-]{36}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const Route = createFileRoute('/api/public/guides/$guideId/slots')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!UUID_RE.test(params.guideId)) {
          return Response.json({ error: 'Invalid guide id' }, { status: 400 })
        }
        const url = new URL(request.url)
        const today = new Date().toISOString().slice(0, 10)
        const from = url.searchParams.get('from') ?? today
        const to = url.searchParams.get('to') ?? addDays(from, 60)
        if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
          return Response.json({ error: 'Invalid date (expected YYYY-MM-DD)' }, { status: 400 })
        }
        if (from > to) {
          return Response.json({ error: 'from must be <= to' }, { status: 400 })
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        const [slotsRes, busyRes] = await Promise.all([
          supabaseAdmin
            .from('guide_availability_slots')
            .select('id, date, start_time, duration_minutes')
            .eq('guide_id', params.guideId)
            .eq('is_booked', false)
            .gte('date', from)
            .lte('date', to)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(200),
          supabaseAdmin
            .from('bookings')
            .select('date, start_time, duration_minutes')
            .eq('guide_id', params.guideId)
            .in('status', ['pending', 'confirmed'])
            .gte('date', from)
            .lte('date', to)
            .not('start_time', 'is', null),
        ])

        if (slotsRes.error) {
          return Response.json({ error: slotsRes.error.message }, { status: 500 })
        }
        if (busyRes.error) {
          return Response.json({ error: busyRes.error.message }, { status: 500 })
        }

        // Overlap filter (defensive: is_booked should already exclude slot-bound bookings)
        const toMin = (t: string) => {
          const [h, m] = t.split(':').map(Number)
          return h * 60 + m
        }
        const busyByDate = new Map<string, Array<{ s: number; e: number }>>()
        for (const b of busyRes.data ?? []) {
          if (!b.start_time || !b.date) continue
          const s = toMin(b.start_time as string)
          const e = s + ((b.duration_minutes ?? 120) as number)
          const list = busyByDate.get(b.date as string) ?? []
          list.push({ s, e })
          busyByDate.set(b.date as string, list)
        }

        const slots = (slotsRes.data ?? []).filter((slot: any) => {
          const list = busyByDate.get(slot.date)
          if (!list?.length) return true
          const s = toMin(slot.start_time)
          const e = s + ((slot.duration_minutes ?? 120) as number)
          return !list.some((b) => b.s < e && s < b.e)
        })

        return Response.json({ slots })
      },
    },
  },
})
