import { ExpenseCategory } from '../types/expenses.types';

export const expenseCategories: ExpenseCategory[] = [
  { id: 'payroll', name: 'Payroll', emoji: '💼', color: 'blue' },
  { id: 'office', name: 'Office', emoji: '🏢', color: 'gray' },
  { id: 'technology', name: 'Technology', emoji: '💻', color: 'purple' },
  { id: 'marketing', name: 'Marketing', emoji: '📢', color: 'pink' },
  { id: 'services', name: 'Services', emoji: '🔧', color: 'orange' },
  { id: 'transport', name: 'Transport', emoji: '🚗', color: 'yellow' },
  { id: 'food', name: 'Food & Beverage', emoji: '🍽️', color: 'red' },
  { id: 'legal', name: 'Legal', emoji: '⚖️', color: 'indigo' },
  { id: 'insurance', name: 'Insurance', emoji: '🛡️', color: 'teal' },
  { id: 'utilities', name: 'Utilities', emoji: '💡', color: 'cyan' },
  { id: 'rent', name: 'Rent', emoji: '🏠', color: 'emerald' },
  { id: 'supplies', name: 'Supplies', emoji: '📦', color: 'lime' },
  { id: 'maintenance', name: 'Maintenance', emoji: '🔨', color: 'amber' },
  { id: 'training', name: 'Training', emoji: '📚', color: 'violet' },
  { id: 'other', name: 'Other', emoji: '📋', color: 'slate' },
];

export const getCategoryById = (id: string): ExpenseCategory | undefined => {
  return expenseCategories.find(cat => cat.id === id);
};

export const getCategoryColor = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    lime: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  };
  return colorMap[colorName] || colorMap.gray;
};
