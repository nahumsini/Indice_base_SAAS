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
  title: 'Personalize navigation',
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
  title: 'Personalizar navegación',
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
    title: 'Personnaliser la navigation',
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
    title: 'Personalizar navegação',
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
    title: '탐색 맞춤 설정',
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
    title: '自定义导航',
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

type WorkbarPreferenceCopy = { loadingPreferences: string; loadError: string; saveError: string; retry: string; closeError: string; frameError: string; reloadSecondary: string; scopeSummary: string; dualScreenSaved: string };
const preferenceCopies: Record<string, WorkbarPreferenceCopy> = {
  "en-CA": {"loadingPreferences": "Loading your navigation…", "loadError": "Your navigation could not be loaded. Retry before changing it.", "saveError": "We could not confirm the save. Your selection is kept; please try again.", "retry": "Retry", "closeError": "We could not save the closure. This workspace is still open; try closing it again.", "frameError": "The second workspace could not finish loading. You can retry or close it.", "reloadSecondary": "Reload workspace", "scopeSummary": "Your account · This company", "dualScreenSaved": "Dual screen saved for a larger window"},
  "es-MX": {"loadingPreferences": "Cargando tu navegación…", "loadError": "No se pudo cargar tu navegación. Reintenta antes de cambiarla.", "saveError": "No pudimos confirmar el guardado. Conservamos tu selección; vuelve a intentarlo.", "retry": "Reintentar", "closeError": "No pudimos guardar el cierre. La pantalla sigue abierta; vuelve a intentar cerrarla.", "frameError": "La segunda pantalla no terminó de cargar. Puedes reintentar o cerrarla.", "reloadSecondary": "Volver a cargar", "scopeSummary": "Tu cuenta · Esta empresa", "dualScreenSaved": "Pantalla doble guardada para una ventana más amplia"},
  "fr-CA": {"loadingPreferences": "Chargement de votre navigation…", "loadError": "Impossible de charger votre navigation. Réessayez avant de la modifier.", "saveError": "Impossible de confirmer l’enregistrement. Votre sélection est conservée; réessayez.", "retry": "Réessayer", "closeError": "Impossible d’enregistrer la fermeture. Cet espace reste ouvert; réessayez.", "frameError": "Le chargement du deuxième espace a échoué. Réessayez ou fermez-le.", "reloadSecondary": "Recharger l’espace", "scopeSummary": "Votre compte · Cette entreprise", "dualScreenSaved": "Double écran conservé pour une fenêtre plus large"},
  "pt-BR": {"loadingPreferences": "Carregando sua navegação…", "loadError": "Não foi possível carregar sua navegação. Tente novamente antes de alterar.", "saveError": "Não foi possível confirmar o salvamento. Sua seleção foi mantida; tente novamente.", "retry": "Tentar novamente", "closeError": "Não foi possível salvar o fechamento. A tela continua aberta; tente fechá-la novamente.", "frameError": "A segunda tela não terminou de carregar. Tente novamente ou feche-a.", "reloadSecondary": "Recarregar tela", "scopeSummary": "Sua conta · Esta empresa", "dualScreenSaved": "Tela dupla salva para uma janela maior"},
  "ko-CA": {"loadingPreferences": "탐색 설정 불러오는 중…", "loadError": "탐색 설정을 불러오지 못했습니다. 변경하기 전에 다시 시도하세요.", "saveError": "저장을 확인하지 못했습니다. 선택은 유지됩니다. 다시 시도하세요.", "retry": "다시 시도", "closeError": "닫기를 저장하지 못했습니다. 작업 공간이 열려 있습니다. 다시 닫아 보세요.", "frameError": "두 번째 작업 공간을 불러오지 못했습니다. 다시 시도하거나 닫으세요.", "reloadSecondary": "다시 불러오기", "scopeSummary": "내 계정 · 현재 회사", "dualScreenSaved": "더 넓은 창에서 사용할 듀얼 화면 설정이 저장됨"},
  "zh-CA": {"loadingPreferences": "正在加载导航设置…", "loadError": "无法加载导航设置。请重试后再修改。", "saveError": "无法确认保存。已保留您的选择，请重试。", "retry": "重试", "closeError": "无法保存关闭操作。此工作区仍保持打开，请再次关闭。", "frameError": "第二个工作区未能完成加载。您可以重试或关闭。", "reloadSecondary": "重新加载", "scopeSummary": "我的账户 · 当前公司", "dualScreenSaved": "已保留双屏设置，供较宽窗口使用"},
};

const dualLayoutHints: Record<string, string> = {"en-CA": "Dual screen uses top navigation. Closing it restores the layout you selected.", "es-MX": "La pantalla doble usa la navegación arriba. Al cerrarla volverá a la distribución que elegiste.", "fr-CA": "Le double écran utilise la navigation en haut. Sa fermeture rétablit la disposition choisie.", "pt-BR": "A tela dupla usa a navegação acima. Ao fechar, o layout escolhido é restaurado.", "ko-CA": "듀얼 화면에서는 상단 탐색을 사용합니다. 닫으면 선택한 배치로 돌아갑니다.", "zh-CA": "双屏模式使用顶部导航。关闭后会恢复您选择的布局。"};

export function getWorkbarLayoutCopy(locale?: string | null) {
  const resolved = resolveHeaderLocale(locale);
  const copyLocale = resolved === 'es-CO' ? 'es-MX' : resolved === 'en-US' ? 'en-CA' : resolved;
  return { ...translations[resolved], ...preferenceCopies[copyLocale], dualLayoutHint: dualLayoutHints[copyLocale] };
}
