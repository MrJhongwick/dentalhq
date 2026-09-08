import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const operators = pgTable("operator", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  createdAt: created(),
});
export const clinics = pgTable("clinic", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("America/New_York"),
  bookingEnabled: boolean("booking_enabled").notNull().default(false),
  createdAt: created(),
});
export const memberRole = pgEnum("member_role", ["owner", "manager", "staff"]);
export const memberships = pgTable(
  "membership",
  {
    clinicId: text("clinic_id")
      .notNull()
      .references(() => clinics.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    role: memberRole("role").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.clinicId, t.userId] }),
    index("membership_user_idx").on(t.userId),
  ],
);
export const audits = pgTable(
  "audit",
  {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id").references(() => clinics.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    createdAt: created(),
  },
  (t) => [index("audit_clinic_idx").on(t.clinicId, t.createdAt)],
);
export const supportGrants = pgTable(
  "support_grant",
  {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id")
      .notNull()
      .references(() => clinics.id),
    operatorId: text("operator_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [index("support_scope_idx").on(t.clinicId, t.operatorId)],
);
