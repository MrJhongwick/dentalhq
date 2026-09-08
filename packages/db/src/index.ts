import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as embeddedDrizzle } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migrateEmbedded } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";
export { schema };
export { and, eq, desc, gt, isNull, sql } from "drizzle-orm";
export type Database = ReturnType<typeof embeddedDrizzle<typeof schema>>;
const migrationsFolder = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

export function connectDatabase(connectionString: string) {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Invalid database connection configuration.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Invalid database connection configuration.");
  url.searchParams.set("sslmode", "verify-full");
  const pool = new pg.Pool({
    connectionString: url.toString(),
    max: 5,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 15_000,
    enableChannelBinding: true,
  });
  const db = drizzle(pool, { schema });
  return {
    db: db as unknown as Database,
    migrate: () => migratePg(db, { migrationsFolder }),
    close: () => pool.end(),
  };
}

export async function createTestDatabase() {
  const client = new PGlite();
  const db = embeddedDrizzle(client, { schema });
  await migrateEmbedded(db, { migrationsFolder });
  return {
    db,
    migrate: () => migrateEmbedded(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
