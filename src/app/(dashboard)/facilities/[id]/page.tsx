"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Save, Send, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface FacilityDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  instructions: string | null;
  thirdPartyProcessor: string | null;
  thirdPartyDetails: string | null;
  createdAt: string;
  _count: { billingOrders: number; facilityComments: number };
  billingOrders: Array<{
    id: string; orderNumber: string; status: string; createdAt: string;
    patient: { id: string; firstName: string; lastName: string };
  }>;
}

interface FacilityComment {
  id: string; text: string; createdAt: string;
  author: { id: string; name: string | null };
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  submitted: "bg-purple-100 text-purple-700",
  pending: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function ageInDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<FacilityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", state: "", zip: "",
    instructions: "", thirdPartyProcessor: "", thirdPartyDetails: "",
  });

  const fetchFacility = useCallback(async () => {
    try {
      const res = await fetch(`/api/facilities/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFacility(data);
      setForm({
        name: data.name || "", email: data.email || "", phone: data.phone || "",
        address: data.address || "", city: data.city || "", state: data.state || "", zip: data.zip || "",
        instructions: data.instructions || "", thirdPartyProcessor: data.thirdPartyProcessor || "",
        thirdPartyDetails: data.thirdPartyDetails || "",
      });
    } catch { toast.error("Failed to load facility"); }
    finally { setLoading(false); }
  }, [id]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/facilities/${id}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { fetchFacility(); fetchComments(); }, [fetchFacility, fetchComments]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/facilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Facility updated");
      setEditing(false);
      fetchFacility();
    } catch { toast.error("Failed to update facility"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/facilities/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        const data = await res.json();
        toast.error(data.error);
        setConfirmDelete(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Facility deleted");
      router.push("/facilities");
    } catch { toast.error("Failed to delete facility"); }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/facilities/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      if (!res.ok) throw new Error("Failed to post");
      setCommentText("");
      toast.success("Comment posted");
      fetchComments();
    } catch { toast.error("Failed to post comment"); }
    finally { setPosting(false); }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading facility...</div>;
  if (!facility) return <div className="py-12 text-center text-muted-foreground">Facility not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/facilities")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{facility.name}</h2>
          <p className="text-sm text-muted-foreground">{facility._count.billingOrders} orders · {facility._count.facilityComments} notes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Facility Details + Edit Form */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5 text-muted-foreground" /> Facility Details
              </h3>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {editing ? (
                <>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">City</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">State</label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">ZIP</label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Third-Party Processor</label><Input value={form.thirdPartyProcessor} onChange={(e) => setForm({ ...form, thirdPartyProcessor: e.target.value })} /></div>
                  <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Third-Party Details</label><Input value={form.thirdPartyDetails} onChange={(e) => setForm({ ...form, thirdPartyDetails: e.target.value })} /></div>
                  <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Instructions</label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} /></div>
                </>
              ) : (
                <>
                  <div><p className="text-xs font-medium text-muted-foreground">Email</p><p className="font-medium">{facility.email || "—"}</p></div>
                  <div><p className="text-xs font-medium text-muted-foreground">Phone</p><p className="font-medium">{facility.phone || "—"}</p></div>
                  <div className="col-span-2"><p className="text-xs font-medium text-muted-foreground">Address</p><p className="font-medium">{[facility.address, facility.city, facility.state, facility.zip].filter(Boolean).join(", ") || "—"}</p></div>
                  <div className="col-span-2 border-t pt-2"><p className="text-xs font-medium text-muted-foreground">Third-Party Processor</p><p className="font-medium">{facility.thirdPartyProcessor || "—"}</p></div>
                  {facility.thirdPartyDetails && <div className="col-span-2"><p className="text-xs font-medium text-muted-foreground">Details</p><p className="text-sm">{facility.thirdPartyDetails}</p></div>}
                  {facility.instructions && <div className="col-span-2 border-t pt-2"><p className="text-xs font-medium text-muted-foreground">Instructions</p><p className="text-sm">{facility.instructions}</p></div>}
                </>
              )}
            </div>
          </Card>

          {/* Delete section */}
          {!editing && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Danger Zone</h3>
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <p className="text-sm">Are you sure? This cannot be undone.</p>
                  <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete Facility</Button>
              )}
            </Card>
          )}
        </div>

        {/* Right: Linked Orders + Comments */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold">Linked Billing Orders</h3>
            {facility.billingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billing orders linked to this facility.</p>
            ) : (
              <div className="space-y-2">
                {facility.billingOrders.map((o) => (
                  <div key={o.id} onClick={() => router.push(`/orders/${o.id}`)} className="flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/30">
                    <div>
                      <span className="font-mono text-xs">{o.orderNumber}</span>
                      <p className="text-xs text-muted-foreground">{o.patient.firstName} {o.patient.lastName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-700"}`}>{o.status.replace(/_/g, " ")}</span>
                      <span className={`text-xs ${ageInDays(o.createdAt) > 3 ? "font-semibold text-orange-600" : "text-muted-foreground"}`}>{ageInDays(o.createdAt)}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-muted-foreground" /> Facility Notes & Reminders
            </h3>
            <div className="mb-4 max-h-[300px] space-y-3 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No facility notes yet.</p>
              ) : (
                comments.map((c) => (
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
              <Textarea placeholder="Type a facility note or reminder..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} className="flex-1" />
              <Button onClick={postComment} disabled={posting || !commentText.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
