import type { PettyCashManagedAsset, PettyCashStatement } from '../types/pettyCash.types';
import type { PettyCashTranslations } from '../translations';

export const MAX_MANAGED_ASSETS = 50;
export const managedAssetTypes = ['REAL_ESTATE', 'VEHICLE', 'VESSEL', 'MACHINERY', 'INVESTMENT_ACCOUNT', 'CURRENCY', 'SECURITIES', 'OTHER'] as const;
export type ManagedAssetDraft = PettyCashManagedAsset & { draftId: string };

export function getFundManagedAssets(fund: {
  managedAssets?: PettyCashManagedAsset[] | null;
  managedAssetType?: string | null;
  managedAssetName?: string | null;
  managedAssetReference?: string | null;
}): PettyCashManagedAsset[] {
  if (fund.managedAssets != null) return fund.managedAssets;
  return fund.managedAssetType || fund.managedAssetName || fund.managedAssetReference
    ? [{ type: fund.managedAssetType ?? '', name: fund.managedAssetName ?? '', reference: fund.managedAssetReference ?? undefined }]
    : [];
}

export function getStatementManagedAssets(statement: Pick<PettyCashStatement,
  'managedAssetsSnapshot' | 'managedAssetTypeSnapshot' | 'managedAssetNameSnapshot' | 'managedAssetReferenceSnapshot'>): PettyCashManagedAsset[] {
  // A historical empty list must never inherit assets from the current fund.
  return getFundManagedAssets({ managedAssets: statement.managedAssetsSnapshot,
    managedAssetType: statement.managedAssetTypeSnapshot, managedAssetName: statement.managedAssetNameSnapshot,
    managedAssetReference: statement.managedAssetReferenceSnapshot });
}

export function getManagedAssetTypeLabel(type: string, copy: PettyCashTranslations): string {
  const labels: Record<string, string> = {
    REAL_ESTATE: copy.funds.modal.assetRealEstate, VEHICLE: copy.funds.modal.assetVehicle,
    VESSEL: copy.funds.modal.assetVessel, MACHINERY: copy.funds.modal.assetMachinery,
    INVESTMENT_ACCOUNT: copy.funds.modal.assetInvestment, CURRENCY: copy.funds.modal.assetCurrency,
    SECURITIES: copy.funds.modal.assetSecurities, OTHER: copy.funds.modal.assetOther,
  };
  return labels[type] ?? type;
}

export const describeManagedAsset = (asset: PettyCashManagedAsset, copy: PettyCashTranslations) =>
  [getManagedAssetTypeLabel(asset.type, copy), asset.name, asset.reference].filter(Boolean).join(' · ');

export function getManagedAssetsCopy(locale: string) {
  const labels: Record<string, readonly string[]> = {
    es: ['Activos administrados (opcional)', 'Agrega las propiedades, vehículos u otros activos que administra este fondo.', 'Agregar activo', 'Quitar activo', 'Activo', 'Puedes agregar hasta 50 activos.'],
    en: ['Managed assets (optional)', 'Add the properties, vehicles or other assets managed by this fund.', 'Add asset', 'Remove asset', 'Asset', 'You can add up to 50 assets.'],
    fr: ['Actifs gérés (facultatif)', 'Ajoutez les propriétés, véhicules ou autres actifs gérés par ce fonds.', 'Ajouter un actif', 'Retirer cet actif', 'Actif', 'Vous pouvez ajouter jusqu’à 50 actifs.'],
    pt: ['Ativos administrados (opcional)', 'Adicione os imóveis, veículos ou outros ativos administrados por este fundo.', 'Adicionar ativo', 'Remover ativo', 'Ativo', 'Você pode adicionar até 50 ativos.'],
    ko: ['관리 자산 (선택 사항)', '이 자금으로 관리하는 부동산, 차량 또는 기타 자산을 추가하세요.', '자산 추가', '자산 제거', '자산', '최대 50개의 자산을 추가할 수 있습니다.'],
    zh: ['管理资产（可选）', '添加此资金管理的房产、车辆或其他资产。', '添加资产', '移除资产', '资产', '最多可添加 50 项资产。'],
  };
  const [title, description, add, remove, item, limit] = labels[locale.split('-')[0]] ?? labels.en;
  return { title, description, add, remove, item: (index: number) => `${item} ${index}`, limit };
}
