import { z } from "zod";

export const roleSchema = z.enum(["owner", "manager", "staff"]);
export const appointmentStateSchema = z.enum([
  "requested",
  "held",
  "confirmed",
  "cancelled",
  "completed",
]);
export const nextActionSchema = z.object({
  ownerId: z.string().nullable(),
  action: z.string(),
  dueAt: z.iso.datetime().nullable(),
  resolvedAt: z.iso.datetime().nullable(),
});
export const clinicInputSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .min(2)
      .max(60),
    ownerEmail: z.email().toLowerCase(),
  })
  .strict();
export const settingsSchema = z
  .object({
    timezone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
    bookingEnabled: z.boolean(),
  })
  .strict();
export const clinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  bookingEnabled: z.boolean(),
});
export const memberInputSchema = z
  .object({
    email: z.email().toLowerCase(),
    role: z.enum(["manager", "staff"]),
  })
  .strict();
export const removeMemberSchema = z
  .object({ email: z.email().toLowerCase() })
  .strict();
export const supportGrantSchema = z.object({
  id: z.string(),
  expiresAt: z.iso.datetime(),
});
export const userInputSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().toLowerCase(),
    password: z.string().min(12).max(128),
  })
  .strict();
export const supportInputSchema = z
  .object({ reason: z.string().trim().min(10).max(300) })
  .strict();
export const auditSchema = z.object({
  id: z.string(),
  clinicId: z.string().nullable(),
  actorId: z.string(),
  action: z.string(),
  targetId: z.string(),
  createdAt: z.string(),
  reason: z.string().nullable(),
});
export const identitySchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  operator: z.boolean(),
  clinics: z.array(clinicSchema.extend({ role: roleSchema })),
});
export const errorSchema = z.object({
  error: z.string(),
  requestId: z.string(),
});
export const clinicListSchema = z.array(clinicSchema);
export const auditListSchema = z.array(auditSchema);
export type Identity = z.infer<typeof identitySchema>;
export type Clinic = z.infer<typeof clinicSchema>;
export type Audit = z.infer<typeof auditSchema>;
