import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const appointments = await prisma.appointment.findMany({
      where: { organizationId: orgId },
      include: {
        provider: true,
        patient: { select: { firstName: true, lastName: true } },
        room: true,
      },
      orderBy: { startTime: "asc" },
    });

    const mapped = appointments.map(
      (
        a: Prisma.AppointmentGetPayload<{
          include: {
            provider: true;
            patient: { select: { firstName: true; lastName: true } };
            room: true;
          };
        }>,
      ) => {
      const timeString = a.startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const durationMs = a.endTime.getTime() - a.startTime.getTime();
      const durationMins = Math.round(durationMs / 60000);
      return {
        id: a.id,
        patientId: a.patientId,
        patient: a.patient
          ? `${a.patient.firstName} ${a.patient.lastName}`
          : null,
        providerId: a.providerId,
        provider: a.provider?.name ?? "Unknown Provider",
        roomId: a.roomId,
        room: a.room?.name ?? null,
        date: a.startTime.toISOString().split("T")[0],
        time: timeString,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        duration: `${durationMins} min`,
        type: a.appointmentType ?? a.notes ?? "Standard",
        status: a.status,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    logServerError("Error fetching appointments", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const {
      patientId,
      providerId,
      roomId,
      date,
      time,
      startTime,
      endTime,
      status,
      type,
      idempotencyKey,
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    if (idempotencyKey) {
      const existing = await prisma.appointment.findUnique({
        where: { idempotencyKey },
        include: { provider: true, patient: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            id: existing.id,
            patientId: existing.patientId,
            provider: existing.provider?.name,
            date: existing.startTime.toISOString().split("T")[0],
            time: existing.startTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            duration: "30 min",
            type: existing.appointmentType ?? existing.notes ?? "Standard",
            status: existing.status,
          },
          { status: 200 },
        );
      }
    }

    let provider = providerId
      ? await prisma.user.findFirst({
          where: { id: providerId, organizationId: orgId },
        })
      : null;
    if (!provider) {
      provider = await prisma.user.findFirst({
        where: { organizationId: orgId },
      });
    }
    if (!provider) {
      return NextResponse.json(
        { error: "No provider available" },
        { status: 400 },
      );
    }

    let startDateTime: Date;
    let endDateTime: Date;
    if (startTime && endTime) {
      startDateTime = new Date(startTime);
      endDateTime = new Date(endTime);
    } else if (date && time) {
      startDateTime = new Date(`${date}T${time}`);
      endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
    } else {
      return NextResponse.json(
        { error: "Either (date + time) or (startTime + endTime) required" },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        organizationId: orgId,
        patientId,
        providerId: provider.id,
        roomId: roomId || null,
        startTime: startDateTime,
        endTime: endDateTime,
        status: status ?? "scheduled",
        appointmentType: type ?? null,
        notes: type ?? null,
        idempotencyKey: idempotencyKey ?? null,
      },
      include: { provider: true },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Appointment",
      entityId: newAppointment.id,
      afterState: JSON.stringify({
        patientId: newAppointment.patientId,
        providerId: newAppointment.providerId,
        roomId: newAppointment.roomId,
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime,
        status: newAppointment.status,
        appointmentType: newAppointment.appointmentType,
      }),
    });

    return NextResponse.json(
      {
        id: newAppointment.id,
        patientId: newAppointment.patientId,
        provider: newAppointment.provider?.name ?? "Unknown Provider",
        date: newAppointment.startTime.toISOString().split("T")[0],
        time: newAppointment.startTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: `${Math.round((newAppointment.endTime.getTime() - newAppointment.startTime.getTime()) / 60000)} min`,
        type:
          newAppointment.appointmentType ?? newAppointment.notes ?? "Standard",
        status: newAppointment.status,
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating appointment", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Appointment ID required" },
        { status: 400 },
      );
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.date || updates.time) {
      const dateStr =
        updates.date ?? existing.startTime.toISOString().split("T")[0];
      const timeStr =
        updates.time ?? existing.startTime.toTimeString().substring(0, 5);
      updateData.startTime = new Date(`${dateStr}T${timeStr}`);
      updateData.endTime = new Date(
        (updateData.startTime as Date).getTime() + 30 * 60000,
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { provider: true },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: updated.id,
      beforeState: JSON.stringify({
        startTime: existing.startTime,
        endTime: existing.endTime,
        status: existing.status,
      }),
      afterState: JSON.stringify({
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
      }),
    });

    return NextResponse.json({
      id: updated.id,
      patientId: updated.patientId,
      provider: updated.provider?.name,
      date: updated.startTime.toISOString().split("T")[0],
      time: updated.startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      duration: "30 min",
      type: updated.appointmentType ?? updated.notes ?? "Standard",
      status: updated.status,
    });
  } catch (error) {
    logServerError("Error updating appointment", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}
