import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { SpotlightRow } from "./spotlights";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export const getSpotlights = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = publicClient();

  const { data, error } = await supabasePublic
    .from("spotlights")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SpotlightRow[];
});

export const getSpotlightById = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabasePublic = publicClient();
    const { data: row, error } = await supabasePublic
      .from("spotlights")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return (row ?? null) as SpotlightRow | null;
  });
