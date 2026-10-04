export type LoginShellCopy = {
  skipToLogin: string;
  navigation: string;
  openMenu: string;
  closeMenu: string;
  chooseLanguage: string;
  agents: string;
  methodology: string;
  modules: string;
  plans: string;
  signIn: string;
  diagnosis: string;
  footerDescription: string;
  product: string;
  company: string;
  support: string;
  apprentice: string;
  about: string;
  blog: string;
  help: string;
  contact: string;
  privacy: string;
  terms: string;
  rights: string;
};

const esMX: LoginShellCopy = {
  skipToLogin: 'Ir al inicio de sesión',
  navigation: 'Navegación principal',
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
  chooseLanguage: 'Seleccionar país e idioma',
  agents: 'Lupita y agentes',
  methodology: 'Cómo funciona',
  modules: 'Módulos',
  plans: 'Planes',
  signIn: 'Iniciar sesión',
  diagnosis: 'Diagnóstico sin costo',
  footerDescription: 'ERP personalizado y agentes digitales para profesionalizar tu empresa.',
  product: 'Producto',
  company: 'Empresa',
  support: 'Soporte',
  apprentice: 'Modo aprendiz',
  about: 'Nosotros',
  blog: 'Blog',
  help: 'Centro de ayuda',
  contact: 'Contacto',
  privacy: 'Privacidad',
  terms: 'Términos',
  rights: 'Todos los derechos reservados.',
};

const enCA: LoginShellCopy = {
  skipToLogin: 'Skip to sign in',
  navigation: 'Main navigation',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  chooseLanguage: 'Choose country and language',
  agents: 'Lupita & agents',
  methodology: 'How it works',
  modules: 'Modules',
  plans: 'Plans',
  signIn: 'Sign in',
  diagnosis: 'Free assessment',
  footerDescription: 'Personalized ERP and digital agents to help your business grow professionally.',
  product: 'Product',
  company: 'Company',
  support: 'Support',
  apprentice: 'Learning Mode',
  about: 'About us',
  blog: 'Blog',
  help: 'Help centre',
  contact: 'Contact',
  privacy: 'Privacy',
  terms: 'Terms',
  rights: 'All rights reserved.',
};

const frCA: LoginShellCopy = {
  skipToLogin: 'Aller à la connexion',
  navigation: 'Navigation principale',
  openMenu: 'Ouvrir le menu',
  closeMenu: 'Fermer le menu',
  chooseLanguage: 'Choisir le pays et la langue',
  agents: 'Lupita et agents',
  methodology: 'Fonctionnement',
  modules: 'Modules',
  plans: 'Forfaits',
  signIn: 'Se connecter',
  diagnosis: 'Diagnostic gratuit',
  footerDescription: 'Un ERP personnalisé et des agents numériques pour professionnaliser votre entreprise.',
  product: 'Produit',
  company: 'Entreprise',
  support: 'Assistance',
  apprentice: 'Mode apprentissage',
  about: 'À propos',
  blog: 'Blogue',
  help: 'Centre d’aide',
  contact: 'Contact',
  privacy: 'Confidentialité',
  terms: 'Conditions',
  rights: 'Tous droits réservés.',
};

const ptBR: LoginShellCopy = {
  skipToLogin: 'Ir para o login',
  navigation: 'Navegação principal',
  openMenu: 'Abrir menu',
  closeMenu: 'Fechar menu',
  chooseLanguage: 'Selecionar país e idioma',
  agents: 'Lupita e agentes',
  methodology: 'Como funciona',
  modules: 'Módulos',
  plans: 'Planos',
  signIn: 'Entrar',
  diagnosis: 'Diagnóstico gratuito',
  footerDescription: 'ERP personalizado e agentes digitais para profissionalizar sua empresa.',
  product: 'Produto',
  company: 'Empresa',
  support: 'Suporte',
  apprentice: 'Modo Aprendiz',
  about: 'Sobre nós',
  blog: 'Blog',
  help: 'Central de ajuda',
  contact: 'Contato',
  privacy: 'Privacidade',
  terms: 'Termos',
  rights: 'Todos os direitos reservados.',
};

const koCA: LoginShellCopy = {
  skipToLogin: '로그인으로 건너뛰기',
  navigation: '기본 탐색',
  openMenu: '메뉴 열기',
  closeMenu: '메뉴 닫기',
  chooseLanguage: '국가 및 언어 선택',
  agents: 'Lupita와 에이전트',
  methodology: '이용 방법',
  modules: '모듈',
  plans: '요금제',
  signIn: '로그인',
  diagnosis: '무료 진단',
  footerDescription: '맞춤형 ERP와 디지털 에이전트로 기업 운영을 체계화합니다.',
  product: '제품',
  company: '회사',
  support: '지원',
  apprentice: '학습 모드',
  about: '회사 소개',
  blog: '블로그',
  help: '도움말 센터',
  contact: '문의',
  privacy: '개인정보 처리방침',
  terms: '이용 약관',
  rights: '모든 권리 보유.',
};

const zhCA: LoginShellCopy = {
  skipToLogin: '跳转到登录',
  navigation: '主导航',
  openMenu: '打开菜单',
  closeMenu: '关闭菜单',
  chooseLanguage: '选择国家和语言',
  agents: 'Lupita 与智能代理',
  methodology: '运作方式',
  modules: '模块',
  plans: '方案',
  signIn: '登录',
  diagnosis: '免费诊断',
  footerDescription: '通过定制 ERP 和数字代理，助力企业实现专业化运营。',
  product: '产品',
  company: '公司',
  support: '支持',
  apprentice: '学习模式',
  about: '关于我们',
  blog: '博客',
  help: '帮助中心',
  contact: '联系我们',
  privacy: '隐私政策',
  terms: '服务条款',
  rights: '保留所有权利。',
};

const copies: Record<string, LoginShellCopy> = {
  'es-MX': esMX,
  'es-CO': esMX,
  'en-US': enCA,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function getLoginShellCopy(locale: string): LoginShellCopy {
  return copies[locale] ?? enCA;
}
