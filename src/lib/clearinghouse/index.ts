/**
 * Clearinghouse abstraction layer.
 * A "clearinghouse" is the intermediary between a billing system and the insurance payer.
 */

export type ClaimErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "PAYER_REJECTED"
  | "MISSING_ELIGIBILITY"
  | "DUPLICATE_CLAIM"
  | "INVALID_PROCEDURE_CODE"
  | "INVALID_DIAGNOSIS_CODE"
  | "TIMELY_FILING"
  | "RATE_LIMITED"
  | "PROVIDER_NOT_ENROLLED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ClaimSubmissionPatient {
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
  memberId?: string;
}

export interface ClaimSubmissionFacility {
  name: string;
  npi?: string;
  taxId?: string;
}

export interface ClaimSubmissionProcedure {
  code: string;
  description: string;
  charge: number;
}

export interface ClaimSubmission {
  orderId: string;
  claimNumber: string;
  patient: ClaimSubmissionPatient;
  facility: ClaimSubmissionFacility;
  serviceStartDate: string;
  serviceEndDate: string;
  procedures: ClaimSubmissionProcedure[];
  totalCharge: number;
  diagnosisCodes: string[];
  payerId?: string;
}

export interface ClaimSubmissionError {
  code: ClaimErrorCode;
  message: string;
  field?: string;
}

export interface ClaimResult {
  accepted: boolean;
  clearinghouseClaimId: string;
  errors: ClaimSubmissionError[];
  submittedAt: string;
}

export type ClaimStatus =
  | { status: "pending"; payerResponse?: string }
  | { status: "accepted"; payerResponse?: string }
  | { status: "rejected"; payerResponse?: string; denialReason?: string }
  | { status: "paid"; payerResponse?: string; checkAmount?: number; checkDate?: string }
  | { status: "denied"; payerResponse?: string; denialReason?: string };

export interface RemittanceCheck {
  checkNumber: string;
  amount: number;
  date: string;
}

export interface Remittance {
  remittanceId: string;
  claimIds: string[];
  totalPaid: number;
  checks: RemittanceCheck[];
}

export interface ClearinghouseProvider {
  readonly name: string;
  submitClaim(claim: ClaimSubmission): Promise<ClaimResult>;
  checkStatus(claimId: string): Promise<ClaimStatus>;
  downloadRemittance(remittanceId: string): Promise<Remittance>;
}
