"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logClientError } from "@/lib/client-logger";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
};

interface AddConsentDialogProps {
  onSuccess: () => void;
}

export function AddConsentDialog({ onSuccess }: AddConsentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    consentType: "",
    isGranted: true,
    signedAt: new Date().toISOString().split("T")[0],
    documentUrl: "",
  });

  React.useEffect(() => {
    if (open) {
      fetchPatients();
    }
  }, [open]);

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast.error("Failed to load patients");
      logClientError("Consent patient lookup failed", error);
    }
  };

  const consentTypes = [
    "Treatment",
    "Surgery",
    "Medication",
    "Research",
    "Photography",
    "Telehealth",
    "Data Sharing",
    "Insurance",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.consentType) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          consentType: formData.consentType,
          isGranted: formData.isGranted,
          signedAt: formData.signedAt,
          documentUrl: formData.documentUrl || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create consent");

      toast.success("Consent recorded successfully");
      setFormData({
        patientId: "",
        consentType: "",
        isGranted: true,
        signedAt: new Date().toISOString().split("T")[0],
        documentUrl: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to record consent");
      logClientError("Create consent failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Consent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Patient Consent</DialogTitle>
          <DialogDescription>
            Record consent for treatment, procedures, or data sharing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="patient">Patient *</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger id="patient">
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="consent-type">Consent Type *</Label>
            <Select
              value={formData.consentType}
              onValueChange={(value) =>
                setFormData({ ...formData, consentType: value })
              }
            >
              <SelectTrigger id="consent-type">
                <SelectValue placeholder="Select consent type" />
              </SelectTrigger>
              <SelectContent>
                {consentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="signed-date">Signed Date</Label>
            <Input
              id="signed-date"
              type="date"
              value={formData.signedAt}
              onChange={(e) =>
                setFormData({ ...formData, signedAt: e.target.value })
              }
            />
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="document-url">Document URL</Label>
            <Input
              id="document-url"
              placeholder="https://..."
              value={formData.documentUrl}
              onChange={(e) =>
                setFormData({ ...formData, documentUrl: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is-granted"
              checked={formData.isGranted}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isGranted: checked as boolean })
              }
            />
            <Label htmlFor="is-granted" className="cursor-pointer">
              Consent Granted
            </Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Consent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
