import type { QuotePdfContext } from '../../src/app/BasicModules/Sales/Cotizacion/quotePdf';
import { esMX as copy } from '../../src/app/BasicModules/Sales/Cotizacion/translations/es-MX';
const quote: QuotePdfContext['quote'] = {
  id: 'quote-fixture', quoteNumber: 'COT-QA-001', clientName: 'Cliente de prueba', contactPerson: 'Contacto de prueba', status: 'Draft',
  createdDate: '2026-10-18', expirationDate: '2026-11-18', assignedSeller: 'Vendedor de prueba', currency: 'MXN',
  items: [{ id: 'one', productName: 'Servicio de prueba', sku: 'QA-01', section: 'Servicios', quantity: 2, unitPrice: 100, unitCost: 30, discountPercent: 10, taxPercent: 16, taxLabel: 'IVA', notes: 'Alcance completo', originalCurrency: 'USD', originalUnitPrice: 5, exchangeRate: 20, exchangeRateDate: '2026-10-18' }],
  subtotal: 200, discountTotal: 20, taxTotal: 28.8, total: 208.8, notes: 'Nota comercial completa', terms: 'Condición comercial completa', files: [], lastUpdated: '2026-10-18',
};
export const context: QuotePdfContext = { quote, copy, locale: 'es-MX', generatedAt: new Date('2026-10-18T12:00:00Z'),
  company: { name: 'Emisor de prueba', address: 'Dirección completa del emisor', email: 'issuer@example.invalid', phone: '1234', logoUrl: '' },
  contact: { phone: '5551234', email: 'client@example.invalid', fiscalTaxId: 'TEST-ID', fiscalLegalName: 'Razón social completa', fiscalRegime: 'Régimen de prueba', fiscalAddressLine1: 'Domicilio fiscal completo' } as QuotePdfContext['contact'],
  opportunity: { opportunityName: 'Proyecto relacionado' } as QuotePdfContext['opportunity'],
};
