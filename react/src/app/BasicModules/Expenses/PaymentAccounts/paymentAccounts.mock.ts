import type { PaymentAccount } from './types';

export const mockPaymentAccounts: PaymentAccount[] = [
  { id: '1', name: 'Cuenta Corriente Principal', type: 'bank', accountNumber: '****1234', bank: 'BBVA Bancomer', currency: 'MXN', balance: 250000.00, isActive: true, lastTransaction: '2026-04-01' },
  { id: '2', name: 'Cuenta de Ahorros', type: 'bank', accountNumber: '****5678', bank: 'Santander', currency: 'MXN', balance: 150000.00, isActive: true, lastTransaction: '2026-03-30' },
  { id: '3', name: 'Caja Chica', type: 'cash', currency: 'MXN', balance: 15000.00, isActive: true, lastTransaction: '2026-04-02' },
  { id: '4', name: 'Tarjeta Empresarial', type: 'credit_card', accountNumber: '****9012', bank: 'American Express', currency: 'MXN', balance: 85000.00, isActive: true, lastTransaction: '2026-04-01' },
  { id: '5', name: 'Tarjeta Débito Operaciones', type: 'debit_card', accountNumber: '****3456', bank: 'HSBC', currency: 'MXN', balance: 45000.00, isActive: true, lastTransaction: '2026-04-02' },
  { id: '6', name: 'PayPal Business', type: 'digital_wallet', accountNumber: 'business@empresa.com', currency: 'USD', balance: 12500.00, isActive: true, lastTransaction: '2026-03-29' },
  { id: '7', name: 'Cuenta USD', type: 'bank', accountNumber: '****7890', bank: 'Citibanamex', currency: 'USD', balance: 35000.00, isActive: true, lastTransaction: '2026-03-28' },
  { id: '8', name: 'Tarjeta Corporativa Respaldo', type: 'credit_card', accountNumber: '****2468', bank: 'Visa', currency: 'MXN', balance: 120000.00, isActive: false, lastTransaction: '2026-02-15' },
];
