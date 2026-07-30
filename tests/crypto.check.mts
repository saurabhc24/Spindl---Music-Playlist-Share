import "dotenv/config";
import { randomBytes, createDecipheriv } from "node:crypto";

// Exercises the real lib/crypto.ts. Run with:
//   npx tsx --conditions=react-server tests/crypto.check.mts
process.env.TOKEN_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");

const { encrypt, decrypt, encryptNullable, decryptNullable, safeEqual } =
  await import("../lib/crypto");

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}: ${(error as Error).message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function expectThrow(fn: () => unknown, message: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

check("round-trips a realistic refresh token", () => {
  const token = `AQD${"x".repeat(120)}_-9`;
  assert(decrypt(encrypt(token)) === token, "mismatch");
});

check("round-trips unicode and single characters", () => {
  assert(decrypt(encrypt("héllo wörld 🎵")) === "héllo wörld 🎵", "unicode mismatch");
  assert(decrypt(encrypt("a")) === "a", "single char mismatch");
});

check("uses a fresh IV per call", () => {
  const a = encrypt("same-token");
  const b = encrypt("same-token");
  assert(a !== b, "ciphertext repeated -- IV is not random");
  assert(decrypt(a) === decrypt(b), "both should decrypt to the same value");
});

check("rejects a tampered ciphertext body", () => {
  const buffer = Buffer.from(encrypt("sensitive"), "base64");
  buffer[buffer.length - 1] ^= 0xff;
  expectThrow(() => decrypt(buffer.toString("base64")), "tampered payload decrypted");
});

check("rejects a tampered auth tag", () => {
  const buffer = Buffer.from(encrypt("sensitive"), "base64");
  buffer[12] ^= 0xff;
  expectThrow(() => decrypt(buffer.toString("base64")), "bad auth tag accepted");
});

check("rejects a truncated payload", () => {
  expectThrow(
    () => decrypt(Buffer.from("short").toString("base64")),
    "truncated payload accepted"
  );
});

check("cannot be decrypted with a different key", () => {
  const buffer = Buffer.from(encrypt("secret"), "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    randomBytes(32),
    buffer.subarray(0, 12)
  );
  decipher.setAuthTag(buffer.subarray(12, 28));
  expectThrow(
    () => Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]),
    "wrong key decrypted successfully"
  );
});

check("nullable helpers pass null through", () => {
  assert(encryptNullable(null) === null, "encryptNullable(null) should be null");
  assert(encryptNullable(undefined) === null, "encryptNullable(undefined) should be null");
  assert(decryptNullable(null) === null, "decryptNullable(null) should be null");
  const value = encryptNullable("token");
  assert(value !== null && decryptNullable(value) === "token", "nullable round-trip failed");
});

check("safeEqual compares correctly", () => {
  assert(safeEqual("abc123", "abc123"), "equal strings should match");
  assert(!safeEqual("abc123", "abc124"), "different strings should not match");
  assert(!safeEqual("abc", "abcdef"), "different lengths should not match");
});

console.log(
  failures === 0 ? "\nAll crypto checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
