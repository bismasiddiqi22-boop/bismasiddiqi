// Password check for the admin API. Single-owner site, no user accounts —
// just a shared secret compared to process.env.ADMIN_PASSWORD (set directly
// in the Vercel dashboard, never handled by this codebase's authors).

import { timingSafeEqual } from "node:crypto";

export function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Misconfiguration (env var not set) must fail closed, not open.
    return false;
  }
  if (typeof candidate !== "string" || candidate.length === 0) {
    return false;
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // timingSafeEqual requires equal-length buffers; a length mismatch is
    // already a safe, fast "no" (doesn't leak more than length).
    return false;
  }
  return timingSafeEqual(a, b);
}
