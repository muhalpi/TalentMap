import { createHash, randomBytes } from "node:crypto";

export function generateParticipantToken() {
  return `tm_${randomBytes(24).toString("base64url")}`;
}

export function hashParticipantToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
