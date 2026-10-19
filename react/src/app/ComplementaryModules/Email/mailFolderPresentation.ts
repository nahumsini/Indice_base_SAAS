import type { MailboxFolder } from './mailboxApi';

/** Labels are presentation only: provider IDs and special-use kinds remain authoritative. */
export function presentMailFolders(folders: MailboxFolder[], labels: Record<string, string>) {
  const names = folders.map(folder => labels[folder.kind] || folder.name.replace(/^INBOX[./]/i, '') || folder.name);
  return folders.map((folder, index) => ({
    ...folder,
    label: names.filter(name => name === names[index]).length > 1
      ? `${names[index]} · ${folder.name}` : names[index],
  }));
}
