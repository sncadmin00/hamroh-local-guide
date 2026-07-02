import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DiaryDay = {
  day?: number;
  date?: string;
  label?: string;
  notes?: string;
  photos?: string[];
  places?: { id?: string; name?: string }[];
  tours?: { id?: string; title?: string }[];
  guides?: { id?: string; name?: string }[];
};

export type PublicDiary = {
  id: string;
  title: string | null;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  days: (DiaryDay & { photos: string[] })[];
  stats: { tours?: number; places?: number; guides?: number; photos?: number } | null;
};

export const getPublicDiary = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<PublicDiary | null> => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: row, error } = await supabasePublic
      .from("travel_diaries")
      .select("id,title,city,start_date,end_date,cover_url,days,stats,is_public")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();

    if (error || !row) return null;

    // Collect all photo paths (+ cover), sign with admin, then map back
    const rawDays = (Array.isArray(row.days) ? row.days : []) as DiaryDay[];
    const coverPath =
      row.cover_url && !/^https?:\/\//i.test(row.cover_url) ? row.cover_url : null;
    const allPaths = Array.from(
      new Set(
        [
          ...rawDays.flatMap((d) => (Array.isArray(d?.photos) ? d.photos : [])),
          ...(coverPath ? [coverPath] : []),
        ].filter(Boolean),
      ),
    );

    let signedMap = new Map<string, string>();
    if (allPaths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("traveler-media")
        .createSignedUrls(allPaths, 60 * 60 * 24 * 7);
      if (signed) {
        for (const s of signed) {
          if (s.signedUrl && s.path) signedMap.set(s.path, s.signedUrl);
        }
      }
    }

    const days = rawDays.map((d) => ({
      ...d,
      photos: (Array.isArray(d?.photos) ? d.photos : [])
        .map((p) => signedMap.get(p) || "")
        .filter(Boolean),
    }));

    return {
      id: row.id,
      title: row.title,
      city: row.city,
      start_date: row.start_date,
      end_date: row.end_date,
      cover_url: coverPath ? signedMap.get(coverPath) || null : row.cover_url,
      days,
      stats: row.stats as PublicDiary["stats"],
    };
  });

