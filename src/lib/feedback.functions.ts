import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(5).max(2000),
  page: z.string().max(500).optional(),
  user_id: z.string().uuid().optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("feedback").insert({
      name: data.name,
      email: data.email.toLowerCase(),
      message: data.message,
      page: data.page ?? "",
      user_id: data.user_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
