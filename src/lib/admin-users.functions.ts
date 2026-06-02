import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as string);
      rolesByUser.set(r.user_id, arr);
    }

    return {
      users: (list?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        roles: rolesByUser.get(u.id) ?? [],
      })),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_id: z.string().uuid(),
      role: z.enum(["admin", "guide", "user"]),
      grant: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      // Prevent removing the last admin
      if (data.role === "admin") {
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1) throw new Error("Cannot remove the last admin");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const inviteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    let userId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());

    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
      );
      if (createErr) throw new Error(createErr.message);
      userId = created.user?.id ?? null;
    }

    if (!userId) throw new Error("Could not resolve invited user.");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);

    return { ok: true, existed: !!existing };
  });
