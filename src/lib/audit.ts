import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";
type AuditDbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateAuditParams {
  organizationId: string;
  userId?: string | null;
  actorType?: "user" | "patient" | "system" | "webhook";
  actorIdentifier?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState?: string;
  afterState?: string;
  ipAddress?: string;
  userAgent?: string;
  db?: AuditDbClient;
}

/**
 * Append-only audit log. Every Create, Update, Delete must call this.
 */
export async function createAuditLog(params: CreateAuditParams) {
  const db = params.db ?? prisma;

  return db.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      actorType: params.actorType ?? (params.userId ? "user" : "system"),
      actorIdentifier: params.actorIdentifier ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState ?? null,
      afterState: params.afterState ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
