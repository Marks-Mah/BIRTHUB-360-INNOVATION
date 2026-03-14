import { createHmac, randomBytes } from "node:crypto";

import { decryptSensitiveValue, encryptSensitiveValue, randomToken, sha256 } from "./crypto.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;

function toBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function fromBase32(secret: string): Buffer {
  const normalized = secret.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number, digits = 6): string {
  const key = fromBase32(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest.readUInt8(digest.length - 1) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  const otp = binary % 10 ** digits;

  return otp.toString().padStart(digits, "0");
}

export function generateTotpSecret(): string {
  return toBase32(randomBytes(20));
}

export function buildOtpauthUrl(input: {
  accountName: string;
  issuer: string;
  secret: string;
}): string {
  const issuer = encodeURIComponent(input.issuer);
  const accountName = encodeURIComponent(input.accountName);
  const secret = encodeURIComponent(input.secret);

  return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=${TOTP_PERIOD_SECONDS}`;
}

export function buildQrCodeDataUrl(otpauthUrl: string): string {
  // The setup flow consumes a base64 payload and renders it as an image preview in the UI.
  return `data:text/plain;base64,${Buffer.from(otpauthUrl, "utf8").toString("base64")}`;
}

export function verifyTotpCode(input: {
  code: string;
  clockSkewWindows: number;
  now?: Date;
  secret: string;
}): boolean {
  if (!/^\d{6}$/.test(input.code)) {
    return false;
  }

  const now = input.now ?? new Date();
  const currentCounter = Math.floor(now.getTime() / 1000 / TOTP_PERIOD_SECONDS);

  for (let offset = -input.clockSkewWindows; offset <= input.clockSkewWindows; offset += 1) {
    const candidate = hotp(input.secret, currentCounter + offset, 6);

    if (candidate === input.code) {
      return true;
    }
  }

  return false;
}

export function generateCurrentTotp(secret: string, now: Date = new Date()): string {
  const counter = Math.floor(now.getTime() / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(secret, counter, 6);
}

export function encryptTotpSecret(secret: string, encryptionKey: string): string {
  return encryptSensitiveValue(secret, encryptionKey);
}

export function decryptTotpSecret(secret: string, encryptionKey: string): string {
  return decryptSensitiveValue(secret, encryptionKey);
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => randomToken(6).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
}

export function hashRecoveryCode(code: string): string {
  return sha256(`recovery:${code}`);
}
