"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Mail, MapPin, MessageSquare, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface FacilityListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  thirdPartyProcessor: string | null;
  _count: { billingOrders: number; facilityComments: number };
  createdAt: string;
}

const EMPTY_FORM = {
  name: "", email: "", phone: "", address: "", city: "", state: "", zip: "",
  instructions: "", thirdPartyProcessor: "", thirdPartyDetails: "",
};

export default function FacilitiesPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<FacilityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/facilities${qs}`);
      if (!res.ok) throw new Error("Failed to load facilities");
      const data = await res.json();
      setFacilities(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load facilities");
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Facility name is required"); return; }
    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        instructions: form.instructions.trim() || null,
        thirdPartyProcessor: form.thirdPartyProcessor.trim() || null,
        thirdPartyDetails: form.thirdPartyDetails.trim() || null,
      };
      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create facility");
      }
      const created = await res.json();
      toast.success("Facility created");
      setForm({ ...EMPTY_FORM });
      setShowNewForm(false);
      fetchFacilities();
      router.push(`/facilities/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create facility");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facilities</h2>
          <p className="text-sm text-muted-foreground">Manage billing facilities, contacts, and third-party processors</p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="mr-2 h-4 w-4" /> New Facility
        </Button>
      </div>

      {showNewForm && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Create New Facility</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="St. Mary Medical Center" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="billing@facility.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <div className="col-span-2 md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Health St" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">City</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">State</label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="CA" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ZIP</label>
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="90001" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Third-Party Processor</label>
              <Input value={form.thirdPartyProcessor} onChange={(e) => setForm({ ...form, thirdPartyProcessor: e.target.value })} placeholder="Waystar" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="mb-1 block text-sm font-medium">Third-Party Details</label>
              <Input value={form.thirdPartyDetails} onChange={(e) => setForm({ ...form, thirdPartyDetails: e.target.value })} placeholder="Submitter ID / account #" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="mb-1 block text-sm font-medium">Instructions</label>
              <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Facility particular instructions..." rows={2} />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Facility"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search facilities by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading facilities...</div>
      ) : facilities.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No facilities found. Create one to get started.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Address</th>
                  <th className="px-4 py-3 text-left font-medium">Processor</th>
                  <th className="px-4 py-3 text-center font-medium">Orders</th>
                  <th className="px-4 py-3 text-center font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id} onClick={() => router.push(`/facilities/${f.id}`)} className="cursor-pointer border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3">
                      {f.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{f.email}</div>}
                      {f.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{f.phone}</div>}
                      {!f.email && !f.phone && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {f.address ? (
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {[f.address, f.city, f.state, f.zip].filter(Boolean).join(", ")}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">{f.thirdPartyProcessor || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-center">{f._count.billingOrders}</td>
                    <td className="px-4 py-3 text-center">{f._count.facilityComments}</td>
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
