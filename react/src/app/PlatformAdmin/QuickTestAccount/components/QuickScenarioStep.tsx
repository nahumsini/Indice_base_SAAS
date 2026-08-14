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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
              className={`min-h-48 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 ${
                active
                  ? "border-[#2563EB] bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${
                  active
                    ? "bg-[#2563EB] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <strong className="mt-4 block text-base text-slate-950">
                {option.label}
              </strong>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
                {option.description}
              </p>
              <span className="mt-4 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-600">
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
