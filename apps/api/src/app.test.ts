import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { createTestDatabase, schema, eq, and } from "@dentalhq/db";
import { createAuth } from "./auth";
import { createApp } from "./app";
import { seedDevelopment } from "./seed";
import { provisionUser } from "./provision";
import {
  identitySchema,
  clinicSchema,
  auditListSchema,
} from "@dentalhq/contracts";

test(
  "foundation: real sessions, tenant isolation, onboarding, roles, support and audit atomicity",
  { timeout: 120_000 },
  async (t) => {
    const database = await createTestDatabase();
    t.after(() => database.close());
    await database.migrate(); // Reapplying the same migration must be safe.
    const password = randomBytes(24).toString("hex");
    const fixture = await seedDevelopment(database.db, password);
    const origin = "http://localhost:3002";
    const auth = createAuth(
      database.db,
      randomBytes(32).toString("hex"),
      "http://localhost:3003",
      [origin],
    );
    const app = createApp(database.db, auth, [origin]);
    async function request(
      path: string,
      cookie = "",
      method = "GET",
      body?: unknown,
      requestOrigin = origin,
    ) {
      return app.request(`http://localhost:3003${path}`, {
        method,
        headers: {
          cookie,
          origin: requestOrigin,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
    async function login(email: string) {
      const response = await request("/api/auth/sign-in/email", "", "POST", {
        email,
        password,
      });
      assert.equal(response.status, 200, await response.clone().text());
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      assert.ok(cookie);
      assert.match(response.headers.get("set-cookie") ?? "", /httponly/i);
      return cookie;
    }
    const operator = await login(fixture.operator.email),
      owner = await login(fixture.owner.email),
      staff = await login(fixture.staff.email),
      other = await login(fixture.outsider.email);
    const clinicPath = `/api/clinics/${fixture.clinicId}`;

    await t.test(
      "rejects anonymous and forged sessions and disables public sign-up",
      async () => {
        assert.equal((await request(clinicPath)).status, 401);
        assert.equal(
          (await request("/api/me", "better-auth.session_token=forged")).status,
          401,
        );
        assert.equal(
          (
            await request("/api/auth/sign-up/email", "", "POST", {
              name: "Attacker",
              email: "attacker@example.test",
              password,
            })
          ).status,
          404,
        );
        const invalid = await request("/api/auth/sign-in/email", "", "POST", {
          email: fixture.owner.email,
          password: "wrong-password",
        });
        assert.equal(invalid.status, 401);
      },
    );
    await t.test(
      "returns only own memberships and rejects cross-tenant reads and writes",
      async () => {
        const me = identitySchema.parse(
          await (await request("/api/me", owner)).json(),
        );
        assert.deepEqual(
          me.clinics.map((c) => c.id),
          [fixture.clinicId],
        );
        assert.equal((await request(clinicPath, other)).status, 403);
        assert.equal((await request(`${clinicPath}/audit`, other)).status, 403);
        assert.equal(
          (
            await request(clinicPath, other, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
            })
          ).status,
          403,
        );
        assert.equal(
          (await request("/api/operator/clinics", owner)).status,
          403,
        );
        assert.equal((await request(clinicPath, operator)).status, 403);
      },
    );
    await t.test(
      "validates origins, roles and payloads before settings mutations",
      async () => {
        assert.equal(
          (
            await request(clinicPath, staff, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              clinicPath,
              owner,
              "PATCH",
              { timezone: "UTC", bookingEnabled: false },
              "https://evil.example",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              clinicPath,
              owner,
              "PATCH",
              { timezone: "UTC", bookingEnabled: false },
              "",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(clinicPath, owner, "PATCH", {
              timezone: "invalid",
              bookingEnabled: false,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(clinicPath, owner, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
              clinicId: fixture.otherClinicId,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(clinicPath, owner, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
            })
          ).status,
          200,
        );
        const audit = auditListSchema.parse(
          await (await request(`${clinicPath}/audit`, owner)).json(),
        );
        assert.ok(
          audit.some(
            (e) =>
              e.action === "clinic.settings.updated" &&
              e.actorId === fixture.owner.id,
          ),
        );
        assert.ok(audit.every((e) => e.clinicId === fixture.clinicId));
      },
    );
    await t.test(
      "onboards accounts and clinics through authenticated APIs with atomic audit records",
      async () => {
        const response = await request(
          "/api/operator/users",
          operator,
          "POST",
          { name: "New owner", email: "new@example.test", password },
        );
        assert.equal(response.status, 201);
        assert.equal(
          JSON.stringify(await response.json()).includes(password),
          false,
        );
        const clinicInput = {
          name: "New Clinic",
          slug: "new-clinic",
          ownerEmail: "new@example.test",
        };
        const created = await request(
          "/api/operator/clinics",
          operator,
          "POST",
          clinicInput,
        );
        assert.equal(created.status, 201);
        const clinic = clinicSchema.parse(await created.json());
        const newOwner = await login("new@example.test");
        assert.equal(
          (await request(`/api/clinics/${clinic.id}`, newOwner)).status,
          200,
        );
        assert.equal(
          (await request(`/api/clinics/${clinic.id}`, owner)).status,
          403,
        );
        assert.equal(
          (
            await request(
              "/api/operator/clinics",
              operator,
              "POST",
              clinicInput,
            )
          ).status,
          409,
        );
        const audit = auditListSchema.parse(
          await (
            await request(`/api/clinics/${clinic.id}/audit`, newOwner)
          ).json(),
        );
        assert.equal(
          audit.filter((e) => e.action === "clinic.created").length,
          1,
        );
        assert.equal(audit[0].actorId, fixture.operator.id);
      },
    );
    await t.test(
      "owners control membership, managers cannot grant membership, changed roles take effect immediately",
      async () => {
        assert.equal(
          (
            await request(`${clinicPath}/members`, owner, "PUT", {
              email: fixture.staff.email,
              role: "manager",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(clinicPath, staff, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(`${clinicPath}/members`, staff, "PUT", {
              email: fixture.outsider.email,
              role: "staff",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(`${clinicPath}/members`, owner, "PUT", {
              email: fixture.owner.email,
              role: "staff",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`${clinicPath}/members`, owner, "PUT", {
              email: fixture.staff.email,
              role: "staff",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(clinicPath, staff, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "support requires a reason, is tenant-scoped, read-only, audited, expiring and revocable",
      async () => {
        const support = `/api/operator/clinics/${fixture.clinicId}/support`;
        assert.equal(
          (await request(support, operator, "POST", { reason: "short" }))
            .status,
          400,
        );
        assert.equal(
          (
            await request(support, owner, "POST", {
              reason: "Investigate setup issue",
            })
          ).status,
          403,
        );
        const started = await request(support, operator, "POST", {
          reason: "Investigate setup issue",
        });
        assert.equal(started.status, 201);
        const grant = (await started.json()) as { id: string };
        assert.equal((await request(clinicPath, operator)).status, 200);
        assert.equal(
          (await request(`/api/clinics/${fixture.otherClinicId}`, operator))
            .status,
          403,
        );
        assert.equal(
          (
            await request(clinicPath, operator, "PATCH", {
              timezone: "UTC",
              bookingEnabled: false,
            })
          ).status,
          403,
        );
        await database.db
          .update(schema.supportGrants)
          .set({ expiresAt: new Date(0) })
          .where(eq(schema.supportGrants.id, grant.id));
        assert.equal((await request(clinicPath, operator)).status, 403);
        await request(support, operator, "POST", {
          reason: "Continue setup investigation",
        });
        assert.equal((await request(support, operator, "DELETE")).status, 200);
        assert.equal((await request(clinicPath, operator)).status, 403);
        const events = auditListSchema.parse(
          await (await request(`${clinicPath}/audit`, owner)).json(),
        );
        for (const action of [
          "support.started",
          "support.read",
          "support.ended",
        ])
          assert.ok(
            events.some(
              (e) => e.action === action && e.actorId === fixture.operator.id,
            ),
          );
      },
    );
    await t.test(
      "membership deletion, session expiry and sign-out revoke access on the server",
      async () => {
        assert.equal(
          (
            await request(`${clinicPath}/members`, owner, "DELETE", {
              email: fixture.staff.email,
            })
          ).status,
          200,
        );
        assert.equal((await request(clinicPath, staff)).status, 403);
        await database.db
          .update(schema.session)
          .set({ expiresAt: new Date(0) })
          .where(eq(schema.session.userId, fixture.outsider.id));
        assert.equal((await request("/api/me", other)).status, 401);
        assert.equal(
          (await request("/api/auth/sign-out", owner, "POST", {})).status,
          200,
        );
        assert.equal((await request("/api/me", owner)).status, 401);
      },
    );
    await t.test(
      "bootstrap is single-use and rejected attempts leave no account",
      async () => {
        await assert.rejects(() =>
          provisionUser(database.db, {
            name: "Second operator",
            email: "second-operator@example.test",
            password,
          }),
        );
        const rejected = await database.db
          .select()
          .from(schema.user)
          .where(eq(schema.user.email, "second-operator@example.test"));
        assert.equal(rejected.length, 0);
        assert.equal(
          (await database.db.select().from(schema.operators)).length,
          1,
        );
      },
    );
    await t.test("repeated credential attempts are rate limited", async () => {
      let status = 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        status = (
          await request("/api/auth/sign-in/email", "", "POST", {
            email: fixture.owner.email,
            password: "incorrect-password",
          })
        ).status;
        if (status === 429) break;
        assert.equal(status, 401);
      }
      assert.equal(status, 429);
    });
  },
);
