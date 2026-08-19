import {
  decryptJsonStrict,
  encryptJsonStrict,
  isEncryptionEnabled,
} from "@/lib/crypto";

export class SensitiveDataUnavailableError extends Error {
  constructor(field: string) {
    super(`Sensitive ${field} data could not be decrypted`);
    this.name = "SensitiveDataUnavailableError";
  }
}

type SensitivePatientFields = {
  dateOfBirth?: string | null;
  phoneSecondary?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  familyHistory?: string | null;
};

type SensitiveEmergencyContactFields = {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
  email?: string | null;
};

type PatientRecord = {
  dateOfBirth: Date | null;
  phoneSecondary: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  familyHistory?: string | null;
  sensitiveDataEncrypted?: string | null;
};

type EmergencyContactRecord = {
  name: string;
  phone: string;
  relationship: string | null;
  email?: string | null;
  contactDataEncrypted?: string | null;
};

function decryptPatientFields(record: Pick<PatientRecord, "sensitiveDataEncrypted">) {
  return decryptJsonStrict<SensitivePatientFields>(record.sensitiveDataEncrypted);
}

function decryptEmergencyContactFields(
  record: Pick<EmergencyContactRecord, "contactDataEncrypted">,
) {
  return decryptJsonStrict<SensitiveEmergencyContactFields>(
    record.contactDataEncrypted,
  );
}

export function buildEncryptedPatientFields(fields: SensitivePatientFields) {
  if (!isEncryptionEnabled()) {
    return {
      dateOfBirth: fields.dateOfBirth ? new Date(fields.dateOfBirth) : null,
      phoneSecondary: fields.phoneSecondary ?? null,
      address: fields.address ?? null,
      city: fields.city ?? null,
      state: fields.state ?? null,
      zip: fields.zip ?? null,
      country: fields.country ?? null,
      familyHistory: fields.familyHistory ?? null,
      sensitiveDataEncrypted: null,
    };
  }

  return {
    dateOfBirth: null,
    phoneSecondary: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    country: null,
    familyHistory: null,
    sensitiveDataEncrypted: encryptJsonStrict(fields),
  };
}

export function buildEncryptedEmergencyContactFields(
  fields: SensitiveEmergencyContactFields,
) {
  if (!isEncryptionEnabled()) {
    return {
      name: fields.name ?? "Unknown",
      phone: fields.phone ?? "",
      relationship: fields.relationship ?? null,
      email: fields.email ?? null,
      contactDataEncrypted: null,
    };
  }

  return {
    name: "[Encrypted]",
    phone: "",
    relationship: null,
    email: null,
    contactDataEncrypted: encryptJsonStrict(fields),
  };
}

export function readPatientSensitiveFields(record: PatientRecord) {
  const encrypted = decryptPatientFields(record);

  return {
    dateOfBirth: encrypted?.dateOfBirth
      ? new Date(encrypted.dateOfBirth)
      : record.dateOfBirth,
    phoneSecondary: encrypted?.phoneSecondary ?? record.phoneSecondary,
    address: encrypted?.address ?? record.address,
    city: encrypted?.city ?? record.city,
    state: encrypted?.state ?? record.state,
    zip: encrypted?.zip ?? record.zip,
    country: encrypted?.country ?? record.country,
    familyHistory: encrypted?.familyHistory ?? record.familyHistory ?? null,
  };
}

export function readEmergencyContactFields(record: EmergencyContactRecord) {
  const encrypted = decryptEmergencyContactFields(record);

  return {
    name: encrypted?.name ?? record.name,
    phone: encrypted?.phone ?? record.phone,
    relationship: encrypted?.relationship ?? record.relationship,
    email: encrypted?.email ?? record.email ?? null,
  };
}
