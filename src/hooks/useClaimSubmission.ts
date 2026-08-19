"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

type SubmissionState = "idle" | "submitting" | "success" | "error";

interface ClaimResultData {
  accepted: boolean;
  clearinghouseClaimId: string;
  errors: Array<{ code: string; message: string; field?: string }>;
  submittedAt: string;
}

interface ClaimStatusData {
  status: "pending" | "accepted" | "rejected" | "paid" | "denied";
  payerResponse?: string;
  checkAmount?: number;
  checkDate?: string;
  denialReason?: string;
}

export function useClaimSubmission() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [result, setResult] = useState<ClaimResultData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitClaim = useCallback(async (orderId: string) => {
    setState("submitting");
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/submit-claim`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit claim");
      }
      setResult(data);
      setState(data.accepted ? "success" : "error");
      if (data.accepted) {
        toast.success("Claim submitted successfully");
      } else {
        const firstError = data.errors?.[0];
        toast.error(firstError ? firstError.message : "Claim was rejected");
      }
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Failed to submit claim";
      setError(msg);
      toast.error(msg);
    }
  }, []);

  const checkStatus = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/claim-status`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to check claim status");
      }
      setClaimStatus(data);
      return data as ClaimStatusData;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to check status";
      toast.error(msg);
      return null;
    }
  }, []);

  return { submitClaim, checkStatus, state, result, claimStatus, error };
}
