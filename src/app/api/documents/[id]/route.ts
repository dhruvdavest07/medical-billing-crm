import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { getStorage } from "@/lib/storage";
import type { Prisma } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let orgId: string | undefined;
  try {
    orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const canRead = await hasPermission(userId, orgId, "documents:read", "documents");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const document = await prisma.document.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const storage = getStorage();
    const url = await storage.getSignedUrl(document.storageKey);
    return NextResponse.json({ url, document });
  } catch (error) {
    logServerError("Error fetching document", error);
    return NextResponse.json({ error: "Failed to fetch document." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let orgId: string | undefined;
  try {
    orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const canWrite = await hasPermission(userId, orgId, "documents:write", "documents");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const document = await prisma.document.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const storage = getStorage();
    await storage.delete(document.storageKey);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.document.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "DELETE",
          entityType: "Document",
          entityId: id,
          afterState: JSON.stringify({ name: document.name }),
        },
      });
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    logServerError("Error deleting document", error);
    return NextResponse.json({ error: "Failed to delete document." }, { status: 500 });
  }
}
