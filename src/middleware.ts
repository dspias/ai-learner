import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// NOTE: with a `src/` directory, Next.js only recognizes middleware at
// src/middleware.ts (a root-level middleware.ts is ignored).
// Edge-safe: uses only the base config (no bcrypt/Prisma).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect everything except Next internals, the auth API, and the sign-in page.
  matcher: [
    "/((?!api/auth|api/register|api/stripe|_next/static|_next/image|favicon.ico|signin|register).*)",
  ],
};
