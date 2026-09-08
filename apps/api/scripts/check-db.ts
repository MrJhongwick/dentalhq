import pg from "pg";
import { databaseConnection } from "./database-config";

for (const [key, pooled] of [["DATABASE_URL", true], ["DATABASE_URL_UNPOOLED", false]] as const) {
  let client: pg.Client | undefined;
  try {
    const url = new URL(databaseConnection(process.env[key], pooled));
    // Require certificate and hostname verification across pg major versions.
    url.searchParams.set("sslmode", "verify-full");
    client = new pg.Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 15_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
      enableChannelBinding: true,
    });
    await client.connect();
    const result = await client.query("SELECT 1 AS ok");
    if (result.rows[0]?.ok !== 1) throw new Error("Unexpected probe result");
    console.log(`${key}: connection verified (SELECT 1).`);
  } catch {
    // Driver errors can contain connection details. Keep public output fixed.
    console.error(`${key}: verification failed. Check local credentials, TLS, pooling mode, and network access.`);
    process.exitCode = 1;
  } finally {
    await client?.end().catch(() => {});
  }
}
