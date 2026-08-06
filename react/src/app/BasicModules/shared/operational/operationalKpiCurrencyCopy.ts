export function getOperationalKpiCurrencyCopy(locale?: string | null) {
  const language = (locale ?? 'es-MX').toLowerCase().split('-')[0];
  if (language === 'es') {
    return {
      consolidatedIn: 'Consolidado en', nativeOrigin: 'Origen nativo', partialTotal: 'Total parcial',
      excludedRecords: (count: number) => `${count} registros excluidos`, dailyRate: 'Tipo de cambio diario', unavailable: 'No disponible',
    };
  }
  if (language === 'fr') {
    return {
      consolidatedIn: 'Consolidé en', nativeOrigin: 'Origine native', partialTotal: 'Total partiel',
      excludedRecords: (count: number) => `${count} enregistrements exclus`, dailyRate: 'Taux de change quotidien', unavailable: 'Indisponible',
    };
  }
  if (language === 'pt') {
    return {
      consolidatedIn: 'Consolidado em', nativeOrigin: 'Origem nativa', partialTotal: 'Total parcial',
      excludedRecords: (count: number) => `${count} registros excluídos`, dailyRate: 'Taxa de câmbio diária', unavailable: 'Indisponível',
    };
  }
  return {
    consolidatedIn: 'Consolidated in', nativeOrigin: 'Native origin', partialTotal: 'Partial total',
    excludedRecords: (count: number) => `${count} excluded records`, dailyRate: 'Daily exchange rate', unavailable: 'Unavailable',
  };
}
