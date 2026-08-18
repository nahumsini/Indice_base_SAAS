import { useState } from 'react';

type ValidityUnit = 'hours' | 'days';

const unitMinutes: Record<ValidityUnit, number> = {
  hours: 60,
  days: 24 * 60,
};

function initialUnit(minutes: number): ValidityUnit {
  return minutes >= unitMinutes.days && minutes % unitMinutes.days === 0 ? 'days' : 'hours';
}

export function PreticketValidityField({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const [unit, setUnit] = useState<ValidityUnit>(() => initialUnit(minutes));
  const factor = unitMinutes[unit];
  const quantity = Number((minutes / factor).toFixed(2));
  const max = unit === 'hours' ? 24 : 30;
  const step = unit === 'hours' ? 0.25 : 1;

  const changeUnit = (nextUnit: ValidityUnit) => {
    const nextFactor = unitMinutes[nextUnit];
    const nextMax = nextUnit === 'hours' ? 24 : 30;
    const safeQuantity = Math.min(Math.max(quantity || 1, nextUnit === 'hours' ? 0.25 : 1), nextMax);
    setUnit(nextUnit);
    onChange(Math.round(safeQuantity * nextFactor));
  };

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">Vigencia del pre-ticket</span>
      <span className="grid grid-cols-[minmax(0,1fr)_140px] overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/20">
        <input
          type="number"
          min={unit === 'hours' ? 0.25 : 1}
          max={max}
          step={step}
          value={quantity}
          onChange={(event) => onChange(Math.round(Number(event.target.value) * factor))}
          className="h-12 min-w-0 border-0 bg-transparent px-4 text-sm text-[#111827] outline-none"
          aria-label="Cantidad de vigencia"
        />
        <select
          value={unit}
          onChange={(event) => changeUnit(event.target.value as ValidityUnit)}
          className="h-12 border-0 border-l border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
          aria-label="Unidad de vigencia"
        >
          <option value="hours">Horas</option>
          <option value="days">Días</option>
        </select>
      </span>
      <span className="mt-1.5 block text-xs text-slate-500">
        El pre-ticket vencerá automáticamente después de este tiempo.
      </span>
    </label>
  );
}
