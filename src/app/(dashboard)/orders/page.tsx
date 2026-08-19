"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, FileText, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface OrderPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  mrn: string | null;
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  priority: number;
  createdAt: string;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  claimNumber: string | null;
  patient: OrderPatient;
  facility: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  _count: { orderComments: number; documents: number };
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  submitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  denied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  appeal: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ageInDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [patients, setPatients] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      patientId: formData.get("patientId"),
      facilityId: formData.get("facilityId") || null,
      status: formData.get("status") || "new",
      priority: parseInt(formData.get("priority") as string, 10) || 0,
      serviceStartDate: formData.get("serviceStartDate") || null,
      serviceEndDate: formData.get("serviceEndDate") || null,
      claimNumber: formData.get("claimNumber") || null,
      notes: formData.get("notes") || null,
    };

    if (!body.patientId) {
      toast.error("Please select a patient");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create order");
      toast.success("Order created successfully");
      setShowNewOrder(false);
      fetchOrders();
    } catch {
      toast.error("Failed to create order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing Orders</h2>
          <p className="text-sm text-muted-foreground">Manage medical billing requests and claims</p>
        </div>
        <Button onClick={() => setShowNewOrder(!showNewOrder)}>
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      {showNewOrder && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Create New Billing Order</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Patient *</label>
              <select name="patientId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Select patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select name="status" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Priority (0=highest)</label>
              <Input name="priority" type="number" defaultValue="0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Service Start Date</label>
              <Input name="serviceStartDate" type="date" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Service End Date</label>
              <Input name="serviceEndDate" type="date" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Claim Number</label>
              <Input name="claimNumber" type="text" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <Input name="notes" type="text" placeholder="Additional notes..." />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <Button type="submit">Create Order</Button>
              <Button type="button" variant="outline" onClick={() => setShowNewOrder(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number, patient name, MRN, claim number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No orders found. Create one to get started.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order #</th>
                  <th className="px-4 py-3 text-left font-medium">Patient</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Priority</th>
                  <th className="px-4 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium">Age</th>
                  <th className="px-4 py-3 text-left font-medium">Comments</th>
                  <th className="px-4 py-3 text-left font-medium">Docs</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.patient.firstName} {order.patient.lastName}</div>
                      <div className="text-xs text-muted-foreground">{order.patient.mrn || "No MRN"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        {order.priority}
                      </div>
                    </td>
                    <td className="px-4 py-3">{order.assignedTo?.name || "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <span className={ageInDays(order.createdAt) > 3 ? "font-semibold text-orange-600" : ""}>
                        {ageInDays(order.createdAt)}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{order._count.orderComments}</td>
                    <td className="px-4 py-3 text-center">{order._count.documents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
