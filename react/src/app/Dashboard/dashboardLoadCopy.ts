const copy = {
  es: { loading: 'Cargando tus indicadores…', failed: 'No pudimos cargar tus módulos. Intenta de nuevo.', retry: 'Reintentar' },
  en: { loading: 'Loading your indicators…', failed: 'Your modules could not be loaded. Please try again.', retry: 'Try again' },
  fr: { loading: 'Chargement de vos indicateurs…', failed: 'Impossible de charger vos modules. Réessayez.', retry: 'Réessayer' },
  pt: { loading: 'Carregando seus indicadores…', failed: 'Não foi possível carregar seus módulos. Tente novamente.', retry: 'Tentar novamente' },
  ko: { loading: '지표를 불러오는 중…', failed: '모듈을 불러오지 못했습니다. 다시 시도해 주세요.', retry: '다시 시도' },
  zh: { loading: '正在加载指标…', failed: '无法加载模块。请重试。', retry: '重试' },
};
export function getDashboardLoadCopy(locale: string) {
  return copy[locale.split('-')[0] as keyof typeof copy] ?? copy.en;
}
