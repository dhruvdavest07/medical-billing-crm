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

interface AddLabResultDialogProps {
  onSuccess: () => void;
}

export function AddLabResultDialog({ onSuccess }: AddLabResultDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    testName: "",
    resultValue: "",
    unit: "",
    referenceRange: "",
    status: "pending",
    performedAt: "",
    reportUrl: "",
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
      logClientError("Lab result patient lookup failed", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.testName) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          testName: formData.testName,
          resultValue: formData.resultValue || null,
          unit: formData.unit || null,
          referenceRange: formData.referenceRange || null,
          status: formData.status,
          performedAt: formData.performedAt || null,
          reportUrl: formData.reportUrl || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create lab result");

      toast.success("Lab result added successfully");
      setFormData({
        patientId: "",
        testName: "",
        resultValue: "",
        unit: "",
        referenceRange: "",
        status: "pending",
        performedAt: "",
        reportUrl: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to add lab result");
      logClientError("Create lab result failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Result
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lab Result</DialogTitle>
          <DialogDescription>
            Record a new laboratory test result for a patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="test-name">Test Name *</Label>
              <Input
                id="test-name"
                placeholder="e.g., Blood Glucose, CBC"
                value={formData.testName}
                onChange={(e) =>
                  setFormData({ ...formData, testName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="result-value">Result Value</Label>
              <Input
                id="result-value"
                placeholder="e.g., 125"
                value={formData.resultValue}
                onChange={(e) =>
                  setFormData({ ...formData, resultValue: e.target.value })
                }
              />
            </div>

            <div className="gap-2 flex flex-col">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., mg/dL"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
              />
            </div>

            <div className="gap-2 flex flex-col">
              <Label htmlFor="reference-range">Reference Range</Label>
              <Input
                id="reference-range"
                placeholder="e.g., 70-100"
                value={formData.referenceRange}
                onChange={(e) =>
                  setFormData({ ...formData, referenceRange: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="abnormal">Abnormal</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gap-2 flex flex-col">
              <Label htmlFor="performed-at">Performed Date</Label>
              <Input
                id="performed-at"
                type="date"
                value={formData.performedAt}
                onChange={(e) =>
                  setFormData({ ...formData, performedAt: e.target.value })
                }
              />
            </div>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="report-url">Report URL</Label>
            <Input
              id="report-url"
              placeholder="https://..."
              value={formData.reportUrl}
              onChange={(e) =>
                setFormData({ ...formData, reportUrl: e.target.value })
              }
            />
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
              {loading ? "Adding..." : "Add Lab Result"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
