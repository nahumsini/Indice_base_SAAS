const reloadKey = 'indice:stale-chunk-reload-attempted';

if (!sessionStorage.getItem(reloadKey)) {
  sessionStorage.setItem(reloadKey, 'true');
  window.location.reload();
} else {
  console.error('[Indice] A stale frontend chunk was requested after reload.');
}

export default function StaleChunkReloadFallback() {
  return null;
}
