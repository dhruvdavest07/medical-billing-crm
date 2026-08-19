import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${derivedKey}`;
}

export function verifyPasswordHash(
  passwordHash: string | null,
  candidatePassword: string,
) {
  if (!passwordHash) {
    return false;
  }

  const [prefix, salt, storedKey] = passwordHash.split("$");
  if (prefix !== SCRYPT_PREFIX || !salt || !storedKey) {
    return false;
  }

  const candidateKey = scryptSync(candidatePassword, salt, KEY_LENGTH);
  const storedKeyBuffer = Buffer.from(storedKey, "hex");

  if (candidateKey.length !== storedKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateKey, storedKeyBuffer);
}
