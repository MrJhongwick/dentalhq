import { connectDatabase, schema } from "@dentalhq/db";
import { provisionUser } from "../src/provision";
import { databaseConnection } from "./database-config";
const url = new URL(databaseConnection(process.env.DATABASE_URL, true));
url.searchParams.set("sslmode", "verify-full");
const database = connectDatabase(url.toString());
try {
  const existing = await database.db.select().from(schema.operators).limit(1);
  if (existing.length) throw new Error("An operator already exists.");
  await provisionUser(database.db, {
    name: process.env.BOOTSTRAP_NAME,
    email: process.env.BOOTSTRAP_EMAIL,
    password: process.env.BOOTSTRAP_PASSWORD,
  });
  console.log(
    "Initial operator created. Remove BOOTSTRAP_PASSWORD from local configuration.",
  );
} catch {
  console.error(
    "Bootstrap refused or failed. Check configuration and whether an operator already exists.",
  );
  process.exitCode = 1;
} finally {
  await database.close();
}
