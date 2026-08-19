const SENSITIVE_KEY_PATTERN =
  /pass(word)?|token|secret|auth|cookie|session|email|phone|address|name|firstName|lastName|dob|dateOfBirth|mrn|ssn|patient|body|headers?/i;

const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[REDACTED_PHONE]"],
  [/\bBearer\s+[A-Za-z0-9._-]+\b/gi, "Bearer [REDACTED_TOKEN]"],
  [/\b(?:mrn|medical record number)\s*[:=]\s*[A-Za-z0-9-]+\b/gi, "mrn=[REDACTED]"],
];

type SafeLogMetadata = Record<string, unknown>;

function redactString(value: string) {
  return REDACTION_PATTERNS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value,
  );
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    const sanitizedEntries: Array<[string, unknown]> = [];

    for (const [key, entryValue] of entries) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitizedEntries.push([key, "[REDACTED]"]);
        continue;
      }

      sanitizedEntries.push([key, sanitizeValue(entryValue)]);
    }

    return Object.fromEntries(sanitizedEntries);
  }

  return String(value);
}

function sanitizeError(error: Error | unknown) {
  if (!(error instanceof Error)) {
    return sanitizeValue(error);
  }

  const details: Record<string, unknown> = {
    name: error.name,
    message: redactString(error.message),
  };

  const maybeCode = (error as Error & { code?: unknown }).code;
  if (typeof maybeCode === "string" || typeof maybeCode === "number") {
    details.code = maybeCode;
  }

  const maybeStatus = (error as Error & { status?: unknown; statusCode?: unknown });
  if (typeof maybeStatus.status === "number") {
    details.status = maybeStatus.status;
  }
  if (typeof maybeStatus.statusCode === "number") {
    details.statusCode = maybeStatus.statusCode;
  }

  return details;
}

export function logServerError(
  context: string,
  error?: unknown,
  metadata?: SafeLogMetadata,
) {
  const payload: Record<string, unknown> = {
    context,
    timestamp: new Date().toISOString(),
  };

  if (error !== undefined) {
    payload.error = sanitizeValue(error);
  }

  if (metadata) {
    payload.metadata = sanitizeValue(metadata);
  }

  console.error(JSON.stringify(payload));
}

