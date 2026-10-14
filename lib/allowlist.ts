/**
 * Only emails in ALLOWED_EMAILS (comma separated) may use the studio, since every
 * generation spends the owner's Mureka credits. An empty list lets nobody in.
 */
export function isAllowedEmail(email: string | undefined | null, list = process.env.ALLOWED_EMAILS ?? ""): boolean {
  if (!email) return false;
  const allowed = list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
