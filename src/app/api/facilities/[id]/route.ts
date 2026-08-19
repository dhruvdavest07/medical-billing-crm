import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

const EDITABLE_FIELDS = [
  "name", "email", "phone", "address", "city", "state", "zip",
  "instructions", "thirdPartyProcessor", "thirdPartyDetails",
] as const;

function buildUpdateInput(body: Record<string, unknown>): Prisma.FacilityUpdateInput {
  const updateData: Prisma.FacilityUpdateInput = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    const value = body[field];
    updateData[field] = value === null ? null : String(value);
  }
  return updateData;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();
    const canRead = await hasPermission(userId, orgId, "billing:read", "billing");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const facility = await prisma.facility.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: { select: { billingOrders: true, facilityComments: true } },
        billingOrders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, orderNumber: true, status: true, createdAt: true,
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    return NextResponse.json(facility);
  } catch (error) {
    logServerError("Error fetching facility", error);
    return NextResponse.json({ error: "Failed to load facility" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();
    const canWrite = await hasPermission(userId, orgId, "billing:write", "billing");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.facility.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData = buildUpdateInput(body);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.update({
        where: { id },
        data: updateData,
        include: { _count: { select: { billingOrders: true, facilityComments: true } } },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId, userId, action: "UPDATE",
          entityType: "Facility", entityId: id,
          afterState: JSON.stringify(updateData),
        },
      });
      return facility;
    });

    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating facility", error);
    return NextResponse.json({ error: "Failed to update facility" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();
    const canWrite = await hasPermission(userId, orgId, "billing:write", "billing");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.facility.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    const linkedOrderCount = await prisma.billingOrder.count({
      where: { facilityId: id },
    });

    if (linkedOrderCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete facility "${existing.name}" because it has ${linkedOrderCount} linked billing order(s). Reassign or remove the orders first.`, linkedOrderCount },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.facilityComment.deleteMany({ where: { facilityId: id } });
      await tx.facility.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          organizationId: orgId, userId, action: "DELETE",
          entityType: "Facility", entityId: id,
          afterState: JSON.stringify({ id, name: existing.name }),
        },
      });
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    logServerError("Error deleting facility", error);
    return NextResponse.json({ error: "Failed to delete facility" }, { status: 500 });
  }
}
