"use client";

import * as React from "react";
import { CreditCard, Plus } from "lucide-react";
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
import { getClientErrorMessage, logClientError } from "@/lib/client-logger";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number | string;
  amountPaid?: number | string | null;
};

interface PaymentDialogProps {
  invoiceId?: string;
  onSuccess?: () => void;
}

export function PaymentDialog({ invoiceId, onSuccess }: PaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [invoices, setInvoices] = React.useState<InvoiceOption[]>([]);
  const [formData, setFormData] = React.useState({
    invoiceId: invoiceId || "",
    amount: "",
    currency: "usd",
    description: "",
  });

  React.useEffect(() => {
    if (open) {
      fetchInvoices();
    }
  }, [open]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/billing/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      // Filter for unpaid invoices
      const unpaidInvoices = (data as InvoiceOption[]).filter(
        (inv) => inv.status !== "paid",
      );
      setInvoices(unpaidInvoices);
    } catch (error) {
      toast.error("Failed to load invoices");
      logClientError("Payment dialog invoice fetch failed", error);
    }
  };

  const getInvoiceAmount = () => {
    if (!formData.invoiceId) return "";
    const invoice = invoices.find((i) => i.id === formData.invoiceId);
    if (!invoice) return "";

    const total = Number(invoice.total ?? 0);
    const amountPaid = Number(invoice.amountPaid ?? 0);
    return (total - amountPaid).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoiceId || !formData.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setLoading(true);

      // Create payment intent
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          description: formData.description || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      const data = await response.json();

      // In a real implementation, you would redirect to Stripe Checkout or use the clientSecret
      toast.success(`Payment intent created: ${data.id}`);
      console.log("Payment details:", data);

      setFormData({
        invoiceId: "",
        amount: "",
        currency: "usd",
        description: "",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(getClientErrorMessage(error, "Failed to process payment"));
      logClientError("Payment dialog submission failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Process Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Create a payment for an unpaid invoice via Stripe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="invoice">Invoice *</Label>
            <Select
              value={formData.invoiceId}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  invoiceId: value,
                  amount: getInvoiceAmount(),
                });
              }}
            >
              <SelectTrigger id="invoice">
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - $
                    {(
                      Number(invoice.total ?? 0) -
                      Number(invoice.amountPaid ?? 0)
                    ).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="gap-2 flex flex-col">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                  <SelectItem value="cad">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Payment note (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">Secure Payment via Stripe</p>
            <p>Your payment information is processed securely by Stripe.</p>
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
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {loading ? "Processing..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
