export type InvestmentLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export interface InvestmentLanguageOption {
  code: InvestmentLocale;
  name: string;
  flag: string;
}

export const investmentLanguages: readonly InvestmentLanguageOption[] = [
  { code: 'es-MX', name: 'Español (México)', flag: '🇲🇽' },
  { code: 'es-CO', name: 'Español (Colombia)', flag: '🇨🇴' },
  { code: 'en-US', name: 'English (USA)', flag: '🇺🇸' },
  { code: 'en-CA', name: 'English (Canada)', flag: '🇨🇦' },
  { code: 'fr-CA', name: 'Français (Québec)', flag: '🇨🇦' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'ko-CA', name: '한국어 (캐나다)', flag: '🇰🇷' },
  { code: 'zh-CA', name: '中文 (加拿大)', flag: '🇨🇳' },
];

export interface InvestmentUiCopy {
  welcome: string;
  subtitle: string;
  document: string;
  sections: string;
  central: string;
  next: string;
  source: string;
  language: string;
  currency: string;
  dark: string;
  learning: string;
  learningOn: string;
  learningHint: string;
  disclaimer: string;
  skip: string;
  learn: string;
  night: string;
  light: string;
  overview: string;
  module: string;
  duration: string;
  durationLabel: string;
  sectionsLabel: string;
  environment: string;
  reference: string;
  demo: string;
  toolsLabel: string;
  notificationsNew: string;
  sampleNotification: string;
  now: string;
  fiveMinutesAgo: string;
  notificationFooter: string;
  profileName: string;
  profileNote: string;
  kioskCenter: string;
  presentationContext: string;
}

const es: InvestmentUiCopy = {
  welcome: 'Bienvenido, inversionista',
  subtitle: 'Visión de producto, mercado y crecimiento',
  document: 'Presentación ejecutiva',
  sections: 'Secciones de inversión',
  central: 'Idea central',
  next: 'Siguiente decisión',
  source: 'Fuente pública',
  language: 'Idioma y región',
  currency: 'Moneda de referencia',
  dark: 'Usar modo oscuro',
  learning: 'Configurar Modo aprendiz',
  learningOn: 'Modo aprendiz activo',
  learningHint: 'Esta guía simula cómo Índice acompaña al usuario dentro de cada módulo.',
  disclaimer: 'Presentación informativa · Los controles no modifican datos ni configuraciones del ERP.',
  skip: 'Saltar al contenido',
  learn: 'Aprender',
  night: 'Oscuro',
  light: 'Claro',
  overview: 'Resumen de la sección',
  module: 'Presentación para inversionistas',
  duration: '5 min',
  durationLabel: 'Duración',
  sectionsLabel: 'Secciones',
  environment: 'Entorno',
  reference: 'Referencia',
  demo: 'Modo presentación',
  toolsLabel: 'Herramientas de Índice',
  notificationsNew: 'nuevas',
  sampleNotification: 'Notificación de ejemplo',
  now: 'Ahora',
  fiveMinutesAgo: 'Hace 5 min',
  notificationFooter: 'Centro de notificaciones',
  profileName: 'Inversionista',
  profileNote: 'Herramientas disponibles en una sesión real. En esta presentación son únicamente demostrativas.',
  kioskCenter: 'Centro de kioscos',
  presentationContext: 'Contexto de presentación',
};

const en: InvestmentUiCopy = {
  welcome: 'Welcome, investor',
  subtitle: 'Product, market, and growth vision',
  document: 'Executive presentation',
  sections: 'Investment sections',
  central: 'Core idea',
  next: 'Next decision',
  source: 'Public source',
  language: 'Language and region',
  currency: 'Reference currency',
  dark: 'Use dark mode',
  learning: 'Configure learning mode',
  learningOn: 'Learning mode active',
  learningHint: 'This guide demonstrates how Indice supports users inside each module.',
  disclaimer: 'Informational presentation · Controls do not modify ERP data or settings.',
  skip: 'Skip to content',
  learn: 'Learn',
  night: 'Dark',
  light: 'Light',
  overview: 'Section overview',
  module: 'Investor presentation',
  duration: '5 min',
  durationLabel: 'Duration',
  sectionsLabel: 'Sections',
  environment: 'Environment',
  reference: 'Reference',
  demo: 'Presentation mode',
  toolsLabel: 'Indice tools',
  notificationsNew: 'new',
  sampleNotification: 'Sample notification',
  now: 'Now',
  fiveMinutesAgo: '5 min ago',
  notificationFooter: 'Notification center',
  profileName: 'Investor',
  profileNote: 'Tools available in a real session. In this presentation, they are for demonstration only.',
  kioskCenter: 'Kiosk Center',
  presentationContext: 'Presentation context',
};

const fr: InvestmentUiCopy = {
  welcome: 'Bienvenue, investisseur',
  subtitle: 'Vision du produit, du marché et de la croissance',
  document: 'Présentation exécutive',
  sections: 'Sections d’investissement',
  central: 'Idée centrale',
  next: 'Prochaine décision',
  source: 'Source publique',
  language: 'Langue et région',
  currency: 'Devise de référence',
  dark: 'Utiliser le mode sombre',
  learning: 'Configurer le mode apprentissage',
  learningOn: 'Mode apprentissage activé',
  learningHint: 'Ce guide montre comment Indice accompagne les utilisateurs dans chaque module.',
  disclaimer: 'Présentation informative · Les commandes ne modifient ni les données ni les paramètres de l’ERP.',
  skip: 'Aller au contenu',
  learn: 'Apprendre',
  night: 'Sombre',
  light: 'Clair',
  overview: 'Aperçu de la section',
  module: 'Présentation pour investisseurs',
  duration: '5 min',
  durationLabel: 'Durée',
  sectionsLabel: 'Sections',
  environment: 'Environnement',
  reference: 'Référence',
  demo: 'Mode présentation',
  toolsLabel: 'Outils Indice',
  notificationsNew: 'nouvelles',
  sampleNotification: 'Notification d’exemple',
  now: 'Maintenant',
  fiveMinutesAgo: 'Il y a 5 min',
  notificationFooter: 'Centre de notifications',
  profileName: 'Investisseur',
  profileNote: 'Outils disponibles dans une session réelle. Dans cette présentation, ils servent uniquement à la démonstration.',
  kioskCenter: 'Centre des kiosques',
  presentationContext: 'Contexte de présentation',
};

const pt: InvestmentUiCopy = {
  welcome: 'Bem-vindo, investidor',
  subtitle: 'Visão de produto, mercado e crescimento',
  document: 'Apresentação executiva',
  sections: 'Seções de investimento',
  central: 'Ideia central',
  next: 'Próxima decisão',
  source: 'Fonte pública',
  language: 'Idioma e região',
  currency: 'Moeda de referência',
  dark: 'Usar modo escuro',
  learning: 'Configurar modo aprendiz',
  learningOn: 'Modo aprendiz ativo',
  learningHint: 'Este guia demonstra como a Indice acompanha os usuários dentro de cada módulo.',
  disclaimer: 'Apresentação informativa · Os controles não alteram dados nem configurações do ERP.',
  skip: 'Ir para o conteúdo',
  learn: 'Aprender',
  night: 'Escuro',
  light: 'Claro',
  overview: 'Visão geral da seção',
  module: 'Apresentação para investidores',
  duration: '5 min',
  durationLabel: 'Duração',
  sectionsLabel: 'Seções',
  environment: 'Ambiente',
  reference: 'Referência',
  demo: 'Modo apresentação',
  toolsLabel: 'Ferramentas da Indice',
  notificationsNew: 'novas',
  sampleNotification: 'Notificação de exemplo',
  now: 'Agora',
  fiveMinutesAgo: 'Há 5 min',
  notificationFooter: 'Central de notificações',
  profileName: 'Investidor',
  profileNote: 'Ferramentas disponíveis em uma sessão real. Nesta apresentação, elas são apenas demonstrativas.',
  kioskCenter: 'Central de quiosques',
  presentationContext: 'Contexto da apresentação',
};

const ko: InvestmentUiCopy = {
  welcome: '환영합니다, 투자자님',
  subtitle: '제품, 시장 및 성장 비전',
  document: '경영진 프레젠테이션',
  sections: '투자 섹션',
  central: '핵심 아이디어',
  next: '다음 결정',
  source: '공개 출처',
  language: '언어 및 지역',
  currency: '기준 통화',
  dark: '다크 모드 사용',
  learning: '학습 모드 설정',
  learningOn: '학습 모드 활성화',
  learningHint: '이 가이드는 각 모듈에서 Indice가 사용자를 지원하는 방식을 보여 줍니다.',
  disclaimer: '안내용 프레젠테이션 · 이 컨트롤은 ERP 데이터나 설정을 변경하지 않습니다.',
  skip: '콘텐츠로 건너뛰기',
  learn: '학습',
  night: '다크',
  light: '라이트',
  overview: '섹션 개요',
  module: '투자자 프레젠테이션',
  duration: '5분',
  durationLabel: '소요 시간',
  sectionsLabel: '섹션',
  environment: '환경',
  reference: '기준',
  demo: '프레젠테이션 모드',
  toolsLabel: 'Indice 도구',
  notificationsNew: '새 알림',
  sampleNotification: '예시 알림',
  now: '지금',
  fiveMinutesAgo: '5분 전',
  notificationFooter: '알림 센터',
  profileName: '투자자',
  profileNote: '실제 세션에서 사용할 수 있는 도구입니다. 이 프레젠테이션에서는 시연용으로만 제공됩니다.',
  kioskCenter: '키오스크 센터',
  presentationContext: '프레젠테이션 컨텍스트',
};

const zh: InvestmentUiCopy = {
  welcome: '欢迎您，投资人',
  subtitle: '产品、市场与增长愿景',
  document: '高管演示',
  sections: '投资章节',
  central: '核心观点',
  next: '下一项决策',
  source: '公开来源',
  language: '语言和地区',
  currency: '参考货币',
  dark: '使用深色模式',
  learning: '配置学习模式',
  learningOn: '学习模式已启用',
  learningHint: '本指南展示 Indice 如何在各个模块中为用户提供支持。',
  disclaimer: '信息演示 · 这些控件不会修改 ERP 数据或设置。',
  skip: '跳至内容',
  learn: '学习',
  night: '深色',
  light: '浅色',
  overview: '章节概览',
  module: '投资人演示',
  duration: '5 分钟',
  durationLabel: '时长',
  sectionsLabel: '章节',
  environment: '环境',
  reference: '参考',
  demo: '演示模式',
  toolsLabel: 'Indice 工具',
  notificationsNew: '条新通知',
  sampleNotification: '示例通知',
  now: '刚刚',
  fiveMinutesAgo: '5 分钟前',
  notificationFooter: '通知中心',
  profileName: '投资人',
  profileNote: '这些工具可在真实会话中使用；在本演示中仅用于功能展示。',
  kioskCenter: '自助终端中心',
  presentationContext: '演示上下文',
};

export const investmentUiCopy: Readonly<Record<InvestmentLocale, InvestmentUiCopy>> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};

export function getInvestmentUiCopy(locale: InvestmentLocale): InvestmentUiCopy {
  return investmentUiCopy[locale];
}
