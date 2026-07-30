import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// AES-256-GCM. Stored format is base64(iv | authTag | ciphertext) so a single
// string column round-trips without extra bookkeeping.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, the GCM standard
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`."
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes, got ${key.length}. Generate one with \`openssl rand -base64 32\`.`
    );
  }

  cachedKey = key;
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64"
  );
}

export function decrypt(payload: string): string {
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted payload is malformed.");
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Nullable variants, since ConnectedAccount token columns are optional. */
export function encryptNullable(value: string | null | undefined) {
  return value ? encrypt(value) : null;
}

export function decryptNullable(value: string | null | undefined) {
  return value ? decrypt(value) : null;
}

/** Constant-time compare for OAuth `state` values. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
