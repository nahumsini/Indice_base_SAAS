import { Boxes, ShoppingCart, UsersRound } from "lucide-react";
import { AccountStepTitle } from "../../AccountCreation/components/AccountCreationPrimitives";
import type { QuickTestAccountCopy } from "../translations";
import type {
  QuickTestScenario,
  QuickTestScenarioOption,
} from "../types";

const scenarioIcons = {
  people: UsersRound,
  commerce: ShoppingCart,
  complete: Boxes,
} satisfies Record<QuickTestScenario, typeof Boxes>;

export function QuickScenarioStep({
  copy,
  selected,
  options,
  onSelect,
}: {
  copy: QuickTestAccountCopy;
  selected: QuickTestScenario;
  options: QuickTestScenarioOption[];
  onSelect: (scenario: QuickTestScenario) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <AccountStepTitle
        number="1"
        icon={Boxes}
        title={copy.scenario.title}
        description={copy.scenario.description}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map((option) => {
          const Icon = scenarioIcons[option.id];
          const active = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.id)}
              className={`min-h-48 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/30 ${
                active
                  ? "border-[#59C3A5] bg-[#59C3A5]/10 shadow-sm"
                  : "border-slate-200 bg-white hover:border-[#59C3A5] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${
                  active
                    ? "bg-[#177D66] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 block text-base font-medium text-slate-950 dark:text-white">
                {option.label}
              </span>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
                {option.description}
              </p>
              <span className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-white px-2 py-1 shadow-sm">
                  {copy.scenario.modules(option.moduleCount)}
                </span>
                <span className="rounded-full bg-white px-2 py-1 shadow-sm">
                  {copy.scenario.employees(option.employeeCount)}
                </span>
                <span className="rounded-full bg-white px-2 py-1 shadow-sm">
                  {copy.scenario.days(option.accessDays)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
