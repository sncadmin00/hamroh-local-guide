/**
 * Server functions for manual guide time blocks (public.guide_time_blocks).
 * A block subtracts time from the guide's availability regardless of tour
 * schedules or existing bookings. Used for vacations, sick days, ad-hoc
 * "don't book me" windows, and later by the AI schedule assistant.
 *
 * All writes go through the user's Supabase client; RLS restricts them to
 * the guide-owner of the guide_id (or an admin).
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const UUID = z.string().uuid()
const ISO_DT = z.string().datetime({ offset: true })

export type GuideBlock = {
  id: string
  guide_id: string
  starts_at: string
  ends_at: string
  reason: string | null
  source: 'manual' | 'ai'
  created_at: string
}

async function resolveGuideId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase.from('guides').select('id').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Not a guide')
  return data.id as string
}

/** List blocks for the calling guide in [from, to] (both timestamptz). */
export const listGuideBlocks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from?: string; to?: string }) =>
    z.object({ from: ISO_DT.optional(), to: ISO_DT.optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<GuideBlock[]> => {
    const { supabase, userId } = context
    const guideId = await resolveGuideId(supabase, userId)

    let q = supabase
      .from('guide_time_blocks')
      .select('id, guide_id, starts_at, ends_at, reason, source, created_at')
      .eq('guide_id', guideId)
      .order('starts_at', { ascending: true })
      .limit(200)
    if (data.from) q = q.gte('ends_at', data.from)
    if (data.to) q = q.lte('starts_at', data.to)

    const { data: rows, error } = await q
    if (error) throw new Error(error.message)
    return (rows ?? []) as GuideBlock[]
  })

/**
 * Create a manual block. Returns the created row. `starts_at`/`ends_at` are
 * full ISO timestamps with offset; the caller is responsible for translating
 * a user-friendly "12 июля 12:00–17:00" into the guide's local timezone.
 */
export const blockTime = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { starts_at: string; ends_at: string; reason?: string | null; source?: 'manual' | 'ai' }) =>
    z
      .object({
        starts_at: ISO_DT,
        ends_at: ISO_DT,
        reason: z.string().max(500).nullable().optional(),
        source: z.enum(['manual', 'ai']).optional(),
      })
      .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
        message: 'ends_at must be after starts_at',
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<GuideBlock> => {
    const { supabase, userId } = context
    const guideId = await resolveGuideId(supabase, userId)

    const { data: row, error } = await supabase
      .from('guide_time_blocks')
      .insert({
        guide_id: guideId,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        reason: data.reason ?? null,
        source: data.source ?? 'manual',
        created_by: userId,
      })
      .select('id, guide_id, starts_at, ends_at, reason, source, created_at')
      .single()
    if (error) throw new Error(error.message)
    return row as GuideBlock
  })

/** Delete a specific block by id (RLS enforces ownership). */
export const unblockTime = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: UUID }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; deleted: number }> => {
    const { supabase, userId } = context
    const guideId = await resolveGuideId(supabase, userId)

    const { error, count } = await supabase
      .from('guide_time_blocks')
      .delete({ count: 'exact' })
      .eq('id', data.id)
      .eq('guide_id', guideId)
    if (error) throw new Error(error.message)
    return { ok: true, deleted: count ?? 0 }
  })

/**
 * Delete all blocks of the calling guide that overlap [from, to].
 * Convenience for AI "open day" / "open range" intents.
 */
export const unblockRange = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) =>
    z
      .object({ from: ISO_DT, to: ISO_DT })
      .refine((v) => new Date(v.to) > new Date(v.from), { message: 'to must be after from' })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; deleted: number }> => {
    const { supabase, userId } = context
    const guideId = await resolveGuideId(supabase, userId)

    const { error, count } = await supabase
      .from('guide_time_blocks')
      .delete({ count: 'exact' })
      .eq('guide_id', guideId)
      .lt('starts_at', data.to)
      .gt('ends_at', data.from)
    if (error) throw new Error(error.message)
    return { ok: true, deleted: count ?? 0 }
  })
