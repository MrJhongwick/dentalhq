import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { schema, sql, type Database } from "@dentalhq/db";
import { userInputSchema } from "@dentalhq/contracts";

export async function provisionUser(
  db: Database,
  input: unknown,
  actorId?: string,
) {
  const parsed = userInputSchema.parse(input);
  const id = randomUUID();
  const password = await hashPassword(parsed.password);
  return db.transaction(async (tx) => {
    if (!actorId) {
      await tx.execute(sql`LOCK TABLE operator IN EXCLUSIVE MODE`);
      const existing = await tx.select().from(schema.operators).limit(1);
      if (existing.length) throw new Error("An operator already exists.");
    }
    await tx
      .insert(schema.user)
      .values({ id, email: parsed.email, name: parsed.name });
    await tx.insert(schema.account).values({
      id: randomUUID(),
      accountId: id,
      userId: id,
      providerId: "credential",
      password,
    });
    await tx.insert(schema.audits).values({
      id: randomUUID(),
      actorId: actorId ?? id,
      action: actorId ? "user.provisioned" : "operator.bootstrapped",
      targetId: id,
    });
    if (!actorId) await tx.insert(schema.operators).values({ userId: id });
    return { id, email: parsed.email, name: parsed.name };
  });
}
