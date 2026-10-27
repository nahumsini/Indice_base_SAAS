import { whatsappingApi, type Contact } from "./whatsappingApi";
export const selectableContact = (contact: Contact, needsCompany = false) =>
  contact.eligibility === "READY" && !!contact.phone.trim() && !!contact.name.trim() &&
  (!needsCompany || !!contact.companyName.trim());

// Reuse the normalized, suppression-aware projection, not the raw selection endpoint.
export async function loadCampaignContacts(region: string, search = "", ids?: number[]) {
  const wanted = ids ? new Set(ids) : null;
  const found: Contact[] = [];
  let page = 1;
  if (wanted?.size === 0) return found;
  while (true) {
    const result = await whatsappingApi.contacts(new URLSearchParams({ region, search, page: String(page), pageSize: "200" }));
    for (const contact of result.items) {
      if (!wanted || wanted.has(contact.id)) found.push(contact);
    }
    if (wanted && [...wanted].every(id => found.some(c => c.id === id))) return found;
    if (!wanted && found.filter(c => selectableContact(c)).length > 500) throw new Error("selection_limit");
    if (!result.items.length || page * 200 >= result.total) return found;
    page++;
  }
}
export function uniqueEligibleContacts(contacts: Contact[], needsCompany = false) {
  const phones = new Set<string>();
  return contacts.filter(contact => {
    if (!selectableContact(contact, needsCompany) || phones.has(contact.phone)) return false;
    phones.add(contact.phone);
    return true;
  });
}

export function contactIssues(contact: Contact, needsCompany = false) {
  const issues: ("phoneMissing" | "phoneInvalid" | "nameMissing" | "companyMissing" | "blockedContactAction" | "inactiveContactAction" | "duplicateContactAction")[] = [];
  if (!contact.phone.trim()) issues.push("phoneMissing");
  else if (contact.eligibility === "INVALID") issues.push("phoneInvalid");
  if (!contact.name.trim()) issues.push("nameMissing");
  if (needsCompany && !contact.companyName.trim()) issues.push("companyMissing");
  if (contact.eligibility === "BLOCKED") issues.push("blockedContactAction");
  if (contact.eligibility === "INACTIVE") issues.push("inactiveContactAction");
  if (contact.eligibility === "DUPLICATE") issues.push("duplicateContactAction");
  return issues;
}
export function contactCorrectionUrl(contact: Contact) {
  const query = new URLSearchParams({ q: contact.name.trim() || contact.companyName.trim() || contact.phone.trim(), page: "1" });
  return `/sales/contacts?${query}`;
}
