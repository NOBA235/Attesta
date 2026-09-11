/**
 * Hackathon shortcut: a single hardcoded org id stands in for real
 * multi-tenant auth. Every table, RAG call, and API route in this app
 * already takes `orgId` as a parameter, so swapping this for a real
 * Supabase Auth session lookup (e.g. reading `profiles.org_id` for the
 * logged-in user) later is a one-file change — nothing downstream moves.
 *
 * Set NEXT_PUBLIC_DEMO_ORG_ID in .env.local to any UUID; it just needs to
 * stay consistent across uploads. It's exposed client-side because the
 * upload forms send it directly from the browser — fine for a single-tenant
 * demo, not for production multi-tenant use.
 */
export function getDemoOrgId(): string {
  const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID;
  if (!orgId) {
    throw new Error(
      "Missing NEXT_PUBLIC_DEMO_ORG_ID. Set it in .env.local to any UUID — it just needs to stay consistent."
    );
  }
  return orgId;
}
