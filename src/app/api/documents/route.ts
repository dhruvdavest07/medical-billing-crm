import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import {
  getStorage,
  generateStorageKey,
  validateFile,
  StorageValidationError,
} from "@/lib/storage";
import type { Prisma } from "@prisma/client";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

export async function POST(request: Request) {
  let orgId: string | undefined;
  try {
    orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const canWrite = await hasPermission(userId, orgId, "documents:write", "documents");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    const patientId = formData.get("patientId");
    const billingOrderId = formData.get("billingOrderId");

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }
    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json({ error: "patientId is required." }, { status: 400 });
    }

    for (const file of files) {
      try {
        validateFile(file);
      } catch (err) {
        if (err instanceof StorageValidationError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    let orderId: string | null = null;
    if (billingOrderId && typeof billingOrderId === "string") {
      const order = await prisma.billingOrder.findFirst({
        where: { id: billingOrderId, organizationId: orgId },
        select: { id: true },
      });
      if (!order) {
        return NextResponse.json({ error: "Billing order not found." }, { status: 404 });
      }
      orderId = order.id;
    }

    const storage = getStorage();
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const storageKey = generateStorageKey(orgId, orderId, patientId, file.name);
        const { key } = await storage.upload(file, storageKey);
        return { file, key };
      })
    );

    const documents = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = [];
      for (const { file, key } of uploaded) {
        const doc = await tx.document.create({
          data: {
            organizationId: orgId,
            patientId,
            billingOrderId: orderId,
            name: file.name,
            type: extensionOf(file.name),
            storageKey: key,
            mimeType: file.type || null,
            size: file.size,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId,
            action: "CREATE",
            entityType: "Document",
            entityId: doc.id,
            afterState: JSON.stringify({ name: doc.name, storageKey: doc.storageKey }),
          },
        });
        created.push(doc);
      }
      return created;
    });

    return NextResponse.json({ documents }, { status: 201 });
  } catch (error) {
    logServerError("Error uploading documents", error);
    if (error instanceof StorageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to upload documents." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  let orgId: string | undefined;
  try {
    orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const canRead = await hasPermission(userId, orgId, "documents:read", "documents");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const billingOrderId = searchParams.get("billingOrderId");

    if (!patientId && !billingOrderId) {
      return NextResponse.json({ error: "patientId or billingOrderId is required." }, { status: 400 });
    }

    const where: Record<string, string> = { organizationId: orgId };
    if (patientId) where.patientId = patientId;
    if (billingOrderId) where.billingOrderId = billingOrderId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    logServerError("Error fetching documents", error);
    return NextResponse.json({ error: "Failed to list documents." }, { status: 500 });
  }
}
