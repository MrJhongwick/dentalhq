import { schema, type Database } from "@dentalhq/db";
import { provisionUser } from "./provision";
import { randomUUID } from "node:crypto";

// Synthetic fixtures only; invoked solely against a new in-memory database.
export async function seedDevelopment(db: Database, password: string) {
  if (password.length < 12)
    throw new Error(
      "Set DEVELOPMENT_PASSWORD to at least 12 characters for synthetic fixtures.",
    );
  const operator = await provisionUser(db, {
    name: "Demo operator",
    email: "operator@example.test",
    password,
  });
  const owner = await provisionUser(
    db,
    { name: "Maya Kim", email: "owner@example.test", password },
    operator.id,
  );
  const staff = await provisionUser(
    db,
    { name: "Demo staff", email: "staff@example.test", password },
    operator.id,
  );
  const outsider = await provisionUser(
    db,
    { name: "Other clinic owner", email: "other@example.test", password },
    operator.id,
  );
  const clinicId = randomUUID(),
    otherClinicId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.clinics).values([
      { id: clinicId, name: "Harbor Dental", slug: "harbor-dental" },
      { id: otherClinicId, name: "Other Dental", slug: "other-dental" },
    ]);
    await tx.insert(schema.memberships).values([
      { clinicId, userId: owner.id, role: "owner" },
      { clinicId, userId: staff.id, role: "staff" },
      { clinicId: otherClinicId, userId: outsider.id, role: "owner" },
    ]);
    await tx
      .insert(schema.audits)
      .values(
        [clinicId, otherClinicId].map((id) => ({
          id: randomUUID(),
          clinicId: id,
          actorId: operator.id,
          action: "clinic.seeded",
          targetId: id,
        })),
      );
  });
  return { operator, owner, staff, outsider, clinicId, otherClinicId };
}
