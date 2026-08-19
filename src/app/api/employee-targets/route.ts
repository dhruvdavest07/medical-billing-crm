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
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const targets = await prisma.employeeTarget.findMany({
      where: { organizationId: orgId, month },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    // For each target, count orders completed today and this month
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const enriched = await Promise.all(
      targets.map(async (t) => {
        const todayCount = await prisma.billingOrder.count({
          where: {
            assignedToId: t.userId,
            status: "completed",
            updatedAt: { gte: todayStart },
          },
        });
        const monthCount = await prisma.billingOrder.count({
          where: {
            assignedToId: t.userId,
            status: "completed",
            updatedAt: { gte: monthStart },
          },
        });
        return { ...t, todayCompleted: todayCount, monthCompleted: monthCount };
      }),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    logServerError("Error fetching employee targets", error);
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await getCurrentUserId(orgId);
    const isAdmin = await hasPermission(userId, orgId, "billing:write", "billing");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, dailyTarget, weeklyTarget, month } = body;

    if (!targetUserId || !month) {
      return NextResponse.json({ error: "User ID and month are required" }, { status: 400 });
    }

    const target = await prisma.employeeTarget.upsert({
      where: { userId_month: { userId: targetUserId, month } },
      create: {
        organizationId: orgId,
        userId: targetUserId,
        dailyTarget: dailyTarget || 0,
        weeklyTarget: weeklyTarget || 0,
        month,
      },
      update: {
        dailyTarget: dailyTarget || 0,
        weeklyTarget: weeklyTarget || 0,
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    logServerError("Error creating/updating employee target", error);
    return NextResponse.json({ error: "Failed to set target" }, { status: 500 });
  }
}
