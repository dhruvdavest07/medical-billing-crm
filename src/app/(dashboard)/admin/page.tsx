"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Target, TrendingUp, AlertTriangle, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: number;
  createdAt: string;
  ageDays: number;
  priorityLabel: string;
  patient: { firstName: string; lastName: string };
  assignedTo: { id: string; name: string } | null;
  facility: { name: string } | null;
}

interface EmployeeStat {
  id: string;
  name: string | null;
  email: string;
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  recentOrders: { id: string; status: string; orderNumber: string }[];
}

interface TargetStat {
  id: string;
  userId: string;
  dailyTarget: number;
  weeklyTarget: number;
  month: string;
  user: { id: string; name: string | null; email: string };
  todayCompleted: number;
  monthCompleted: number;
  achieved: boolean;
}

interface DashboardData {
  activeOrders: ActiveOrder[];
  employeeStats: EmployeeStat[];
  targetStats: TargetStat[];
  statusCounts: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  submitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  denied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [priorityOverrides, setPriorityOverrides] = useState<Record<string, number>>({});

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const toggleEmployee = (id: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updatePriority = async (orderId: string, priority: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Priority updated");
      fetchDashboard();
    } catch {
      toast.error("Failed to update priority");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">No data available</div>;
  }

  const totalActive = data.activeOrders.length;
  const totalEmployees = data.employeeStats.length;
  const totalCompletedToday = data.employeeStats.reduce((sum, e) => sum + e.completedOrders, 0);
  const targetsNotAchieved = data.targetStats.filter((t) => !t.achieved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">Priority management, employee tracking & target monitoring</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowUpDown className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Active Orders</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{totalActive}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Employees Working</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{totalEmployees}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Completed ({period})</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{totalCompletedToday}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Targets Missed</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-orange-600">{targetsNotAchieved}</p>
        </Card>
      </div>

      {/* Status distribution */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order Status Distribution</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className={`rounded-lg px-4 py-2 text-sm ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}>
              <span className="font-medium capitalize">{status.replace(/_/g, " ")}</span>
              <span className="ml-2 font-bold">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active orders with per-day priority */}
        <Card className="p-5">
          <h3 className="mb-4 text-lg font-semibold">Active Orders — Priority Queue</h3>
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {data.activeOrders.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No active orders.</p>
            ) : (
              data.activeOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-medium">{order.orderNumber}</p>
                    <p className="text-sm">{order.patient.firstName} {order.patient.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.assignedTo?.name || "Unassigned"} · {order.facility?.name || "No facility"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <p className={`mt-1 text-xs font-medium ${order.ageDays > 3 ? "text-orange-600" : "text-muted-foreground"}`}>
                      {order.priorityLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="w-16"
                      defaultValue={order.priority}
                      onChange={(e) => setPriorityOverrides((p) => ({ ...p, [order.id]: parseInt(e.target.value, 10) }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updatePriority(order.id, priorityOverrides[order.id] ?? order.priority)}
                    >
                      Set
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Employee work tracking & targets */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold">Employee Work Tracking</h3>
            <div className="space-y-2">
              {data.employeeStats.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No employee data for this period.</p>
              ) : (
                data.employeeStats.map((emp) => (
                  <div key={emp.id} className="rounded-lg border">
                    <button
                      onClick={() => toggleEmployee(emp.id)}
                      className="flex w-full items-center justify-between p-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {expandedEmployees.has(emp.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">{emp.name || emp.email}</span>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="text-muted-foreground">{emp.totalOrders} orders</span>
                        <span className="text-green-600">{emp.completedOrders} done</span>
                        <span className="text-yellow-600">{emp.inProgressOrders} active</span>
                      </div>
                    </button>
                    {expandedEmployees.has(emp.id) && (
                      <div className="border-t bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Recent orders:</p>
                        {emp.recentOrders.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No recent orders.</p>
                        ) : (
                          <div className="space-y-1">
                            {emp.recentOrders.map((o) => (
                              <div key={o.id} className="flex items-center justify-between text-sm">
                                <span className="font-mono text-xs">{o.orderNumber}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[o.status] || "bg-gray-100"}`}>
                                  {o.status.replace(/_/g, " ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Target tracking */}
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Target className="h-5 w-5 text-muted-foreground" /> Target Tracking
            </h3>
            {data.targetStats.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No targets set for this month.</p>
            ) : (
              <div className="space-y-3">
                {data.targetStats.map((t) => (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.user.name || t.user.email}</span>
                      {t.achieved ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Achieved</span>
                      ) : (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Not Achieved</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Target</p>
                        <p className="font-medium">{t.dailyTarget}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Completed Today</p>
                        <p className={`font-medium ${t.todayCompleted >= t.dailyTarget ? "text-green-600" : "text-orange-600"}`}>
                          {t.todayCompleted}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Completed This Month</p>
                        <p className="font-medium">{t.monthCompleted}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
