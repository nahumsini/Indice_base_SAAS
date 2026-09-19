import { resolveHeaderLocale, type HeaderLocale } from '../header/translations';

export type WorkbarLayoutCopy = {
  eyebrow: string;
  title: string;
  description: string;
  top: string;
  topDescription: string;
  left: string;
  leftDescription: string;
  responsive: string;
  cancel: string;
  apply: string;
  applying: string;
  dualScreenTitle: string;
  dualScreenDescription: string;
  dualScreenEnable: string;
  dualScreenActive: string;
  dualScreenUnavailable: string;
  dualScreenCloseHint: string;
  secondaryWorkspace: string;
  closeDualScreen: string;
  loadingSecondaryWorkspace: string;
};

const enCA: WorkbarLayoutCopy = {
  eyebrow: 'Navigation preferences',
  title: 'Configure workbar',
  description: 'Choose how to arrange your modules, favorites, and sections.',
  top: 'Top',
  topDescription: 'The classic Indice layout with horizontal navigation.',
  left: 'Left',
  leftDescription: 'A spacious sidebar for moving comfortably through the system.',
  responsive: 'On smaller screens, the bar appears at the top to preserve space and accessibility.',
  cancel: 'Cancel',
  apply: 'Apply',
  applying: 'Applying…',
  dualScreenTitle: 'Dual screen',
  dualScreenDescription: 'Work in two independent Indice pages within the same browser window.',
  dualScreenEnable: 'Enable dual screen',
  dualScreenActive: 'Dual screen is active.',
  dualScreenUnavailable: 'Available on screens at least 1280 px wide.',
  dualScreenCloseHint: 'Once active, close it only with the Close button on the second screen.',
  secondaryWorkspace: 'Screen 2',
  closeDualScreen: 'Close dual screen',
  loadingSecondaryWorkspace: 'Loading screen 2…',
};

const esMX: WorkbarLayoutCopy = {
  eyebrow: 'Preferencias de navegación',
  title: 'Configurar barra de trabajo',
  description: 'Elige cómo organizar tus módulos, favoritos y secciones.',
  top: 'Arriba',
  topDescription: 'La distribución clásica de Índice, con navegación horizontal.',
  left: 'Izquierda',
  leftDescription: 'Una barra lateral amplia para recorrer el sistema con comodidad.',
  responsive: 'En pantallas pequeñas la barra se mostrará arriba para conservar espacio y accesibilidad.',
  cancel: 'Cancelar',
  apply: 'Aplicar',
  applying: 'Aplicando…',
  dualScreenTitle: 'Pantalla doble',
  dualScreenDescription: 'Trabaja en dos páginas independientes de Índice dentro de la misma ventana del navegador.',
  dualScreenEnable: 'Activar pantalla doble',
  dualScreenActive: 'La pantalla doble está activa.',
  dualScreenUnavailable: 'Disponible en pantallas de al menos 1280 px de ancho.',
  dualScreenCloseHint: 'Una vez activa, ciérrala únicamente con el botón Cerrar de la segunda pantalla.',
  secondaryWorkspace: 'Pantalla 2',
  closeDualScreen: 'Cerrar pantalla doble',
  loadingSecondaryWorkspace: 'Cargando pantalla 2…',
};

const translations: Record<HeaderLocale, WorkbarLayoutCopy> = {
  'en-CA': enCA,
  'en-US': enCA,
  'es-MX': esMX,
  'es-CO': esMX,
  'fr-CA': {
    eyebrow: 'Préférences de navigation',
    title: 'Configurer la barre de travail',
    description: 'Choisissez comment organiser vos modules, favoris et sections.',
    top: 'En haut',
    topDescription: 'La disposition classique d’Indice avec navigation horizontale.',
    left: 'À gauche',
    leftDescription: 'Une barre latérale spacieuse pour parcourir facilement le système.',
    responsive: 'Sur les petits écrans, la barre reste en haut pour préserver l’espace et l’accessibilité.',
    cancel: 'Annuler',
    apply: 'Appliquer',
    applying: 'Application…',
    dualScreenTitle: 'Double écran',
    dualScreenDescription: 'Travaillez dans deux pages Indice indépendantes dans la même fenêtre du navigateur.',
    dualScreenEnable: 'Activer le double écran',
    dualScreenActive: 'Le double écran est actif.',
    dualScreenUnavailable: 'Disponible sur les écrans d’au moins 1280 px de largeur.',
    dualScreenCloseHint: 'Une fois actif, fermez-le uniquement avec le bouton Fermer du deuxième écran.',
    secondaryWorkspace: 'Écran 2',
    closeDualScreen: 'Fermer le double écran',
    loadingSecondaryWorkspace: 'Chargement de l’écran 2…',
  },
  'pt-BR': {
    eyebrow: 'Preferências de navegação',
    title: 'Configurar barra de trabalho',
    description: 'Escolha como organizar seus módulos, favoritos e seções.',
    top: 'Acima',
    topDescription: 'O layout clássico do Índice, com navegação horizontal.',
    left: 'À esquerda',
    leftDescription: 'Uma barra lateral ampla para navegar pelo sistema com conforto.',
    responsive: 'Em telas menores, a barra será exibida acima para preservar espaço e acessibilidade.',
    cancel: 'Cancelar',
    apply: 'Aplicar',
    applying: 'Aplicando…',
    dualScreenTitle: 'Tela dupla',
    dualScreenDescription: 'Trabalhe em duas páginas independentes do Índice na mesma janela do navegador.',
    dualScreenEnable: 'Ativar tela dupla',
    dualScreenActive: 'A tela dupla está ativa.',
    dualScreenUnavailable: 'Disponível em telas com pelo menos 1280 px de largura.',
    dualScreenCloseHint: 'Depois de ativada, feche-a somente com o botão Fechar da segunda tela.',
    secondaryWorkspace: 'Tela 2',
    closeDualScreen: 'Fechar tela dupla',
    loadingSecondaryWorkspace: 'Carregando tela 2…',
  },
  'ko-CA': {
    eyebrow: '탐색 환경설정',
    title: '작업 표시줄 구성',
    description: '모듈, 즐겨찾기 및 섹션의 배치를 선택하세요.',
    top: '위쪽',
    topDescription: '가로 탐색을 사용하는 Indice의 기본 레이아웃입니다.',
    left: '왼쪽',
    leftDescription: '시스템을 편안하게 탐색할 수 있는 넓은 사이드바입니다.',
    responsive: '작은 화면에서는 공간과 접근성을 위해 작업 표시줄이 위쪽에 표시됩니다.',
    cancel: '취소',
    apply: '적용',
    applying: '적용 중…',
    dualScreenTitle: '듀얼 화면',
    dualScreenDescription: '같은 브라우저 창에서 두 개의 독립적인 Indice 페이지를 사용하세요.',
    dualScreenEnable: '듀얼 화면 활성화',
    dualScreenActive: '듀얼 화면이 활성화되었습니다.',
    dualScreenUnavailable: '너비가 1280px 이상인 화면에서 사용할 수 있습니다.',
    dualScreenCloseHint: '활성화한 후에는 두 번째 화면의 닫기 버튼으로만 종료할 수 있습니다.',
    secondaryWorkspace: '화면 2',
    closeDualScreen: '듀얼 화면 닫기',
    loadingSecondaryWorkspace: '화면 2 로드 중…',
  },
  'zh-CA': {
    eyebrow: '导航偏好设置',
    title: '配置工作栏',
    description: '选择模块、收藏和分区的排列方式。',
    top: '顶部',
    topDescription: 'Indice 的经典横向导航布局。',
    left: '左侧',
    leftDescription: '使用宽敞的侧边栏轻松浏览系统。',
    responsive: '在较小的屏幕上，工作栏会显示在顶部，以保留空间并确保易用性。',
    cancel: '取消',
    apply: '应用',
    applying: '正在应用…',
    dualScreenTitle: '双屏模式',
    dualScreenDescription: '在同一浏览器窗口中使用两个独立的 Indice 页面。',
    dualScreenEnable: '启用双屏模式',
    dualScreenActive: '双屏模式已启用。',
    dualScreenUnavailable: '适用于宽度至少为 1280 像素的屏幕。',
    dualScreenCloseHint: '启用后，只能使用第二个屏幕上的“关闭”按钮退出。',
    secondaryWorkspace: '屏幕 2',
    closeDualScreen: '关闭双屏模式',
    loadingSecondaryWorkspace: '正在加载屏幕 2…',
  },
};

export function getWorkbarLayoutCopy(locale?: string | null) {
  return translations[resolveHeaderLocale(locale)];
}
