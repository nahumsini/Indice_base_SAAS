import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  ChevronDown,
  Eye,
  GraduationCap,
  Info,
  Trash2,
  Upload,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type {
  CreateRecordData,
  EmployeeRecord,
  RecordEmployeeOption,
  RecordSeverity,
  RecordStatus,
  RecordType,
} from '../types/records.types';
import type { CreateRecordModalCopy } from '../translations';

interface CreateRecordModalProps {
  copy: CreateRecordModalCopy;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateRecordData) => Promise<void> | void;
  employees: RecordEmployeeOption[];
  isEmployeesLoading?: boolean;
  employeeLoadError?: string;
  onRetryEmployees?: () => void;
  editingRecord?: EmployeeRecord | null;
}

const typeOptionIcons: Array<{ value: RecordType; Icon: LucideIcon; iconClassName: string }> = [
  { value: 'incident', Icon: AlertTriangle, iconClassName: 'text-red-500' },
  { value: 'warning', Icon: AlertCircle, iconClassName: 'text-orange-500' },
  { value: 'recognition', Icon: Award, iconClassName: 'text-green-500' },
  { value: 'observation', Icon: Eye, iconClassName: 'text-blue-500' },
  { value: 'training', Icon: GraduationCap, iconClassName: 'text-purple-500' },
];

const severityDotClass: Record<RecordSeverity, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export function CreateRecordModal({
  copy,
  isOpen,
  onClose,
  onSave,
  employees,
  isEmployeesLoading = false,
  employeeLoadError = '',
  onRetryEmployees,
  editingRecord = null,
}: CreateRecordModalProps) {
  const [formData, setFormData] = useState<{
    employeeId: string;
    status: RecordStatus;
    type: RecordType | '';
    severity: RecordSeverity | '';
    title: string;
    description: string;
    actionsTaken: string;
    witnesses: string[];
    eventDate: string;
    attachments: File[];
  }>({
    employeeId: '',
    status: 'pending',
    type: '',
    severity: '',
    title: '',
    description: '',
    actionsTaken: '',
    witnesses: [],
    eventDate: new Date().toISOString().split('T')[0],
    attachments: [],
  });
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [showWitnessDropdown, setShowWitnessDropdown] = useState(false);
  const [witnessSearch, setWitnessSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const witnessDropdownRef = useRef<HTMLDivElement | null>(null);
  const typeOptions = useMemo(
    () =>
      typeOptionIcons.map((option) => ({
        ...option,
        description: copy.typeDescriptions[option.value],
        label: copy.types[option.value],
      })),
    [copy],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingRecord) {
      setFormData({
        employeeId: editingRecord.user.id,
        status: editingRecord.status,
        type: editingRecord.type,
        severity: editingRecord.severity ?? '',
        title: editingRecord.title,
        description: editingRecord.description,
        actionsTaken: editingRecord.actionsTaken ?? '',
        witnesses: editingRecord.witnesses ?? [],
        eventDate: editingRecord.eventDate.split('T')[0],
        attachments: [],
      });
      return;
    }

    setFormData({
      employeeId: '',
      status: 'pending',
      type: '',
      severity: '',
      title: '',
      description: '',
      actionsTaken: '',
      witnesses: [],
      eventDate: new Date().toISOString().split('T')[0],
      attachments: [],
    });
  }, [editingRecord, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (witnessDropdownRef.current && !witnessDropdownRef.current.contains(event.target as Node)) {
        setShowWitnessDropdown(false);
        setWitnessSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) {
    return null;
  }

  const requiresSeverity = formData.type === 'incident' || formData.type === 'warning';
  const hasEmployeeOptions = employees.length > 0;
  const isFullyValid = Boolean(
    formData.employeeId
    && formData.type
    && formData.title.trim()
    && formData.description.trim()
    && (!requiresSeverity || formData.severity)
    && hasEmployeeOptions,
  );

  const filteredEmployees = employees.filter((employee) => {
    const searchLower = witnessSearch.toLowerCase();
    const isAlreadySelected = formData.witnesses.includes(employee.name);
    const isMainEmployee = employee.id === formData.employeeId;
    const matchesSearch = !searchLower
      || employee.name.toLowerCase().includes(searchLower)
      || employee.position.toLowerCase().includes(searchLower)
      || employee.department.toLowerCase().includes(searchLower);
    return !isAlreadySelected && !isMainEmployee && matchesSearch;
  });

  const handleTypeChange = (type: RecordType) => {
    setFormData((current) => ({
      ...current,
      type,
      severity: type === 'incident' || type === 'warning' ? current.severity : '',
      title: '',
    }));
    setShowTitleSuggestions(true);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setFormData((current) => ({ ...current, attachments: [...current.attachments, ...files] }));
  };

  const handleSave = async () => {
    if (!isFullyValid || !formData.type) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        employeeId: formData.employeeId,
        status: formData.status,
        type: formData.type,
        severity: formData.severity || undefined,
        title: formData.title.trim(),
        description: formData.description.trim(),
        actionsTaken: formData.actionsTaken.trim() || undefined,
        witnesses: formData.witnesses.length ? formData.witnesses : undefined,
        eventDate: formData.eventDate,
        attachments: formData.attachments.length ? formData.attachments : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <UserPlus className="h-5 w-5" />
            </span>
            <h2 className="min-w-0 truncate text-2xl font-semibold text-white">
              {editingRecord ? copy.modal.editTitle : copy.modal.newTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={copy.modal.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 bg-slate-50/70 p-6 dark:bg-slate-950/40">
          <div className="flex gap-3 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-900/20">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="mb-1 font-semibold">{copy.modal.noticeTitle}</p>
              <p className="text-blue-800 dark:text-blue-300">
                {copy.modal.noticeDescription}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
              {copy.modal.basicInformation}
            </h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.employee} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.employeeId}
                onChange={(event) => setFormData((current) => ({ ...current, employeeId: event.target.value }))}
                disabled={isEmployeesLoading || !hasEmployeeOptions}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {isEmployeesLoading
                    ? copy.modal.loadingEmployees
                    : hasEmployeeOptions
                      ? copy.modal.selectEmployee
                      : copy.modal.noEmployees}
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.position}
                  </option>
                ))}
              </select>
              {employeeLoadError ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
                  <span>{employeeLoadError}</span>
                  {onRetryEmployees ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onRetryEmployees}
                      disabled={isEmployeesLoading}
                    >
                      {copy.modal.retry}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {!isEmployeesLoading && !employeeLoadError && !hasEmployeeOptions ? (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {copy.modal.noEmployeesHint}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.eventDate} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(event) => setFormData((current) => ({ ...current, eventDate: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.recordStatus} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(event) => setFormData((current) => ({
                  ...current,
                  status: event.target.value as RecordStatus,
                }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="pending">{copy.status.pending}</option>
                <option value="reviewed">{copy.status.reviewed}</option>
                <option value="resolved">{copy.status.resolved}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.recordType} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {typeOptions.map((option) => {
                  const TypeIcon = option.Icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleTypeChange(option.value)}
                      className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                        formData.type === option.value
                          ? 'border-[#59C3A5] bg-[#59C3A5]/10 shadow-sm dark:bg-[#59C3A5]/15'
                          : 'border-gray-200 hover:border-[#59C3A5]/60 dark:border-gray-700 dark:hover:border-[#59C3A5]/70'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <TypeIcon className={`h-4 w-4 ${option.iconClassName}`} />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{option.label}</span>
                      </div>
                      <div className="text-xs leading-tight text-gray-600 dark:text-gray-400">{option.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {requiresSeverity ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {copy.modal.severity} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as RecordSeverity[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData((current) => ({ ...current, severity: level }))}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-semibold capitalize transition-all ${
                        formData.severity === level
                          ? level === 'low'
                            ? 'border-green-500 bg-green-50 text-green-700 shadow-sm dark:bg-green-900/30 dark:text-green-400'
                            : level === 'medium'
                              ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-sm dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'border-red-500 bg-red-50 text-red-700 shadow-sm dark:bg-red-900/30 dark:text-red-400'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${severityDotClass[level]}`} />
                      {copy.severity[level]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <h3 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
              {copy.modal.recordDetails}
            </h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.title} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                onFocus={() => formData.type && setShowTitleSuggestions(true)}
                placeholder={copy.modal.titlePlaceholder}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {showTitleSuggestions && formData.type && !formData.title ? (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">{copy.modal.suggestions}</p>
                  <div className="flex flex-wrap gap-2">
                    {copy.titleSuggestions[formData.type].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setFormData((current) => ({ ...current, title: suggestion }));
                          setShowTitleSuggestions(false);
                        }}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/30"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.description} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                maxLength={1000}
                placeholder={copy.modal.descriptionPlaceholder}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {copy.modal.characters(formData.description.length, 1000)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
              {copy.modal.actionsContext}
            </h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.actionsTaken}
              </label>
              <textarea
                value={formData.actionsTaken}
                onChange={(event) => setFormData((current) => ({ ...current, actionsTaken: event.target.value }))}
                rows={3}
                placeholder={copy.modal.actionsPlaceholder}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {copy.modal.witnesses}
              </label>

              {formData.witnesses.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {formData.witnesses.map((witness) => (
                    <span
                      key={witness}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {witness}
                      <button
                        type="button"
                        onClick={() => setFormData((current) => ({
                          ...current,
                          witnesses: current.witnesses.filter((item) => item !== witness),
                        }))}
                        className="rounded-full p-0.5 transition-colors hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="relative" ref={witnessDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowWitnessDropdown((current) => !current)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-gray-700 transition-colors hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-700"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <UserPlus className="h-4 w-4" />
                    {copy.modal.selectWitnesses}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showWitnessDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showWitnessDropdown ? (
                  <div className="absolute z-10 mt-2 max-h-64 w-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                    <div className="border-b border-gray-200 p-2 dark:border-gray-600">
                      <input
                        type="text"
                        value={witnessSearch}
                        onChange={(event) => setWitnessSearch(event.target.value)}
                        placeholder={copy.modal.witnessSearchPlaceholder}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => {
                            setFormData((current) => ({ ...current, witnesses: [...current.witnesses, employee.name] }));
                            setShowWitnessDropdown(false);
                            setWitnessSearch('');
                          }}
                          className="w-full border-b border-gray-100 px-3 py-2 text-left transition-colors hover:bg-blue-50 last:border-0 dark:border-gray-600 dark:hover:bg-blue-900/30"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {employee.position} - {employee.department}
                          </div>
                        </button>
                      )) : (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {witnessSearch ? copy.modal.noEmployeesFound : copy.modal.allEmployeesSelected}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
              {copy.modal.attachments}
            </h3>

            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-600">
              <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                {copy.modal.dropFiles}
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="record-file-upload"
              />
              <label
                htmlFor="record-file-upload"
                className="inline-block cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {copy.modal.chooseFiles}
              </label>
            </div>

            {formData.attachments.length > 0 ? (
              <div className="space-y-2">
                {formData.attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((current) => ({
                        ...current,
                        attachments: current.attachments.filter((_, fileIndex) => fileIndex !== index),
                      }))}
                      className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 bg-[#59C3A5] px-6 py-4 text-white">
          <Button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-white/35 bg-white/10 text-white hover:bg-white/20"
          >
            {copy.modal.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isFullyValid || isSaving}
            className="rounded-xl bg-white font-semibold text-[#137F68] hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-[#137F68]/60"
          >
            {isSaving ? copy.modal.saving : editingRecord ? copy.modal.saveChanges : copy.modal.createRecord}
          </Button>
        </div>
      </div>
    </div>
  );
}
