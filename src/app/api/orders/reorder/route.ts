import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import type { Prisma } from "@prisma/client";

interface ReorderItem {
  id: string;
  priority: number;
}

interface ReorderRequestBody {
  items: ReorderItem[];
}

/**
 * PATCH /api/orders/reorder
 * Batch-updates the priority field on billing orders within a single transaction.
 */
export async function PATCH(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const canWrite = await hasPermission(userId, orgId, "billing:write", "billing");
    if (!canWrite) {
      return NextResponse.json(
        { error: "Insufficient permissions to reorder billing orders" },
        { status: 403 },
      );
    }

    let body: ReorderRequestBody;
    try {
      body = (await request.json()) as ReorderRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "`items` must be a non-empty array of { id, priority }" },
        { status: 400 },
      );
    }

    for (const item of items) {
      if (
        typeof item.id !== "string" || item.id.length === 0 ||
        typeof item.priority !== "number" || !Number.isFinite(item.priority) ||
        item.priority < 0 || !Number.isInteger(item.priority)
      ) {
        return NextResponse.json(
          { error: "Each item must have a non-empty string `id` and a non-negative integer `priority`" },
          { status: 400 },
        );
      }
    }

    const ids = Array.from(new Set(items.map((item) => item.id)));

    const ownedOrders = await prisma.billingOrder.findMany({
      where: { id: { in: ids }, organizationId: orgId },
      select: { id: true },
    });

    const ownedIds = new Set(ownedOrders.map((order) => order.id));
    const foreignIds = ids.filter((id) => !ownedIds.has(id));

    if (foreignIds.length > 0) {
      return NextResponse.json(
        { error: "One or more orders do not belong to your organization" },
        { status: 403 },
      );
    }

    const updatedCount = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await Promise.all(
          items.map((item) =>
            tx.billingOrder.update({
              where: { id: item.id },
              data: { priority: item.priority },
            }),
          ),
        );

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId,
            action: "UPDATE",
            entityType: "BillingOrder",
            entityId: "batch",
            afterState: JSON.stringify({
              reordered: items.length,
              priorities: items.map((item) => ({ id: item.id, priority: item.priority })),
            }),
          },
        });

        return items.length;
      },
    );

    return NextResponse.json({ updated: updatedCount });
  } catch (error) {
    logServerError("Error reordering billing orders", error);
    return NextResponse.json(
      { error: "Failed to reorder billing orders" },
      { status: 500 },
    );
  }
}
