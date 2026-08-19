/**
 * Mock clearinghouse provider for development and testing.
 */
import type {
  ClaimResult, ClaimStatus, ClaimSubmission, ClaimSubmissionError,
  ClearinghouseProvider, Remittance,
} from "./index";

export interface MockProviderOptions {
  delayMs?: number;
  alwaysReject?: boolean;
}

const DEFAULT_DELAY_MS = 150;

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockProvider implements ClearinghouseProvider {
  readonly name = "mock";
  private readonly delayMs: number;
  private readonly alwaysReject: boolean;

  constructor(options: MockProviderOptions = {}) {
    this.delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
    this.alwaysReject = options.alwaysReject ?? false;
  }

  async submitClaim(claim: ClaimSubmission): Promise<ClaimResult> {
    await sleep(this.delayMs);
    const errors: ClaimSubmissionError[] = [];

    if (claim.procedures.length === 0) {
      errors.push({ code: "VALIDATION_ERROR", message: "At least one procedure is required.", field: "procedures" });
    }
    if (claim.totalCharge <= 0) {
      errors.push({ code: "VALIDATION_ERROR", message: "Total charge must be greater than zero.", field: "totalCharge" });
    }
    if (claim.diagnosisCodes.length === 0) {
      errors.push({ code: "VALIDATION_ERROR", message: "At least one diagnosis code is required.", field: "diagnosisCodes" });
    }
    if (!claim.facility.npi && !claim.facility.taxId) {
      errors.push({ code: "VALIDATION_ERROR", message: "Facility must have either an NPI or a tax id.", field: "facility" });
    }

    if (this.alwaysReject && errors.length === 0) {
      errors.push({ code: "PAYER_REJECTED", message: "Mock payer rejected the claim (alwaysReject mode)." });
    }

    const accepted = errors.length === 0;
    const clearinghouseClaimId = accepted
      ? `MOCK-CLM-${hashString(claim.claimNumber).toString(36).toUpperCase()}`
      : "MOCK-CLM-REJECTED";

    return { accepted, clearinghouseClaimId, errors, submittedAt: new Date().toISOString() };
  }

  async checkStatus(claimId: string): Promise<ClaimStatus> {
    await sleep(this.delayMs);
    const seed = hashString(claimId);
    const roll = seed % 5;

    switch (roll) {
      case 0: return { status: "pending", payerResponse: "Claim received; awaiting payer acknowledgement." };
      case 1: return { status: "accepted", payerResponse: "Claim accepted by payer for adjudication." };
      case 2: return { status: "rejected", payerResponse: "Claim rejected by payer.", denialReason: "Missing prior authorization on file." };
      case 3: {
        const amount = Math.round(((seed % 5000) + 500) * 100) / 100;
        return { status: "paid", payerResponse: "Claim paid.", checkAmount: amount, checkDate: new Date().toISOString().slice(0, 10) };
      }
      default: return { status: "denied", payerResponse: "Claim denied after adjudication.", denialReason: "Service not deemed medically necessary." };
    }
  }

  async downloadRemittance(remittanceId: string): Promise<Remittance> {
    await sleep(this.delayMs);
    const seed = hashString(remittanceId);
    const checkAmount = Math.round(((seed % 8000) + 1000) * 100) / 100;
    return {
      remittanceId,
      claimIds: [`${remittanceId}-claim-1`, `${remittanceId}-claim-2`],
      totalPaid: checkAmount,
      checks: [{ checkNumber: `CHK-${seed.toString(36).toUpperCase()}`, amount: checkAmount, date: new Date().toISOString().slice(0, 10) }],
    };
  }
}
