import type { SalesKpiSellerRankingRow } from '../salesKpiSelectors';
import type { SalesKpisTranslations } from '../translations';

function percent(value: number) {
  return `${Math.round(value)}%`;
}

export function SalesSellerRanking({
  copy,
  rows,
  sellerMoney,
}: {
  copy: SalesKpisTranslations;
  rows: SalesKpiSellerRankingRow[];
  sellerMoney: Map<string, { pipeline: string; sales: string }>;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{copy.sellerTable.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.sellerTable.subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-5 py-4">{copy.sellerTable.columns.rank}</th>
              <th className="px-5 py-4">{copy.sellerTable.columns.seller}</th>
              <th className="px-5 py-4">{copy.sellerTable.columns.sales}</th>
              <th className="px-5 py-4">{copy.sellerTable.columns.pipeline}</th>
              <th className="px-5 py-4">{copy.sellerTable.columns.quotes}</th>
              <th className="px-5 py-4">{copy.sellerTable.columns.closed}</th>
              <th className="px-5 py-4">{copy.sellerTable.columns.conversion}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.seller} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4 font-bold text-slate-950 dark:text-white">#{index + 1}</td>
                <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">{row.seller}</td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">{sellerMoney.get(row.seller)?.sales}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{sellerMoney.get(row.seller)?.pipeline}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{row.quotes}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{row.closed}</td>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{percent(row.conversion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
