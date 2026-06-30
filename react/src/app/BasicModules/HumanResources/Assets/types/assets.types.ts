import type { HrAssetStatus } from '../../../../api/HumanResources/assets';
import type { AddNewAssetType } from '../constants/assetCatalog';

export type AssetType = AddNewAssetType;
export type AssetTypeFilter = AssetType | 'other';
export type AssetColumnId =
  | 'id'
  | 'type'
  | 'asset'
  | 'model'
  | 'serialNumber'
  | 'responsible'
  | 'unit'
  | 'status'
  | 'assignedAt'
  | 'value'
  | 'photos'
  | 'notes'
  | 'actions';

export interface AssetRow {
  backendId: number;
  assetCode: string;
  assetType: string;
  assetTypeFilter: AssetTypeFilter;
  name: string;
  model: string;
  serialNumber: string;
  responsibleName: string;
  responsibleId: number | null;
  responsibleEmail: string | null;
  unitName: string;
  unitId: number | null;
  status: HrAssetStatus;
  assignedAt: string | null;
  valueAmount: number | null;
  valueCurrency: string;
  photoCount: number;
  notes: string;
}
