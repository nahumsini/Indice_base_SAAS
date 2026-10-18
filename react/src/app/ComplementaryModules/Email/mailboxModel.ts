import type { MailboxAccount, MailboxMessage, MailDraft } from './mailboxApi';
export function splitRecipients(value: string): string[] { return value.split(/[,;\n]/).map(address => address.trim()).filter(Boolean); }
export function validRecipients(...values: string[][]) {
  const all = values.flat();
  return all.length <= 20 && new Set(all.map(v => v.toLowerCase())).size === all.length && all.every(v => /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v));
}
export function initialDraft(account: MailboxAccount, message?: MailboxMessage, mode: 'new' | 'edit' | 'reply' | 'all' | 'forward' | 'copy' = 'new'): MailDraft {
  const draft: MailDraft = { version: 0, accountVersion: account.version, to: [], cc: [], bcc: [], subject: '', bodyText: '', replyToMessageId: null };
  if (!message) return draft;
  if (mode === 'edit' || mode === 'copy') return { ...draft, version: mode === 'edit' ? message.version : 0, to: message.to, cc: message.cc, bcc: message.bcc, subject: message.subject, bodyText: message.bodyText ?? '', bodyHtml: mode === 'edit' ? message.bodyHtml : null };
  if (mode === 'forward') return { ...draft, subject: `Fwd: ${message.subject}`.slice(0, 240), bodyText: `\n\n${message.fromName} <${message.fromAddress}>\n${message.subject}\n\n${message.bodyText ?? ''}`.slice(0, 20000) };
  const own = account.email.toLowerCase();
  const reply = message.fromAddress.toLowerCase() === own ? message.to : message.replyTo.length ? message.replyTo : [message.fromAddress];
  const seen = new Set<string>();
  const to = [...reply, ...(mode === 'all' ? message.to : [])].filter(v => { const key = v.toLowerCase(); if (!key || key === own || seen.has(key)) return false; seen.add(key); return true; });
  const used = new Set(to.map(v => v.toLowerCase()));
  const cc = mode === 'all' ? message.cc.filter(v => { const key = v.toLowerCase(); if (key === own || used.has(key)) return false; used.add(key); return true; }) : [];
  return { ...draft, to, cc, subject: /^re:/i.test(message.subject) ? message.subject.slice(0, 240) : `Re: ${message.subject}`.slice(0, 240), replyToMessageId: message.id };
}
