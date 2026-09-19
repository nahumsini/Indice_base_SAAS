export type HrKpiView = 'overview' | 'charts' | 'units' | 'employees';

export function resolveHrKpiView(value: unknown): HrKpiView {
  return value === 'charts' || value === 'units' || value === 'employees' ? value : 'overview';
}

type WorkspaceCopy = {
  navigation: string;
  views: Record<HrKpiView, string>;
  showMore: string;
  showLess: string;
};

const copies: Record<string, WorkspaceCopy> = {
  es: {
    navigation: 'Vistas de indicadores de Recursos Humanos',
    views: { overview: 'Resumen', charts: 'Gráficas', units: 'Por unidad', employees: 'Colaboradores' },
    showMore: 'Ver más casos', showLess: 'Mostrar menos',
  },
  en: {
    navigation: 'Human Resources indicator views',
    views: { overview: 'Overview', charts: 'Charts', units: 'By unit', employees: 'Employees' },
    showMore: 'Show more cases', showLess: 'Show fewer',
  },
  fr: {
    navigation: 'Vues des indicateurs des ressources humaines',
    views: { overview: 'Synthèse', charts: 'Graphiques', units: 'Par unité', employees: 'Employés' },
    showMore: 'Voir plus de cas', showLess: 'Voir moins',
  },
  pt: {
    navigation: 'Visualizações dos indicadores de Recursos Humanos',
    views: { overview: 'Resumo', charts: 'Gráficos', units: 'Por unidade', employees: 'Colaboradores' },
    showMore: 'Ver mais casos', showLess: 'Mostrar menos',
  },
  ko: {
    navigation: '인사 지표 보기',
    views: { overview: '요약', charts: '차트', units: '사업장별', employees: '직원' },
    showMore: '사례 더 보기', showLess: '간략히 보기',
  },
  zh: {
    navigation: '人力资源指标视图',
    views: { overview: '概览', charts: '图表', units: '按单位', employees: '员工' },
    showMore: '查看更多案例', showLess: '收起',
  },
};

export function getHrKpiWorkspaceCopy(locale: string): WorkspaceCopy {
  return copies[locale.slice(0, 2)] ?? copies.en;
}
