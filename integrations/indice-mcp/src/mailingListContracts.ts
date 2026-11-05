import { z } from "zod";

export const mailingListToolNames = [
  "list_mailing_lists",
  "preview_assign_mailing_list_contacts",
  "assign_mailing_list_contacts",
] as const;

const listId = z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
const contactId = z.number().int().positive();
const confirmationToken = z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/);
const savedList = z.object({
  id: listId,
  name: z.string(),
  version: z.number().int().positive(),
  contactCount: z.number().int().min(0),
  updatedAt: z.string(),
});
const audienceFilter = z.object({
  search: z.string().trim().min(1).max(180).optional(),
  source: z.string().trim().min(1).max(80).optional(),
  owner: contactId.optional(),
  tag: z.string().trim().min(1).max(180).optional(),
  listId: z.union([listId, z.literal("none")]).optional(),
  eligibility: z.enum(["READY", "CONSENT_REQUIRED", "INVALID", "SUPPRESSED"]).optional(),
}).strict().refine(filters => Object.values(filters).some(value => value !== undefined), "Specify at least one audience filter.");

export const mailingListSearch = z.object({
  search: z.string().trim().max(180).optional(),
  page: z.number().int().min(1).max(10_000).optional(),
}).strict();
export const mailingListDirectory = z.object({
  lists: z.array(savedList),
  total: z.number().int().min(0),
  filters: z.object({
    sources: z.array(z.string()),
    owners: z.array(z.object({ value: z.string(), label: z.string() })),
    tags: z.array(z.string()),
  }),
});
export const mailingAssignmentInput = z.object({
  listId,
  contactIds: z.array(contactId).min(1).max(500).optional(),
  filters: audienceFilter.optional(),
}).strict().refine(input => (input.contactIds !== undefined) !== (input.filters !== undefined), "Provide contactIds or filters.");
export const mailingAssignmentPreview = z.object({
  list: savedList,
  additions: z.array(z.object({ id: contactId, name: z.string(), companyName: z.string() })).max(500),
  alreadyInList: z.number().int().min(0),
  projectedCount: z.number().int().min(0).max(500),
  confirmationToken: confirmationToken.nullable(),
  expiresAt: z.string().nullable(),
  confirmationRequired: z.boolean(),
});
export const mailingAssignmentConfirmation = z.object({
  confirmation_token: confirmationToken,
  idempotency_key: z.string().min(8).max(128),
}).strict();
export const mailingAssignmentResult = z.object({
  result: z.object({ list: savedList, added: z.number().int().min(0).max(500) }),
  replayed: z.boolean(),
  correlationId: z.string(),
});
