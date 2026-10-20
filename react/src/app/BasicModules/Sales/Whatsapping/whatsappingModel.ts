import { ApiClientError } from "../../../lib/apiClient";
import type { CampaignInput, Recipient } from "./whatsappingApi";
import type { Copy } from "./whatsappingCopy";
export const variables = [
  "name",
  "clientCompany",
  "seller",
  "company",
  "offer",
  "link",
] as const;
export const terminal = (state: string) =>
  ["DONE", "SKIPPED", "REPLIED", "BLOCKED"].includes(state);
export const due = (r: Recipient, now = Date.now()) =>
  !r.nextActionAt || new Date(r.nextActionAt).getTime() <= now;
export const ready = (r: Recipient, now = Date.now()) =>
  r.eligibility === "READY" && !terminal(r.state) && due(r, now);
export function preview(body: string, values: Record<string, string>) {
  return body.replace(
    /\{\{\s*([^{}]+?)\s*}}/g,
    (token, key: string) => values[key.trim()]?.trim() || token,
  );
}
export function validBody(body: string) {
  return (
    body.trim().length > 0 &&
    body.length <= 4000 &&
    !body
      .replace(
        /\{\{\s*(name|clientCompany|seller|company|offer|link)\s*}}/g,
        "",
      )
      .match(/\{\{|}}/)
  );
}
export function freshCampaign(copy: Copy): CampaignInput {
  return {
    name: "",
    objective: "WELCOME",
    offer: "",
    defaultRegion: "MX",
    resourceUrl: "",
    steps: [{ name: copy.message, delayDays: 0, body: "" }],
    contactIds: [],
    version: 0,
  };
}
export function failure(error: unknown, copy: Copy) {
  return error instanceof ApiClientError
    ? error.status === 409
      ? copy.conflict
      : error.status === 403
        ? copy.denied
        : copy.error
    : copy.error;
}
export function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function isoDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}
