import { NextResponse } from "next/server";
import { getCurrentUserId, hasAnyPermission } from "@/lib/auth";

type RequiredPermission = {
  action: string;
  resource?: string;
};

export async function requireAnyPermission(
  orgId: string,
  permissions: RequiredPermission[],
) {
  const userId = await getCurrentUserId(orgId);
  const isAllowed = await hasAnyPermission(userId, orgId, permissions);

  if (!isAllowed) {
    return {
      userId,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { userId, response: null };
}
