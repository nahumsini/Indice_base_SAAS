import { apiClient, buildApiUrl } from '../../../lib/apiClient';
import type { BoardAsset, BoardInput, SavedBoard } from './ideasBoardModel';
const base = '/api/v1/sales/funnels/ideas-board';
export const ideasBoardApi = {
  get: (signal?: AbortSignal) => apiClient<SavedBoard>(base, { signal }),
  save: (input: BoardInput, actorKey: string) => apiClient<SavedBoard>(base, { method: 'PUT', headers: { 'X-Idea-Board-Actor': actorKey }, body: JSON.stringify(input) }),
  upload: (file: File, id: string, actorKey: string) => apiClient<BoardAsset>(`${base}/assets/${id}`, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Idea-Photo-Name': encodeURIComponent(file.name), 'X-Idea-Board-Actor': actorKey }, body: file }),
  photoUrl: (id: string) => buildApiUrl(`${base}/assets/${encodeURIComponent(id)}`),
};
