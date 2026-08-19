import { auth } from "@/auth";

/**
 * Error used for auth or tenant context failures.
 */
export class AuthContextError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthContextError";
    this.status = status;
  }
}

export function isAuthContextError(error: unknown): error is AuthContextError {
  return error instanceof AuthContextError;
}

export async function requireOrgContext() {
  const session = await auth();
  const userId = session?.user?.id;
  const organizationId = session?.user?.organizationId;

  if (!session?.user?.email || !userId) {
    throw new AuthContextError(401, "Authentication required");
  }

  if (!organizationId) {
    throw new AuthContextError(403, "Organization context is required");
  }

  return {
    session,
    userId,
    organizationId,
    roles: session.user.roles ?? [],
  };
}

export async function getOrgIdFromSession(): Promise<string> {
  const { organizationId } = await requireOrgContext();
  return organizationId;
}

/**
 * Backwards-compatible alias for route handlers that still import getOrgId().
 */
export async function getOrgId(): Promise<string> {
  return getOrgIdFromSession();
}

/**
 * Assert org scoping - NEVER bypass in production.
 */
export function assertOrgScope(orgId: string | null | undefined): asserts orgId is string {
  if (!orgId || typeof orgId !== "string") {
    throw new Error("Organization scope (orgId) is required for this operation.");
  }
}
