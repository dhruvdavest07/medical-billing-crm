/**
 * Availity clearinghouse provider.
 * Uses the Availity REST API with OAuth2 client-credentials.
 * Set AVAILITY_CLIENT_ID, AVAILITY_CLIENT_SECRET, AVAILITY_BASE_URL in env.
 */
import type {
  ClaimResult, ClaimStatus, ClaimSubmission, ClaimSubmissionError,
  ClearinghouseProvider, Remittance,
} from "./index";

interface AvailityConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  scope: string;
  tokenRefreshMarginMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}

function readConfig(): AvailityConfig {
  const clientId = process.env.AVAILITY_CLIENT_ID;
  const clientSecret = process.env.AVAILITY_CLIENT_SECRET;
  const baseUrl = process.env.AVAILITY_BASE_URL || "https://api.availity.com";

  if (!clientId || !clientSecret) {
    throw new Error("AVAILITY_CLIENT_ID and AVAILITY_CLIENT_SECRET are required for AvailityProvider");
  }

  return {
    clientId, clientSecret, baseUrl,
    scope: "hipaa",
    tokenRefreshMarginMs: 60_000,
    maxRetries: 3,
    retryBackoffMs: 300,
  };
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

export class AvailityProvider implements ClearinghouseProvider {
  readonly name = "availity";
  private readonly config: AvailityConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config?: Partial<AvailityConfig>) {
    this.config = { ...readConfig(), ...config };
  }

  private async getAuthToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scope,
    });

    const res = await fetch(`${this.config.baseUrl}/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Availity auth failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - this.config.tokenRefreshMarginMs,
    };
    return data.access_token;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryBackoffMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  async submitClaim(claim: ClaimSubmission): Promise<ClaimResult> {
    const token = await this.getAuthToken();

    const payload = {
      claimNumber: claim.claimNumber,
      subscriber: {
        firstName: claim.patient.firstName,
        lastName: claim.patient.lastName,
        birthDate: claim.patient.dob,
        memberNumber: claim.patient.memberId,
      },
      provider: {
        npi: claim.facility.npi,
        taxId: claim.facility.taxId,
        name: claim.facility.name,
      },
      serviceStartDate: claim.serviceStartDate,
      serviceEndDate: claim.serviceEndDate,
      procedures: claim.procedures,
      totalCharge: claim.totalCharge,
      diagnosisCodes: claim.diagnosisCodes,
      payerId: claim.payerId,
    };

    return this.withRetry(async () => {
      const res = await fetch(`${this.config.baseUrl}/availity/claims/v1/claims`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errors: ClaimSubmissionError[] = [{
          code: res.status === 401 ? "AUTH_ERROR" : res.status === 429 ? "RATE_LIMITED" : "NETWORK_ERROR",
          message: `Availity submission failed: ${res.status} ${res.statusText}`,
        }];
        return { accepted: false, clearinghouseClaimId: "", errors, submittedAt: new Date().toISOString() };
      }

      const data = await res.json() as { id?: string; status?: string };
      return {
        accepted: true,
        clearinghouseClaimId: data.id || "",
        errors: [],
        submittedAt: new Date().toISOString(),
      };
    });
  }

  async checkStatus(claimId: string): Promise<ClaimStatus> {
    const token = await this.getAuthToken();

    return this.withRetry(async () => {
      const res = await fetch(`${this.config.baseUrl}/availity/intelligent-payer-network/v1/claim-statuses`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clearinghouseClaimId: claimId }),
      });

      if (!res.ok) {
        return { status: "pending" as const, payerResponse: `Status check failed: ${res.status}` };
      }

      const data = await res.json() as {
        status?: string;
        payerResponse?: string;
        amounts?: { paid?: number; patientResponsibility?: number };
        errors?: Array<{ reason?: string }>;
      };

      const statusMap: Record<string, ClaimStatus["status"]> = {
        PENDING: "pending",
        ACKNOWLEDGED: "accepted",
        PAID: "paid",
        DENIED: "denied",
        REJECTED: "rejected",
      };

      const status = statusMap[data.status || ""] || "pending";

      if (status === "paid" && data.amounts?.paid) {
        return { status, payerResponse: data.payerResponse, checkAmount: data.amounts.paid, checkDate: new Date().toISOString().slice(0, 10) };
      }
      if ((status === "denied" || status === "rejected") && data.errors?.[0]?.reason) {
        return { status, payerResponse: data.payerResponse, denialReason: data.errors[0].reason };
      }
      return { status, payerResponse: data.payerResponse };
    });
  }

  async downloadRemittance(remittanceId: string): Promise<Remittance> {
    const token = await this.getAuthToken();

    return this.withRetry(async () => {
      const res = await fetch(`${this.config.baseUrl}/availity/remittance/v1/remittances/${remittanceId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Availity remittance fetch failed: ${res.status}`);
      }

      const data = await res.json() as {
        id: string;
        claimIds?: string[];
        totalPaid?: number;
        checks?: Array<{ checkNumber: string; amount: number; date: string }>;
      };

      return {
        remittanceId: data.id || remittanceId,
        claimIds: data.claimIds || [],
        totalPaid: data.totalPaid || 0,
        checks: data.checks || [],
      };
    });
  }
}
