import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before database access.");
  }

  return drizzle(neon(databaseUrl), { schema });
}

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!db) {
    db = createDb();
  }

  return db;
}
