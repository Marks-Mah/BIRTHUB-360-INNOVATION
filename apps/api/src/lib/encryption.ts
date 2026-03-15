import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { getApiConfig } from "@birthub/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from the AUTH_MFA_ENCRYPTION_KEY or another
 * 32-byte secret configuration. For agent connectors, we reuse the
 * configured MFA encryption key or assume it is at least 32 bytes long
 * (we pad/slice to 32 bytes).
 */
function getEncryptionKey(): Buffer {
  const config = getApiConfig();
  const secret = config.AUTH_MFA_ENCRYPTION_KEY;

  // Use SHA-256 to securely derive a 32-byte key from any string length
  return createHash("sha256").update(secret).digest();
}

export function encryptConnectorToken(text: string): string {
  if (!text) return text;

  const iv = randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptConnectorToken(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encryptedHex] = parts;
    if (!ivHex || !authTagHex || !encryptedHex) return encryptedText;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getEncryptionKey();

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // Se a decriptação falhar, retornamos o texto original. Isso facilita a migração retroativa
    // de instâncias onde o token foi salvo em plain-text antes.
    return encryptedText;
  }
}

export function encryptConnectorsMap(connectors: Record<string, unknown>): Record<string, unknown> {
  if (!connectors) return connectors;

  const encrypted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(connectors)) {
    if (typeof value === "string") {
      encrypted[key] = encryptConnectorToken(value);
    } else if (typeof value === "object" && value !== null) {
      // Basic recursive encryption for nested connector objects like { hubspot: { token: '...' } }
      encrypted[key] = encryptConnectorsMap(value as Record<string, unknown>);
    } else {
      encrypted[key] = value;
    }
  }
  return encrypted;
}

export function decryptConnectorsMap(connectors: Record<string, unknown>): Record<string, unknown> {
  if (!connectors) return connectors;

  const decrypted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(connectors)) {
    if (typeof value === "string") {
      decrypted[key] = decryptConnectorToken(value);
    } else if (typeof value === "object" && value !== null) {
      decrypted[key] = decryptConnectorsMap(value as Record<string, unknown>);
    } else {
      decrypted[key] = value;
    }
  }
  return decrypted;
}
