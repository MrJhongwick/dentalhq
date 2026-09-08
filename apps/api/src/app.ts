import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { schema, eq, and, desc, gt, isNull, type Database } from "@dentalhq/db";
import {
  clinicInputSchema,
  settingsSchema,
  memberInputSchema,
  removeMemberSchema,
  supportInputSchema,
  supportGrantSchema,
  identitySchema,
  clinicSchema,
  clinicListSchema,
  auditListSchema,
  userInputSchema,
} from "@dentalhq/contracts";
import type { Auth } from "./auth";
import { provisionUser } from "./provision";

type Variables = {
  actor: { id: string; email: string; name: string };
  operator: boolean;
  requestId: string;
};
function isUniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "23505") return true;
  return (
    "cause" in error && error.cause !== error && isUniqueConflict(error.cause)
  );
}
export function createApp(db: Database, auth: Auth, origins: string[]) {
  const app = new Hono<{ Variables: Variables }>();
  app.use("*", async (c, next) => {
    c.set("requestId", randomUUID());
    c.header("X-Request-Id", c.get("requestId"));
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    await next();
  });
  app.onError((error, c) => {
    const status = error instanceof HTTPException ? error.status : 500;
    // Request identifiers and status are sufficient to correlate failures without logging PHI or secrets.
    console.error(
      JSON.stringify({
        requestId: c.get("requestId"),
        status,
        event: "request.failed",
      }),
    );
    return c.json(
      {
        error:
          status === 500
            ? "Request failed. Try again or contact support."
            : error.message,
        requestId: c.get("requestId"),
      },
      status,
    );
  });
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 16_384,
      onError: () => {
        throw new HTTPException(413, { message: "Request body is too large." });
      },
    }),
  );
  app.use("/api/*", async (c, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
      !origins.includes(c.req.header("origin") ?? "")
    )
      throw new HTTPException(403, { message: "Untrusted request origin." });
    await next();
  });
  app.get("/", (c) => c.text("This is api"));
  // Keep account creation and all unreviewed authentication endpoints off the public surface.
  app.on(["GET", "POST"], "/api/auth/*", (c) => {
    const endpoint = c.req.path.slice("/api/auth/".length);
    if (!(
      (c.req.method === "POST" &&
        ["sign-in/email", "sign-out"].includes(endpoint)) ||
      (c.req.method === "GET" && endpoint === "get-session")
    ))
      throw new HTTPException(404, { message: "Not found." });
    return auth.handler(c.req.raw);
  });
  app.use("/api/*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session)
      throw new HTTPException(401, { message: "Sign in to continue." });
    c.set("actor", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    const [operator] = await db
      .select()
      .from(schema.operators)
      .where(eq(schema.operators.userId, session.user.id));
    c.set("operator", Boolean(operator));
    await next();
  });
  app.get("/api/me", async (c) => {
    const memberships = await db
      .select({ clinic: schema.clinics, role: schema.memberships.role })
      .from(schema.memberships)
      .innerJoin(
        schema.clinics,
        eq(schema.memberships.clinicId, schema.clinics.id),
      )
      .where(eq(schema.memberships.userId, c.get("actor").id));
    return c.json(
      identitySchema.parse({
        user: c.get("actor"),
        operator: c.get("operator"),
        clinics: memberships.map((m) => ({ ...m.clinic, role: m.role })),
      }),
    );
  });
  app.use("/api/operator/*", async (c, next) => {
    if (!c.get("operator"))
      throw new HTTPException(403, { message: "Operator access required." });
    await next();
  });
  app.post("/api/operator/users", async (c) => {
    const input = await c.req.json().catch(() => {
      throw new HTTPException(400, { message: "Invalid JSON." });
    });
    const parsed = userInputSchema.safeParse(input);
    if (!parsed.success)
      throw new HTTPException(400, {
        message:
          "Enter a name, valid email, and password of 12–128 characters.",
      });
    // Provisioning failures deliberately do not reveal SQL or credentials.
    try {
      return c.json(
        await provisionUser(db, parsed.data, c.get("actor").id),
        201,
      );
    } catch (error) {
      if (isUniqueConflict(error))
        throw new HTTPException(409, {
          message: "Use an unused email address.",
        });
      throw error;
    }
  });
  app.get("/api/operator/clinics", async (c) =>
    c.json(
      clinicListSchema.parse(
        await db
          .select()
          .from(schema.clinics)
          .orderBy(schema.clinics.name)
          .limit(100),
      ),
    ),
  );
  app.post("/api/operator/clinics", async (c) => {
    const input = clinicInputSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success)
      throw new HTTPException(400, {
        message: "Enter a clinic name, URL slug, and existing owner's email.",
      });
    const [owner] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, input.data.ownerEmail));
    if (!owner)
      throw new HTTPException(400, {
        message: "Provision the owner's account first.",
      });
    const id = randomUUID();
    const actorId = c.get("actor").id;
    try {
      const clinic = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.clinics)
          .values({ id, name: input.data.name, slug: input.data.slug })
          .returning();
        await tx
          .insert(schema.memberships)
          .values({ clinicId: id, userId: owner.id, role: "owner" });
        await tx.insert(schema.audits).values({
          id: randomUUID(),
          clinicId: id,
          actorId,
          action: "clinic.created",
          targetId: id,
        });
        return row;
      });
      return c.json(clinicSchema.parse(clinic), 201);
    } catch (error) {
      if (isUniqueConflict(error))
        throw new HTTPException(409, {
          message:
            "Clinic could not be created. Check that its slug is unique.",
        });
      throw error;
    }
  });
  app.post("/api/operator/clinics/:clinicId/support", async (c) => {
    const input = supportInputSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success)
      throw new HTTPException(400, {
        message: "Enter a support reason of 10–300 characters.",
      });
    const clinicId = c.req.param("clinicId");
    const [clinic] = await db
      .select()
      .from(schema.clinics)
      .where(eq(schema.clinics.id, clinicId));
    if (!clinic) throw new HTTPException(404, { message: "Clinic not found." });
    const id = randomUUID();
    const operatorId = c.get("actor").id;
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await db.transaction(async (tx) => {
      await tx.insert(schema.supportGrants).values({
        id,
        clinicId,
        operatorId,
        expiresAt,
        reason: input.data.reason,
      });
      await tx.insert(schema.audits).values({
        id: randomUUID(),
        clinicId,
        actorId: operatorId,
        action: "support.started",
        targetId: id,
        reason: input.data.reason,
      });
    });
    return c.json(
      supportGrantSchema.parse({ id, expiresAt: expiresAt.toISOString() }),
      201,
    );
  });
  app.delete("/api/operator/clinics/:clinicId/support", async (c) => {
    const clinicId = c.req.param("clinicId"),
      actorId = c.get("actor").id;
    await db.transaction(async (tx) => {
      await tx
        .update(schema.supportGrants)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.supportGrants.clinicId, clinicId),
            eq(schema.supportGrants.operatorId, actorId),
            isNull(schema.supportGrants.revokedAt),
          ),
        );
      await tx.insert(schema.audits).values({
        id: randomUUID(),
        clinicId,
        actorId,
        action: "support.ended",
        targetId: clinicId,
      });
    });
    return c.json({ ok: true });
  });
  async function access(
    clinicId: string,
    actorId: string,
    operator: boolean,
    permission: "read" | "settings" | "members",
  ) {
    const [member] = await db
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.clinicId, clinicId),
          eq(schema.memberships.userId, actorId),
        ),
      );
    if (
      member &&
      (permission === "read" ||
        (permission === "settings" && member.role !== "staff") ||
        (permission === "members" && member.role === "owner"))
    )
      return;
    if (permission === "read" && operator) {
      const [grant] = await db
        .select()
        .from(schema.supportGrants)
        .where(
          and(
            eq(schema.supportGrants.clinicId, clinicId),
            eq(schema.supportGrants.operatorId, actorId),
            gt(schema.supportGrants.expiresAt, new Date()),
            isNull(schema.supportGrants.revokedAt),
          ),
        )
        .limit(1);
      if (grant) {
        await db.insert(schema.audits).values({
          id: randomUUID(),
          clinicId,
          actorId,
          action: "support.read",
          targetId: clinicId,
          reason: grant.reason,
        });
        return;
      }
    }
    throw new HTTPException(403, {
      message: "You do not have permission for this clinic action.",
    });
  }
  app.get("/api/clinics/:clinicId", async (c) => {
    const id = c.req.param("clinicId");
    await access(id, c.get("actor").id, c.get("operator"), "read");
    const [clinic] = await db
      .select()
      .from(schema.clinics)
      .where(eq(schema.clinics.id, id));
    if (!clinic) throw new HTTPException(404, { message: "Clinic not found." });
    return c.json(clinicSchema.parse(clinic));
  });
  app.patch("/api/clinics/:clinicId", async (c) => {
    const clinicId = c.req.param("clinicId"),
      actorId = c.get("actor").id;
    await access(clinicId, actorId, c.get("operator"), "settings");
    const input = settingsSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success)
      throw new HTTPException(400, {
        message: "Choose a valid timezone and booking setting.",
      });
    const updated = await db.transaction(async (tx) => {
      const [clinic] = await tx
        .update(schema.clinics)
        .set(input.data)
        .where(eq(schema.clinics.id, clinicId))
        .returning();
      await tx.insert(schema.audits).values({
        id: randomUUID(),
        clinicId,
        actorId,
        action: "clinic.settings.updated",
        targetId: clinicId,
      });
      return clinic;
    });
    return c.json(clinicSchema.parse(updated));
  });
  app.put("/api/clinics/:clinicId/members", async (c) => {
    const clinicId = c.req.param("clinicId"),
      actorId = c.get("actor").id;
    await access(clinicId, actorId, c.get("operator"), "members");
    const input = memberInputSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success)
      throw new HTTPException(400, {
        message: "Enter an existing user's email and a manager or staff role.",
      });
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, input.data.email));
    if (!user)
      throw new HTTPException(400, {
        message: "Ask an operator to provision this account first.",
      });
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.clinicId, clinicId),
            eq(schema.memberships.userId, user.id),
          ),
        );
      if (existing?.role === "owner")
        throw new HTTPException(400, {
          message: "Owner reassignment is not supported.",
        });
      await tx
        .insert(schema.memberships)
        .values({ clinicId, userId: user.id, role: input.data.role })
        .onConflictDoUpdate({
          target: [schema.memberships.clinicId, schema.memberships.userId],
          set: { role: input.data.role },
        });
      await tx.insert(schema.audits).values({
        id: randomUUID(),
        clinicId,
        actorId,
        action: "membership.updated",
        targetId: user.id,
      });
    });
    return c.json({ ok: true });
  });
  app.delete("/api/clinics/:clinicId/members", async (c) => {
    const clinicId = c.req.param("clinicId"),
      actorId = c.get("actor").id;
    await access(clinicId, actorId, c.get("operator"), "members");
    const input = removeMemberSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success)
      throw new HTTPException(400, { message: "Enter the member's email." });
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, input.data.email));
    if (!user) throw new HTTPException(404, { message: "Member not found." });
    await db.transaction(async (tx) => {
      const [member] = await tx
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.clinicId, clinicId),
            eq(schema.memberships.userId, user.id),
          ),
        );
      if (!member || member.role === "owner")
        throw new HTTPException(400, {
          message:
            "Only an existing manager or staff membership can be removed.",
        });
      await tx
        .delete(schema.memberships)
        .where(
          and(
            eq(schema.memberships.clinicId, clinicId),
            eq(schema.memberships.userId, user.id),
          ),
        );
      await tx.insert(schema.audits).values({
        id: randomUUID(),
        clinicId,
        actorId,
        action: "membership.removed",
        targetId: user.id,
      });
    });
    return c.json({ ok: true });
  });
  app.get("/api/clinics/:clinicId/audit", async (c) => {
    const clinicId = c.req.param("clinicId");
    await access(clinicId, c.get("actor").id, c.get("operator"), "read");
    const events = await db
      .select()
      .from(schema.audits)
      .where(eq(schema.audits.clinicId, clinicId))
      .orderBy(desc(schema.audits.createdAt))
      .limit(100);
    return c.json(
      auditListSchema.parse(
        events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      ),
    );
  });
  app.notFound((c) =>
    c.json({ error: "Not found.", requestId: c.get("requestId") }, 404),
  );
  return app;
}
