import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Admin invites a guide to the guide portal: creates auth user if needed,
// links guides.user_id, and sends a magic-link email.
export const inviteGuideToPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      guide_id: z.string().uuid(),
      email: z.string().email(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;

    // Admin check
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    // 1. Find or create auth user
    let userIdForGuide: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());

    if (existing) {
      userIdForGuide = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
      );
      if (createErr) throw new Error(createErr.message);
      userIdForGuide = created.user?.id ?? null;
    }

    if (!userIdForGuide) throw new Error("Could not resolve invited user.");

    // 2. Link to guide record
    const { error: updErr } = await supabaseAdmin
      .from("guides")
      .update({ user_id: userIdForGuide })
      .eq("id", data.guide_id);
    if (updErr) throw new Error(updErr.message);

    // 3. If user already existed, also send a magic link
    if (existing) {
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: data.email,
      });
    }

    return { ok: true, existed: !!existing };
  });
