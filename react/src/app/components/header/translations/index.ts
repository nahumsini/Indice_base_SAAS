export type HeaderLocale = 'es-MX' | 'es-CO' | 'en-US' | 'en-CA' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';

const enCA = {
  greetings: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  actions: {
    notifications: 'Notifications', language: 'Language and region', darkMode: 'Use dark mode',
    lightMode: 'Use light mode', learningMode: 'Operational journey', profile: 'My profile',
    settings: 'Settings', logout: 'Log out', loggingOut: 'Logging out…',
  },
} as const;

type Widen<T> = T extends string ? string : T extends object ? { readonly [K in keyof T]: Widen<T[K]> } : T;
export type HeaderTranslations = Widen<typeof enCA>;

const translations: Record<HeaderLocale, HeaderTranslations> = {
  'en-CA': enCA,
  'en-US': { ...enCA },
  'es-MX': {
    greetings: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
    actions: { notifications: 'Notificaciones', language: 'Idioma y región', darkMode: 'Usar modo oscuro', lightMode: 'Usar modo claro', learningMode: 'Ruta operativa', profile: 'Mi perfil', settings: 'Configuración', logout: 'Cerrar sesión', loggingOut: 'Cerrando sesión…' },
  },
  'es-CO': {
    greetings: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
    actions: { notifications: 'Notificaciones', language: 'Idioma y región', darkMode: 'Usar modo oscuro', lightMode: 'Usar modo claro', learningMode: 'Ruta operativa', profile: 'Mi perfil', settings: 'Configuración', logout: 'Cerrar sesión', loggingOut: 'Cerrando sesión…' },
  },
  'fr-CA': {
    greetings: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir' },
    actions: { notifications: 'Notifications', language: 'Langue et région', darkMode: 'Utiliser le mode sombre', lightMode: 'Utiliser le mode clair', learningMode: 'Parcours opérationnel', profile: 'Mon profil', settings: 'Paramètres', logout: 'Se déconnecter', loggingOut: 'Déconnexion…' },
  },
  'pt-BR': {
    greetings: { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite' },
    actions: { notifications: 'Notificações', language: 'Idioma e região', darkMode: 'Usar modo escuro', lightMode: 'Usar modo claro', learningMode: 'Rota operacional', profile: 'Meu perfil', settings: 'Configurações', logout: 'Sair', loggingOut: 'Saindo…' },
  },
  'ko-CA': {
    greetings: { morning: '좋은 아침입니다', afternoon: '좋은 오후입니다', evening: '좋은 저녁입니다' },
    actions: { notifications: '알림', language: '언어 및 지역', darkMode: '다크 모드 사용', lightMode: '라이트 모드 사용', learningMode: '운영 경로', profile: '내 프로필', settings: '설정', logout: '로그아웃', loggingOut: '로그아웃 중…' },
  },
  'zh-CA': {
    greetings: { morning: '早上好', afternoon: '下午好', evening: '晚上好' },
    actions: { notifications: '通知', language: '语言和地区', darkMode: '使用深色模式', lightMode: '使用浅色模式', learningMode: '运营路径', profile: '我的个人资料', settings: '设置', logout: '退出登录', loggingOut: '正在退出…' },
  },
};

export function resolveHeaderLocale(locale?: string | null): HeaderLocale {
  return locale && locale in translations ? locale as HeaderLocale : 'en-CA';
}

export function getHeaderTranslations(locale?: string | null): HeaderTranslations {
  return translations[resolveHeaderLocale(locale)];
}
