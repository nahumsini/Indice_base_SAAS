type LegacyCopy = {
  manualRate: string; dailyRate: string; manual: string; officialSources: string; internalReference: string;
  positiveRatesError: string; currency: string; equals: string; officialRate: string; lastRate: string;
  exchangeRate: string; operationalReference: string; preferredCurrency: string; appliesTo: string;
  base: string; source: string; date: string; appliedSources: string; internalFallback: string;
  loadExplanation: string; manualExplanation: string; oneUsdIn: string; loading: string; loadDaily: string;
  reset: string; apply: string; disclaimer: string;
};

type ModalCopy = {
  currencySettings: string;
  cancel: string;
  save: string;
  currentReference: string;
  refreshError: string;
  pendingChanges: string;
  optional: string;
};

type Copy = LegacyCopy & ModalCopy;

const enCA: Copy = {
  manualRate: 'Manual rate', dailyRate: 'Daily rate', manual: 'Manual', officialSources: 'Official sources', internalReference: 'Internal reference',
  positiveRatesError: 'Enter positive rates for every currency.', currency: 'Currency', equals: '1 USD equals', officialRate: 'Official rate', lastRate: 'Latest available rate',
  exchangeRate: 'Exchange rate', operationalReference: 'System operating reference', preferredCurrency: 'Preferred currency', appliesTo: 'Applied to amounts and KPIs',
  base: 'Base', source: 'Source', date: 'Date', appliedSources: 'Applied sources', internalFallback: 'internal fallback',
  loadExplanation: 'Loading today’s rate replaces the manual rate with the available daily reference.', manualExplanation: 'A manually edited rate remains until you change or reset it.',
  oneUsdIn: '1 USD in', loading: 'Loading rate…', loadDaily: 'Load today’s rate', reset: 'Reset manual rates', apply: 'Apply',
  disclaimer: 'Informational rate for operating estimates. It is not a foreign-exchange buy or sell quote.',
  currencySettings: 'Currency settings', cancel: 'Cancel', save: 'Save settings', currentReference: 'Current reference',
  refreshError: 'We could not refresh today’s rates. Your current settings were not changed.', pendingChanges: 'Pending changes', optional: 'Optional',
};

const copies: Record<string, LegacyCopy | Copy> = {
  'en-CA': enCA, 'en-US': enCA,
  'es-MX': { manualRate: 'Tasa manual', dailyRate: 'Tasa diaria', manual: 'Manual', officialSources: 'Fuentes oficiales', internalReference: 'Referencia interna', positiveRatesError: 'Captura tasas positivas para todas las divisas.', currency: 'Divisa', equals: '1 USD equivale a', officialRate: 'Tasa oficial', lastRate: 'Última tasa disponible', exchangeRate: 'Tipo de cambio', operationalReference: 'Referencia operativa del sistema', preferredCurrency: 'Divisa preferida', appliesTo: 'Se aplica a importes y KPIs', base: 'Base', source: 'Fuente', date: 'Fecha', appliedSources: 'Fuentes aplicadas', internalFallback: 'respaldo interno', loadExplanation: 'Cargar la tasa del día reemplaza la tasa manual con la referencia diaria disponible.', manualExplanation: 'Una tasa editada manualmente se conserva hasta que la cambies o restablezcas.', oneUsdIn: '1 USD en', loading: 'Cargando tasa…', loadDaily: 'Cargar tasa del día', reset: 'Restablecer manual', apply: 'Aplicar', disclaimer: 'Tasa informativa para estimaciones operativas. No representa una cotización para compraventa de divisas.' },
  'es-CO': { manualRate: 'Tasa manual', dailyRate: 'Tasa diaria', manual: 'Manual', officialSources: 'Fuentes oficiales', internalReference: 'Referencia interna', positiveRatesError: 'Ingresa tasas positivas para todas las monedas.', currency: 'Moneda', equals: '1 USD equivale a', officialRate: 'Tasa oficial', lastRate: 'Última tasa disponible', exchangeRate: 'Tasa de cambio', operationalReference: 'Referencia operativa del sistema', preferredCurrency: 'Moneda preferida', appliesTo: 'Se aplica a valores y KPIs', base: 'Base', source: 'Fuente', date: 'Fecha', appliedSources: 'Fuentes aplicadas', internalFallback: 'respaldo interno', loadExplanation: 'Cargar la tasa del día reemplaza la tasa manual con la referencia diaria disponible.', manualExplanation: 'Una tasa editada manualmente se conserva hasta que la cambies o restablezcas.', oneUsdIn: '1 USD en', loading: 'Cargando tasa…', loadDaily: 'Cargar tasa del día', reset: 'Restablecer manual', apply: 'Aplicar', disclaimer: 'Tasa informativa para estimaciones operativas. No representa una cotización de compra o venta de divisas.' },
  'fr-CA': { manualRate: 'Taux manuel', dailyRate: 'Taux quotidien', manual: 'Manuel', officialSources: 'Sources officielles', internalReference: 'Référence interne', positiveRatesError: 'Saisissez un taux positif pour chaque devise.', currency: 'Devise', equals: '1 USD équivaut à', officialRate: 'Taux officiel', lastRate: 'Dernier taux disponible', exchangeRate: 'Taux de change', operationalReference: 'Référence opérationnelle du système', preferredCurrency: 'Devise privilégiée', appliesTo: 'Appliquée aux montants et aux KPI', base: 'Base', source: 'Source', date: 'Date', appliedSources: 'Sources appliquées', internalFallback: 'référence interne', loadExplanation: 'Le chargement du taux du jour remplace le taux manuel par la référence quotidienne disponible.', manualExplanation: 'Un taux modifié manuellement demeure actif jusqu’à sa modification ou sa réinitialisation.', oneUsdIn: '1 USD en', loading: 'Chargement du taux…', loadDaily: 'Charger le taux du jour', reset: 'Réinitialiser', apply: 'Appliquer', disclaimer: 'Taux informatif pour les estimations opérationnelles; il ne constitue pas une cotation de change.' },
  'pt-BR': { manualRate: 'Taxa manual', dailyRate: 'Taxa diária', manual: 'Manual', officialSources: 'Fontes oficiais', internalReference: 'Referência interna', positiveRatesError: 'Informe taxas positivas para todas as moedas.', currency: 'Moeda', equals: '1 USD equivale a', officialRate: 'Taxa oficial', lastRate: 'Última taxa disponível', exchangeRate: 'Taxa de câmbio', operationalReference: 'Referência operacional do sistema', preferredCurrency: 'Moeda preferida', appliesTo: 'Aplicada a valores e KPIs', base: 'Base', source: 'Fonte', date: 'Data', appliedSources: 'Fontes aplicadas', internalFallback: 'referência interna', loadExplanation: 'Carregar a taxa do dia substitui a taxa manual pela referência diária disponível.', manualExplanation: 'Uma taxa editada manualmente permanece até ser alterada ou redefinida.', oneUsdIn: '1 USD em', loading: 'Carregando taxa…', loadDaily: 'Carregar taxa do dia', reset: 'Redefinir manual', apply: 'Aplicar', disclaimer: 'Taxa informativa para estimativas operacionais. Não representa cotação de compra ou venda de moeda.' },
  'ko-CA': { manualRate: '수동 환율', dailyRate: '일일 환율', manual: '수동', officialSources: '공식 출처', internalReference: '내부 기준', positiveRatesError: '모든 통화에 양수 환율을 입력하세요.', currency: '통화', equals: '1 USD 환산', officialRate: '공식 환율', lastRate: '최근 사용 가능 환율', exchangeRate: '환율', operationalReference: '시스템 운영 기준', preferredCurrency: '기본 통화', appliesTo: '금액 및 KPI에 적용', base: '기준', source: '출처', date: '날짜', appliedSources: '적용된 출처', internalFallback: '내부 대체값', loadExplanation: '오늘의 환율을 불러오면 수동 환율이 사용 가능한 일일 기준으로 대체됩니다.', manualExplanation: '수동으로 수정한 환율은 변경하거나 초기화할 때까지 유지됩니다.', oneUsdIn: '1 USD 환산', loading: '환율 불러오는 중…', loadDaily: '오늘의 환율 불러오기', reset: '수동값 초기화', apply: '적용', disclaimer: '운영 추정을 위한 참고 환율이며 외환 매매 시세가 아닙니다.' },
  'zh-CA': { manualRate: '手动汇率', dailyRate: '每日汇率', manual: '手动', officialSources: '官方来源', internalReference: '内部参考', positiveRatesError: '请为所有货币输入正数汇率。', currency: '货币', equals: '1 USD 等于', officialRate: '官方汇率', lastRate: '最近可用汇率', exchangeRate: '汇率', operationalReference: '系统运营参考', preferredCurrency: '首选货币', appliesTo: '应用于金额和 KPI', base: '基准', source: '来源', date: '日期', appliedSources: '已应用来源', internalFallback: '内部备用值', loadExplanation: '加载当日汇率会用可用的每日参考替换手动汇率。', manualExplanation: '手动编辑的汇率会保留，直到再次更改或重置。', oneUsdIn: '1 USD 兑换', loading: '正在加载汇率…', loadDaily: '加载当日汇率', reset: '重置手动汇率', apply: '应用', disclaimer: '此汇率仅用于运营估算，不代表外汇买卖报价。' },
};

const modalCopies: Record<string, ModalCopy> = {
  'en-CA': {
    currencySettings: 'Currency settings', cancel: 'Cancel', save: 'Save settings', currentReference: 'Current reference',
    refreshError: 'We could not refresh today’s rates. Your current settings were not changed.', pendingChanges: 'Pending changes', optional: 'Optional',
  },
  'en-US': {
    currencySettings: 'Currency settings', cancel: 'Cancel', save: 'Save settings', currentReference: 'Current reference',
    refreshError: 'We could not refresh today’s rates. Your current settings were not changed.', pendingChanges: 'Pending changes', optional: 'Optional',
  },
  'es-MX': {
    currencySettings: 'Configuración monetaria', cancel: 'Cancelar', save: 'Guardar configuración', currentReference: 'Referencia actual',
    refreshError: 'No fue posible actualizar las tasas del día. Tu configuración actual no cambió.', pendingChanges: 'Cambios pendientes', optional: 'Opcional',
  },
  'es-CO': {
    currencySettings: 'Configuración monetaria', cancel: 'Cancelar', save: 'Guardar configuración', currentReference: 'Referencia actual',
    refreshError: 'No fue posible actualizar las tasas del día. Tu configuración actual no cambió.', pendingChanges: 'Cambios pendientes', optional: 'Opcional',
  },
  'fr-CA': {
    currencySettings: 'Paramètres de devise', cancel: 'Annuler', save: 'Enregistrer', currentReference: 'Référence actuelle',
    refreshError: 'Impossible d’actualiser les taux du jour. Vos paramètres actuels n’ont pas été modifiés.', pendingChanges: 'Modifications en attente', optional: 'Facultatif',
  },
  'pt-BR': {
    currencySettings: 'Configuração monetária', cancel: 'Cancelar', save: 'Salvar configuração', currentReference: 'Referência atual',
    refreshError: 'Não foi possível atualizar as taxas do dia. Suas configurações atuais não foram alteradas.', pendingChanges: 'Alterações pendentes', optional: 'Opcional',
  },
  'ko-CA': {
    currencySettings: '통화 설정', cancel: '취소', save: '설정 저장', currentReference: '현재 기준',
    refreshError: '오늘의 환율을 새로 고치지 못했습니다. 현재 설정은 변경되지 않았습니다.', pendingChanges: '저장하지 않은 변경 사항', optional: '선택 사항',
  },
  'zh-CA': {
    currencySettings: '货币设置', cancel: '取消', save: '保存设置', currentReference: '当前参考',
    refreshError: '无法刷新当日汇率。当前设置未更改。', pendingChanges: '待保存更改', optional: '可选',
  },
};

export const getPreferredCurrencyCopy = (locale?: string | null): Copy => {
  const key = locale ?? '';
  return {
    ...enCA,
    ...(copies[key] ?? {}),
    ...(modalCopies[key] ?? modalCopies['en-CA']),
  };
};
