import { connectDatabase } from "@dentalhq/db";
import { databaseConnection } from "./database-config";
const url = new URL(
  databaseConnection(process.env.DATABASE_URL_UNPOOLED, false),
);
url.searchParams.set("sslmode", "verify-full");
const database = connectDatabase(url.toString());
try {
  await database.migrate();
  console.log("Database migrations applied.");
} catch {
  console.error(
    "Migration failed. Verify the development database configuration.",
  );
  process.exitCode = 1;
} finally {
  await database.close();
}
