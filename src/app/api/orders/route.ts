import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const assignedToId = searchParams.get("assignedToId");
    const priority = searchParams.get("priority");

    const where: Prisma.BillingOrderWhereInput = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(priority ? { priority: parseInt(priority, 10) } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { claimNumber: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
              {
                patient: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { mrn: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const orders = await prisma.billingOrder.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, mrn: true } },
        facility: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
        _count: { select: { orderComments: true, documents: true } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(orders);
  } catch (error) {
    logServerError("Error fetching billing orders", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await getCurrentUserId(orgId);
    const canWrite = await hasPermission(userId, orgId, "billing:write", "billing");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { patientId, facilityId, status, priority, serviceStartDate, serviceEndDate, claimNumber, notes } = body;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    const patient = await prisma.patient.findFirst({ where: { id: patientId, organizationId: orgId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const o = await tx.billingOrder.create({
        data: {
          organizationId: orgId,
          orderNumber,
          patientId,
          facilityId: facilityId || null,
          createdById: userId,
          status: status || "new",
          priority: typeof priority === "number" ? priority : 0,
          serviceStartDate: serviceStartDate ? new Date(serviceStartDate) : null,
          serviceEndDate: serviceEndDate ? new Date(serviceEndDate) : null,
          claimNumber: claimNumber || null,
          notes: notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "BillingOrder",
          entityId: o.id,
          afterState: JSON.stringify({ orderNumber, patientId }),
        },
      });

      return o;
    });

    const withRelations = await prisma.billingOrder.findUnique({
      where: { id: order.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, mrn: true } },
        facility: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(withRelations ?? order, { status: 201 });
  } catch (error) {
    logServerError("Error creating billing order", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
