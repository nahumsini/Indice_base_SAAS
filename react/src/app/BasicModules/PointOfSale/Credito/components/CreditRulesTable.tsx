import type { ReactNode } from 'react';
import { Edit2 } from 'lucide-react';
import type {
  CreditDecisionStatus,
  CreditEvaluationResult,
  CreditRiskLevel,
  CreditRule,
  CreditRuleStatus,
} from '../../shared/commercial/credit';
import type { Customer } from '../../shared/commercial/customers';

export interface CreditRuleRow {
  rule: CreditRule;
  customer?: Customer;
  evaluation: CreditEvaluationResult;
}

interface CreditRulesTableProps {
  rows: CreditRuleRow[];
  customerById: Map<string, Customer>;
  onEdit: (rule: CreditRule) => void;
  onToggleStatus: (rule: CreditRule) => void;
}

const statusLabels: Record<CreditRuleStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  suspended: 'Suspendida',
};

const riskLabels: Record<CreditRiskLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};

const decisionLabels: Record<CreditDecisionStatus, string> = {
  approved: 'Aprobado',
  review: 'Revision',
  blocked: 'Bloqueado',
};

const statusClasses: Record<CreditRuleStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const riskClasses: Record<CreditRiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const decisionClasses: Record<CreditDecisionStatus, string> = {
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const formatCurrency = (amount: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);

const formatDate = (date: Date) => new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(date);

function getRuleSubject(rule: CreditRule, customerById: Map<string, Customer>) {
  const customer = rule.customerId ? customerById.get(rule.customerId) : undefined;
  return customer?.name ?? rule.customerGroup ?? 'General';
}

export function CreditRulesTable({
  rows,
  customerById,
  onEdit,
  onToggleStatus,
}: CreditRulesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              {['Politica', 'Cliente / grupo', 'Linea', 'Plazo', 'Mora', 'Control', 'Preview', 'Riesgo', 'Estado', ''].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map(({ rule, customer, evaluation }) => (
              <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-950 dark:text-white">{rule.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{rule.id}</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">{customer?.name ?? getRuleSubject(rule, customerById)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{customer?.customerType === 'business' ? 'Empresa' : customer ? 'Persona' : 'Regla por grupo'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-950 dark:text-white">{formatCurrency(rule.creditLimit, rule.currency)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(evaluation.availableCredit, rule.currency)} disponible</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p>{rule.paymentTermDays} dias</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">vence {formatDate(evaluation.dueDate)}</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p>{rule.lateInterestRate}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(rule.penaltyFee, rule.currency)} pena</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p>{rule.blockWhenOverdue ? 'Bloquea vencido' : 'Permite revision'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{rule.reviewAtUtilizationPercent ?? 80}% uso revision</p>
                </td>
                <td className="px-4 py-3">
                  <Badge className={decisionClasses[evaluation.decision]}>{decisionLabels[evaluation.decision]}</Badge>
                  <p className="mt-1 max-w-[220px] text-xs text-gray-500 dark:text-gray-400">{evaluation.messages[0]}</p>
                </td>
                <td className="px-4 py-3"><Badge className={riskClasses[rule.riskLevel]}>{riskLabels[rule.riskLevel]}</Badge></td>
                <td className="px-4 py-3"><Badge className={statusClasses[rule.status]}>{statusLabels[rule.status]}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onToggleStatus(rule)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                      {rule.status === 'active' ? 'Pausar' : 'Activar'}
                    </button>
                    <button onClick={() => onEdit(rule)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-200">Sin politicas con esos filtros</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajusta filtros o crea una politica de credito.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${className}`}>{children}</span>;
}
