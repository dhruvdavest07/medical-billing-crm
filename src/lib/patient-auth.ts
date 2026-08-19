import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPatientSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function createPatientSession(params: {
  patientId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresInMs?: number;
}) {
  const rawToken = createPatientSessionToken();
  const expiresAt = new Date(Date.now() + (params.expiresInMs ?? 24 * 60 * 60 * 1000));

  const session = await prisma.patientSession.create({
    data: {
      patientId: params.patientId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  return { sessionId: session.id, rawToken, expiresAt };
}

export async function getPatientSessionFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("patient_session="))
    ?.split("=")[1];
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const token = bearerToken || cookieToken || null;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  return prisma.patientSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      patient: true,
    },
  });
}

export async function revokePatientSessionFromRequest(request: Request) {
  const session = await getPatientSessionFromRequest(request);

  if (!session) {
    return null;
  }

  await prisma.patientSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return session;
}
