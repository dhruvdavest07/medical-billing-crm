"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Upload, Building2, User, Calendar, MessageSquare, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  priority: number;
  claimNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    mrn: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    gender: string | null;
  };
  facility: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    instructions: string | null;
    thirdPartyProcessor: string | null;
    thirdPartyDetails: string | null;
    facilityComments: {
      id: string;
      text: string;
      createdAt: string;
      author: { id: string; name: string };
    }[];
  } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  orderComments: {
    id: string;
    text: string;
    createdAt: string;
    author: { id: string; name: string };
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    storageKey: string;
    mimeType: string | null;
    createdAt: string;
  }[];
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

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [facilityCommentText, setFacilityCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrder(data);
    } catch {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/orders/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      if (!res.ok) throw new Error("Failed to post");
      setCommentText("");
      toast.success("Comment posted");
      fetchOrder();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const postFacilityComment = async () => {
    if (!facilityCommentText.trim() || !order?.facility) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/facilities/${order.facility.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: facilityCommentText, orderId: id }),
      });
      if (!res.ok) throw new Error("Failed to post");
      setFacilityCommentText("");
      toast.success("Facility comment posted");
      fetchOrder();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const updateOrder = async (field: string, value: unknown) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Order updated");
      fetchOrder();
    } catch {
      toast.error("Failed to update order");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !order) return;
    const formData = new FormData();
    formData.append("patientId", order.patient.id);
    formData.append("billingOrderId", id);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      toast.success(`${files.length} file(s) uploaded`);
      fetchOrder();
    } catch {
      toast.error("Failed to upload files");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading order...</div>;
  }

  if (!order) {
    return <div className="py-12 text-center text-muted-foreground">Order not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-mono text-xl font-bold">{order.orderNumber}</h2>
            <p className="text-sm text-muted-foreground">
              Created {formatDateTime(order.createdAt)} by {order.createdBy?.name || "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
            {order.status.replace(/_/g, " ")}
          </span>
          <Select value={order.status} onValueChange={(v) => updateOrder("status", v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="appeal">Appeal</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two-column layout: RIGHT side = patient/order, LEFT side = facility */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ============ RIGHT SIDE — Patient & Order Details ============ */}
        <div className="space-y-6">
          {/* Patient Details */}
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-muted-foreground" /> Patient Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{order.patient.dateOfBirth ? new Date(order.patient.dateOfBirth).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">MRN</p>
                <p className="font-medium">{order.patient.mrn || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Gender</p>
                <p className="font-medium">{order.patient.gender || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p className="font-medium">{order.patient.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="font-medium">{order.patient.email || "—"}</p>
              </div>
            </div>
          </Card>

          {/* Dates of Service */}
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-muted-foreground" /> Dates of Service
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Service Start</p>
                <p className="font-medium">{order.serviceStartDate ? new Date(order.serviceStartDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Service End</p>
                <p className="font-medium">{order.serviceEndDate ? new Date(order.serviceEndDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Claim Number</p>
                <p className="font-medium">{order.claimNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Priority</p>
                <p className="font-medium">{order.priority}</p>
              </div>
            </div>
            {order.notes && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Order Notes</p>
                <p className="mt-1 text-sm">{order.notes}</p>
              </div>
            )}
          </Card>

          {/* Comment Box (primary, with timeline) */}
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-muted-foreground" /> Comments & Timeline
            </h3>
            {/* Timeline panel */}
            <div className="mb-4 max-h-[400px] space-y-3 overflow-y-auto">
              {order.orderComments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No comments yet. Be the first to post.</p>
              ) : (
                order.orderComments.map((c) => (
                  <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.author.name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm">{c.text}</p>
                  </div>
                ))
              )}
            </div>
            {/* Comment input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a comment and post..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button onClick={postComment} disabled={posting || !commentText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Document Upload */}
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Paperclip className="h-5 w-5 text-muted-foreground" /> Documents
            </h3>
            <div className="mb-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <span>Click to upload documents</span>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            {/* Document list */}
            <div className="space-y-2">
              {order.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                order.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ============ LEFT SIDE — Medical Provider / Facility ============ */}
        <div className="space-y-6">
          {order.facility ? (
            <>
              {/* Facility / Medical Provider */}
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5 text-muted-foreground" /> Medical Provider / Facility
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Facility Name</p>
                    <p className="text-lg font-medium">{order.facility.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Email</p>
                      <p className="font-medium">{order.facility.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium">{order.facility.phone || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Address</p>
                      <p className="font-medium">{order.facility.address || "—"}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Facility Particular Instructions */}
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Facility Particular Instructions
                </h3>
                {order.facility.instructions ? (
                  <p className="text-sm">{order.facility.instructions}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific instructions provided.</p>
                )}

                {/* Third-party processor info */}
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Third-Party Processor / Clearinghouse</p>
                  {order.facility.thirdPartyProcessor ? (
                    <>
                      <p className="mt-1 font-medium">{order.facility.thirdPartyProcessor}</p>
                      {order.facility.thirdPartyDetails && (
                        <p className="mt-1 text-sm text-muted-foreground">{order.facility.thirdPartyDetails}</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No third-party processor configured.</p>
                  )}
                </div>
              </Card>

              {/* Facility Comment Box (secondary) */}
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" /> Facility Notes & Reminders
                </h3>
                <div className="mb-4 max-h-[300px] space-y-3 overflow-y-auto">
                  {order.facility.facilityComments.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No facility notes yet.</p>
                  ) : (
                    order.facility.facilityComments.map((c) => (
                      <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{c.author.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a facility note or reminder..."
                    value={facilityCommentText}
                    onChange={(e) => setFacilityCommentText(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={postFacilityComment} disabled={posting || !facilityCommentText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <Building2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>No facility linked to this order.</p>
                <p className="mt-1 text-sm">You can assign a facility by editing the order.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
