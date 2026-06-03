import type { EmployeeModalTranslations } from '../../../translations/types';
import { HelperText } from '../components/HelperText';
import { SelectField } from '../fields/SelectField';
import { TextField } from '../fields/TextField';
import type {
  EmployeeFieldKey,
  EmployeeFormData,
  EmployeeFormFieldChangeHandler,
} from '../types';
import type { EmployeeValidationErrors } from '../validation';

interface ScheduleOnHireFieldsProps {
  copy: EmployeeModalTranslations;
  formData: EmployeeFormData;
  onFieldChange: EmployeeFormFieldChangeHandler;
  scheduleLocationOptions: Array<{ value: string; label: string }>;
  touchedFields: Partial<Record<EmployeeFieldKey, boolean>>;
  validationErrors: EmployeeValidationErrors;
}

export function ScheduleOnHireFields({
  copy,
  formData,
  onFieldChange,
  scheduleLocationOptions,
  touchedFields,
  validationErrors,
}: ScheduleOnHireFieldsProps) {
  return (
    <div className="rounded-[22px] border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
      <label className="flex items-start gap-3">
        <input
          name="scheduleOnHire"
          type="checkbox"
          checked={formData.scheduleOnHire}
          onChange={(event) => onFieldChange('scheduleOnHire', event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5]/30 dark:border-slate-600"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900 dark:text-white">
            {copy.labels.scheduleOnHire}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
            {copy.helpers.scheduleOnHire}
          </span>
        </span>
      </label>

      {formData.scheduleOnHire ? (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField
            name="scheduleStartDate"
            label={copy.labels.scheduleStartDate}
            value={formData.scheduleStartDate}
            onChange={(value) => onFieldChange('scheduleStartDate', value)}
            type="date"
            required
            error={touchedFields.scheduleStartDate ? validationErrors.scheduleStartDate : undefined}
          />
          <TextField
            name="scheduleEndDate"
            label={copy.labels.scheduleEndDate}
            value={formData.scheduleEndDate}
            onChange={(value) => onFieldChange('scheduleEndDate', value)}
            type="date"
            required
            error={touchedFields.scheduleEndDate ? validationErrors.scheduleEndDate : undefined}
          />
          <TextField
            name="scheduleLateAfterMinutes"
            label={copy.labels.scheduleLateAfterMinutes}
            value={formData.scheduleLateAfterMinutes}
            onChange={(value) => onFieldChange('scheduleLateAfterMinutes', value)}
            placeholder={copy.placeholders.scheduleLateAfterMinutes}
            type="number"
            required
            error={touchedFields.scheduleLateAfterMinutes ? validationErrors.scheduleLateAfterMinutes : undefined}
          />
          <TextField
            name="scheduleStartTime"
            label={copy.labels.scheduleStartTime}
            value={formData.scheduleStartTime}
            onChange={(value) => onFieldChange('scheduleStartTime', value)}
            type="time"
            required
            error={touchedFields.scheduleStartTime ? validationErrors.scheduleStartTime : undefined}
          />
          <TextField
            name="scheduleEndTime"
            label={copy.labels.scheduleEndTime}
            value={formData.scheduleEndTime}
            onChange={(value) => onFieldChange('scheduleEndTime', value)}
            type="time"
            required
            error={touchedFields.scheduleEndTime ? validationErrors.scheduleEndTime : undefined}
          />
          <TextField
            name="scheduleMealMinutes"
            label={copy.labels.scheduleMealMinutes}
            value={formData.scheduleMealMinutes}
            onChange={(value) => onFieldChange('scheduleMealMinutes', value)}
            placeholder={copy.placeholders.scheduleMealMinutes}
            type="number"
            required
            error={touchedFields.scheduleMealMinutes ? validationErrors.scheduleMealMinutes : undefined}
          />
          <TextField
            name="scheduleRestMinutes"
            label={copy.labels.scheduleRestMinutes}
            value={formData.scheduleRestMinutes}
            onChange={(value) => onFieldChange('scheduleRestMinutes', value)}
            placeholder={copy.placeholders.scheduleRestMinutes}
            type="number"
            required
            error={touchedFields.scheduleRestMinutes ? validationErrors.scheduleRestMinutes : undefined}
          />
          <SelectField
            name="scheduleLocationRule"
            label={copy.labels.scheduleLocationRule}
            value={formData.scheduleLocationRule}
            onChange={(value) => (
              onFieldChange('scheduleLocationRule', value as EmployeeFormData['scheduleLocationRule'])
            )}
            options={copy.options.scheduleLocationRules}
          />
          {formData.scheduleLocationRule === 'exact' ? (
            <div>
              <SelectField
                name="scheduleLocationId"
                label={copy.labels.scheduleLocationId}
                value={formData.scheduleLocationId}
                onChange={(value) => onFieldChange('scheduleLocationId', value)}
                options={scheduleLocationOptions}
                placeholder={copy.placeholders.select}
                required
                error={touchedFields.scheduleLocationId ? validationErrors.scheduleLocationId : undefined}
              />
              {scheduleLocationOptions.length === 0 ? (
                <HelperText tone="warning">{copy.helpers.noScheduleLocations}</HelperText>
              ) : (
                <HelperText>{copy.helpers.scheduleExactLocation}</HelperText>
              )}
            </div>
          ) : (
            <p className="self-end rounded-2xl border border-[#59C3A5]/15 bg-white p-3 text-xs leading-5 text-[#59C3A5] dark:border-blue-500/20 dark:bg-slate-900/70 dark:text-blue-200">
              {copy.helpers.scheduleBusinessLocation}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
