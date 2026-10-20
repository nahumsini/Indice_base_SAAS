import { useEffect, useState } from 'react';
import { useWorkbarLayout } from './WorkbarLayoutContext';
import { DualWorkspacePane } from './DualWorkspacePane';

/** Preserve an already opened workspace during a temporary resize; never preload it on mobile. */
export function DualWorkspaceHost({ enabled }: { enabled: boolean }) {
  const { preferenceScope, preferencesReady, dualScreenEnabled, dualScreenAvailable } = useWorkbarLayout();
  const [openedScope, setOpenedScope] = useState<string | null>(null);
  const eligible = enabled && preferencesReady && dualScreenEnabled && Boolean(preferenceScope);
  const visible = eligible && dualScreenAvailable;
  useEffect(() => {
    if (!eligible) setOpenedScope(null);
    else if (visible) setOpenedScope(preferenceScope);
  }, [eligible, preferenceScope, visible]);
  if (!eligible || (!visible && openedScope !== preferenceScope)) return null;
  return <DualWorkspacePane key={preferenceScope} visible={visible} />;
}
