import { ChevronDown, ChevronRight, ExternalLink, Eye, LockKeyhole, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Expense } from '../../types/expenses.types';
import type { ExpenseFundGroup, FundMoney, FundMoneyField } from '../../utils/expenseFundGroups';
import { EXPENSE_TABLE_HEADERS } from '../../constants/expenseTableConfig';
import { formatCurrency } from '../../utils/expenses.utils';
import { getStatusBadgeColor } from '../../components/table/ExpenseInlineControls';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import type { EditableExpenseRowOptions } from './EditableExpenseRow';
import { getExpenseFundGroupCopy } from './expenseFundGroup.copy';
import { getExpenseDetailCopy } from './expenseDetail.copy';

type Props = {
  group: ExpenseFundGroup;
  money?: FundMoney;
  periodLabel: string;
  filtered: boolean;
  expanded: boolean;
  onToggle: () => void;
  isColumnVisible: (key: string) => boolean;
  columnWidths: Record<string, number>;
  columnCount: number;
  options: EditableExpenseRowOptions;
  onViewExpense: (expense: Expense) => void;
  onOpenAttachments: (expense: Expense) => void;
  getAttachments: (expense: Expense) => string[];
  mobile?: boolean;
};

const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#147514] hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 dark:border-slate-600 dark:bg-slate-800 dark:text-green-300 dark:hover:bg-slate-700';

export function ExpenseFundGroupRow({ group, money, periodLabel, filtered, expanded, onToggle,
  isColumnVisible, columnWidths, columnCount, options, onViewExpense, onOpenAttachments, getAttachments, mobile = false }: Props) {
  const t = useExpensesTranslations();
  const locale = useExpensesResolvedLocale();
  const copy = getExpenseFundGroupCopy(locale);
  const detailCopy = getExpenseDetailCopy(locale);
  const detailId = `${mobile ? 'mobile' : 'table'}-${group.key}`;
  const count = `${group.expenses.length} ${filtered ? copy.matching : copy.authorized}`;
  const formatMoney = (value?: number) => value == null ? '—' : `${formatCurrency(value, group.currency)} ${group.currency}`;
  const common = (values: Array<string | undefined>, multiple = copy.various) => {
    const distinct = [...new Set(values.map(value => value || '—'))];
    return distinct.length === 1 ? distinct[0] : multiple;
  };
  const accountLabel = (id?: string) => options.accountingAccounts.find(option => option.value === id)?.label ?? id;
  const account = common(group.expenses.map(expense => accountLabel(expense.accountingAccount)), copy.accounts);
  const status = <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusBadgeColor('paid')}`}>{t.expenses.table.statuses.paid}</span>;
  const toggle = <button type="button" className={buttonClass} aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}>
    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{expanded ? copy.hide : copy.details}
  </button>;
  const fundLink = <a className={buttonClass} href={`/petty-cash/control?fundId=${encodeURIComponent(group.fund.id)}`}>
    <ExternalLink className="h-4 w-4" />{copy.open}
  </a>;
  const renderCell = (key: string): ReactNode => {
    if (['total', 'taxes', 'amount', 'amountPaid', 'balance'].includes(key)) return formatMoney(money?.[key as FundMoneyField]);
    switch (key) {
      case 'folio': return <span className="text-xs font-medium text-[#147514] dark:text-green-300">{copy.fund}</span>;
      case 'date': return periodLabel;
      case 'concept': return <div className="min-w-40"><strong className="block font-medium">{group.fund.name}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{count}</span></div>;
      case 'description': return count;
      case 'providerName': return common(group.expenses.map(expense => expense.providerName));
      case 'businessUnit': return common(group.expenses.map(expense => options.businessUnits.find(option => option.value === expense.businessUnit)?.label ?? expense.businessUnit));
      case 'business': return common(group.expenses.map(expense => options.businesses.find(option => option.value === expense.business)?.label ?? expense.business));
      case 'accountingAccount': return <div className="flex items-start gap-2" title={copy.locked}><LockKeyhole aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400" /><div>{account}<span className="block text-xs text-slate-500 dark:text-slate-400">{group.fund.name}</span></div></div>;
      case 'status': return status;
      case 'paymentMethod': return common(group.expenses.map(expense => t.expenses.table.paymentMethods[expense.paymentMethod] ?? expense.paymentMethod));
      case 'attachments': return <button type="button" className={buttonClass} onClick={onToggle} aria-expanded={expanded} aria-controls={detailId}><Paperclip className="h-4 w-4" />{copy.details}</button>;
      default: return '—';
    }
  };
  const details = <div id={detailId} className={`space-y-3 p-4 ${mobile ? '' : 'sticky left-0 w-[100cqw] max-w-full'}`} role="region" aria-label={`${copy.details}: ${group.fund.name}`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">{group.fund.name} · {periodLabel} · {count}</p>{fundLink}</div>
    <div className="max-h-[32rem] space-y-2 overflow-y-auto" tabIndex={0} aria-label={`${copy.details}: ${count}`}>
      {group.expenses.map(expense => <article key={expense.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800" data-fund-expense-id={expense.id}>
        <div className="w-28 shrink-0 text-xs"><span className="block font-mono">{expense.folio}</span><span className="text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(expense.date)}</span></div>
        <div className="min-w-36 flex-1"><p className="text-sm font-medium">{expense.concept}</p><p className="text-xs text-slate-500 dark:text-slate-400">{expense.providerName || '—'} · {accountLabel(expense.accountingAccount) || '—'}</p></div>
        <div className="text-right text-sm"><strong className="block">{formatMoney(expense.total)}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{t.expenses.columns.taxes.label}: {formatMoney(expense.taxes)}</span></div>
        <div className="flex gap-2">
          <button type="button" className={buttonClass} onClick={() => onViewExpense(expense)} aria-label={`${detailCopy.title} ${expense.folio}`} title={`${detailCopy.title} ${expense.folio}`}><Eye className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} onClick={() => onOpenAttachments(expense)} aria-label={`${t.common.viewAttachedFiles} ${expense.folio}`}><Paperclip className="h-4 w-4" />{expense.attachmentCount ?? getAttachments(expense).length}</button>
        </div>
      </article>)}
    </div>
  </div>;

  if (mobile) return <article className="overflow-hidden rounded-xl border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
    <div className="space-y-3 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="text-xs text-slate-500 dark:text-slate-400">{copy.fund} · {periodLabel}</span><h3 className="font-medium">{group.fund.name}</h3><p className="text-xs">{count}</p></div>{status}</div>
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{t.expenses.columns.total.label}: <strong>{formatMoney(money?.total)}</strong></span><span>{t.expenses.columns.balance.label}: {formatMoney(money?.balance)}</span></div>
      <p className="flex items-center gap-2 text-xs"><LockKeyhole className="h-3.5 w-3.5" />{account}</p>{toggle}
    </div>{expanded && details}
  </article>;
  return <>
    <tr className="bg-green-50/50 text-sm text-slate-800 dark:bg-green-950/20 dark:text-slate-100" data-fund-group={group.key}>
      <td className="px-5 py-4"><button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailId} aria-label={`${expanded ? copy.hide : copy.details}: ${group.fund.name}`} className="rounded-lg p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></td>
      {EXPENSE_TABLE_HEADERS.filter(column => isColumnVisible(column.visibleWhen ?? column.key)).map(column => <td key={column.key} className="px-6 py-4" style={{ width: columnWidths[column.key], minWidth: columnWidths[column.key] }}>{renderCell(column.key)}</td>)}
      <td className="whitespace-nowrap px-6 py-4 text-center">{toggle}</td>
    </tr>
    {expanded && <tr className="bg-slate-50 dark:bg-slate-900/50"><td colSpan={columnCount}>{details}</td></tr>}
  </>;
}
