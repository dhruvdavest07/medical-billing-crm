import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    // LabResult is scoped via patient who belongs to org
    const labResults = await prisma.labResult.findMany({
      where: {
        patient: { organizationId: orgId },
        ...(patientId ? { patientId } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      labResults.map((l: Prisma.LabResultGetPayload<{
        include: {
          patient: { select: { firstName: true; lastName: true } };
        };
      }>) => ({
        id: l.id,
        patientId: l.patientId,
        patientName: `${l.patient.firstName} ${l.patient.lastName}`,
        testName: l.testName,
        resultValue: l.resultValue,
        unit: l.unit,
        referenceRange: l.referenceRange,
        status: l.status,
        performedAt: l.performedAt?.toISOString() ?? null,
        reportUrl: l.reportUrl,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    logServerError("Error fetching lab results", error);
    return NextResponse.json(
      { error: "Failed to fetch lab results" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const {
      patientId,
      testName,
      resultValue,
      unit,
      referenceRange,
      status,
      performedAt,
      reportUrl,
    } = body;

    if (!patientId || !testName) {
      return NextResponse.json(
        { error: "patientId and testName are required" },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const labResult = await prisma.labResult.create({
      data: {
        patientId,
        testName,
        resultValue: resultValue ?? null,
        unit: unit ?? null,
        referenceRange: referenceRange ?? null,
        status: status ?? "pending",
        performedAt: performedAt ? new Date(performedAt) : null,
        reportUrl: reportUrl ?? null,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "LabResult",
      entityId: labResult.id,
      afterState: JSON.stringify({ patientId, testName, status }),
    });

    return NextResponse.json(
      {
        id: labResult.id,
        patientId: labResult.patientId,
        patientName: `${labResult.patient.firstName} ${labResult.patient.lastName}`,
        testName: labResult.testName,
        resultValue: labResult.resultValue,
        unit: labResult.unit,
        referenceRange: labResult.referenceRange,
        status: labResult.status,
        performedAt: labResult.performedAt?.toISOString() ?? null,
        createdAt: labResult.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating lab result", error);
    return NextResponse.json(
      { error: "Failed to create lab result" },
      { status: 500 },
    );
  }
}
