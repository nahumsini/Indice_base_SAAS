import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';

export const enCA = {
  eyebrow: 'Learning mode',
  title: 'Contact operating guide',
  subtitle: 'Use Contacts as the commercial relationship base for opportunities, quotes, fiscal context, and customer follow-up.',
  collapseLabel: 'Collapse guide',
  expandLabel: 'Expand guide',
  flowTitle: 'Relationship flow',
  flow: [
    {
      label: 'Relationship',
      description: 'Capture the company, contact person, role, source, and communication channels.',
    },
    {
      label: 'Ownership',
      description: 'Assign one responsible person so follow-up does not depend on memory.',
    },
    {
      label: 'Fiscal base',
      description: 'Prepare billing and legal context before the quote or sale needs it.',
    },
    {
      label: 'Commercial link',
      description: 'Connect the contact to opportunities, quotes, and future sales execution.',
    },
  ],
  cardsTitle: 'Operational signals',
  cards: [
    {
      title: 'Relationship status',
      body: 'Signals show whether the contact is a prospect, customer, quoted account, or needs follow-up.',
    },
    {
      title: 'Communication readiness',
      body: 'Phone, email, and WhatsApp actions should make the next commercial step immediate.',
    },
    {
      title: 'Fiscal readiness',
      body: 'Fiscal data avoids delays when a quote becomes a sale or finance needs validation.',
    },
  ],
  checklistTitle: 'Before creating opportunities',
  checklist: [
    'Company and contact person are clear.',
    'Phone or email is available for follow-up.',
    'A responsible seller owns the relationship.',
    'Fiscal data is complete enough for quoting and future billing.',
  ],
  footer: 'A contact is not only an address book entry. It is the relationship record that supports opportunities, quotes, sales, finance, and after-sales.',
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

type ContactLearningCopy = WidenLiterals<typeof enCA>;

export const esMX: ContactLearningCopy = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guía operativa de contactos',
  subtitle: 'Usa Contactos como la base de relación comercial para oportunidades, cotizaciones, datos fiscales y seguimiento al cliente.',
  collapseLabel: 'Contraer guía',
  expandLabel: 'Expandir guía',
  flowTitle: 'Flujo de relación',
  flow: [
    {
      label: 'Relación',
      description: 'Captura empresa, persona de contacto, rol, origen y canales de comunicación.',
    },
    {
      label: 'Responsable',
      description: 'Asigna una persona responsable para que el seguimiento no dependa de la memoria.',
    },
    {
      label: 'Base fiscal',
      description: 'Prepara contexto legal y fiscal antes de que la cotización o venta lo necesite.',
    },
    {
      label: 'Liga comercial',
      description: 'Conecta el contacto con oportunidades, cotizaciones y futura ejecución de ventas.',
    },
  ],
  cardsTitle: 'Señales operativas',
  cards: [
    {
      title: 'Estado de relación',
      body: 'Las señales muestran si el contacto es prospecto, cliente, cuenta cotizada o requiere seguimiento.',
    },
    {
      title: 'Comunicación lista',
      body: 'Teléfono, email y WhatsApp deben hacer inmediata la siguiente acción comercial.',
    },
    {
      title: 'Preparación fiscal',
      body: 'Los datos fiscales evitan retrasos cuando una cotización se convierte en venta o finanzas valida.',
    },
  ],
  checklistTitle: 'Antes de crear oportunidades',
  checklist: [
    'Empresa y persona de contacto están claras.',
    'Existe teléfono o email para seguimiento.',
    'Un vendedor responsable es dueño de la relación.',
    'Los datos fiscales son suficientes para cotizar y facturar después.',
  ],
  footer: 'Un contacto no es solo una entrada de agenda. Es el registro de relación que sostiene oportunidades, cotizaciones, ventas, finanzas y postventa.',
};

export const esCO: ContactLearningCopy = {
  ...esMX,
  subtitle: 'Usa Contactos como la base de relación comercial para oportunidades, cotizaciones, datos fiscales y seguimiento posventa.',
  footer: 'Un contacto no es solo una entrada de agenda. Es el registro de relación que sostiene oportunidades, cotizaciones, ventas, cartera y posventa.',
};

export const enUS: ContactLearningCopy = {
  ...enCA,
  subtitle: 'Use Contacts as the commercial relationship base for opportunities, quotes, tax context, and customer follow-up.',
  cards: [
    enCA.cards[0],
    enCA.cards[1],
    {
      title: 'Tax readiness',
      body: 'Tax data avoids delays when a quote becomes a sale or finance needs validation.',
    },
  ],
};

export const frCA: ContactLearningCopy = {
  eyebrow: 'Mode apprentissage',
  title: 'Guide operationnel des contacts',
  subtitle: 'Utilisez Contacts comme base de relation commerciale pour occasions, devis, contexte fiscal et suivi client.',
  collapseLabel: 'Reduire le guide',
  expandLabel: 'Developper le guide',
  flowTitle: 'Flux relationnel',
  flow: [
    { label: 'Relation', description: 'Capturez entreprise, personne contact, role, source et canaux de communication.' },
    { label: 'Responsable', description: 'Assignez une personne responsable pour que le suivi ne depende pas de la memoire.' },
    { label: 'Base fiscale', description: 'Preparez le contexte fiscal et legal avant que le devis ou la vente en ait besoin.' },
    { label: 'Lien commercial', description: 'Reliez le contact aux occasions, devis et futures executions de vente.' },
  ],
  cardsTitle: 'Signaux operationnels',
  cards: [
    { title: 'Statut de relation', body: 'Les signaux montrent si le contact est prospect, client, compte avec devis ou demande un suivi.' },
    { title: 'Communication prete', body: 'Telephone, courriel et WhatsApp doivent rendre la prochaine action immediate.' },
    { title: 'Preparation fiscale', body: 'Les donnees fiscales evitent les retards lorsqu un devis devient une vente.' },
  ],
  checklistTitle: 'Avant de creer des occasions',
  checklist: [
    'Entreprise et personne contact sont claires.',
    'Telephone ou courriel est disponible pour le suivi.',
    'Un vendeur responsable possede la relation.',
    'Les donnees fiscales suffisent pour devis et facturation future.',
  ],
  footer: 'Un contact n est pas seulement une entree de carnet. C est le dossier relationnel qui soutient occasions, devis, ventes, finance et apres-vente.',
};

export const ptBR: ContactLearningCopy = {
  eyebrow: 'Modo aprendiz',
  title: 'Guia operacional de contatos',
  subtitle: 'Use Contatos como base de relacionamento comercial para oportunidades, cotacoes, contexto fiscal e follow-up.',
  collapseLabel: 'Recolher guia',
  expandLabel: 'Expandir guia',
  flowTitle: 'Fluxo de relacionamento',
  flow: [
    { label: 'Relacao', description: 'Registre empresa, pessoa de contato, cargo, origem e canais de comunicacao.' },
    { label: 'Responsavel', description: 'Atribua uma pessoa responsavel para o follow-up nao depender da memoria.' },
    { label: 'Base fiscal', description: 'Prepare contexto legal e fiscal antes da cotacao ou venda precisar dele.' },
    { label: 'Ligacao comercial', description: 'Conecte o contato a oportunidades, cotacoes e futura execucao de vendas.' },
  ],
  cardsTitle: 'Sinais operacionais',
  cards: [
    { title: 'Status da relacao', body: 'Os sinais mostram se o contato e prospecto, cliente, conta cotada ou precisa de follow-up.' },
    { title: 'Comunicacao pronta', body: 'Telefone, email e WhatsApp devem tornar imediata a proxima acao comercial.' },
    { title: 'Prontidao fiscal', body: 'Dados fiscais evitam atrasos quando uma cotacao vira venda ou financeiro valida.' },
  ],
  checklistTitle: 'Antes de criar oportunidades',
  checklist: [
    'Empresa e pessoa de contato estao claras.',
    'Telefone ou email esta disponivel para follow-up.',
    'Um vendedor responsavel possui a relacao.',
    'Dados fiscais sao suficientes para cotar e faturar no futuro.',
  ],
  footer: 'Um contato nao e apenas uma entrada de agenda. E o registro de relacionamento que sustenta oportunidades, cotacoes, vendas, financeiro e pos-venda.',
};

export const koCA: ContactLearningCopy = {
  eyebrow: '학습 모드',
  title: '연락처 운영 가이드',
  subtitle: '연락처를 기회, 견적, 세무 맥락, 고객 후속 조치의 관계 기반으로 사용합니다.',
  collapseLabel: '가이드 접기',
  expandLabel: '가이드 펼치기',
  flowTitle: '관계 흐름',
  flow: [
    { label: '관계', description: '회사, 담당자, 역할, 출처, 커뮤니케이션 채널을 기록합니다.' },
    { label: '소유자', description: '후속 조치가 기억에 의존하지 않도록 한 명의 담당자를 지정합니다.' },
    { label: '세무 기반', description: '견적이나 판매가 필요로 하기 전에 법적, 세무 맥락을 준비합니다.' },
    { label: '영업 연결', description: '연락처를 기회, 견적, 향후 판매 실행과 연결합니다.' },
  ],
  cardsTitle: '운영 신호',
  cards: [
    { title: '관계 상태', body: '신호는 연락처가 잠재 고객, 고객, 견적 계정 또는 후속 필요 상태인지 보여줍니다.' },
    { title: '커뮤니케이션 준비', body: '전화, 이메일, WhatsApp 액션은 다음 영업 행동을 즉시 가능하게 해야 합니다.' },
    { title: '세무 준비', body: '세무 데이터는 견적이 판매가 될 때 재무 검증 지연을 줄입니다.' },
  ],
  checklistTitle: '기회 생성 전',
  checklist: [
    '회사와 담당자가 명확합니다.',
    '후속 조치를 위한 전화나 이메일이 있습니다.',
    '담당 영업이 관계를 소유합니다.',
    '견적과 향후 청구에 충분한 세무 데이터가 있습니다.',
  ],
  footer: '연락처는 단순한 주소록이 아닙니다. 기회, 견적, 판매, 재무, 사후 관리를 받치는 관계 기록입니다.',
};

export const zhCA: ContactLearningCopy = {
  eyebrow: '学习模式',
  title: '联系人运营指南',
  subtitle: '把联系人作为机会、报价、税务背景和客户跟进的商业关系基础。',
  collapseLabel: '收起指南',
  expandLabel: '展开指南',
  flowTitle: '关系流程',
  flow: [
    { label: '关系', description: '记录公司、联系人、角色、来源和沟通渠道。' },
    { label: '负责人', description: '指定一个负责人，让跟进不依赖个人记忆。' },
    { label: '税务基础', description: '在报价或销售需要之前准备法律和税务背景。' },
    { label: '商业连接', description: '把联系人连接到机会、报价和未来销售执行。' },
  ],
  cardsTitle: '运营信号',
  cards: [
    { title: '关系状态', body: '信号显示联系人是潜在客户、客户、已报价账户，还是需要跟进。' },
    { title: '沟通准备', body: '电话、邮箱和 WhatsApp 操作应让下一步销售动作立即可做。' },
    { title: '税务准备', body: '税务数据可以减少报价转销售或财务验证时的延误。' },
  ],
  checklistTitle: '创建机会前',
  checklist: [
    '公司和联系人清楚。',
    '有电话或邮箱用于跟进。',
    '一个销售负责人拥有该关系。',
    '税务数据足以支持报价和未来开票。',
  ],
  footer: '联系人不只是通讯录条目。它是支撑机会、报价、销售、财务和售后的关系记录。',
};

export const contactLearningTranslations = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-MX': esMX,
  'es-CO': esCO,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<string, ContactLearningCopy>;

export function resolveContactLearningLocale(locale: string | null | undefined) {
  if (!locale) {
    return 'en-CA';
  }

  if (locale in contactLearningTranslations) {
    return locale as keyof typeof contactLearningTranslations;
  }

  const loweredLocale = locale.toLowerCase();

  if (loweredLocale.startsWith('es-co')) {
    return 'es-CO';
  }

  if (loweredLocale.startsWith('es-')) {
    return 'es-MX';
  }

  if (loweredLocale.startsWith('fr')) {
    return 'fr-CA';
  }

  if (loweredLocale.startsWith('pt')) {
    return 'pt-BR';
  }

  if (loweredLocale.startsWith('ko')) {
    return 'ko-CA';
  }

  if (loweredLocale.startsWith('zh')) {
    return 'zh-CA';
  }

  if (loweredLocale.startsWith('en-us')) {
    return 'en-US';
  }

  return 'en-CA';
}

export function useContactLearningCopy() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => contactLearningTranslations[resolveContactLearningLocale(currentLanguage.code)],
    [currentLanguage.code],
  );
}

export type { ContactLearningCopy };
