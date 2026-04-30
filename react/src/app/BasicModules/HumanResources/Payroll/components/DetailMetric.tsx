type DetailMetricProps = {
    label: string;
    value: string;
};

export function DetailMetric({ label, value }: DetailMetricProps) {
    return (
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}
