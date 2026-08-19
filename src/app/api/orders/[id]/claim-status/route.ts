import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { getClearinghouseProvider } from "@/lib/clearinghouse/factory";

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

    const order = await prisma.billingOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        facility: { select: { thirdPartyProcessor: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const claimId = order.claimNumber || order.orderNumber;
    const provider = getClearinghouseProvider(order.facility?.thirdPartyProcessor || undefined);
    const status = await provider.checkStatus(claimId);

    // Update order status based on claim status
    if (status.status === "paid") {
      await prisma.billingOrder.update({
        where: { id: order.id },
        data: { status: "paid" },
      });
    } else if (status.status === "denied" || status.status === "rejected") {
      await prisma.billingOrder.update({
        where: { id: order.id },
        data: { status: "denied" },
      });
    }

    return NextResponse.json(status);
  } catch (error) {
    logServerError("Error checking claim status", error);
    return NextResponse.json({ error: "Failed to check claim status" }, { status: 500 });
  }
}
