/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");

const envPath = ".env.local";

if (!fs.existsSync(envPath)) {
  throw new Error(".env.local not found");
}

let content = fs.readFileSync(envPath, "utf8");

if (/^\s*AUTH_SECRET\s*=/m.test(content)) {
  console.log("AUTH_SECRET present");
  process.exit(0);
}

if (!content.endsWith("\n")) {
  content += "\n";
}

content += `AUTH_SECRET="${crypto.randomBytes(32).toString("base64url")}"\n`;
fs.writeFileSync(envPath, content);
console.log("AUTH_SECRET added");
