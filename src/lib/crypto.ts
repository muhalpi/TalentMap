import { createHash, randomBytes } from "node:crypto";

const PARTICIPANT_ACCESS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateParticipantToken() {
  return `tm_${randomBytes(24).toString("base64url")}`;
}

export function hashParticipantToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function normalizeParticipantAccessCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function generateParticipantAccessCode() {
  const entropy = randomBytes(16);
  const characters = Array.from(
    entropy,
    (byte) => PARTICIPANT_ACCESS_ALPHABET[byte % PARTICIPANT_ACCESS_ALPHABET.length],
  ).join("");
  const groups = characters.match(/.{1,4}/g)?.join("-") ?? characters;

  return `TM-${groups}`;
}

export function hashParticipantAccessCode(code: string) {
  return hashParticipantToken(normalizeParticipantAccessCode(code));
}

export function participantCredentialHashes(value: string) {
  const hashes = new Set([
    hashParticipantAccessCode(value),
    hashParticipantToken(value),
  ]);

  return [...hashes];
}
