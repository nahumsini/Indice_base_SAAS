import type { AccountingAccount } from './types';

export const mockAccounts: AccountingAccount[] = [
  { id: '1', code: '5110', name: 'Gastos de Oficina', type: 'expense', description: 'Gastos generales de oficina y suministros', isActive: true, balance: 15000.00 },
  { id: '2', code: '5120', name: 'Servicios Públicos', type: 'expense', description: 'Electricidad, agua, gas, internet', isActive: true, balance: 8500.00 },
  { id: '3', code: '5130', name: 'Mantenimiento', type: 'expense', description: 'Mantenimiento de equipos e instalaciones', isActive: true, balance: 12000.00 },
  { id: '4', code: '5140', name: 'Publicidad y Marketing', type: 'expense', description: 'Gastos en publicidad, marketing y promoción', isActive: true, balance: 25000.00 },
  { id: '5', code: '5150', name: 'Honorarios Profesionales', type: 'expense', description: 'Servicios de consultores, abogados, contadores', isActive: true, balance: 30000.00 },
  { id: '6', code: '5160', name: 'Seguros', type: 'expense', description: 'Pólizas de seguros diversos', isActive: true, balance: 18000.00 },
  { id: '7', code: '5170', name: 'Arrendamiento', type: 'expense', description: 'Renta de oficinas y locales', isActive: true, balance: 40000.00 },
  { id: '8', code: '1110', name: 'Caja', type: 'asset', description: 'Efectivo en caja', isActive: true, balance: 50000.00 },
  { id: '9', code: '1120', name: 'Bancos', type: 'asset', description: 'Cuentas bancarias', isActive: true, balance: 250000.00 },
  { id: '10', code: '2110', name: 'Proveedores', type: 'liability', description: 'Cuentas por pagar a proveedores', isActive: true, balance: 85000.00 },
];
