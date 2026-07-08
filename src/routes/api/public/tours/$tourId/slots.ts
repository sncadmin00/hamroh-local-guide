/**
 * Public: available booking slots for a specific tour.
 * Preferred endpoint for tour booking screens (web + mobile).
 *
 * GET /api/public/tours/{tourId}/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   - from: optional, default = today (UTC)
 *   - to:   optional, default = from + 60 days (max +90)
 *
 * Response:
 *   { slots: [{ date, start_time, duration_minutes, source }] }
 *   - date:             'YYYY-MM-DD'
 *   - start_time:       'HH:MM:SS' (guide's local time)
 *   - duration_minutes: integer (from tours.duration_hours * 60)
 *   - source:           'schedule' | 'manual'
 *
 * Slots come from tour_schedules — recurring weekday+time, expanded into
 * concrete dates.
 *
 * Excluded:
 *   - slots overlapping any active (pending/confirmed) booking for this guide,
 *     inflated by guide.buffer_minutes on both sides (matches trigger logic).
 *   - slots overlapping any guide_time_blocks interval (guide is not working).
 *
 * Sorted by (date asc, start_time asc). Max 1500 rows.
 */
import { createFileRoute } from '@tanstack/react-router'

const UUID_RE = /^[0-9a-f-]{36}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime()
  const b = new Date(`${to}T00:00:00Z`).getTime()
  return Math.floor((b - a) / 86400000)
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function hhmmss(t: string): string {
  // Normalize 'HH:MM' or 'HH:MM:SS' → 'HH:MM:SS'
  return t.length === 5 ? `${t}:00` : t.slice(0, 8)
}

export const Route = createFileRoute('/api/public/tours/$tourId/slots')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!UUID_RE.test(params.tourId)) {
          return Response.json({ error: 'Invalid tour id' }, { status: 400 })
        }
        const url = new URL(request.url)
        const today = new Date().toISOString().slice(0, 10)
        const from = url.searchParams.get('from') ?? today
        let to = url.searchParams.get('to') ?? addDays(from, 180)
        if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
          return Response.json({ error: 'Invalid date (expected YYYY-MM-DD)' }, { status: 400 })
        }
        if (from > to) {
          return Response.json({ error: 'from must be <= to' }, { status: 400 })
        }
        // Cap range at 180 days (~6 months)
        if (daysBetween(from, to) > 180) to = addDays(from, 180)

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        // 1. Tour + guide
        const { data: tour, error: tourErr } = await supabaseAdmin
          .from('tours')
          .select('id, guide_id, duration_hours, published')
          .eq('id', params.tourId)
          .maybeSingle()
        if (tourErr) return Response.json({ error: tourErr.message }, { status: 500 })
        if (!tour) return Response.json({ error: 'Tour not found' }, { status: 404 })

        const duration = Math.max(30, Math.round(Number(tour.duration_hours ?? 2) * 60))

        const { data: guide, error: guideErr } = await supabaseAdmin
          .from('guides')
          .select('id, buffer_minutes')
          .eq('id', tour.guide_id)
          .maybeSingle()
        if (guideErr) return Response.json({ error: guideErr.message }, { status: 500 })
        const buffer = Math.max(0, Number(guide?.buffer_minutes ?? 60))

        // 2. Parallel fetches
        const [schedRes, busyRes, blocksRes] = await Promise.all([
          supabaseAdmin
            .from('tour_schedules')
            .select('weekday, start_time')
            .eq('tour_id', tour.id)
            .eq('is_active', true),
          supabaseAdmin
            .from('bookings')
            .select('date, start_time, duration_minutes')
            .eq('guide_id', tour.guide_id)
            .in('status', ['pending', 'confirmed'])
            .gte('date', from)
            .lte('date', to)
            .not('start_time', 'is', null),
          supabaseAdmin
            .from('guide_time_blocks')
            .select('starts_at, ends_at')
            .eq('guide_id', tour.guide_id)
            .lte('starts_at', `${to}T23:59:59Z`)
            .gte('ends_at', `${from}T00:00:00Z`),
        ])

        if (schedRes.error) return Response.json({ error: schedRes.error.message }, { status: 500 })
        if (busyRes.error) return Response.json({ error: busyRes.error.message }, { status: 500 })
        if (blocksRes.error) return Response.json({ error: blocksRes.error.message }, { status: 500 })

        // 3. Build busy list per date (minutes since 00:00, inflated by buffer)
        const busyByDate = new Map<string, Array<{ s: number; e: number }>>()
        for (const b of busyRes.data ?? []) {
          if (!b.start_time || !b.date) continue
          const s = toMin(b.start_time as string) - buffer
          const e = s + ((b.duration_minutes ?? 120) as number) + buffer * 2
          const list = busyByDate.get(b.date as string) ?? []
          list.push({ s, e })
          busyByDate.set(b.date as string, list)
        }

        // 4. Blocks — timestamptz ranges. Convert to per-date busy intervals.
        //    A block that spans multiple days is expanded per date it touches.
        for (const bk of blocksRes.data ?? []) {
          const start = new Date(bk.starts_at as string)
          const end = new Date(bk.ends_at as string)
          const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
          const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
          while (cursor.getTime() <= stop.getTime()) {
            const dateISO = cursor.toISOString().slice(0, 10)
            if (dateISO >= from && dateISO <= to) {
              const dayStart = new Date(`${dateISO}T00:00:00Z`).getTime()
              const dayEnd = dayStart + 86400000
              const segStart = Math.max(start.getTime(), dayStart)
              const segEnd = Math.min(end.getTime(), dayEnd)
              if (segEnd > segStart) {
                const s = Math.floor((segStart - dayStart) / 60000)
                const e = Math.ceil((segEnd - dayStart) / 60000)
                const list = busyByDate.get(dateISO) ?? []
                list.push({ s, e })
                busyByDate.set(dateISO, list)
              }
            }
            cursor.setUTCDate(cursor.getUTCDate() + 1)
          }
        }

        // 5. Expand tour_schedules into concrete dates
        type Cand = { date: string; start_time: string; source: 'schedule' }
        const scheduleByWeekday = new Map<number, Set<string>>()
        for (const row of schedRes.data ?? []) {
          const wd = Number(row.weekday)
          const set = scheduleByWeekday.get(wd) ?? new Set<string>()
          set.add(hhmmss(row.start_time as string))
          scheduleByWeekday.set(wd, set)
        }

        const candidates: Cand[] = []
        const totalDays = daysBetween(from, to)
        for (let i = 0; i <= totalDays; i++) {
          const dateISO = addDays(from, i)
          const wd = new Date(`${dateISO}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
          const times = scheduleByWeekday.get(wd)
          if (!times) continue
          for (const t of times) candidates.push({ date: dateISO, start_time: t, source: 'schedule' })
        }

        // 7. Filter out overlaps with busy+blocks
        const nowIso = new Date().toISOString()
        const slots = candidates
          .filter((c) => {
            // Skip past times (compare full timestamp in guide's local ~ we treat as UTC)
            const ts = `${c.date}T${c.start_time}Z`
            if (ts < nowIso) return false
            const list = busyByDate.get(c.date)
            if (!list?.length) return true
            const s = toMin(c.start_time)
            const e = s + duration
            return !list.some((b) => b.s < e && s < b.e)
          })
          .sort((a, b) =>
            a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date),
          )
          .slice(0, 1500)
          .map((c) => ({
            date: c.date,
            start_time: c.start_time,
            duration_minutes: duration,
            source: c.source,
          }))

        return Response.json({ slots })
      },
    },
  },
})
