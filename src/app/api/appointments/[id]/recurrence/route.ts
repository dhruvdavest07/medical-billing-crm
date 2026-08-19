import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { isRecurring, recurrenceRule } = body;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        isRecurring: isRecurring ?? false,
        recurrenceRule: recurrenceRule ?? null,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: appointment.id,
      beforeState: JSON.stringify({
        isRecurring: appointment.isRecurring,
        recurrenceRule: appointment.recurrenceRule,
      }),
      afterState: JSON.stringify({
        isRecurring: updatedAppointment.isRecurring,
        recurrenceRule: updatedAppointment.recurrenceRule,
      }),
    });

    return NextResponse.json(updatedAppointment, { status: 200 });
  } catch (error) {
    logServerError("Error updating appointment recurrence", error);
    return NextResponse.json(
      { error: "Failed to update appointment recurrence" },
      { status: 500 },
    );
  }
}
