import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Calendar, Upload } from 'lucide-react';
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
import type { PermissionType } from '../types/permissions.types';

interface CreatePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PermissionFormData) => void;
}

export interface PermissionFormData {
  type: PermissionType;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  reason: string;
  attachment?: File;
}

export function CreatePermissionModal({ isOpen, onClose, onSubmit }: CreatePermissionModalProps) {
  const [formData, setFormData] = useState<{
    type: PermissionType | '';
    startDate: string;
    endDate: string;
    halfDay: boolean;
    reason: string;
    attachment?: File;
  }>({
    type: '',
    startDate: '',
    endDate: '',
    halfDay: false,
    reason: '',
  });
  const [fileName, setFileName] = useState('');
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) {
      setTotalDays(0);
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setTotalDays(formData.halfDay ? diffDays - 0.5 : diffDays);
  }, [formData.endDate, formData.halfDay, formData.startDate]);

  const handleClose = () => {
    setFormData({
      type: '',
      startDate: '',
      endDate: '',
      halfDay: false,
      reason: '',
    });
    setFileName('');
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.type) {
      return;
    }

    onSubmit({
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      halfDay: formData.halfDay,
      reason: formData.reason.trim(),
      attachment: formData.attachment,
    });
    handleClose();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFormData((current) => ({ ...current, attachment: file }));
    setFileName(file.name);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Request Permission</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit a new permission request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="permission-type">Permission Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((current) => ({ ...current, type: value as PermissionType }))}
            >
              <SelectTrigger id="permission-type">
                <SelectValue placeholder="Select permission type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="maternity">Maternity/Paternity</SelectItem>
                <SelectItem value="bereavement">Bereavement</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permission-start">Start Date *</Label>
              <Input
                id="permission-start"
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-end">End Date *</Label>
              <Input
                id="permission-end"
                type="date"
                value={formData.endDate}
                min={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
            <div className="space-y-0.5">
              <Label htmlFor="permission-half-day">Half Day</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Request only half of the last day
              </p>
            </div>
            <Switch
              id="permission-half-day"
              checked={formData.halfDay}
              onCheckedChange={(checked) => setFormData((current) => ({ ...current, halfDay: checked }))}
            />
          </div>

          {totalDays > 0 ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Days:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalDays}</span>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="permission-reason">Reason *</Label>
            <Textarea
              id="permission-reason"
              rows={4}
              placeholder="Please provide a brief reason for your request..."
              value={formData.reason}
              onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission-file">Attachment (Optional)</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('permission-file')?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {fileName || 'Upload File'}
              </Button>
              <input
                id="permission-file"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              {fileName ? (
                <span className="truncate text-sm text-gray-500 dark:text-gray-400">{fileName}</span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Accepted formats: PDF, DOC, DOCX, JPG, PNG
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!formData.type || !formData.startDate || !formData.endDate || !formData.reason.trim()}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
