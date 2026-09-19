import type { InvestmentLocale } from './investmentContent';

export const investmentProformaAssumptions = {
  currency: 'MXN',
  months: 12,
  baseMonthlyNewRevenueMxn: 15_000,
  scenarioMonthlyNewRevenueMxn: [10_000, 20_000, 30_000] as const,
  networkConsultants: [30, 32, 60] as const,
  distributorRate: 0.30,
  fiscalReserveRate: 0.13,
  capexRate: 0.20,
  promotionRate: 0.10,
  retentionRate: 1,
} as const;

export const investmentProformaOperatingBalanceRate = 1
  - investmentProformaAssumptions.distributorRate
  - investmentProformaAssumptions.fiscalReserveRate
  - investmentProformaAssumptions.capexRate
  - investmentProformaAssumptions.promotionRate;

const cumulativeMonthFactor = (month: number) => (month * (month + 1)) / 2;

export type ProformaProjection = {
  monthlyNewRevenueMxn: number;
  decemberMrrMxn: number;
  exitArrMxn: number;
  yearOneRevenueMxn: number;
  distributorAllocationMxn: number;
  fiscalReserveMxn: number;
  capexMxn: number;
  promotionMxn: number;
  operatingBalanceMxn: number;
};

export const buildProformaProjection = (monthlyNewRevenueMxn: number): ProformaProjection => {
  const yearOneRevenueMxn = monthlyNewRevenueMxn * cumulativeMonthFactor(investmentProformaAssumptions.months);
  const decemberMrrMxn = monthlyNewRevenueMxn * investmentProformaAssumptions.months;
  const distributorAllocationMxn = Math.round(yearOneRevenueMxn * investmentProformaAssumptions.distributorRate);
  const fiscalReserveMxn = Math.round(yearOneRevenueMxn * investmentProformaAssumptions.fiscalReserveRate);
  const capexMxn = Math.round(yearOneRevenueMxn * investmentProformaAssumptions.capexRate);
  const promotionMxn = Math.round(yearOneRevenueMxn * investmentProformaAssumptions.promotionRate);
  return {
    monthlyNewRevenueMxn,
    decemberMrrMxn,
    exitArrMxn: decemberMrrMxn * investmentProformaAssumptions.months,
    yearOneRevenueMxn,
    distributorAllocationMxn,
    fiscalReserveMxn,
    capexMxn,
    promotionMxn,
    operatingBalanceMxn: yearOneRevenueMxn - distributorAllocationMxn - fiscalReserveMxn - capexMxn - promotionMxn,
  };
};

export const investmentProformaMilestones = [1, 3, 6, 12].map(month => ({
  month,
  portfolioMrrMxn: investmentProformaAssumptions.baseMonthlyNewRevenueMxn * month,
  cumulativeRevenueMxn: investmentProformaAssumptions.baseMonthlyNewRevenueMxn * cumulativeMonthFactor(month),
}));

export const investmentProformaScenarios = investmentProformaAssumptions.scenarioMonthlyNewRevenueMxn.map(buildProformaProjection);

const baseConsultantProjection = buildProformaProjection(investmentProformaAssumptions.baseMonthlyNewRevenueMxn);

export const investmentProformaNetworks = investmentProformaAssumptions.networkConsultants.map(consultants => ({
  consultants,
  aggregateMonthlyNewRevenueMxn: baseConsultantProjection.monthlyNewRevenueMxn * consultants,
  decemberMrrMxn: baseConsultantProjection.decemberMrrMxn * consultants,
  exitArrMxn: baseConsultantProjection.exitArrMxn * consultants,
  yearOneRevenueMxn: baseConsultantProjection.yearOneRevenueMxn * consultants,
  distributorAllocationMxn: baseConsultantProjection.distributorAllocationMxn * consultants,
  fiscalReserveMxn: baseConsultantProjection.fiscalReserveMxn * consultants,
  capexMxn: baseConsultantProjection.capexMxn * consultants,
  promotionMxn: baseConsultantProjection.promotionMxn * consultants,
  operatingBalanceMxn: baseConsultantProjection.operatingBalanceMxn * consultants,
}));

type ProformaCopy = {
  assumptionsLabel: string;
  assumptionPills: readonly [string, string, string, string];
  evolutionTitle: string;
  evolutionDescription: string;
  monthLabel: string;
  portfolioMrrLabel: string;
  cumulativeRevenueLabel: string;
  scenariosTitle: string;
  scenariosDescription: string;
  monthlyNewRevenueLabel: string;
  decemberMrrLabel: string;
  yearOneRevenueLabel: string;
  distributorAllocationLabel: string;
  operatingBalanceLabel: string;
  allocationsTitle: string;
  allocationsDescription: string;
  allocationLabels: readonly [string, string, string, string, string];
  nationalTitle: string;
  nationalDescription: string;
  networkLabels: Record<'30' | '32' | '60', { title: string; description: string }>;
  consultantsLabel: string;
  aggregateMonthlyNewRevenueLabel: string;
  exitArrLabel: string;
  allocationDetailLabel: string;
  modelNoteTitle: string;
  modelNote: string;
};

const es: ProformaCopy = {
  assumptionsLabel: 'Supuestos de la simulación',
  assumptionPills: ['Valores en MXN y antes de IVA', 'Retención ilustrativa del 100%', 'Meta base: +$15,000 mensuales', 'Canal: 30% simplificado'],
  evolutionTitle: 'Cómo evoluciona un consultor',
  evolutionDescription: 'Cada mes incorpora $15,000 de nueva facturación recurrente y conserva la cartera anterior. El crecimiento viene de sumar y retener, no de una venta aislada.',
  monthLabel: 'Mes',
  portfolioMrrLabel: 'Cartera mensual',
  cumulativeRevenueLabel: 'Ventas acumuladas',
  scenariosTitle: 'Tres ritmos comerciales durante un año',
  scenariosDescription: '“10, 20 y 30” representan miles de pesos de nueva facturación mensual, no cantidad de clientes.',
  monthlyNewRevenueLabel: 'Nueva facturación por mes',
  decemberMrrLabel: 'Cartera en diciembre',
  yearOneRevenueLabel: 'Ventas del año 1',
  distributorAllocationLabel: 'Canal 30%',
  operatingBalanceLabel: 'Saldo después de asignaciones',
  allocationsTitle: 'Cómo se distribuye cada $100 facturado',
  allocationsDescription: 'El saldo del 27% no es utilidad neta: todavía debe cubrir nómina, infraestructura, soporte y otros costos no modelados.',
  allocationLabels: ['Canal de distribución', 'Reserva fiscal estimada', 'CapEx y reinversión', 'Publicidad y promoción', 'Saldo no asignado'],
  nationalTitle: 'De cobertura inicial a una red nacional',
  nationalDescription: 'La meta territorial es contar con al menos un distribuidor-consultor certificado en cada entidad federativa y reforzar después los mercados con mayor demanda.',
  networkLabels: {
    '30': { title: 'Primera cobertura', description: 'Treinta consultores activos acercan la operación a casi todo el país.' },
    '32': { title: 'Meta territorial', description: 'Un consultor en cada una de las 32 entidades federativas.' },
    '60': { title: 'Red reforzada', description: 'Mayor densidad comercial y capacidad de acompañamiento regional.' },
  },
  consultantsLabel: 'consultores',
  aggregateMonthlyNewRevenueLabel: 'Nueva venta mensual de la red',
  exitArrLabel: 'ARR al cierre',
  allocationDetailLabel: 'Asignaciones',
  modelNoteTitle: 'Lectura responsable',
  modelNote: 'Simulación ilustrativa con ritmo uniforme, todos los consultores activos durante 12 meses, retención total y sin impagos, descuentos, devoluciones ni variación cambiaria. La reserva fiscal del 13% requiere validación contable. El 30% del canal es un supuesto simplificado para esta proforma y no sustituye los términos contractuales vigentes.',
};

const en: ProformaCopy = {
  assumptionsLabel: 'Simulation assumptions',
  assumptionPills: ['Values in MXN and before VAT', 'Illustrative 100% retention', 'Base target: +$15,000 monthly', 'Channel: simplified 30%'],
  evolutionTitle: 'How one consultant evolves',
  evolutionDescription: 'Each month adds $15,000 in new recurring billing and retains the prior portfolio. Growth comes from adding and retaining, not from a single sale.',
  monthLabel: 'Month', portfolioMrrLabel: 'Monthly portfolio', cumulativeRevenueLabel: 'Cumulative sales',
  scenariosTitle: 'Three commercial paces over one year',
  scenariosDescription: '“10, 20, and 30” mean thousands of pesos in new monthly billing, not a number of customers.',
  monthlyNewRevenueLabel: 'New billing per month', decemberMrrLabel: 'December portfolio', yearOneRevenueLabel: 'Year-one sales',
  distributorAllocationLabel: 'Channel 30%', operatingBalanceLabel: 'Balance after allocations',
  allocationsTitle: 'How each $100 billed is allocated',
  allocationsDescription: 'The 27% balance is not net profit: payroll, infrastructure, support, and other unmodelled costs still need to be covered.',
  allocationLabels: ['Distribution channel', 'Estimated fiscal reserve', 'CapEx and reinvestment', 'Advertising and promotion', 'Unallocated balance'],
  nationalTitle: 'From initial coverage to a national network',
  nationalDescription: 'The territorial goal is at least one certified consulting distributor in every federal entity, followed by greater density in higher-demand markets.',
  networkLabels: {
    '30': { title: 'Initial coverage', description: 'Thirty active consultants bring operations close to almost the entire country.' },
    '32': { title: 'Territorial goal', description: 'One consultant in each of Mexico’s 32 federal entities.' },
    '60': { title: 'Reinforced network', description: 'Greater commercial density and regional support capacity.' },
  },
  consultantsLabel: 'consultants', aggregateMonthlyNewRevenueLabel: 'Network new monthly sales', exitArrLabel: 'Exit ARR', allocationDetailLabel: 'Allocations',
  modelNoteTitle: 'Responsible reading',
  modelNote: 'Illustrative simulation with a uniform pace, every consultant active for 12 months, full retention, and no defaults, discounts, refunds, or foreign-exchange changes. The 13% fiscal reserve requires accounting validation. The channel’s 30% is a simplified assumption for this pro forma and does not replace current contract terms.',
};

const fr: ProformaCopy = {
  assumptionsLabel: 'Hypothèses de la simulation',
  assumptionPills: ['Valeurs en MXN avant TVA', 'Rétention illustrative de 100 %', 'Cible de base : +15 000 $ par mois', 'Canal : 30 % simplifié'],
  evolutionTitle: 'Évolution d’un conseiller',
  evolutionDescription: 'Chaque mois, il ajoute 15 000 $ de facturation récurrente et conserve le portefeuille antérieur. La croissance vient de l’ajout et de la fidélisation, pas d’une vente isolée.',
  monthLabel: 'Mois', portfolioMrrLabel: 'Portefeuille mensuel', cumulativeRevenueLabel: 'Ventes cumulées',
  scenariosTitle: 'Trois rythmes commerciaux sur un an',
  scenariosDescription: '« 10, 20 et 30 » représentent des milliers de pesos de nouvelle facturation mensuelle, pas un nombre de clients.',
  monthlyNewRevenueLabel: 'Nouvelle facturation mensuelle', decemberMrrLabel: 'Portefeuille en décembre', yearOneRevenueLabel: 'Ventes de l’an 1',
  distributorAllocationLabel: 'Canal 30 %', operatingBalanceLabel: 'Solde après affectations',
  allocationsTitle: 'Répartition de chaque tranche de 100 $ facturée',
  allocationsDescription: 'Le solde de 27 % n’est pas un bénéfice net : il reste à couvrir la paie, l’infrastructure, le soutien et les autres coûts non modélisés.',
  allocationLabels: ['Canal de distribution', 'Réserve fiscale estimée', 'CapEx et réinvestissement', 'Publicité et promotion', 'Solde non affecté'],
  nationalTitle: 'De la couverture initiale à un réseau national',
  nationalDescription: 'L’objectif territorial est d’avoir au moins un distributeur-conseil certifié dans chaque entité fédérée, puis de renforcer les marchés à forte demande.',
  networkLabels: {
    '30': { title: 'Couverture initiale', description: 'Trente conseillers actifs rapprochent les opérations de presque tout le pays.' },
    '32': { title: 'Objectif territorial', description: 'Un conseiller dans chacune des 32 entités fédérées du Mexique.' },
    '60': { title: 'Réseau renforcé', description: 'Une densité commerciale et une capacité de soutien régional accrues.' },
  },
  consultantsLabel: 'conseillers', aggregateMonthlyNewRevenueLabel: 'Nouvelles ventes mensuelles du réseau', exitArrLabel: 'ARR à la clôture', allocationDetailLabel: 'Affectations',
  modelNoteTitle: 'Lecture responsable',
  modelNote: 'Simulation illustrative à rythme uniforme, avec tous les conseillers actifs pendant 12 mois, une rétention totale et aucun impayé, rabais, remboursement ni variation de change. La réserve fiscale de 13 % doit être validée par un comptable. Les 30 % du canal sont une hypothèse simplifiée de cette pro forma et ne remplacent pas les modalités contractuelles en vigueur.',
};

const pt: ProformaCopy = {
  assumptionsLabel: 'Premissas da simulação',
  assumptionPills: ['Valores em MXN e antes do IVA', 'Retenção ilustrativa de 100%', 'Meta base: +$15.000 por mês', 'Canal: 30% simplificado'],
  evolutionTitle: 'Como um consultor evolui',
  evolutionDescription: 'A cada mês, incorpora $15.000 em novo faturamento recorrente e conserva a carteira anterior. O crescimento vem de somar e reter, não de uma venda isolada.',
  monthLabel: 'Mês', portfolioMrrLabel: 'Carteira mensal', cumulativeRevenueLabel: 'Vendas acumuladas',
  scenariosTitle: 'Três ritmos comerciais durante um ano',
  scenariosDescription: '“10, 20 e 30” representam milhares de pesos em novo faturamento mensal, não quantidade de clientes.',
  monthlyNewRevenueLabel: 'Novo faturamento por mês', decemberMrrLabel: 'Carteira em dezembro', yearOneRevenueLabel: 'Vendas do ano 1',
  distributorAllocationLabel: 'Canal 30%', operatingBalanceLabel: 'Saldo após alocações',
  allocationsTitle: 'Como cada $100 faturados são distribuídos',
  allocationsDescription: 'O saldo de 27% não é lucro líquido: ainda precisa cobrir folha, infraestrutura, suporte e outros custos não modelados.',
  allocationLabels: ['Canal de distribuição', 'Reserva fiscal estimada', 'CapEx e reinvestimento', 'Publicidade e promoção', 'Saldo não alocado'],
  nationalTitle: 'Da cobertura inicial a uma rede nacional',
  nationalDescription: 'A meta territorial é ter ao menos um distribuidor-consultor certificado em cada entidade federativa e depois reforçar os mercados com maior demanda.',
  networkLabels: {
    '30': { title: 'Cobertura inicial', description: 'Trinta consultores ativos aproximam a operação de quase todo o país.' },
    '32': { title: 'Meta territorial', description: 'Um consultor em cada uma das 32 entidades federativas do México.' },
    '60': { title: 'Rede reforçada', description: 'Maior densidade comercial e capacidade regional de acompanhamento.' },
  },
  consultantsLabel: 'consultores', aggregateMonthlyNewRevenueLabel: 'Nova venda mensal da rede', exitArrLabel: 'ARR no fechamento', allocationDetailLabel: 'Alocações',
  modelNoteTitle: 'Leitura responsável',
  modelNote: 'Simulação ilustrativa com ritmo uniforme, todos os consultores ativos por 12 meses, retenção total e sem inadimplência, descontos, reembolsos ou variação cambial. A reserva fiscal de 13% exige validação contábil. Os 30% do canal são uma premissa simplificada desta pro forma e não substituem os termos contratuais vigentes.',
};

const ko: ProformaCopy = {
  assumptionsLabel: '시뮬레이션 가정',
  assumptionPills: ['MXN 기준, 부가세 제외', '예시 유지율 100%', '기본 목표: 매월 +$15,000', '채널: 단순화한 30%'],
  evolutionTitle: '컨설턴트 한 명의 성장 과정',
  evolutionDescription: '매월 새로운 반복 청구액 $15,000을 추가하고 기존 포트폴리오를 유지합니다. 성장은 한 번의 판매가 아니라 추가와 유지에서 나옵니다.',
  monthLabel: '월', portfolioMrrLabel: '월간 포트폴리오', cumulativeRevenueLabel: '누적 매출',
  scenariosTitle: '1년 동안의 세 가지 영업 속도',
  scenariosDescription: '“10, 20, 30”은 고객 수가 아니라 매월 새로 추가되는 청구액 수천 페소를 뜻합니다.',
  monthlyNewRevenueLabel: '월별 신규 청구액', decemberMrrLabel: '12월 포트폴리오', yearOneRevenueLabel: '1년 차 매출',
  distributorAllocationLabel: '채널 30%', operatingBalanceLabel: '배분 후 잔액',
  allocationsTitle: '청구액 $100의 배분',
  allocationsDescription: '27% 잔액은 순이익이 아니며 급여, 인프라, 지원 및 모델에 포함되지 않은 기타 비용을 충당해야 합니다.',
  allocationLabels: ['유통 채널', '예상 세무 준비금', 'CapEx 및 재투자', '광고 및 프로모션', '미배분 잔액'],
  nationalTitle: '초기 커버리지에서 전국 네트워크로',
  nationalDescription: '각 연방 행정구역에 최소 한 명의 인증 유통 컨설턴트를 두고, 이후 수요가 큰 시장의 밀도를 높이는 것이 목표입니다.',
  networkLabels: {
    '30': { title: '초기 커버리지', description: '활성 컨설턴트 30명이 거의 전국에 운영을 가까이 제공합니다.' },
    '32': { title: '지역 목표', description: '멕시코 32개 연방 행정구역마다 컨설턴트 한 명을 배치합니다.' },
    '60': { title: '강화된 네트워크', description: '영업 밀도와 지역 지원 역량을 높입니다.' },
  },
  consultantsLabel: '컨설턴트', aggregateMonthlyNewRevenueLabel: '네트워크 월간 신규 매출', exitArrLabel: '연말 ARR', allocationDetailLabel: '배분',
  modelNoteTitle: '책임 있는 해석',
  modelNote: '모든 컨설턴트가 12개월 동안 일정한 속도로 활동하고 고객을 100% 유지하며 연체, 할인, 환불, 환율 변동이 없다는 예시 시뮬레이션입니다. 13% 세무 준비금은 회계 검증이 필요합니다. 채널 30%는 이 프로포마의 단순화된 가정이며 현행 계약 조건을 대체하지 않습니다.',
};

const zh: ProformaCopy = {
  assumptionsLabel: '模拟假设',
  assumptionPills: ['以 MXN 计价且不含增值税', '示例留存率 100%', '基础目标：每月新增 $15,000', '渠道：简化为 30%'],
  evolutionTitle: '一名顾问如何成长',
  evolutionDescription: '每月新增 $15,000 经常性账单并保留既有客户组合。增长来自持续新增和留存，而不是单次销售。',
  monthLabel: '第', portfolioMrrLabel: '月度客户组合', cumulativeRevenueLabel: '累计销售额',
  scenariosTitle: '一年内的三种销售节奏',
  scenariosDescription: '“10、20 和 30”代表每月新增数千比索账单，而不是客户数量。',
  monthlyNewRevenueLabel: '每月新增账单', decemberMrrLabel: '十二月客户组合', yearOneRevenueLabel: '第一年销售额',
  distributorAllocationLabel: '渠道 30%', operatingBalanceLabel: '分配后余额',
  allocationsTitle: '每开票 $100 的分配方式',
  allocationsDescription: '27% 的余额并非净利润，仍需覆盖工资、基础设施、支持和其他未建模成本。',
  allocationLabels: ['分销渠道', '预计税务准备金', '资本开支与再投资', '广告与推广', '未分配余额'],
  nationalTitle: '从初步覆盖到全国网络',
  nationalDescription: '区域目标是在每个联邦实体至少配置一名认证分销顾问，然后加强需求较高市场的覆盖密度。',
  networkLabels: {
    '30': { title: '初步覆盖', description: '30 名活跃顾问使服务触达几乎全国。' },
    '32': { title: '区域目标', description: '墨西哥 32 个联邦实体各配置一名顾问。' },
    '60': { title: '强化网络', description: '提升商业密度和区域服务能力。' },
  },
  consultantsLabel: '名顾问', aggregateMonthlyNewRevenueLabel: '网络每月新增销售', exitArrLabel: '期末 ARR', allocationDetailLabel: '分配',
  modelNoteTitle: '审慎解读',
  modelNote: '本模拟仅作说明，假设所有顾问连续活跃 12 个月、节奏稳定、客户全部留存，并且没有逾期、折扣、退款或汇率变化。13% 的税务准备金需要会计确认。渠道 30% 是本预计模型的简化假设，不取代现行合同条款。',
};

export const investmentProformaCopy: Record<InvestmentLocale, ProformaCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};
