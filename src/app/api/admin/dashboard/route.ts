import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";

    const now = new Date();
    let startDate: Date;
    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 1. All active orders with priority and age
    const activeOrders = await prisma.billingOrder.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["completed", "cancelled"] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
        facility: { select: { name: true } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    // 2. Per-day priority: how many days each order has been open
    const ordersWithAge = activeOrders.map((o) => {
      const ageDays = Math.floor((now.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...o,
        ageDays,
        priorityLabel: ageDays <= 1 ? "1 day" : `${ageDays} days`,
      };
    });

    // 3. Employee work tracking — who worked on how many orders
    const employees = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        assignedOrders: {
          where: { updatedAt: { gte: startDate } },
          select: { id: true, status: true, orderNumber: true },
        },
      },
    });

    const employeeStats = employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      totalOrders: e.assignedOrders.length,
      completedOrders: e.assignedOrders.filter((o) => o.status === "completed").length,
      inProgressOrders: e.assignedOrders.filter((o) => o.status === "in_progress").length,
      recentOrders: e.assignedOrders.slice(0, 5),
    }));

    // 4. Targets for current month
    const month = now.toISOString().slice(0, 7);
    const targets = await prisma.employeeTarget.findMany({
      where: { organizationId: orgId, month },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const targetStats = await Promise.all(
      targets.map(async (t) => {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayCompleted = await prisma.billingOrder.count({
          where: { assignedToId: t.userId, status: "completed", updatedAt: { gte: todayStart } },
        });
        const monthCompleted = await prisma.billingOrder.count({
          where: { assignedToId: t.userId, status: "completed", updatedAt: { gte: monthStart } },
        });
        return {
          ...t,
          todayCompleted,
          monthCompleted,
          achieved: t.dailyTarget > 0 && todayCompleted >= t.dailyTarget,
        };
      }),
    );

    // 5. Status distribution
    const statusCounts = await prisma.billingOrder.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    });

    return NextResponse.json({
      activeOrders: ordersWithAge,
      employeeStats,
      targetStats,
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s.status] = s._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    logServerError("Error fetching admin dashboard data", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
