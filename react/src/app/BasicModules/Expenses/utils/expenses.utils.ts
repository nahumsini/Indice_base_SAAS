import { defaultBusinessCurrency, formatBusinessCurrencyAmount } from '../../shared/businessCurrency';

/**
 * Format currency with proper symbol and locale
 */
export const formatCurrency = (amount: number, currency: string = defaultBusinessCurrency): string => {
  return formatBusinessCurrencyAmount(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format date to readable string
 */
export const formatDate = (date?: Date | null): string => {
  if (!date || !Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format date and time
 */
export const formatDateTime = (date?: Date | null): string => {
  if (!date || !Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Get status badge color classes
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    audited: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    exceeded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return colors[status] || colors.pending;
};

/**
 * Get status label in Spanish
 */
export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Por Pagar',
    paid: 'Pagado',
    partial: 'Pago Parcial',
    overdue: 'Vencido',
    audited: 'Auditado',
  };
  return labels[status] || status;
};

/**
 * Get payment method display name
 */
export const getPaymentMethodName = (method: string): string => {
  const names: Record<string, string> = {
    cash: 'Efectivo',
    credit_card: 'Tarjeta de Crédito',
    debit_card: 'Tarjeta de Débito',
    transfer: 'Transferencia',
    check: 'Cheque',
  };
  return names[method] || method;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Get rating stars
 */
export const getRatingStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '✨';
  return stars;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Sort array by field
 */
export const sortBy = <T>(array: T[], field: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Filter by search term
 */
export const filterBySearch = <T>(array: T[], searchTerm: string, fields: (keyof T)[]): T[] => {
  if (!searchTerm) return array;
  
  const lowerSearch = searchTerm.toLowerCase();
  return array.filter(item => 
    fields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(lowerSearch);
    })
  );
};

/**
 * Group array by field
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Generate unique ID
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
