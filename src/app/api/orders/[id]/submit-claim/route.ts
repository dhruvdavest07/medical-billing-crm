import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { getClearinghouseProvider } from "@/lib/clearinghouse/factory";
import type { ClaimSubmission } from "@/lib/clearinghouse";

export async function POST(
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

    const order = await prisma.billingOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true, mrn: true },
        },
        facility: { select: { id: true, name: true, thirdPartyProcessor: true, thirdPartyDetails: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.facility) {
      return NextResponse.json({ error: "No facility linked to this order" }, { status: 400 });
    }

    // Build claim submission
    const submission: ClaimSubmission = {
      orderId: order.id,
      claimNumber: order.claimNumber || order.orderNumber,
      patient: {
        firstName: order.patient.firstName,
        lastName: order.patient.lastName,
        dob: order.patient.dateOfBirth ? order.patient.dateOfBirth.toISOString().slice(0, 10) : "",
        mrn: order.patient.mrn || "",
      },
      facility: {
        name: order.facility.name,
      },
      serviceStartDate: order.serviceStartDate ? order.serviceStartDate.toISOString().slice(0, 10) : "",
      serviceEndDate: order.serviceEndDate ? order.serviceEndDate.toISOString().slice(0, 10) : "",
      procedures: [],
      totalCharge: order.invoice?.totalAmount || 0,
      diagnosisCodes: [],
    };

    const provider = getClearinghouseProvider(order.facility.thirdPartyProcessor || undefined);
    const result = await provider.submitClaim(submission);

    if (result.accepted) {
      await prisma.billingOrder.update({
        where: { id: order.id },
        data: { status: "submitted" },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "InsuranceClaim",
          entityId: result.clearinghouseClaimId,
          afterState: JSON.stringify({
            orderId: order.id,
            clearinghouseClaimId: result.clearinghouseClaimId,
            submittedAt: result.submittedAt,
          }),
        },
      });
    }

    return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
  } catch (error) {
    logServerError("Error submitting claim", error);
    return NextResponse.json({ error: "Failed to submit claim" }, { status: 500 });
  }
}
