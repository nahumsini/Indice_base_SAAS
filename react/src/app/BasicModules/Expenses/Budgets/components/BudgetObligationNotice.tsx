import type { BudgetObligationReview } from '../../services/budget-lines.service';

export function BudgetObligationNotice({ reviews, error, locale, onRetry }: {
  reviews: BudgetObligationReview[]; error: string; locale: string; onRetry: () => void;
}) {
  const es = locale.startsWith('es');
  const reasons: Record<string, string> = es ? {
    HISTORICAL_RECONCILIATION: 'Periodo anterior: conciliar antes de generar una deuda histórica.',
    EXISTING_FINANCIAL_ACTIVITY: 'Tiene pagos o movimientos previos que deben conciliarse.',
    POSSIBLE_MANUAL_EXPENSE: 'Existe un gasto parecido en ese mes. Revisa para evitar duplicarlo.',
    INVALID_REFERENCE: 'Revisa el proveedor y la cuenta contable de la partida.',
    INVALID_SCHEDULE: 'La partida necesita una fecha de vencimiento válida.',
    INVALID_BUDGET_SCOPE: 'Revisa periodo, moneda, unidad y negocio del presupuesto.',
    INVALID_AMOUNTS: 'Revisa el monto y los impuestos de la partida.',
    INVALID_CONCEPT: 'Revisa el concepto de la partida.',
    RETRY_REQUIRED: 'No se pudo completar la generación. Puedes reintentar.',
  } : {
    HISTORICAL_RECONCILIATION: 'Earlier period: reconcile before creating historical debt.',
    EXISTING_FINANCIAL_ACTIVITY: 'Existing payments or activity require reconciliation.',
    POSSIBLE_MANUAL_EXPENSE: 'A similar expense exists in this month. Review to avoid duplicates.',
    INVALID_REFERENCE: 'Check the line’s supplier and accounting account.',
    INVALID_SCHEDULE: 'The line needs a valid due date.',
    INVALID_BUDGET_SCOPE: 'Check the budget period, currency, unit and business.',
    INVALID_AMOUNTS: 'Check the line’s amount and taxes.',
    INVALID_CONCEPT: 'Check the line’s description.',
    RETRY_REQUIRED: 'Generation could not be completed. You can retry.',
  };
  if (!error && !reviews.length) return null;
  return (
    <div role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      {error && <p role="alert">{es ? 'No se pudo verificar la generación de cuentas por pagar desde presupuestos.' : 'Budget payable generation could not be verified.'} {error}</p>}
      {reviews.length > 0 && <details>
        <summary className="cursor-pointer font-medium">{reviews.length} {es ? 'partidas presupuestales por conciliar' : 'budget lines require reconciliation'}</summary>
        <ul className="mt-3 max-h-60 space-y-2 overflow-auto">
          {reviews.map(row => <li key={row.budgetLineId}><strong>{row.name}</strong> — {reasons[row.reason] || (es ? 'Revisa la partida.' : 'Review this budget line.')}</li>)}
        </ul>
      </details>}
      {(error || reviews.some(row => row.reason === 'RETRY_REQUIRED')) && <button type="button" onClick={onRetry} className="mt-2 rounded-lg border border-amber-300 px-3 py-2 font-medium">{es ? 'Reintentar' : 'Retry'}</button>}
    </div>
  );
}
