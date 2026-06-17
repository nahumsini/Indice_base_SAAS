import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';

export const enCA = {
  eyebrow: 'Learning mode',
  title: 'Opportunity operating guide',
  subtitle: 'Use Opportunities to control active commercial work before it becomes a quote, sale, or operational commitment.',
  collapseLabel: 'Collapse guide',
  expandLabel: 'Expand guide',
  flowTitle: 'Opportunity flow',
  flow: [
    { label: 'Contact', description: 'Start from a real relationship so the opportunity has company, owner, and context.' },
    { label: 'Qualification', description: 'Validate need, budget, timing, value, probability, and buying temperature.' },
    { label: 'Next action', description: 'Every open opportunity needs a clear follow-up date and responsible seller.' },
    { label: 'Quote', description: 'Move to a quote when the customer is ready to review a concrete proposal.' },
  ],
  cardsTitle: 'Operational signals',
  cards: [
    { title: 'Pipeline health', body: 'Stage, probability, value, and temperature show whether the opportunity is real or only noise.' },
    { title: 'Follow-up discipline', body: 'Agenda and next action fields prevent active revenue from disappearing between tasks.' },
    { title: 'Quote readiness', body: 'The quote signal shows whether commercial work is ready to become a formal proposal.' },
  ],
  checklistTitle: 'Before quoting',
  checklist: [
    'The contact and company are clear.',
    'A responsible seller owns the opportunity.',
    'Estimated value, probability, and expected close date are realistic.',
    'The next action is specific and dated.',
  ],
  footer: 'An opportunity is not a guarantee of revenue. It is a controlled commercial hypothesis that must earn its way into a quote.',
} as const;

type WidenLiterals<T> =
  T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends readonly (infer Item)[]
          ? ReadonlyArray<WidenLiterals<Item>>
          : T extends object
            ? { [Key in keyof T]: WidenLiterals<T[Key]> }
            : T;

type ProspectosLearningCopy = WidenLiterals<typeof enCA>;

export const esMX: ProspectosLearningCopy = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guía operativa de oportunidades',
  subtitle: 'Usa Oportunidades para controlar trabajo comercial activo antes de que se convierta en cotización, venta o compromiso operativo.',
  collapseLabel: 'Contraer guía',
  expandLabel: 'Expandir guía',
  flowTitle: 'Flujo de oportunidad',
  flow: [
    { label: 'Contacto', description: 'Parte de una relación real para que la oportunidad tenga empresa, responsable y contexto.' },
    { label: 'Calificación', description: 'Valida necesidad, presupuesto, tiempo, valor, probabilidad y temperatura de compra.' },
    { label: 'Siguiente acción', description: 'Cada oportunidad abierta necesita fecha de seguimiento y vendedor responsable.' },
    { label: 'Cotización', description: 'Avanza a cotización cuando el cliente esté listo para revisar una propuesta concreta.' },
  ],
  cardsTitle: 'Señales operativas',
  cards: [
    { title: 'Salud del pipeline', body: 'Etapa, probabilidad, valor y temperatura muestran si la oportunidad es real o solo ruido.' },
    { title: 'Disciplina de seguimiento', body: 'Agenda y siguiente acción evitan que el ingreso activo se pierda entre tareas.' },
    { title: 'Preparación para cotizar', body: 'La señal de cotización muestra si el trabajo comercial ya puede convertirse en propuesta formal.' },
  ],
  checklistTitle: 'Antes de cotizar',
  checklist: [
    'Contacto y empresa están claros.',
    'Un vendedor responsable es dueño de la oportunidad.',
    'Valor estimado, probabilidad y fecha de cierre son realistas.',
    'La siguiente acción es específica y tiene fecha.',
  ],
  footer: 'Una oportunidad no garantiza ingreso. Es una hipótesis comercial controlada que debe ganarse el paso a cotización.',
};

export const enUS: ProspectosLearningCopy = {
  ...enCA,
  footer: 'An opportunity is not guaranteed revenue. It is a controlled commercial hypothesis that must earn its way into a quote.',
};

export const esCO: ProspectosLearningCopy = {
  ...esMX,
  footer: 'Una oportunidad no garantiza ingreso. Es una hipótesis comercial controlada que debe ganarse el paso a cotización.',
};

export const frCA: ProspectosLearningCopy = {
  ...enCA,
  eyebrow: 'Mode apprentissage',
  title: 'Guide operationnel des occasions',
  subtitle: 'Utilisez Occasions pour controler le travail commercial actif avant devis, vente ou engagement operationnel.',
  collapseLabel: 'Reduire le guide',
  expandLabel: 'Developper le guide',
  flowTitle: 'Flux de l occasion',
  flow: [
    { label: 'Contact', description: 'Commencez avec une relation reelle pour garder entreprise, responsable et contexte.' },
    { label: 'Qualification', description: 'Validez besoin, budget, delai, valeur, probabilite et temperature d achat.' },
    { label: 'Prochaine action', description: 'Chaque occasion ouverte demande une date de suivi et un vendeur responsable.' },
    { label: 'Devis', description: 'Passez au devis quand le client est pret a revoir une proposition concrete.' },
  ],
  cardsTitle: 'Signaux operationnels',
  cards: [
    { title: 'Sante du pipeline', body: 'Etape, probabilite, valeur et temperature montrent si l occasion est reelle.' },
    { title: 'Discipline de suivi', body: 'Agenda et prochaine action evitent que le revenu actif se perde entre les taches.' },
    { title: 'Preparation au devis', body: 'Le signal de devis montre quand le travail commercial peut devenir proposition formelle.' },
  ],
  checklistTitle: 'Avant le devis',
  checklist: [
    'Contact et entreprise sont clairs.',
    'Un vendeur responsable possede l occasion.',
    'Valeur, probabilite et date de cloture sont realistes.',
    'La prochaine action est precise et datee.',
  ],
  footer: 'Une occasion ne garantit pas le revenu. C est une hypothese commerciale controlee qui doit meriter son passage au devis.',
};

export const ptBR: ProspectosLearningCopy = {
  ...enCA,
  eyebrow: 'Modo aprendiz',
  title: 'Guia operacional de oportunidades',
  subtitle: 'Use Oportunidades para controlar trabalho comercial ativo antes de virar cotacao, venda ou compromisso operacional.',
  collapseLabel: 'Recolher guia',
  expandLabel: 'Expandir guia',
  flowTitle: 'Fluxo da oportunidade',
  flow: [
    { label: 'Contato', description: 'Comece por uma relacao real para ter empresa, responsavel e contexto.' },
    { label: 'Qualificacao', description: 'Valide necessidade, orcamento, prazo, valor, probabilidade e temperatura de compra.' },
    { label: 'Proxima acao', description: 'Cada oportunidade aberta precisa de follow-up com data e vendedor responsavel.' },
    { label: 'Cotacao', description: 'Avance para cotacao quando o cliente estiver pronto para uma proposta concreta.' },
  ],
  cardsTitle: 'Sinais operacionais',
  cards: [
    { title: 'Saude do pipeline', body: 'Etapa, probabilidade, valor e temperatura mostram se a oportunidade e real.' },
    { title: 'Disciplina de follow-up', body: 'Agenda e proxima acao evitam que receita ativa se perca entre tarefas.' },
    { title: 'Prontidao para cotar', body: 'O sinal de cotacao mostra quando o trabalho comercial pode virar proposta formal.' },
  ],
  checklistTitle: 'Antes de cotar',
  checklist: [
    'Contato e empresa estao claros.',
    'Um vendedor responsavel possui a oportunidade.',
    'Valor, probabilidade e data de fechamento sao realistas.',
    'A proxima acao e especifica e tem data.',
  ],
  footer: 'Uma oportunidade nao garante receita. E uma hipotese comercial controlada que deve merecer a cotacao.',
};

export const koCA: ProspectosLearningCopy = {
  ...enCA,
  eyebrow: '학습 모드',
  title: '기회 운영 가이드',
  subtitle: '기회를 사용해 견적, 판매, 운영 약속이 되기 전의 활성 영업 업무를 관리합니다.',
  collapseLabel: '가이드 접기',
  expandLabel: '가이드 펼치기',
  flowTitle: '기회 흐름',
  flow: [
    { label: '연락처', description: '회사, 담당자, 맥락이 있도록 실제 관계에서 시작합니다.' },
    { label: '검증', description: '니즈, 예산, 일정, 가치, 확률, 구매 온도를 확인합니다.' },
    { label: '다음 행동', description: '모든 열린 기회에는 후속 날짜와 담당 영업이 필요합니다.' },
    { label: '견적', description: '고객이 구체적인 제안을 검토할 준비가 되었을 때 견적으로 이동합니다.' },
  ],
  cardsTitle: '운영 신호',
  cards: [
    { title: '파이프라인 상태', body: '단계, 확률, 가치, 온도는 기회가 실제인지 보여줍니다.' },
    { title: '후속 규율', body: '일정과 다음 행동은 매출 기회가 업무 사이에서 사라지지 않게 합니다.' },
    { title: '견적 준비', body: '견적 신호는 영업 작업이 공식 제안으로 갈 준비가 되었는지 보여줍니다.' },
  ],
  checklistTitle: '견적 전',
  checklist: [
    '연락처와 회사가 명확합니다.',
    '담당 영업이 기회를 소유합니다.',
    '예상 가치, 확률, 마감일이 현실적입니다.',
    '다음 행동이 구체적이고 날짜가 있습니다.',
  ],
  footer: '기회는 매출 보장이 아닙니다. 견적으로 이동할 자격을 얻어야 하는 통제된 영업 가설입니다.',
};

export const zhCA: ProspectosLearningCopy = {
  ...enCA,
  eyebrow: '学习模式',
  title: '机会运营指南',
  subtitle: '用机会管理在报价、销售或运营承诺之前的活跃销售工作。',
  collapseLabel: '收起指南',
  expandLabel: '展开指南',
  flowTitle: '机会流程',
  flow: [
    { label: '联系人', description: '从真实关系开始，让机会有公司、负责人和背景。' },
    { label: '资格确认', description: '确认需求、预算、时间、价值、概率和购买温度。' },
    { label: '下一步', description: '每个开放机会都需要跟进日期和负责销售。' },
    { label: '报价', description: '当客户准备查看具体方案时，再推进到报价。' },
  ],
  cardsTitle: '运营信号',
  cards: [
    { title: '管道健康度', body: '阶段、概率、价值和温度显示机会是真实的还是噪音。' },
    { title: '跟进纪律', body: '日程和下一步动作防止活跃收入机会在任务之间消失。' },
    { title: '报价准备度', body: '报价信号显示销售工作是否可以成为正式提案。' },
  ],
  checklistTitle: '报价前',
  checklist: [
    '联系人和公司清楚。',
    '负责销售拥有该机会。',
    '预计价值、概率和预计成交日现实。',
    '下一步动作具体且有日期。',
  ],
  footer: '机会不是收入保证。它是一个受控的商业假设，必须证明自己值得进入报价。',
};

export const prospectosLearningTranslations = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-MX': esMX,
  'es-CO': esCO,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<string, ProspectosLearningCopy>;

export function resolveProspectosLearningLocale(locale: string | null | undefined) {
  if (!locale) {
    return 'en-CA';
  }

  if (locale in prospectosLearningTranslations) {
    return locale as keyof typeof prospectosLearningTranslations;
  }

  const loweredLocale = locale.toLowerCase();

  if (loweredLocale.startsWith('es-co')) return 'es-CO';
  if (loweredLocale.startsWith('es-')) return 'es-MX';
  if (loweredLocale.startsWith('fr')) return 'fr-CA';
  if (loweredLocale.startsWith('pt')) return 'pt-BR';
  if (loweredLocale.startsWith('ko')) return 'ko-CA';
  if (loweredLocale.startsWith('zh')) return 'zh-CA';
  if (loweredLocale.startsWith('en-us')) return 'en-US';

  return 'en-CA';
}

export function useProspectosLearningCopy() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => prospectosLearningTranslations[resolveProspectosLearningLocale(currentLanguage.code)],
    [currentLanguage.code],
  );
}

export type { ProspectosLearningCopy };
