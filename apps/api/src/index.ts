import { connectDatabase, createTestDatabase } from "@dentalhq/db";
import { createAuth } from "./auth";
import { createApp } from "./app";
import { seedDevelopment } from "./seed";

const secret = process.env.BETTER_AUTH_SECRET ?? "";
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3003";
const origins = (
  process.env.TRUSTED_ORIGINS ?? "http://localhost:3001,http://localhost:3002"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const demo = process.env.DENTALHQ_DEMO === "1";
if (demo && process.env.NODE_ENV === "production")
  throw new Error("Synthetic demo mode cannot run in production.");
if (!demo && !process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL or use the synthetic demo command.");
if (secret.length < 32)
  throw new Error(
    "Configure BETTER_AUTH_SECRET with at least 32 random characters.",
  );
export const database = demo
  ? await createTestDatabase()
  : connectDatabase(process.env.DATABASE_URL!);
const auth = createAuth(database.db, secret, baseURL, origins);
if (demo)
  await seedDevelopment(database.db, process.env.DEVELOPMENT_PASSWORD ?? "");
export default createApp(database.db, auth, origins);
