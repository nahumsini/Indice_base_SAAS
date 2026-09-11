export const kioskAdminSource = 'kiosk-center';

// Rollback switch for the presentation-only consolidation. Owner managers remain mounted.
export function resolveLegacyOwnerKioskEntryPointsEnabled(
  configuredValue: string | undefined,
  development: boolean,
) {
  if (configuredValue === 'true') return true;
  if (configuredValue === 'false') return false;
  return !development;
}

export const legacyOwnerKioskEntryPointsEnabled = resolveLegacyOwnerKioskEntryPointsEnabled(
  import.meta.env?.VITE_LEGACY_OWNER_KIOSK_ENTRY_POINTS_ENABLED,
  Boolean(import.meta.env?.DEV),
);

export interface KioskAdminNavigationTarget {
  engineId: number;
  referenceId: number | null;
  kioskType: string;
}

type KioskAdminNavigationInput = {
  engineId: number;
  referenceId?: number | null;
  kioskType: string;
};

const positiveInteger = (value: string | null) => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export function buildKioskAdminNavigationSearch({
  engineId,
  referenceId,
  kioskType,
}: KioskAdminNavigationInput) {
  const query = new URLSearchParams({
    kioskAdminSource,
    kioskEngineId: String(engineId),
    kioskType,
  });
  if (referenceId) query.set('kioskReferenceId', String(referenceId));
  return query.toString();
}

export function readKioskAdminNavigationTarget(search: string): KioskAdminNavigationTarget | null {
  const query = new URLSearchParams(search);
  if (query.get('kioskAdminSource') !== kioskAdminSource) return null;

  const engineId = positiveInteger(query.get('kioskEngineId'));
  const referenceId = positiveInteger(query.get('kioskReferenceId'));
  const kioskType = (query.get('kioskType') ?? '').trim();
  if (!engineId || !kioskType || kioskType.length > 80) return null;

  return { engineId, referenceId, kioskType };
}
