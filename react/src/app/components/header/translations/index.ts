export type HeaderLocale = 'es-MX' | 'es-CO' | 'en-US' | 'en-CA' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';

const enCA = {
  greetings: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  actions: {
    notifications: 'Notifications', language: 'Language and region', darkMode: 'Use dark mode',
    lightMode: 'Use light mode', learningMode: 'Operational journey', profile: 'My profile',
    settings: 'Settings', subscription: 'Manage subscription', platformAdmin: 'Platform administration', logout: 'Log out', loggingOut: 'Logging out…',
    company: 'Company', switchCompany: 'Switch company', switchingCompany: 'Switching company…', companySwitchError: 'The company could not be changed.',
  },
} as const;

type Widen<T> = T extends string ? string : T extends object ? { readonly [K in keyof T]: Widen<T[K]> } : T;
export type HeaderTranslations = Widen<typeof enCA>;

const translations: Record<HeaderLocale, HeaderTranslations> = {
  'en-CA': enCA,
  'en-US': { ...enCA },
  'es-MX': {
    greetings: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
    actions: { notifications: 'Notificaciones', language: 'Idioma y región', darkMode: 'Usar modo oscuro', lightMode: 'Usar modo claro', learningMode: 'Ruta operativa', profile: 'Mi perfil', settings: 'Configuración', subscription: 'Administrar suscripción', platformAdmin: 'Administración de plataforma', logout: 'Cerrar sesión', loggingOut: 'Cerrando sesión…', company: 'Empresa', switchCompany: 'Cambiar empresa', switchingCompany: 'Cambiando empresa…', companySwitchError: 'No se pudo cambiar la empresa.' },
  },
  'es-CO': {
    greetings: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
    actions: { notifications: 'Notificaciones', language: 'Idioma y región', darkMode: 'Usar modo oscuro', lightMode: 'Usar modo claro', learningMode: 'Ruta operativa', profile: 'Mi perfil', settings: 'Configuración', subscription: 'Administrar suscripción', platformAdmin: 'Administración de plataforma', logout: 'Cerrar sesión', loggingOut: 'Cerrando sesión…', company: 'Empresa', switchCompany: 'Cambiar empresa', switchingCompany: 'Cambiando empresa…', companySwitchError: 'No se pudo cambiar la empresa.' },
  },
  'fr-CA': {
    greetings: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir' },
    actions: { notifications: 'Notifications', language: 'Langue et région', darkMode: 'Utiliser le mode sombre', lightMode: 'Utiliser le mode clair', learningMode: 'Parcours opérationnel', profile: 'Mon profil', settings: 'Paramètres', subscription: 'Gérer l’abonnement', platformAdmin: 'Administration de la plateforme', logout: 'Se déconnecter', loggingOut: 'Déconnexion…', company: 'Entreprise', switchCompany: "Changer d’entreprise", switchingCompany: 'Changement en cours…', companySwitchError: "Impossible de changer d’entreprise." },
  },
  'pt-BR': {
    greetings: { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite' },
    actions: { notifications: 'Notificações', language: 'Idioma e região', darkMode: 'Usar modo escuro', lightMode: 'Usar modo claro', learningMode: 'Rota operacional', profile: 'Meu perfil', settings: 'Configurações', subscription: 'Gerenciar assinatura', platformAdmin: 'Administração da plataforma', logout: 'Sair', loggingOut: 'Saindo…', company: 'Empresa', switchCompany: 'Trocar empresa', switchingCompany: 'Trocando empresa…', companySwitchError: 'Não foi possível trocar a empresa.' },
  },
  'ko-CA': {
    greetings: { morning: '좋은 아침입니다', afternoon: '좋은 오후입니다', evening: '좋은 저녁입니다' },
    actions: { notifications: '알림', language: '언어 및 지역', darkMode: '다크 모드 사용', lightMode: '라이트 모드 사용', learningMode: '운영 경로', profile: '내 프로필', settings: '설정', subscription: '구독 관리', platformAdmin: '플랫폼 관리', logout: '로그아웃', loggingOut: '로그아웃 중…', company: '회사', switchCompany: '회사 전환', switchingCompany: '회사 전환 중…', companySwitchError: '회사를 전환할 수 없습니다.' },
  },
  'zh-CA': {
    greetings: { morning: '早上好', afternoon: '下午好', evening: '晚上好' },
    actions: { notifications: '通知', language: '语言和地区', darkMode: '使用深色模式', lightMode: '使用浅色模式', learningMode: '运营路径', profile: '我的个人资料', settings: '设置', subscription: '管理订阅', platformAdmin: '平台管理', logout: '退出登录', loggingOut: '正在退出…', company: '公司', switchCompany: '切换公司', switchingCompany: '正在切换公司…', companySwitchError: '无法切换公司。' },
  },
};

export function resolveHeaderLocale(locale?: string | null): HeaderLocale {
  return locale && locale in translations ? locale as HeaderLocale : 'en-CA';
}

export function getHeaderTranslations(locale?: string | null): HeaderTranslations {
  return translations[resolveHeaderLocale(locale)];
}
