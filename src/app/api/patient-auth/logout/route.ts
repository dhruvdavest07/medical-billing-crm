import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { revokePatientSessionFromRequest } from "@/lib/patient-auth";
import { logServerError } from "@/lib/safe-logger";

export async function POST(request: Request) {
  try {
    const session = await revokePatientSessionFromRequest(request);
    const response = NextResponse.json({ success: true });
    response.cookies.set("patient_session", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    if (!session) {
      return response;
    }

    await createAuditLog({
      organizationId: session.patient.organizationId,
      action: "DELETE",
      entityType: "PatientSession",
      entityId: session.id,
      actorType: "patient",
      actorIdentifier: session.patientId,
      beforeState: JSON.stringify({ status: "active" }),
      afterState: JSON.stringify({ status: "revoked" }),
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return response;
  } catch (error) {
    logServerError("Patient logout error", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
