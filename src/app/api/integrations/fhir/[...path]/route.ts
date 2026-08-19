import { NextResponse } from "next/server";
import { requireOrgContext, isAuthContextError } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { logServerError } from "@/lib/safe-logger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const FHIR_ID_PATTERN = /^[A-Za-z0-9.-]{1,64}$/;
const PATIENT_REFERENCE_PATTERN = /^Patient\/([A-Za-z0-9.-]{1,64})$/;

function getPatientReferenceId(value: string) {
  return PATIENT_REFERENCE_PATTERN.exec(value)?.[1] ?? null;
}

const ALLOWED_FHIR_COLLECTIONS = {
  AllergyIntolerance: ["patient", "_count"],
  Appointment: ["patient", "date", "status", "_count"],
  Condition: ["patient", "clinical-status", "_count"],
  DiagnosticReport: ["patient", "category", "status", "_count"],
  Encounter: ["patient", "_count"],
  MedicationRequest: ["patient", "status", "_count"],
  Observation: ["subject", "code", "date", "_count"],
} as const;

function getFhirBaseUrl() {
  return process.env.FHIR_BASE_URL?.replace(/\/+$/, "") ?? "";
}

function buildFhirUrl(pathSegments: string[], requestUrl: string) {
  const upstream = new URL(`${getFhirBaseUrl()}/${pathSegments.join("/")}`);
  const incomingUrl = new URL(requestUrl);

  incomingUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });

  return upstream.toString();
}

function isValidPatientReference(value: string) {
  return getPatientReferenceId(value) !== null;
}

function validateFhirPath(path: string[], requestUrl: string) {
  const [resourceType, resourceId, ...rest] = path;

  if (!resourceType) {
    return { error: "FHIR path is required", status: 400 };
  }

  if (resourceType === "Patient") {
    if (!resourceId || rest.length > 0 || !FHIR_ID_PATTERN.test(resourceId)) {
      return {
        error: "Only direct Patient/{id} reads are allowed",
        status: 403,
      };
    }

    const incomingUrl = new URL(requestUrl);
    if (Array.from(incomingUrl.searchParams.keys()).length > 0) {
      return {
        error: "Patient reads do not allow arbitrary query params",
        status: 403,
      };
    }

    return null;
  }

  const allowedParams = ALLOWED_FHIR_COLLECTIONS[
    resourceType as keyof typeof ALLOWED_FHIR_COLLECTIONS
  ];

  if (!allowedParams || resourceId || rest.length > 0) {
    return {
      error: "FHIR path is outside the allowed read-only proxy scope",
      status: 403,
    };
  }

  const incomingUrl = new URL(requestUrl);
  const params = Array.from(incomingUrl.searchParams.entries());

  for (const [key, value] of params) {
    if (!allowedParams.includes(key as never)) {
      return {
        error: `FHIR query parameter '${key}' is not allowed for ${resourceType}`,
        status: 403,
      };
    }

    if (
      (key === "patient" || key === "subject") &&
      !isValidPatientReference(value)
    ) {
      return {
        error: `FHIR query parameter '${key}' must be a Patient/<id> reference`,
        status: 400,
      };
    }
  }

  const hasPatientScope = params.some(
    ([key]) => key === "patient" || key === "subject",
  );

  if (!hasPatientScope) {
    return {
      error: `${resourceType} reads must be explicitly scoped to a patient reference`,
      status: 403,
    };
  }

  return null;
}

function getReferencedPatientIds(path: string[], requestUrl: string) {
  const [resourceType, resourceId] = path;

  if (resourceType === "Patient" && resourceId) {
    return [resourceId];
  }

  const incomingUrl = new URL(requestUrl);
  const ids = new Set<string>();

  for (const key of ["patient", "subject"] as const) {
    for (const value of incomingUrl.searchParams.getAll(key)) {
      const id = getPatientReferenceId(value);
      if (id) {
        ids.add(id);
      }
    }
  }

  return Array.from(ids);
}

async function ensurePatientsBelongToOrganization(
  patientIds: string[],
  organizationId: string,
) {
  if (patientIds.length === 0) {
    return null;
  }

  const patients = await prisma.patient.findMany({
    where: {
      id: { in: patientIds },
      organizationId,
    },
    select: { id: true },
  });

  if (patients.length !== patientIds.length) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { userId, organizationId } = await requireOrgContext();
    const canReadPatients = await hasPermission(
      userId,
      organizationId,
      "patients:read",
      "patients",
    );

    if (!canReadPatients) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baseUrl = getFhirBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { error: "FHIR integration is not configured" },
        { status: 501 },
      );
    }

    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: "FHIR path is required" }, { status: 400 });
    }

    const validationError = validateFhirPath(path, request.url);
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status },
      );
    }

    const patientAccessError = await ensurePatientsBelongToOrganization(
      getReferencedPatientIds(path, request.url),
      organizationId,
    );
    if (patientAccessError) {
      return patientAccessError;
    }

    const response = await fetch(buildFhirUrl(path, request.url), {
      headers: {
        Accept: "application/fhir+json, application/json",
        ...(process.env.FHIR_AUTH_TOKEN
          ? { Authorization: `Bearer ${process.env.FHIR_AUTH_TOKEN}` }
          : {}),
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "application/json";
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logServerError("FHIR proxy request failed", error);
    return NextResponse.json(
      { error: "Failed to reach FHIR upstream" },
      { status: 502 },
    );
  }
}
