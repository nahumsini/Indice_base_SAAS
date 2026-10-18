import { createContext, useContext, type ReactNode } from 'react';

interface ModuleTabArtworkIdentity {
  moduleId: string;
  tabId: string;
}

const ModuleTabArtworkContext = createContext<ModuleTabArtworkIdentity | null>(null);

/** Presentation identity only. The owning shell retains all routing and access decisions. */
export function ModuleTabArtworkProvider({ moduleId, tabId, children }: ModuleTabArtworkIdentity & { children: ReactNode }) {
  return (
    <ModuleTabArtworkContext.Provider value={{ moduleId, tabId }}>
      {children}
    </ModuleTabArtworkContext.Provider>
  );
}

export function useModuleTabArtwork() {
  return useContext(ModuleTabArtworkContext);
}
