export const boardTabs = ['overview', 'trends', 'channels', 'sales'] as const;
export type BoardTab = typeof boardTabs[number];

/** Older bookmarks stored the section in ?view=. Explicit new section paths win. */
export function legacyBoardDestination(requestedTab: string | undefined, search: string) {
  const params = new URLSearchParams(search);
  if (!params.has('view')) return null;
  const legacyView = params.get('view');
  const explicitTab = boardTabs.find(tab => tab === requestedTab);
  const migratedTab = boardTabs.find(tab => tab === legacyView) ?? 'overview';
  const tab = explicitTab && explicitTab !== 'overview' ? explicitTab : migratedTab;
  params.delete('view');
  const query = params.toString();
  return `/sales-board/${tab}${query ? `?${query}` : ''}`;
}
