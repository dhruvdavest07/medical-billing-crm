import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { logServerError } from "@/lib/safe-logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const comments = await prisma.orderComment.findMany({
      where: { orderId: id, order: { organizationId: orgId } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    logServerError("Error fetching order comments", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const existing = await prisma.billingOrder.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const comment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const c = await tx.orderComment.create({
        data: { orderId: id, authorId: userId, text },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "OrderComment",
          entityId: c.id,
          afterState: JSON.stringify({ orderId: id, text: text.slice(0, 100) }),
        },
      });

      return c;
    });

    const withAuthor = await prisma.orderComment.findUnique({
      where: { id: comment.id },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(withAuthor ?? comment, { status: 201 });
  } catch (error) {
    logServerError("Error creating order comment", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
