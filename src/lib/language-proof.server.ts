import crypto from "crypto";

// Signs AI language-test results so clients cannot forge a CEFR level.
function key() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("Server not configured");
  return k;
}
export function signLanguageProof(language: string, level: string): string {
  const body = Buffer.from(JSON.stringify({ language, level, exp: Date.now() + 15 * 60_000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", key()).update("langproof:" + body).digest("base64url");
  return `${body}.${sig}`;
}
export function verifyLanguageProof(proof: string, language: string, level: string): boolean {
  const [body, sig] = proof.split(".");
  if (!body || !sig) return false;
  const exp = crypto.createHmac("sha256", key()).update("langproof:" + body).digest("base64url");
  if (exp.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig))) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.language === language && p.level === level && p.exp > Date.now();
  } catch { return false; }
}
