import { useCallback } from "react";
import { maintenanceApi, query } from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Feedback,
  panel,
  useMaintenanceQuery,
} from "./MaintenancePrimitives";

const messages = {
  en: [
    "Cost of closed work orders",
    "Selected closure period. Amounts remain in their original currency; paid services are separate from incurred costs.",
    "More than 500 orders. Narrow the period to calculate complete totals.",
  ],
  es: [
    "Costo de las órdenes cerradas",
    "Período de cierre seleccionado. Cada moneda conserva su total; los servicios pagados se muestran por separado del costo realizado.",
    "Hay más de 500 órdenes. Reduce el período para calcular totales completos.",
  ],
  fr: [
    "Coût des ordres clôturés",
    "Période de clôture sélectionnée. Les devises restent séparées; les services payés sont distincts des coûts engagés.",
    "Plus de 500 ordres. Réduisez la période pour calculer les totaux complets.",
  ],
  pt: [
    "Custo das ordens encerradas",
    "Período de encerramento selecionado. As moedas permanecem separadas; os serviços pagos são distintos dos custos realizados.",
    "Mais de 500 ordens. Reduza o período para calcular os totais completos.",
  ],
  ko: [
    "완료된 작업 지시 비용",
    "선택한 완료 기간입니다. 통화별로 합산하며 지급한 서비스 비용은 발생 비용과 별도로 표시합니다.",
    "작업 지시가 500건을 초과합니다. 전체 합계를 계산하려면 기간을 줄이세요.",
  ],
  zh: [
    "已关闭工单的费用",
    "所选关闭期间。各币种单独汇总；已支付服务费用与实际发生费用分别显示。",
    "工单超过500份。请缩短期间以计算完整总额。",
  ],
} as const;
type Summary = {
  orders: number;
  limit: number;
  limited: boolean;
  currencies: {
    currency: string;
    orders: number;
    estimated: number;
    actual: number | null;
    paidServices: number | null;
    complete: boolean;
  }[];
};
export function MaintenanceCostSummary({
  c,
  locale,
  from,
  to,
}: {
  c: MaintenanceCopy;
  locale: string;
  from: string;
  to: string;
}) {
  const copy =
    messages[locale.slice(0, 2) as keyof typeof messages] ?? messages.en;
  const result = useMaintenanceQuery(
    useCallback(
      (signal) => {
        const end = new Date(`${to}T00:00:00`);
        end.setDate(end.getDate() + 1);
        return maintenanceApi.get<Summary>(
          "/metrics/costs" +
            query({
              from: new Date(`${from}T00:00:00`).toISOString(),
              to: end.toISOString(),
            }),
          signal,
        );
      },
      [from, to],
    ),
  );
  const money = (amount: number | null, currency: string) =>
    amount === null
      ? c.noData
      : new Intl.NumberFormat(locale, { style: "currency", currency }).format(
          amount,
        );
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">{copy[0]}</h3>
      <p className="text-sm text-slate-500">{copy[1]}</p>
      {result.loading ? (
        <Feedback>{c.loading}</Feedback>
      ) : result.error ? (
        <Feedback error>
          {c.error} <Action onClick={result.reload}>{c.retry}</Action>
        </Feedback>
      ) : result.data?.limited ? (
        <Feedback>{copy[2]}</Feedback>
      ) : !result.data?.orders ? (
        <Feedback>{c.noData}</Feedback>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {result.data.currencies.map((row) => (
            <article className={panel} key={row.currency}>
              <h4 className="font-semibold">
                {row.currency} · {row.orders} {c.records}
              </h4>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {[
                  [c.estimate, row.estimated],
                  [c.actual, row.actual],
                  [c.paidServices, row.paidServices],
                ].map(([title, amount]) => (
                  <div key={title as string}>
                    <dt className="text-sm text-slate-500">{title}</dt>
                    <dd>{money(amount as number | null, row.currency)}</dd>
                  </div>
                ))}
              </dl>
              {!row.complete && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  {c.incompleteCost}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
