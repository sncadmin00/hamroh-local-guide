/**
 * Server functions for managing a tour's recurring availability schedule
 * (public.tour_schedules) and the owning guide's buffer setting.
 *
 * All writes are scoped by RLS to the guide who owns the tour + admins.
 * These functions mirror that: they only pass the user's bearer through,
 * so any mismatch surfaces as a permission error, not a silent write.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const UUID = z.string().uuid()
const TIME = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'HH:MM or HH:MM:SS')

const ScheduleRow = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: TIME,
})

export type TourScheduleRow = {
  id: string
  tour_id: string
  weekday: number
  start_time: string
  is_active: boolean
}

/** List all schedule rows for a tour (guide-facing). */
export const listTourSchedule = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tourId: string }) => z.object({ tourId: UUID }).parse(input))
  .handler(async ({ data, context }): Promise<TourScheduleRow[]> => {
    const { supabase } = context
    const { data: rows, error } = await supabase
      .from('tour_schedules')
      .select('id, tour_id, weekday, start_time, is_active')
      .eq('tour_id', data.tourId)
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true })
    if (error) throw new Error(error.message)
    return (rows ?? []) as TourScheduleRow[]
  })

/**
 * Full replace: delete existing rows for the tour and insert the given set.
 * `rows` = [] clears the schedule (tour becomes unbookable via schedule).
 */
export const upsertTourSchedule = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tourId: string; rows: Array<{ weekday: number; start_time: string }> }) =>
    z.object({ tourId: UUID, rows: z.array(ScheduleRow).max(50) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ inserted: number }> => {
    const { supabase } = context

    // Normalize times to HH:MM:SS and deduplicate
    const seen = new Set<string>()
    const rows = data.rows
      .map((r) => ({
        weekday: r.weekday,
        start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time.slice(0, 8),
      }))
      .filter((r) => {
        const k = `${r.weekday}|${r.start_time}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })

    const { error: delErr } = await supabase.from('tour_schedules').delete().eq('tour_id', data.tourId)
    if (delErr) throw new Error(delErr.message)

    if (rows.length === 0) return { inserted: 0 }

    const { error: insErr } = await supabase
      .from('tour_schedules')
      .insert(rows.map((r) => ({ tour_id: data.tourId, ...r, is_active: true })))
    if (insErr) throw new Error(insErr.message)

    return { inserted: rows.length }
  })

/** Guide's buffer between tours in minutes (30 / 60 / 90). */
export const setGuideBuffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { minutes: 30 | 60 | 90 }) =>
    z.object({ minutes: z.union([z.literal(30), z.literal(60), z.literal(90)]) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context
    const { error } = await supabase
      .from('guides')
      .update({ buffer_minutes: data.minutes })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/** Read own buffer_minutes (nullable if user is not a guide). */
export const getGuideBuffer = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ minutes: number | null }> => {
    const { supabase, userId } = context
    const { data, error } = await supabase
      .from('guides')
      .select('buffer_minutes')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return { minutes: (data?.buffer_minutes as number | undefined) ?? null }
  })
