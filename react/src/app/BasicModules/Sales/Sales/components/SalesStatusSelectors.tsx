import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord } from '../types/salesTypes';
import {
  commercialStatuses,
  financeStatuses,
  inventoryMovementStatuses,
  inventoryStatuses,
} from '../utils/salesStatuses';
import { FormField, salesFieldClassName } from './SalesModalPrimitives';

export function SalesStatusSelectors({
  record,
  t,
  onChange,
}: {
  record: SaleRecord;
  t: SalesRecordsTranslations;
  onChange: (patch: Partial<SaleRecord>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label={t.modal.fields.commercialStatus}>
        <Select value={record.commercialStatus} onValueChange={(value) => onChange({ commercialStatus: value as SaleRecord['commercialStatus'] })}>
          <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
          <SelectContent>{commercialStatuses.map((status) => <SelectItem key={status} value={status}>{t.statuses.commercial[status]}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label={t.modal.fields.financeStatus}>
        <Select value={record.financeStatus} onValueChange={(value) => onChange({ financeStatus: value as SaleRecord['financeStatus'] })}>
          <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
          <SelectContent>{financeStatuses.map((status) => <SelectItem key={status} value={status}>{t.statuses.finance[status]}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label={t.modal.fields.inventoryStatus}>
        <Select value={record.inventoryStatus} onValueChange={(value) => onChange({ inventoryStatus: value as SaleRecord['inventoryStatus'] })}>
          <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
          <SelectContent>{inventoryStatuses.map((status) => <SelectItem key={status} value={status}>{t.statuses.inventory[status]}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label={t.modal.fields.inventoryMovementStatus}>
        <Select value={record.inventoryMovementStatus} onValueChange={(value) => onChange({ inventoryMovementStatus: value as SaleRecord['inventoryMovementStatus'] })}>
          <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
          <SelectContent>{inventoryMovementStatuses.map((status) => <SelectItem key={status} value={status}>{t.statuses.movement[status]}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
