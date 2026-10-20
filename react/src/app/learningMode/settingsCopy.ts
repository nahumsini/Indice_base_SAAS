export type LearningModeSettingsCopy = {
  loading: string;
  loadError: string;
  saveError: string;
  retry: string;
  activeDescription: string;
  activeLabel: string;
  activeState: string;
  cancel: string;
  description: string;
  eyebrow: string;
  footerSummary: string;
  inactiveState: string;
  journeyDescription: string;
  journeyDisabledHint: string;
  journeyLabel: string;
  journeyTitle: string;
  previewInactive: string;
  previewModules: string;
  previewTitle: string;
  previewWithJourney: string;
  progressDescription: string;
  progressTitle: string;
  restart: string;
  restartHint: string;
  save: string;
  saving: string;
  stageLabel: (current: number, total: number) => string;
  title: string;
};

const english: LearningModeSettingsCopy = {
  loading: 'Loading your preferences…',
  loadError: 'Your preferences could not be loaded. Retry before making changes.',
  saveError: 'Your changes could not be saved. Please try again.',
  retry: 'Retry',
  eyebrow: 'Personal settings',
  title: 'Learning mode',
  description: 'Choose how Índice accompanies you while you learn each part of your operation.',
  activeLabel: 'Help inside modules',
  activeDescription: 'Practical steps and examples in supported modules.',
  activeState: 'Active',
  inactiveState: 'Inactive',
  journeyTitle: 'Dashboard learning journey',
  journeyDescription: 'Show the six stages of the Índice Methodology instead of KPIs and favourites on the dashboard.',
  journeyLabel: 'Show the learning journey',
  journeyDisabledHint: 'Unavailable while Learning mode is off. Your saved choice is kept for when you turn it on.',
  progressTitle: 'Current stage',
  progressDescription: 'This is where you will resume. Your place is saved privately for this account and company.',
  stageLabel: (current, total) => `Stage ${current} of ${total}`,
  restart: 'Return to the first stage',
  restartHint: 'Return to the first stage without deleting your selected business case.',
  previewTitle: 'Your experience',
  previewWithJourney: 'You will see the six-stage journey on the dashboard and contextual guides inside compatible modules.',
  previewModules: 'Module guides will remain active while the dashboard keeps its operational KPIs and favourites.',
  previewInactive: 'Índice will keep its usual operational view. Your journey progress and business case will not be deleted.',
  footerSummary: 'Your account · This company',
  cancel: 'Cancel',
  save: 'Save changes',
  saving: 'Saving…',
};

const spanish: LearningModeSettingsCopy = {
  loading: 'Cargando tus preferencias…',
  loadError: 'No se pudieron cargar tus preferencias. Reintenta antes de cambiarlas.',
  saveError: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
  retry: 'Reintentar',
  eyebrow: 'Configuración personal',
  title: 'Modo aprendiz',
  description: 'Decide cómo te acompaña Índice mientras conoces cada parte de tu operación.',
  activeLabel: 'Ayuda dentro de los módulos',
  activeDescription: 'Muestra ejemplos y pasos sencillos en los módulos compatibles.',
  activeState: 'Activo',
  inactiveState: 'Inactivo',
  journeyTitle: 'Recorrido de inicio',
  journeyDescription: 'Muestra las seis etapas de la Metodología Índice en lugar de los KPIs y favoritos del panel.',
  journeyLabel: 'Mostrar el recorrido de aprendizaje',
  journeyDisabledHint: 'No está activo mientras Modo aprendiz esté apagado. Conservamos tu elección para cuando lo enciendas.',
  progressTitle: 'Etapa actual',
  progressDescription: 'Retomarás desde esta etapa. Tu lugar se guarda de forma privada para tu usuario y empresa.',
  stageLabel: (current, total) => `Etapa ${current} de ${total}`,
  restart: 'Volver a la primera etapa',
  restartHint: 'Vuelve a la primera etapa sin borrar el caso empresarial que elegiste.',
  previewTitle: 'Tu experiencia',
  previewWithJourney: 'Verás la ruta de seis etapas en el Panel Inicial y guías contextuales dentro de los módulos compatibles.',
  previewModules: 'Las guías de los módulos seguirán activas, mientras el Panel Inicial conserva sus KPIs y favoritos.',
  previewInactive: 'Índice conservará su vista operativa habitual. Tu avance y caso empresarial no se borrarán.',
  footerSummary: 'Tu cuenta · Esta empresa',
  cancel: 'Cancelar',
  save: 'Guardar cambios',
  saving: 'Guardando…',
};

const french: LearningModeSettingsCopy = {
  ...english,
  loading: 'Chargement de vos préférences…',
  loadError: 'Impossible de charger vos préférences. Réessayez avant de les modifier.',
  saveError: 'Impossible d’enregistrer les modifications. Réessayez.',
  retry: 'Réessayer',
  eyebrow: 'Préférences personnelles',
  title: 'Mode apprentissage',
  description: 'Choisissez comment Índice vous accompagne pendant que vous découvrez chaque partie de votre activité.',
  activeLabel: 'Aide dans les modules',
  activeDescription: 'Affiche des explications pratiques dans les modules compatibles sans bloquer votre travail.',
  activeState: 'Actif',
  inactiveState: 'Inactif',
  journeyTitle: 'Parcours du tableau de bord',
  journeyDescription: 'Affiche les six étapes de la méthodologie Índice à la place des indicateurs et favoris du tableau de bord.',
  journeyLabel: 'Afficher le parcours d’apprentissage',
  journeyDisabledHint: 'Indisponible quand le mode apprentissage est désactivé. Votre choix sera conservé à la réactivation.',
  progressTitle: 'Étape actuelle',
  progressDescription: 'Votre étape actuelle reste privée pour cet utilisateur et cette entreprise.',
  stageLabel: (current, total) => `Étape ${current} sur ${total}`,
  restart: 'Recommencer le parcours',
  restartHint: 'Revenez à la première étape sans supprimer le cas d’entreprise choisi.',
  previewTitle: 'Votre expérience',
  previewWithJourney: 'Le parcours en six étapes apparaîtra au tableau de bord et les guides contextuels dans les modules compatibles.',
  previewModules: 'Les guides des modules resteront actifs tandis que le tableau de bord conservera ses indicateurs et favoris.',
  previewInactive: 'Índice conservera sa vue opérationnelle habituelle. Votre progression et votre cas d’entreprise seront conservés.',
  footerSummary: 'Votre compte · Cette entreprise',
  cancel: 'Annuler',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
};

const portuguese: LearningModeSettingsCopy = {
  ...english,
  loading: 'Carregando suas preferências…',
  loadError: 'Não foi possível carregar suas preferências. Tente novamente antes de alterá-las.',
  saveError: 'Não foi possível salvar as alterações. Tente novamente.',
  retry: 'Tentar novamente',
  eyebrow: 'Configuração pessoal',
  title: 'Modo aprendiz',
  description: 'Escolha como o Índice acompanha você enquanto conhece cada parte da operação.',
  activeLabel: 'Ajuda dentro dos módulos',
  activeDescription: 'Mostra explicações práticas nos módulos compatíveis sem interromper o trabalho.',
  activeState: 'Ativo',
  inactiveState: 'Inativo',
  journeyTitle: 'Jornada do painel inicial',
  journeyDescription: 'Mostra as seis etapas da Metodologia Índice no lugar dos KPIs e favoritos do painel.',
  journeyLabel: 'Mostrar a jornada de aprendizagem',
  journeyDisabledHint: 'Indisponível enquanto o Modo aprendiz estiver desligado. Sua escolha será mantida ao ativar novamente.',
  progressTitle: 'Etapa atual',
  progressDescription: 'Sua etapa atual é privada para este usuário e empresa.',
  stageLabel: (current, total) => `Etapa ${current} de ${total}`,
  restart: 'Reiniciar jornada',
  restartHint: 'Volte à primeira etapa sem apagar o caso empresarial escolhido.',
  previewTitle: 'Sua experiência',
  previewWithJourney: 'Você verá a jornada de seis etapas no painel e guias contextuais nos módulos compatíveis.',
  previewModules: 'Os guias dos módulos continuarão ativos enquanto o painel mantém seus KPIs e favoritos.',
  previewInactive: 'O Índice manterá a visualização operacional habitual. Seu progresso e caso empresarial serão preservados.',
  footerSummary: 'Sua conta · Esta empresa',
  cancel: 'Cancelar',
  save: 'Salvar alterações',
  saving: 'Salvando…',
};

const korean: LearningModeSettingsCopy = {
  ...english,
  loading: '설정을 불러오는 중…',
  loadError: '설정을 불러올 수 없습니다. 변경하기 전에 다시 시도하세요.',
  saveError: '변경 사항을 저장할 수 없습니다. 다시 시도하세요.',
  retry: '다시 시도',
  eyebrow: '개인 설정',
  title: '학습 모드',
  description: '운영의 각 부분을 익히는 동안 Índice가 안내하는 방식을 선택하세요.',
  activeLabel: '모듈 내 도움말',
  activeDescription: '업무를 방해하지 않고 지원되는 모듈 안에 실용적인 설명을 표시합니다.',
  activeState: '활성',
  inactiveState: '비활성',
  journeyTitle: '홈 대시보드 여정',
  journeyDescription: '대시보드의 KPI와 즐겨찾기 대신 Índice 방법론의 여섯 단계를 표시합니다.',
  journeyLabel: '학습 여정 표시',
  journeyDisabledHint: '학습 모드가 꺼져 있으면 사용할 수 없습니다. 다시 켤 때 이전 선택이 복원됩니다.',
  progressTitle: '현재 단계',
  progressDescription: '현재 단계는 이 사용자와 회사에 비공개로 저장됩니다.',
  stageLabel: (current, total) => `${total}단계 중 ${current}단계`,
  restart: '여정 다시 시작',
  restartHint: '선택한 비즈니스 사례를 지우지 않고 첫 단계로 돌아갑니다.',
  previewTitle: '예상 화면',
  previewWithJourney: '대시보드에는 여섯 단계 여정이, 지원되는 모듈에는 상황별 안내가 표시됩니다.',
  previewModules: '모듈 안내는 유지되고 대시보드에는 운영 KPI와 즐겨찾기가 표시됩니다.',
  previewInactive: 'Índice는 일반 운영 화면을 유지합니다. 진행 상황과 비즈니스 사례는 삭제되지 않습니다.',
  footerSummary: '내 계정 · 현재 회사',
  cancel: '취소',
  save: '변경 사항 저장',
  saving: '저장 중…',
};

const chinese: LearningModeSettingsCopy = {
  ...english,
  loading: '正在加载偏好设置…',
  loadError: '无法加载偏好设置。请重试后再修改。',
  saveError: '无法保存更改。请重试。',
  retry: '重试',
  eyebrow: '个人设置',
  title: '学习模式',
  description: '选择在了解运营各环节时 Índice 为你提供陪伴的方式。',
  activeLabel: '模块内帮助',
  activeDescription: '在不打断工作的情况下，于支持的模块中显示实用说明。',
  activeState: '已启用',
  inactiveState: '未启用',
  journeyTitle: '主页仪表板学习路径',
  journeyDescription: '在仪表板中以 Índice 方法的六个阶段替代 KPI 和收藏。',
  journeyLabel: '显示学习路径',
  journeyDisabledHint: '学习模式关闭时不可用。再次启用时将恢复您之前的选择。',
  progressTitle: '当前阶段',
  progressDescription: '当前阶段仅为此用户和公司私密保存。',
  stageLabel: (current, total) => `第 ${current} 阶段，共 ${total} 阶段`,
  restart: '重新开始学习路径',
  restartHint: '返回第一阶段，但不会删除已选择的企业案例。',
  previewTitle: '你的使用体验',
  previewWithJourney: '仪表板会显示六阶段路径，支持的模块中会显示情境指引。',
  previewModules: '模块指引保持启用，仪表板则保留运营 KPI 和收藏。',
  previewInactive: 'Índice 将保留常规运营视图，不会删除你的进度和企业案例。',
  footerSummary: '我的账户 · 当前公司',
  cancel: '取消',
  save: '保存更改',
  saving: '正在保存…',
};

export function getLearningModeSettingsCopy(locale: string): LearningModeSettingsCopy {
  if (locale.startsWith('es')) return spanish;
  if (locale.startsWith('fr')) return french;
  if (locale.startsWith('pt')) return portuguese;
  if (locale.startsWith('ko')) return korean;
  if (locale.startsWith('zh')) return chinese;
  return english;
}
