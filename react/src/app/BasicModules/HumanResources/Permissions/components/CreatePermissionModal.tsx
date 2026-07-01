import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Calendar, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Switch } from '../../../../components/ui/switch';
import { Textarea } from '../../../../components/ui/textarea';
import type { PermissionPayrollTreatment, PermissionType } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';

interface CreatePermissionModalProps {
  copy: PermissionsTranslations;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PermissionFormData) => Promise<void>;
}

export interface PermissionFormData {
  type: PermissionType;
  payrollTreatment: PermissionPayrollTreatment;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  reason: string;
  attachment?: File;
}

export function CreatePermissionModal({ copy, isOpen, onClose, onSubmit }: CreatePermissionModalProps) {
  const [formData, setFormData] = useState<{
    type: PermissionType | '';
    payrollTreatment: PermissionPayrollTreatment;
    startDate: string;
    endDate: string;
    halfDay: boolean;
    reason: string;
    attachment?: File;
  }>({
    type: '',
    payrollTreatment: 'paid',
    startDate: '',
    endDate: '',
    halfDay: false,
    reason: '',
  });
  const [fileName, setFileName] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const resetForm = () => {
    setFormData({
      type: '',
      payrollTreatment: 'paid',
      startDate: '',
      endDate: '',
      halfDay: false,
      reason: '',
    });
    setFileName('');
    setSubmitError('');
  };

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) {
      setTotalDays(0);
      return;
    }

    const start = toCivilDateTime(formData.startDate);
    const end = toCivilDateTime(formData.endDate);

    if (start === null || end === null || end < start) {
      setTotalDays(0);
      return;
    }

    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    setTotalDays(Math.max(0.5, formData.halfDay ? diffDays - 0.5 : diffDays));
  }, [formData.endDate, formData.halfDay, formData.startDate]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.type) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await onSubmit({
        type: formData.type,
        payrollTreatment: formData.payrollTreatment,
        startDate: formData.startDate,
        endDate: formData.endDate,
        halfDay: formData.halfDay,
        reason: formData.reason.trim(),
        attachment: formData.attachment,
      });
      resetForm();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.errors.create);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSubmitError(copy.modal.fileTooLarge);
      event.target.value = '';
      return;
    }

    setSubmitError('');
    setFormData((current) => ({ ...current, attachment: file }));
    setFileName(file.name);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden rounded-[28px] border border-[#59C3A5]/25 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <DialogHeader className="bg-[#59C3A5] px-7 py-5 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-2xl font-semibold text-white">{copy.modal.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-white/85">
                {copy.modal.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-116px)] flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50/70 px-7 py-6 dark:bg-slate-900/60">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="permission-type">{copy.modal.permissionType}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((current) => ({
                      ...current,
                      type: value as PermissionType,
                      payrollTreatment: value === 'unpaid' ? 'unpaid' : current.payrollTreatment,
                    }))}
                  >
                    <SelectTrigger id="permission-type" className="h-11 rounded-xl">
                      <SelectValue placeholder={copy.modal.selectPermissionType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">{copy.types.vacation}</SelectItem>
                      <SelectItem value="sick_leave">{copy.types.sick_leave}</SelectItem>
                      <SelectItem value="personal">{copy.types.personal}</SelectItem>
                      <SelectItem value="maternity">{copy.types.maternity}</SelectItem>
                      <SelectItem value="bereavement">{copy.types.bereavement}</SelectItem>
                      <SelectItem value="unpaid">{copy.types.unpaid}</SelectItem>
                      <SelectItem value="other">{copy.types.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permission-payroll-treatment">{copy.modal.payrollTreatment}</Label>
                  <Select
                    value={formData.payrollTreatment}
                    onValueChange={(value) => setFormData((current) => ({ ...current, payrollTreatment: value as PermissionPayrollTreatment }))}
                  >
                    <SelectTrigger id="permission-payroll-treatment" className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">{copy.payrollTreatment.paid}</SelectItem>
                      <SelectItem value="unpaid">{copy.payrollTreatment.unpaid}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    {copy.modal.payrollTreatmentDescription}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="permission-start">{copy.modal.startDate}</Label>
                  <Input
                    id="permission-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permission-end">{copy.modal.endDate}</Label>
                  <Input
                    id="permission-end"
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-4 dark:bg-[#59C3A5]/10">
                <div className="space-y-0.5">
                  <Label htmlFor="permission-half-day">{copy.modal.halfDay}</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {copy.modal.halfDayDescription}
                  </p>
                </div>
                <Switch
                  id="permission-half-day"
                  checked={formData.halfDay}
                  onCheckedChange={(checked) => setFormData((current) => ({ ...current, halfDay: checked }))}
                />
              </div>

              {totalDays > 0 ? (
                <div className="mt-4 rounded-2xl border border-[#59C3A5]/25 bg-[#59C3A5]/10 p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#159A7D]" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modal.totalDays}</span>
                    <span className="text-lg font-bold text-[#159A7D]">{totalDays}</span>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-2">
                <Label htmlFor="permission-reason">{copy.modal.reason}</Label>
                <Textarea
                  id="permission-reason"
                  rows={4}
                  placeholder={copy.modal.reasonPlaceholder}
                  value={formData.reason}
                  onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="mt-5 space-y-2">
                <Label htmlFor="permission-file">{copy.modal.attachment}</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('permission-file')?.click()}
                    className="h-11 gap-2 rounded-xl border-[#59C3A5]/30 text-[#159A7D] hover:bg-[#59C3A5]/10"
                  >
                    <Upload className="h-4 w-4" />
                    {fileName || copy.modal.uploadFile}
                  </Button>
                  <input
                    id="permission-file"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  {fileName ? (
                    <span className="truncate text-sm text-slate-500 dark:text-slate-400">{fileName}</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {copy.modal.acceptedFormats}
                </p>
              </div>
            </section>

            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {submitError}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-[#59C3A5]/20 bg-[#59C3A5] px-7 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-white/30 bg-white/10 px-5 font-semibold text-white hover:bg-white/20 hover:text-white"
            >
              {copy.modal.cancel}
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-white px-5 font-semibold text-[#159A7D] shadow-sm hover:bg-slate-50"
              disabled={isSubmitting || !formData.type || !formData.startDate || !formData.endDate || !formData.reason.trim() || totalDays <= 0}
            >
              {isSubmitting ? copy.modal.submitting : copy.modal.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toCivilDateTime(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day).getTime();
}
