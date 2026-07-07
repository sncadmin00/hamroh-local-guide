/**
 * Public: busy time ranges for a guide on a given date.
 * Used by the mobile app when picking a booking time — clients can
 * hide/grey overlapping slots so they aren't offered.
 *
 * GET /api/public/guides/{guideId}/busy?date=YYYY-MM-DD
 * → { busy: [{ start_time, duration_minutes, status }] }
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/guides/$guideId/busy')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url)
        const date = url.searchParams.get('date') ?? ''
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return Response.json({ error: 'Invalid date' }, { status: 400 })
        }
        if (!/^[0-9a-f-]{36}$/i.test(params.guideId)) {
          return Response.json({ error: 'Invalid guide id' }, { status: 400 })
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await supabaseAdmin
          .from('bookings')
          .select('start_time, duration_minutes, status')
          .eq('guide_id', params.guideId)
          .eq('date', date)
          .in('status', ['pending', 'confirmed'])
          .not('start_time', 'is', null)

        if (error) {
          return Response.json({ error: error.message }, { status: 500 })
        }
        return Response.json({
          busy: (data ?? []).map((r: any) => ({
            start_time: r.start_time,
            duration_minutes: r.duration_minutes ?? 120,
            status: r.status,
          })),
        })
      },
    },
  },
})
