ALTER TABLE "Patient"
ADD COLUMN "sensitiveDataEncrypted" TEXT;

ALTER TABLE "EmergencyContact"
ADD COLUMN "contactDataEncrypted" TEXT;
