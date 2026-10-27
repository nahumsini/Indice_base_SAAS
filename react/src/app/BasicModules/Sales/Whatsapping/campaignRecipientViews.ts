import type { Recipient, ResultContacts } from "./whatsappingApi";
export const recipientViews = ["PENDING", "DUE", "TODAY", "FINISHED", "ALL", "CONTACTED", "POSITIVE", "NEGATIVE", "OPPORTUNITY"] as const;
export type RecipientView = typeof recipientViews[number];
const resultFields = { CONTACTED: "contacted", POSITIVE: "positive", NEGATIVE: "negative", OPPORTUNITY: "withOpportunity" } as const;
export function parseRecipientView(value: string | null): RecipientView {
  return recipientViews.includes(value as RecipientView) ? value as RecipientView : "PENDING";
}
export function isResultView(view: string): view is keyof typeof resultFields {
  return Object.prototype.hasOwnProperty.call(resultFields, view);
}
export function resultRecipientIds(view: string, results?: ResultContacts): readonly number[] {
  return isResultView(view) ? results?.[resultFields[view]] ?? [] : [];
}
export function matchesResultRecipient(recipient: Recipient, view: string, results?: ResultContacts): boolean {
  return resultRecipientIds(view, results).includes(recipient.contact.id);
}
