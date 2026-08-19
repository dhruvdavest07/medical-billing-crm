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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

interface AddCommunicationDialogProps {
  onSuccess?: () => void;
}

export function AddCommunicationDialog({
  onSuccess,
}: AddCommunicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [patientLoading, setPatientLoading] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    channel: "sms",
    type: "reminder",
    content: "",
    scheduledFor: "",
  });

  async function loadPatients() {
    try {
      setPatientLoading(true);
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast.error("Failed to load patients");
      logClientError("Communication patient lookup failed", error);
    } finally {
      setPatientLoading(false);
    }
  }

  async function handleSubmit() {
    if (
      !formData.patientId ||
      !formData.channel ||
      !formData.type ||
      !formData.content
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scheduledFor: formData.scheduledFor || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create communication");

      toast.success("Communication sent successfully");
      setOpen(false);
      setFormData({
        patientId: "",
        channel: "sms",
        type: "reminder",
        content: "",
        scheduledFor: "",
      });
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to send communication");
      logClientError("Create communication failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" onClick={() => loadPatients()}>
          <Plus className="w-4 h-4" />
          Send Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Communication</DialogTitle>
          <DialogDescription>
            Send SMS, email, or WhatsApp messages to patients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Selection */}
          <div>
            <Label htmlFor="patient">Patient</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patientLoading ? (
                  <SelectItem value="">Loading...</SelectItem>
                ) : (
                  patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Channel Selection */}
          <div>
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) =>
                setFormData({ ...formData, channel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Selection */}
          <div>
            <Label htmlFor="type">Message Type</Label>
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
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
                <SelectItem value="survey">Survey</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Content */}
          <div>
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              placeholder="Enter your message..."
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.content.length}/160 characters
            </p>
          </div>

          {/* Schedule Option */}
          <div>
            <Label htmlFor="scheduledFor">Schedule For (Optional)</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) =>
                setFormData({ ...formData, scheduledFor: e.target.value })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to send immediately
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
