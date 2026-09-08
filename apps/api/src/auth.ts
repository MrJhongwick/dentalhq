import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { schema, type Database } from "@dentalhq/db";

export function createAuth(
  db: Database,
  secret: string,
  baseURL: string,
  origins: string[],
) {
  if (secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  return betterAuth({
    appName: "DentalHQ",
    baseURL,
    secret,
    trustedOrigins: origins,
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    session: { expiresIn: 60 * 60 * 8, cookieCache: { enabled: false } },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: { "/sign-in/email": { window: 60, max: 10 } },
    },
    logger: { disabled: true },
  });
}
export type Auth = ReturnType<typeof createAuth>;
