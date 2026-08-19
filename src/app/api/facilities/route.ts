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

    const facilities = await prisma.facility.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
      include: {
        _count: { select: { billingOrders: true, facilityComments: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(facilities);
  } catch (error) {
    logServerError("Error fetching facilities", error);
    return NextResponse.json({ error: "Failed to fetch facilities" }, { status: 500 });
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
    const { name, email, phone, address, city, state, zip, instructions, thirdPartyProcessor, thirdPartyDetails } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Facility name is required" }, { status: 400 });
    }

    const facility = await prisma.facility.create({
      data: {
        organizationId: orgId,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        instructions: instructions || null,
        thirdPartyProcessor: thirdPartyProcessor || null,
        thirdPartyDetails: thirdPartyDetails || null,
      },
    });

    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    logServerError("Error creating facility", error);
    return NextResponse.json({ error: "Failed to create facility" }, { status: 500 });
  }
}
