export type QuoteTaxJurisdiction =
  | 'mx'
  | 'ca'
  | 'us'
  | 'co'
  | 'br'
  | 'eu'
  | 'custom';

export type QuoteTaxCategory =
  | 'valueAdded'
  | 'sales'
  | 'withholding'
  | 'excise'
  | 'lodging'
  | 'municipal'
  | 'environmental'
  | 'import'
  | 'custom';

export type QuoteTaxPreset = {
  id: string;
  jurisdiction: QuoteTaxJurisdiction;
  label: string;
  defaultRate: number;
  category: QuoteTaxCategory;
  rateEditable: boolean;
  descriptionKey: string;
};

export const quoteTaxJurisdictions: QuoteTaxJurisdiction[] = ['mx', 'ca', 'us', 'co', 'br', 'eu', 'custom'];

export const quoteTaxPresets: QuoteTaxPreset[] = [
  { id: 'mx-iva-16', jurisdiction: 'mx', label: 'IVA 16%', defaultRate: 16, category: 'valueAdded', rateEditable: false, descriptionKey: 'mxIva16' },
  { id: 'mx-iva-0', jurisdiction: 'mx', label: 'IVA 0%', defaultRate: 0, category: 'valueAdded', rateEditable: false, descriptionKey: 'mxIva0' },
  { id: 'mx-exempt', jurisdiction: 'mx', label: 'Exento', defaultRate: 0, category: 'valueAdded', rateEditable: false, descriptionKey: 'mxExempt' },
  { id: 'mx-ieps', jurisdiction: 'mx', label: 'IEPS', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'mxIeps' },
  { id: 'mx-ish', jurisdiction: 'mx', label: 'ISH / hospedaje', defaultRate: 3, category: 'lodging', rateEditable: true, descriptionKey: 'mxIsh' },
  { id: 'mx-withholding', jurisdiction: 'mx', label: 'Retención', defaultRate: 0, category: 'withholding', rateEditable: true, descriptionKey: 'mxWithholding' },

  { id: 'ca-gst-5', jurisdiction: 'ca', label: 'GST 5%', defaultRate: 5, category: 'valueAdded', rateEditable: false, descriptionKey: 'caGst5' },
  { id: 'ca-hst-13', jurisdiction: 'ca', label: 'HST 13%', defaultRate: 13, category: 'valueAdded', rateEditable: false, descriptionKey: 'caHst13' },
  { id: 'ca-hst-15', jurisdiction: 'ca', label: 'HST 15%', defaultRate: 15, category: 'valueAdded', rateEditable: false, descriptionKey: 'caHst15' },
  { id: 'ca-pst-rst', jurisdiction: 'ca', label: 'PST / RST', defaultRate: 7, category: 'sales', rateEditable: true, descriptionKey: 'caPstRst' },
  { id: 'ca-qst', jurisdiction: 'ca', label: 'QST 9.975%', defaultRate: 9.975, category: 'sales', rateEditable: false, descriptionKey: 'caQst' },
  { id: 'ca-excise', jurisdiction: 'ca', label: 'Excise duty', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'caExcise' },
  { id: 'ca-lodging', jurisdiction: 'ca', label: 'Lodging / tourism levy', defaultRate: 0, category: 'lodging', rateEditable: true, descriptionKey: 'caLodging' },

  { id: 'us-sales', jurisdiction: 'us', label: 'State sales tax', defaultRate: 0, category: 'sales', rateEditable: true, descriptionKey: 'usSales' },
  { id: 'us-use', jurisdiction: 'us', label: 'Use tax', defaultRate: 0, category: 'sales', rateEditable: true, descriptionKey: 'usUse' },
  { id: 'us-local-sales', jurisdiction: 'us', label: 'Local sales tax', defaultRate: 0, category: 'municipal', rateEditable: true, descriptionKey: 'usLocalSales' },
  { id: 'us-lodging', jurisdiction: 'us', label: 'Lodging / occupancy tax', defaultRate: 0, category: 'lodging', rateEditable: true, descriptionKey: 'usLodging' },
  { id: 'us-excise', jurisdiction: 'us', label: 'Federal / state excise', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'usExcise' },
  { id: 'us-fuel', jurisdiction: 'us', label: 'Fuel tax', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'usFuel' },
  { id: 'us-sugar-beverage', jurisdiction: 'us', label: 'Sugar / beverage levy', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'usSugarBeverage' },

  { id: 'co-iva-19', jurisdiction: 'co', label: 'IVA 19%', defaultRate: 19, category: 'valueAdded', rateEditable: false, descriptionKey: 'coIva19' },
  { id: 'co-iva-5', jurisdiction: 'co', label: 'IVA 5%', defaultRate: 5, category: 'valueAdded', rateEditable: false, descriptionKey: 'coIva5' },
  { id: 'co-exempt', jurisdiction: 'co', label: 'Exento / excluido', defaultRate: 0, category: 'valueAdded', rateEditable: false, descriptionKey: 'coExempt' },
  { id: 'co-inc', jurisdiction: 'co', label: 'INC', defaultRate: 8, category: 'excise', rateEditable: true, descriptionKey: 'coInc' },
  { id: 'co-ica', jurisdiction: 'co', label: 'ICA municipal', defaultRate: 0, category: 'municipal', rateEditable: true, descriptionKey: 'coIca' },
  { id: 'co-carbon-fuel', jurisdiction: 'co', label: 'Carbono / combustibles', defaultRate: 0, category: 'environmental', rateEditable: true, descriptionKey: 'coCarbonFuel' },
  { id: 'co-plastic-bag', jurisdiction: 'co', label: 'Bolsas plásticas', defaultRate: 0, category: 'environmental', rateEditable: true, descriptionKey: 'coPlasticBag' },

  { id: 'br-icms', jurisdiction: 'br', label: 'ICMS', defaultRate: 0, category: 'sales', rateEditable: true, descriptionKey: 'brIcms' },
  { id: 'br-iss', jurisdiction: 'br', label: 'ISS', defaultRate: 0, category: 'municipal', rateEditable: true, descriptionKey: 'brIss' },
  { id: 'br-ipi', jurisdiction: 'br', label: 'IPI', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'brIpi' },
  { id: 'br-pis', jurisdiction: 'br', label: 'PIS', defaultRate: 0, category: 'valueAdded', rateEditable: true, descriptionKey: 'brPis' },
  { id: 'br-cofins', jurisdiction: 'br', label: 'COFINS', defaultRate: 0, category: 'valueAdded', rateEditable: true, descriptionKey: 'brCofins' },
  { id: 'br-ibs-cbs', jurisdiction: 'br', label: 'IBS / CBS', defaultRate: 0, category: 'valueAdded', rateEditable: true, descriptionKey: 'brIbsCbs' },
  { id: 'br-import', jurisdiction: 'br', label: 'Imposto de importacao', defaultRate: 0, category: 'import', rateEditable: true, descriptionKey: 'brImport' },

  { id: 'eu-vat-standard', jurisdiction: 'eu', label: 'VAT standard', defaultRate: 0, category: 'valueAdded', rateEditable: true, descriptionKey: 'euVatStandard' },
  { id: 'eu-vat-reduced', jurisdiction: 'eu', label: 'VAT reduced', defaultRate: 0, category: 'valueAdded', rateEditable: true, descriptionKey: 'euVatReduced' },
  { id: 'eu-vat-zero', jurisdiction: 'eu', label: 'VAT zero / exempt', defaultRate: 0, category: 'valueAdded', rateEditable: true, descriptionKey: 'euVatZero' },
  { id: 'eu-excise-alcohol', jurisdiction: 'eu', label: 'Excise alcohol', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'euExciseAlcohol' },
  { id: 'eu-excise-tobacco', jurisdiction: 'eu', label: 'Excise tobacco', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'euExciseTobacco' },
  { id: 'eu-excise-energy', jurisdiction: 'eu', label: 'Excise energy', defaultRate: 0, category: 'excise', rateEditable: true, descriptionKey: 'euExciseEnergy' },
  { id: 'eu-customs', jurisdiction: 'eu', label: 'Customs / import', defaultRate: 0, category: 'import', rateEditable: true, descriptionKey: 'euCustoms' },

  { id: 'custom-tax', jurisdiction: 'custom', label: 'Custom tax', defaultRate: 0, category: 'custom', rateEditable: true, descriptionKey: 'customTax' },
  { id: 'custom-exempt', jurisdiction: 'custom', label: 'Exempt / no tax', defaultRate: 0, category: 'custom', rateEditable: true, descriptionKey: 'customExempt' },
];

export function getTaxPresetsForJurisdiction(jurisdiction: QuoteTaxJurisdiction) {
  return quoteTaxPresets.filter((preset) => preset.jurisdiction === jurisdiction);
}

export function findQuoteTaxPreset(presetId?: string) {
  return quoteTaxPresets.find((preset) => preset.id === presetId);
}

export function getDefaultTaxPresetForJurisdiction(jurisdiction: QuoteTaxJurisdiction) {
  return getTaxPresetsForJurisdiction(jurisdiction)[0] ?? quoteTaxPresets[0];
}

export function createCustomTaxPreset(label: string, rate: number): QuoteTaxPreset {
  return {
    id: 'custom-tax',
    jurisdiction: 'custom',
    label: label.trim() || 'Custom tax',
    defaultRate: Number.isFinite(rate) ? Math.max(rate, 0) : 0,
    category: 'custom',
    rateEditable: true,
    descriptionKey: 'customTax',
  };
}
