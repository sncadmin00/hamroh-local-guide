/**
 * Server-only helper for consuming a payout step-up token.
 *
 * Downstream sensitive hooks (updatePayoutDetails, requestPayout) call
 * `consumeStepUpToken(userId, token, purpose)` before performing the action.
 * The token is single-use: this helper atomically clears token_hash so it
 * cannot be replayed. Returns true on success, false otherwise.
 */
import { createHash } from "crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type StepUpPurpose = "update_payout_details" | "request_payout";

export async function consumeStepUpToken(
  userId: string,
  token: string | null | undefined,
  purpose: StepUpPurpose,
): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = hashToken(token);

  const { data: row } = await supabaseAdmin
    .from("payout_change_challenges")
    .select("id, user_id, purpose, token_expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!row) return false;
  if (row.user_id !== userId) return false;
  if (row.purpose !== purpose) return false;
  if (!row.token_expires_at) return false;
  if (new Date(row.token_expires_at).getTime() < Date.now()) return false;

  // Invalidate atomically — only the first caller succeeds.
  const { data: cleared, error } = await supabaseAdmin
    .from("payout_change_challenges")
    .update({ token_hash: null, token_expires_at: null })
    .eq("id", row.id)
    .eq("token_hash", hash)
    .select("id")
    .maybeSingle();
  if (error || !cleared) return false;
  return true;
}
