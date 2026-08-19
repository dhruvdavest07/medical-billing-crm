import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

interface AddCampaignDialogProps {
  onSuccess?: () => void;
}

export function AddCampaignDialog({ onSuccess }: AddCampaignDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "drip",
    triggerType: "",
  });

  async function handleSubmit() {
    if (!formData.name || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/communications/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          triggerType: formData.triggerType || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create campaign");

      toast.success("Campaign created successfully");
      setOpen(false);
      setFormData({ name: "", type: "drip", triggerType: "" });
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create campaign");
      logClientError("Create campaign failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>
            Set up a new marketing campaign for patient engagement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campaign Name */}
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="e.g., Post-Visit Follow-up"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Campaign Type */}
          <div>
            <Label htmlFor="type">Campaign Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drip">Drip (Automated sequence)</SelectItem>
                <SelectItem value="broadcast">
                  Broadcast (Single message)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Drip campaigns send messages over time. Broadcasts send to
              everyone at once.
            </p>
          </div>

          {/* Trigger Type (optional) */}
          <div>
            <Label htmlFor="triggerType">Trigger Type (Optional)</Label>
            <Select
              value={formData.triggerType}
              onValueChange={(value) =>
                setFormData({ ...formData, triggerType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trigger (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Trigger</SelectItem>
                <SelectItem value="post_visit">After Visit</SelectItem>
                <SelectItem value="chronic_care">Chronic Care</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Triggers automatically start campaigns based on events
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Campaign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
