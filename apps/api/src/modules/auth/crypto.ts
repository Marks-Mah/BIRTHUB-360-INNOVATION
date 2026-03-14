import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_BYTES = 64;

type OptionalBcryptModule = {
  compare: (password: string, hashed: string) => Promise<boolean>;
  genSalt: (rounds: number) => Promise<string>;
  hash: (password: string, salt: string) => Promise<string>;
};

let bcryptModulePromise: Promise<OptionalBcryptModule | null> | null = null;
const importOptionalModule = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<unknown>;

async function loadOptionalBcryptModule(): Promise<OptionalBcryptModule | null> {
  if (!bcryptModulePromise) {
    bcryptModulePromise = importOptionalModule("bcryptjs")
      .then((module) => ({
        compare: (module as OptionalBcryptModule).compare,
        genSalt: (module as OptionalBcryptModule).genSalt,
        hash: (module as OptionalBcryptModule).hash
      }))
      .catch(() => null);
  }

  return bcryptModulePromise;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function isBcryptHash(value: string): boolean {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

function bcryptCost(value: string): number | null {
  if (!isBcryptHash(value)) {
    return null;
  }

  const [, , cost] = value.split("$");
  const parsed = Number(cost);
  return Number.isFinite(parsed) ? parsed : null;
}

function isScryptHash(value: string): boolean {
  return value.startsWith("scrypt$");
}

async function hashWithScrypt(password: string, cost: number): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_BYTES)) as Buffer;

  return `scrypt$${cost}$${salt}$${derivedKey.toString("base64url")}`;
}

async function verifyScryptHash(password: string, storedHash: string): Promise<boolean> {
  const [, , salt, expectedHash] = storedHash.split("$");

  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_BYTES)) as Buffer;
  const actualHash = Buffer.from(derivedKey);
  const expectedBuffer = Buffer.from(expectedHash, "base64url");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

function scryptCost(value: string): number | null {
  if (!isScryptHash(value)) {
    return null;
  }

  const [, cost] = value.split("$");
  const parsed = Number(cost);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function hashPassword(password: string, saltRounds: number): Promise<string> {
  const bcrypt = await loadOptionalBcryptModule();

  if (bcrypt) {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  }

  return hashWithScrypt(password, saltRounds);
}

export async function verifyPasswordHash(
  password: string,
  storedHash: string,
  minimumSaltRounds: number
): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (isBcryptHash(storedHash)) {
    const bcrypt = await loadOptionalBcryptModule();

    if (!bcrypt) {
      return {
        isValid: false,
        needsRehash: false
      };
    }

    const isValid = await bcrypt.compare(password, storedHash);
    const currentCost = bcryptCost(storedHash);

    return {
      isValid,
      needsRehash: isValid && currentCost !== null && currentCost < minimumSaltRounds
    };
  }

  if (isScryptHash(storedHash)) {
    const isValid = await verifyScryptHash(password, storedHash);
    const currentCost = scryptCost(storedHash);

    return {
      isValid,
      needsRehash: isValid && currentCost !== null && currentCost < minimumSaltRounds
    };
  }

  return {
    isValid: sha256(password) === storedHash,
    needsRehash: sha256(password) === storedHash
  };
}

export function randomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function createAccessToken(): string {
  return `atk_${randomToken(32)}`;
}

export function createRefreshToken(): string {
  return `rtk_${randomToken(48)}`;
}

export function createApiKey(prefix: string): {
  hash: string;
  key: string;
  last4: string;
  prefix: string;
} {
  const material = randomToken(36);
  const key = `${prefix}_${material}`;
  return {
    hash: sha256(key),
    key,
    last4: key.slice(-4),
    prefix
  };
}

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptSensitiveValue(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSensitiveValue(payload: string, secret: string): string {
  const [ivPart, authTagPart, encryptedPart] = payload.split(".");

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error("Invalid encrypted payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyPayloadSignature(payload: string, secret: string, signature: string): boolean {
  return signPayload(payload, secret) === signature;
}
