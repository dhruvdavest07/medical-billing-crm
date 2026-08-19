import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { logServerError } from "@/lib/safe-logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const order = await prisma.billingOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        patient: true,
        facility: { include: { facilityComments: { include: { author: { select: { name: true } }, orderBy: { createdAt: "desc" } } } } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        invoice: { include: { lineItems: true, payments: true } },
        orderComments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    logServerError("Error fetching billing order", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await getCurrentUserId(orgId);
    const canWrite = await hasPermission(userId, orgId, "billing:write", "billing");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.billingOrder.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, priority, assignedToId, serviceStartDate, serviceEndDate, claimNumber, notes, facilityId, invoiceId } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (facilityId !== undefined) updateData.facilityId = facilityId || null;
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId || null;
    if (serviceStartDate !== undefined) updateData.serviceStartDate = serviceStartDate ? new Date(serviceStartDate) : null;
    if (serviceEndDate !== undefined) updateData.serviceEndDate = serviceEndDate ? new Date(serviceEndDate) : null;
    if (claimNumber !== undefined) updateData.claimNumber = claimNumber || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const o = await tx.billingOrder.update({ where: { id }, data: updateData });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "UPDATE",
          entityType: "BillingOrder",
          entityId: id,
          beforeState: JSON.stringify(existing),
          afterState: JSON.stringify(o),
        },
      });
      return o;
    });

    const withRelations = await prisma.billingOrder.findUnique({
      where: { id: updated.id },
      include: {
        patient: { select: { firstName: true, lastName: true, dateOfBirth: true, mrn: true } },
        facility: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(withRelations ?? updated);
  } catch (error) {
    logServerError("Error updating billing order", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
