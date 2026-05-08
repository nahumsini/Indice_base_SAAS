import { Search } from 'lucide-react';

interface AnnouncementFiltersProps {
  audienceOptions: ReadonlyArray<{ value: string; label: string }>;
  searchQuery: string;
  selectedAudience: string;
  selectedStatus: string;
  selectedType: string;
  statusOptions: readonly string[];
  typeOptions: readonly string[];
  onAudienceChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

export function AnnouncementFilters({
  audienceOptions,
  searchQuery,
  selectedAudience,
  selectedStatus,
  selectedType,
  statusOptions,
  typeOptions,
  onAudienceChange,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: AnnouncementFiltersProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">Filters</h3>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Search announcement
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Title, author, audience, or preview"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </label>

        <FilterSelect
          label="Type"
          value={selectedType}
          options={typeOptions.map((option) => ({ value: option, label: option === 'All' ? 'All' : option }))}
          onChange={onTypeChange}
        />
        <FilterSelect
          label="Status"
          value={selectedStatus}
          options={statusOptions.map((option) => ({ value: option, label: option === 'All' ? 'All' : option }))}
          onChange={onStatusChange}
        />
        <FilterSelect
          label="Audience"
          value={selectedAudience}
          options={audienceOptions}
          onChange={onAudienceChange}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
