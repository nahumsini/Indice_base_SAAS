import { usePersistentColumnWidths } from '../../hooks/usePersistentColumnWidths';
import { BarChart3, CalendarDays, Receipt, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndiceFilterSelect } from "../../components/frontend-os/IndiceFilterBar";
import { TableBody, TableCell, TableRow } from "../../components/ui/table";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
} from "../../components/table/IndiceTableEngine";
import { Button } from "../../components/ui/button";
import { channelLabel, originLabel, type BoardCopy } from "./boardCopy";
import {
  amountShare,
  completeAmount,
  dateLabel,
  moneyLabel,
  type Workspace,
} from "./boardModel";

export const panelClass =
  "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800";
type Props = { data: Workspace; copy: BoardCopy; locale: string };
export function BoardOverview({
  data,
  copy,
  locale,
  onSales,
}: Props & { onSales: (activeOnly: boolean) => void }) {
  const {
    summary: s,
    analytics: { comparison: p },
  } = data;
  const currency = s.total.preferredCurrency;
  const amount = (n: number | null) => moneyLabel(n, currency, locale);
  const change = (value: number | null) =>
    value === null
      ? copy.noComparison
      : `${value > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  const metrics = [
    {
      label: copy.total,
      value: amount(completeAmount(s.total)),
      previous: amount(completeAmount(p.total)),
      change: p.totalChangePercent,
      icon: TrendingUp,
    },
    {
      label: copy.count,
      value: s.active.toLocaleString(locale),
      previous: p.active.toLocaleString(locale),
      change: p.volumeChangePercent,
      icon: Receipt,
    },
    {
      label: copy.average,
      value: amount(s.averageTicket),
      previous: amount(p.averageTicket),
      change: p.averageChangePercent,
      icon: BarChart3,
    },
  ];
  const leading = data.channels
    .filter((group) => completeAmount(group.summary.total) !== null)
    .sort(
      (a, b) =>
        (completeAmount(b.summary.total) ?? 0) -
        (completeAmount(a.summary.total) ?? 0),
    )[0];
  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {metrics.map((metric) => (
          <section
            key={metric.label}
            className={`${panelClass} border-t-4 border-t-[#FF6B5E]/50`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <metric.icon
                aria-hidden
                className="h-5 w-5 text-[#b63b32] dark:text-[#ff9d94]"
              />
              <h3>{metric.label}</h3>
            </div>
            <p className="mt-4 break-words text-2xl font-medium tabular-nums">
              {metric.value}
            </p>
            <p
              className={`mt-3 text-sm font-medium ${metric.change === null || metric.change === 0 ? "text-slate-500 dark:text-slate-400" : metric.change > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
            >
              {change(metric.change)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {copy.previous}: {metric.previous}
            </p>
            <button
              className="mt-3 min-h-11 text-sm font-medium text-[#b63b32] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#ff9d94]"
              onClick={() => onSales(true)}
            >
              {copy.reviewSales} →
            </button>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-5 dark:bg-[#FF6B5E]/10">
        <h3 className="font-medium">{copy.periodReading}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {copy.countHint}
        </p>
        {s.active < 10 && (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            {copy.lowData}
          </p>
        )}
        {leading &&
          !s.total.partial &&
          completeAmount(leading.summary.total)! > 0 && (
            <p className="mt-2 text-sm">
              {copy.leadingGroup}:{" "}
              <span className="font-medium">
                {originLabel(leading.origin, copy)} ·{" "}
                {channelLabel(leading.channel, copy)}
              </span>{" "}
              · {amount(completeAmount(leading.summary.total))}
            </p>
          )}
      </section>
      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">{copy.current}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {dateLabel(data.context.from, locale)} –{" "}
              {dateLabel(data.context.to, locale)}
            </p>
          </div>
          <Button variant="outline" className="min-h-11" onClick={() => onSales(false)}>
            {copy.reviewSales}
          </Button>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            [copy.beforeTax, amount(completeAmount(s.beforeTax))],
            [copy.tax, amount(completeAmount(s.tax))],
            [copy.cancelled, s.cancelled.toLocaleString(locale)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-500 dark:text-slate-400">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="flex gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <CalendarDays aria-hidden className="h-5 w-5 shrink-0" />
        <div>
          <p>
            {copy.previous}: {dateLabel(p.from, locale)} –{" "}
            {dateLabel(p.to, locale)}
          </p>
          <p className="mt-1">{copy.comparisonHint}</p>
        </div>
      </div>
    </div>
  );
}

export function BoardTrends({
  data,
  copy,
  locale,
  onInterval,
  granularity,
  onGranularity,
}: Props & {
  granularity: string;
  onGranularity: (value: string) => void;
  onInterval: (from: string, to: string) => void;
}) {
  const currency = data.summary.total.preferredCurrency;
  const amount = (value: number | null) => moneyLabel(value, currency, locale);
  const points = data.analytics.trend.map((point) => ({
    ...point,
    current: completeAmount(point.total),
    previous: completeAmount(point.previousTotal),
    label: dateLabel(point.from, locale),
  }));
  const max = Math.max(
    0,
    ...data.analytics.weekdays.map((day) => day.averagePerDay ?? 0),
  );
  return (
    <div className="grid min-w-0 gap-6">
      <section className={panelClass} aria-label={copy.trends}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">{copy.total}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {currency} ·{" "}
              {copy[data.analytics.granularity as "day" | "week" | "month"]}
            </p>
          </div>
          <div className="w-full sm:w-52">
            <IndiceFilterSelect
              tone="coral"
              label={copy.granularity}
              value={granularity}
              options={(["auto", "day", "week", "month"] as const).map(
                (value) => ({ value, label: copy[value] }),
              )}
              onValueChange={onGranularity}
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.trendHint} {copy.chartDrill}
        </p>
        <div
          className="mt-4 h-72 min-w-0"
          role="group"
          aria-label={`${copy.trends}: ${copy.current} / ${copy.previous}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              accessibilityLayer
              onClick={(state) => {
                const point = points[state?.activeTooltipIndex ?? -1];
                if (point) onInterval(point.from, point.to);
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid
                stroke="#94a3b8"
                strokeOpacity={0.18}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                minTickGap={45}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                width={60}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat(locale, { notation: "compact" }).format(
                    value,
                  )
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as
                    | (typeof points)[number]
                    | undefined;
                  return active && point ? (
                    <div className="max-w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-600 dark:bg-slate-900">
                      <p className="font-medium">
                        {copy.current}: {dateLabel(point.from, locale)} –{" "}
                        {dateLabel(point.to, locale)}
                      </p>
                      <p>
                        {amount(point.current)} · {point.active}{" "}
                        {copy.sales.toLowerCase()}
                      </p>
                      <p className="mt-2 font-medium">
                        {copy.previous}: {dateLabel(point.previousFrom, locale)}{" "}
                        – {dateLabel(point.previousTo, locale)}
                      </p>
                      <p>
                        {amount(point.previous)} · {point.previousActive}{" "}
                        {copy.sales.toLowerCase()}
                      </p>
                    </div>
                  ) : null;
                }}
              />
              <Line
                type="linear"
                dataKey="current"
                name={copy.current}
                stroke="#FF6B5E"
                strokeWidth={2.5}
                dot={points.length <= 31}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="previous"
                name={copy.previous}
                stroke="#64748b"
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-5 text-xs">
          <span>
            <span
              aria-hidden
              className="mr-2 inline-block w-5 border-t-2 border-[#FF6B5E]"
            />
            {copy.current}
          </span>
          <span>
            <span
              aria-hidden
              className="mr-2 inline-block w-5 border-t-2 border-dashed border-slate-500"
            />
            {copy.previous}
          </span>
        </div>
        <details className="mt-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
          <summary className="cursor-pointer py-2 font-medium">
            {copy.seriesData}
          </summary>
          <ul className="max-h-80 overflow-auto">
            {points.map((point) => (
              <li
                key={point.from}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 dark:border-slate-700"
              >
                <div>
                  <p>
                    {dateLabel(point.from, locale)} –{" "}
                    {dateLabel(point.to, locale)}
                  </p>
                  <p>
                    {copy.current}: {amount(point.current)} · {point.active}{" "}
                    {copy.sales.toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {copy.previous}: {dateLabel(point.previousFrom, locale)} –{" "}
                    {dateLabel(point.previousTo, locale)} ·{" "}
                    {amount(point.previous)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => onInterval(point.from, point.to)}
                >
                  {copy.reviewSales}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <section className={panelClass}>
        <h3 className="font-medium">{copy.weekday}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.timingHint}
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {data.analytics.weekdays.map((day) => (
            <li
              key={day.day}
              className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"
            >
              <div className="flex flex-col gap-2 text-sm">
                <span className="font-medium">
                  {new Intl.DateTimeFormat(locale, {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(new Date(Date.UTC(2026, 0, 4 + day.day)))}
                </span>
                <span>{amount(day.averagePerDay)}</span>
              </div>
              <div
                aria-hidden
                className="my-2 h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-700"
              >
                <div
                  className="h-full rounded bg-[#FF6B5E]"
                  style={{
                    width: `${max > 0 && day.averagePerDay !== null ? Math.max(0, day.averagePerDay / max) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {copy.averagePerDay} · {copy.occurrences}: {day.occurrences} ·{" "}
                {copy.sales}: {day.active}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function BoardChannels({
  data,
  copy,
  locale,
  onChannel,
}: Props & { onChannel: (origin: string, channel: string) => void }) {
  const { columnWidths, resizeColumn } = usePersistentColumnWidths({ storageKey: 'sales-board-channel-widths-v1', defaults: { origin: 120, channel: 200, share: 240, amount: 190, count: 150, average: 190 }, headerLabels: { origin: copy.origin, channel: copy.channel, share: copy.share, amount: copy.total, count: copy.count, average: copy.average } });
  const columns = [
    { id: "origin", label: copy.origin, width: 120 },
    { id: "channel", label: copy.channel, width: 200 },
    { id: "share", label: copy.share, width: 240 },
    { id: "amount", label: copy.total, width: 190 },
    { id: "count", label: copy.count, width: 150 },
    { id: "average", label: copy.average, width: 190 },
  ].map(column => ({ ...column, width: columnWidths[column.id as keyof typeof columnWidths], defaultWidth: column.width, contentMinimumWidth: column.width, resizeLabel: `${copy.resize}: ${column.label}` }));
  return (
    <section className="grid min-w-0 gap-4">
      <div className={`${panelClass} bg-[#FF6B5E]/5`}>
        <h3 className="font-medium">{copy.channels}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {copy.channelHint}
        </p>
        {(completeAmount(data.summary.total) === null ||
          completeAmount(data.summary.total)! <= 0) && (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            {copy.shareUnavailable}
          </p>
        )}
      </div>
      <IndiceTableShell>
        <IndiceOperationalTable minimumWidth={Object.values(columnWidths).reduce((sum, width) => sum + width, 150)}>
          <IndiceTableColGroup columns={columns} actionsWidth={150} />
          <IndiceTableHeaderRow
            columns={columns}
            onResize={resizeColumn}
            tone="coral"
            actions={{ label: copy.actions, width: 150 }}
          />
          <TableBody>
            {data.channels.map((group) => {
              const share = amountShare(
                group.summary.total,
                data.summary.total,
              );
              return (
                <TableRow key={`${group.origin}:${group.channel}`}>
                  <TableCell>
                    <span
                      className={`rounded-lg px-3 py-2 font-medium ${group.origin === "POS" ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#ff9d94]"}`}
                    >
                      {originLabel(group.origin, copy)}
                    </span>
                  </TableCell>
                  <TableCell>{channelLabel(group.channel, copy)}</TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">
                      {share === null
                        ? "—"
                        : new Intl.NumberFormat(locale, {
                            style: "percent",
                            maximumFractionDigits: 1,
                          }).format(share)}
                    </span>
                    <div
                      aria-hidden
                      className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                    >
                      <div
                        className={`h-full rounded-full ${group.origin === "POS" ? "bg-blue-400" : "bg-[#FF6B5E]"}`}
                        style={{
                          width: `${Math.min(100, (share ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {moneyLabel(
                      completeAmount(group.summary.total),
                      group.summary.total.preferredCurrency,
                      locale,
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {group.summary.active.toLocaleString(locale)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {moneyLabel(
                      group.summary.averageTicket,
                      group.summary.total.preferredCurrency,
                      locale,
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="min-h-11 text-[#b63b32] dark:text-[#ff9d94]"
                      onClick={() => onChannel(group.origin, group.channel)}
                    >
                      {copy.reviewSales}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>
    </section>
  );
}
