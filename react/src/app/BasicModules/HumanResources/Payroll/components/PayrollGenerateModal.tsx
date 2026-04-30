import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, PlayCircle, Search, Users, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { BackendEmployee, PayrollCreateRunsPayload } from '../../../../api/humanResources';

type PeriodRange = 'this_month' | 'last_month' | 'two_months_ago' | 'all_year' | 'custom';

type EmployeeGenerationDraft = {
    employeeId: number;
    include: boolean;
    attendanceDays: number;
    absenceDays: number;
    overtimeHours: number;
    additionalEarnings: number;
    deductions: number;
    notes: string;
};

export type PayrollGenerationDraft = {
    payPeriod: PayrollCreateRunsPayload['pay_period'];
    groupingMode: PayrollCreateRunsPayload['grouping_mode'];
    periodRange: PeriodRange;
    periodFrom: string;
    periodTo: string;
    employeeDrafts: EmployeeGenerationDraft[];
};

type PayrollGenerateModalCopy = {
    title: string;
    subtitle: string;
    generate: string;
    cancel: string;
    employees: string;
    period: string;
    frequency: string;
    groupingMode: string;
    periodFrom: string;
    periodTo: string;
    periodThisMonth: string;
    periodLastMonth: string;
    periodTwoMonthsAgo: string;
    periodAllYear: string;
    periodCustom: string;
    noResults: string;
    attendanceControls: string;
    earningsControls: string;
    daily: string;
    weekly: string;
    biweekly: string;
    monthly: string;
    single: string;
    unit: string;
    business: string;
};

type PayrollGenerateModalProps = {
    isOpen: boolean;
    isSaving: boolean;
    employees: BackendEmployee[];
    initialPayPeriod: PayrollCreateRunsPayload['pay_period'];
    initialGroupingMode: PayrollCreateRunsPayload['grouping_mode'];
    initialPeriodRange: PeriodRange;
    initialPeriodFrom: string;
    initialPeriodTo: string;
    copy: PayrollGenerateModalCopy;
    onClose: () => void;
    onGenerate: (draft: PayrollGenerationDraft) => void;
};

const defaultAttendanceDays = 6;

export function PayrollGenerateModal({
    isOpen,
    isSaving,
    employees,
    initialPayPeriod,
    initialGroupingMode,
    initialPeriodRange,
    initialPeriodFrom,
    initialPeriodTo,
    copy,
    onClose,
    onGenerate,
}: PayrollGenerateModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [payPeriod, setPayPeriod] = useState<PayrollCreateRunsPayload['pay_period']>(initialPayPeriod);
    const [groupingMode, setGroupingMode] = useState<PayrollCreateRunsPayload['grouping_mode']>(initialGroupingMode);
    const [periodRange, setPeriodRange] = useState<PeriodRange>(initialPeriodRange);
    const [periodFrom, setPeriodFrom] = useState(initialPeriodFrom);
    const [periodTo, setPeriodTo] = useState(initialPeriodTo);
    const [employeeDrafts, setEmployeeDrafts] = useState<EmployeeGenerationDraft[]>([]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setPayPeriod(initialPayPeriod);
        setGroupingMode(initialGroupingMode);
        setPeriodRange(initialPeriodRange);
        setPeriodFrom(initialPeriodFrom);
        setPeriodTo(initialPeriodTo);
        setSearchTerm('');

        setEmployeeDrafts(
            employees.map((employee) => ({
                employeeId: employee.id,
                include: employee.status === 'active',
                attendanceDays: defaultAttendanceDays,
                absenceDays: 0,
                overtimeHours: 0,
                additionalEarnings: 0,
                deductions: 0,
                notes: '',
            })),
        );
    }, [
        isOpen,
        employees,
        initialPayPeriod,
        initialGroupingMode,
        initialPeriodRange,
        initialPeriodFrom,
        initialPeriodTo,
    ]);

    const employeesById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

    const filteredEmployees = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) {
            return employees;
        }

        return employees.filter((employee) => {
            const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
            const employeeNumber = (employee.employee_number || '').toLowerCase();
            const department = (employee.department || '').toLowerCase();
            return fullName.includes(normalizedSearch)
                || employeeNumber.includes(normalizedSearch)
                || department.includes(normalizedSearch);
        });
    }, [employees, searchTerm]);

    const visibleDrafts = useMemo(() => {
        const visibleIds = new Set(filteredEmployees.map((employee) => employee.id));
        return employeeDrafts.filter((draft) => visibleIds.has(draft.employeeId));
    }, [employeeDrafts, filteredEmployees]);

    const selectedCount = useMemo(() => employeeDrafts.filter((draft) => draft.include).length, [employeeDrafts]);

    if (!isOpen) {
        return null;
    }

    const updateDraft = (employeeId: number, next: Partial<EmployeeGenerationDraft>) => {
        setEmployeeDrafts((current) => current.map((draft) => (
            draft.employeeId === employeeId ? { ...draft, ...next } : draft
        )));
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]">
            <div className="flex h-full w-full flex-col bg-white dark:bg-slate-950">
                <header className="border-b border-slate-200 bg-[#143675] px-6 py-4 text-white dark:border-slate-700">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">{copy.title}</h2>
                            <p className="mt-1 text-sm text-blue-100">{copy.subtitle}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl border border-white/40 p-2 transition-colors hover:bg-white/10 disabled:opacity-60"
                            aria-label={copy.cancel}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span>{copy.period}</span>
                            <select
                                value={periodRange}
                                onChange={(event) => setPeriodRange(event.target.value as PeriodRange)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="this_month">{copy.periodThisMonth}</option>
                                <option value="last_month">{copy.periodLastMonth}</option>
                                <option value="two_months_ago">{copy.periodTwoMonthsAgo}</option>
                                <option value="all_year">{copy.periodAllYear}</option>
                                <option value="custom">{copy.periodCustom}</option>
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span>{copy.frequency}</span>
                            <select
                                value={payPeriod}
                                onChange={(event) => setPayPeriod(event.target.value as PayrollCreateRunsPayload['pay_period'])}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="weekly">{copy.weekly}</option>
                                <option value="biweekly">{copy.biweekly}</option>
                                <option value="monthly">{copy.monthly}</option>
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span>{copy.groupingMode}</span>
                            <select
                                value={groupingMode}
                                onChange={(event) => setGroupingMode(event.target.value as PayrollCreateRunsPayload['grouping_mode'])}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="single">{copy.single}</option>
                                <option value="unit">{copy.unit}</option>
                                <option value="business">{copy.business}</option>
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span>{copy.periodFrom}</span>
                            <input
                                type="date"
                                value={periodFrom}
                                disabled={periodRange !== 'custom'}
                                onChange={(event) => setPeriodFrom(event.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#143675] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/60"
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span>{copy.periodTo}</span>
                            <input
                                type="date"
                                value={periodTo}
                                disabled={periodRange !== 'custom'}
                                onChange={(event) => setPeriodTo(event.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#143675] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/60"
                            />
                        </label>
                    </div>
                </div>

                <main className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[340px_1fr_1fr]">
                    <section className="min-h-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                            <div className="mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Users className="h-4 w-4" />
                                <h3 className="text-sm font-semibold">{copy.employees}</h3>
                                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{selectedCount}/{employees.length}</span>
                            </div>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search employee"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>
                        <div className="max-h-full overflow-y-auto px-3 py-3">
                            {filteredEmployees.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {copy.noResults}
                                </p>
                            ) : (
                                filteredEmployees.map((employee) => {
                                    const draft = employeeDrafts.find((item) => item.employeeId === employee.id);
                                    if (!draft) {
                                        return null;
                                    }

                                    return (
                                        <label
                                            key={employee.id}
                                            className="mb-2 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={draft.include}
                                                onChange={(event) => updateDraft(employee.id, { include: event.target.checked })}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#143675] focus:ring-[#143675]"
                                            />
                                            <span className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                                    {employee.first_name} {employee.last_name}
                                                </p>
                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                    {employee.department || '-'} · {employee.position_title || '-'}
                                                </p>
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="min-h-0 border-r border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/20">
                        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.attendanceControls}</h3>
                        </div>
                        <div className="max-h-full overflow-y-auto px-3 py-3">
                            {visibleDrafts.filter((draft) => draft.include).map((draft) => {
                                const employee = employeesById.get(draft.employeeId);
                                if (!employee) {
                                    return null;
                                }

                                return (
                                    <div key={draft.employeeId} className="mb-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                                        <p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">
                                            {employee.first_name} {employee.last_name}
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                <span>Attendance</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={draft.attendanceDays}
                                                    onChange={(event) => updateDraft(draft.employeeId, { attendanceDays: Number(event.target.value) })}
                                                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                <span>Absences</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={draft.absenceDays}
                                                    onChange={(event) => updateDraft(draft.employeeId, { absenceDays: Number(event.target.value) })}
                                                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                <span>Overtime</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.5"
                                                    value={draft.overtimeHours}
                                                    onChange={(event) => updateDraft(draft.employeeId, { overtimeHours: Number(event.target.value) })}
                                                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="min-h-0 bg-slate-50/60 dark:bg-slate-900/20">
                        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.earningsControls}</h3>
                        </div>
                        <div className="max-h-full overflow-y-auto px-3 py-3">
                            {visibleDrafts.filter((draft) => draft.include).map((draft) => {
                                const employee = employeesById.get(draft.employeeId);
                                if (!employee) {
                                    return null;
                                }

                                return (
                                    <div key={draft.employeeId} className="mb-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                                        <p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">
                                            {employee.first_name} {employee.last_name}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                <span>Earnings +</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={draft.additionalEarnings}
                                                    onChange={(event) => updateDraft(draft.employeeId, { additionalEarnings: Number(event.target.value) })}
                                                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                <span>Deductions -</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={draft.deductions}
                                                    onChange={(event) => updateDraft(draft.employeeId, { deductions: Number(event.target.value) })}
                                                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                                />
                                            </label>
                                        </div>
                                        <label className="mt-2 block space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                            <span>Notes</span>
                                            <textarea
                                                value={draft.notes}
                                                onChange={(event) => updateDraft(draft.employeeId, { notes: event.target.value })}
                                                className="min-h-[70px] w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-900 focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                            />
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </main>

                <footer className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Proposal ready: selected employees and attendance/earnings controls are captured in a draft for payroll generation.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} disabled={isSaving}>
                                {copy.cancel}
                            </Button>
                            <Button
                                onClick={() => onGenerate({
                                    payPeriod,
                                    groupingMode,
                                    periodRange,
                                    periodFrom,
                                    periodTo,
                                    employeeDrafts,
                                })}
                                disabled={isSaving || selectedCount === 0}
                                className="gap-2 bg-[#143675] text-white hover:bg-[#0f2855]"
                            >
                                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                {copy.generate}
                            </Button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
