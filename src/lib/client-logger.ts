"use client";

const CLIENT_REDACTIONS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[REDACTED_PHONE]"],
  [/\b(?:mrn|medical record number)\s*[:=]\s*[A-Za-z0-9-]+\b/gi, "mrn=[REDACTED]"],
];

function sanitizeMessage(message: string) {
  return CLIENT_REDACTIONS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    message,
  );
}

export function getClientErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return sanitizeMessage(error.message);
  }

  return fallback;
}

export function logClientError(context: string, error?: unknown) {
  const payload: Record<string, unknown> = {
    context,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof Error) {
    payload.error = {
      name: error.name,
      message: sanitizeMessage(error.message),
    };
  } else if (typeof error === "string") {
    payload.error = sanitizeMessage(error);
  }

  console.error(JSON.stringify(payload));
}
