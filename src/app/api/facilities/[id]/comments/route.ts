import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope, requireOrgContext } from "@/lib/org";
import { logServerError } from "@/lib/safe-logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const comments = await prisma.facilityComment.findMany({
      where: { facilityId: id, facility: { organizationId: orgId } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    logServerError("Error fetching facility comments", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const { userId } = await requireOrgContext();

    const existing = await prisma.facility.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    const body = await request.json();
    const { text, orderId } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const comment = await prisma.facilityComment.create({
      data: {
        facilityId: id,
        orderId: orderId || null,
        authorId: userId,
        text,
      },
    });

    const withAuthor = await prisma.facilityComment.findUnique({
      where: { id: comment.id },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(withAuthor ?? comment, { status: 201 });
  } catch (error) {
    logServerError("Error creating facility comment", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
