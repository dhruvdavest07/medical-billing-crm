import { requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";

const ADMIN_ROLES = new Set(["Super Admin", "Admin"]);

/**
 * Checks if the current user has admin-level access.
 * Returns true if the user has an admin role OR the "admin:read" permission.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId, organizationId, roles } = await requireOrgContext();

    if (roles.some((role) => ADMIN_ROLES.has(role))) {
      return true;
    }

    return hasPermission(userId, organizationId, "admin:read", "admin");
  } catch {
    return false;
  }
}

/**
 * Asserts admin access. Throws AuthContextError if not an admin.
 */
export async function assertAdmin(): Promise<{ userId: string; organizationId: string }> {
  const { userId, organizationId } = await requireOrgContext();
  const admin = await isAdmin();
  if (!admin) {
    const { AuthContextError } = await import("@/lib/org");
    throw new AuthContextError(403, "Admin access required");
  }
  return { userId, organizationId };
}
