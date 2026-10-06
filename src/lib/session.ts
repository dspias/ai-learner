import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Thrown by requireUserId when there's no authenticated session. */
export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/** For API routes: returns the current user's id, or throws UnauthorizedError. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

/**
 * For server components/pages: returns the current user's id, or redirects to
 * /signin. Defense-in-depth alongside middleware — never renders a protected
 * page (or 500s) for an unauthenticated visitor.
 */
export async function requirePageUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/signin");
  return id;
}
