import type {
  AttendanceControlAssignment,
  AttendanceControlLocation,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';

export interface DraftLocation {
  id: string;
  persistedId?: number;
  unitId?: number | null;
  unitName?: string;
  businessId?: number | null;
  businessName?: string;
  contractStartDate: string;
  contractEndDate: string;
  nombre: string;
  latitud: number;
  longitud: number;
  radio: number;
  requiredHoursPerDay: number;
  requiredStartTime: string;
  requiredEndTime: string;
  status: 'active' | 'inactive';
  assignedEmployeeCount: number;
  assignedEmployeeNames?: string;
  enlaceGoogleMaps?: string;
  altitud?: string;
}

export type ContractSiteFilter = 'all' | 'assigned' | 'unassigned' | 'active' | 'inactive';
export type ContractSiteWizardStep = 'basic' | 'location' | 'review';
export type ContractSiteCopy = ControlTranslations['contractSites'];

export interface ContractSiteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: AttendanceControlLocation[];
  assignments: AttendanceControlAssignment[];
  controlDate: string;
  onReload?: () => Promise<void> | void;
  onSaved?: () => void;
}
