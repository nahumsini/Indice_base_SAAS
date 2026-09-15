export type LearningModeSettingsCopy = {
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
  eyebrow: 'Personal settings',
  title: 'Learning mode',
  description: 'Choose how Índice accompanies you while you learn each part of your operation.',
  activeLabel: 'Guidance throughout Índice',
  activeDescription: 'Shows practical explanations inside compatible modules without blocking your work.',
  activeState: 'Active',
  inactiveState: 'Inactive',
  journeyTitle: 'Home dashboard journey',
  journeyDescription: 'Show the six stages of the Índice Methodology instead of KPIs and favourites on the dashboard.',
  journeyLabel: 'Show the learning journey',
  journeyDisabledHint: 'Turn on Learning mode to show this journey.',
  progressTitle: 'Journey progress',
  progressDescription: 'Your current stage is kept private for this user and company.',
  stageLabel: (current, total) => `Stage ${current} of ${total}`,
  restart: 'Restart journey',
  restartHint: 'Return to the first stage without deleting your selected business case.',
  previewTitle: 'Your experience',
  previewWithJourney: 'You will see the six-stage journey on the dashboard and contextual guides inside compatible modules.',
  previewModules: 'Module guides will remain active while the dashboard keeps its operational KPIs and favourites.',
  previewInactive: 'Índice will keep its usual operational view. Your journey progress and business case will not be deleted.',
  footerSummary: 'Saved for this user and company in this browser.',
  cancel: 'Cancel',
  save: 'Save changes',
  saving: 'Saving…',
};

const spanish: LearningModeSettingsCopy = {
  eyebrow: 'Configuración personal',
  title: 'Modo aprendiz',
  description: 'Decide cómo te acompaña Índice mientras conoces cada parte de tu operación.',
  activeLabel: 'Acompañamiento en todo Índice',
  activeDescription: 'Muestra explicaciones prácticas dentro de los módulos compatibles sin bloquear tu trabajo.',
  activeState: 'Activo',
  inactiveState: 'Inactivo',
  journeyTitle: 'Recorrido del Panel Inicial',
  journeyDescription: 'Muestra las seis etapas de la Metodología Índice en lugar de los KPIs y favoritos del panel.',
  journeyLabel: 'Mostrar el recorrido de aprendizaje',
  journeyDisabledHint: 'Activa Modo aprendiz para mostrar este recorrido.',
  progressTitle: 'Progreso del recorrido',
  progressDescription: 'Tu etapa actual se conserva de forma privada para este usuario y empresa.',
  stageLabel: (current, total) => `Etapa ${current} de ${total}`,
  restart: 'Reiniciar recorrido',
  restartHint: 'Vuelve a la primera etapa sin borrar el caso empresarial que elegiste.',
  previewTitle: 'Tu experiencia',
  previewWithJourney: 'Verás la ruta de seis etapas en el Panel Inicial y guías contextuales dentro de los módulos compatibles.',
  previewModules: 'Las guías de los módulos seguirán activas, mientras el Panel Inicial conserva sus KPIs y favoritos.',
  previewInactive: 'Índice conservará su vista operativa habitual. Tu avance y caso empresarial no se borrarán.',
  footerSummary: 'Se guarda para este usuario y empresa en este navegador.',
  cancel: 'Cancelar',
  save: 'Guardar cambios',
  saving: 'Guardando…',
};

const french: LearningModeSettingsCopy = {
  ...english,
  eyebrow: 'Préférences personnelles',
  title: 'Mode apprentissage',
  description: 'Choisissez comment Índice vous accompagne pendant que vous découvrez chaque partie de votre activité.',
  activeLabel: 'Accompagnement dans tout Índice',
  activeDescription: 'Affiche des explications pratiques dans les modules compatibles sans bloquer votre travail.',
  activeState: 'Actif',
  inactiveState: 'Inactif',
  journeyTitle: 'Parcours du tableau de bord',
  journeyDescription: 'Affiche les six étapes de la méthodologie Índice à la place des indicateurs et favoris du tableau de bord.',
  journeyLabel: 'Afficher le parcours d’apprentissage',
  journeyDisabledHint: 'Activez le mode apprentissage pour afficher ce parcours.',
  progressTitle: 'Progression du parcours',
  progressDescription: 'Votre étape actuelle reste privée pour cet utilisateur et cette entreprise.',
  stageLabel: (current, total) => `Étape ${current} sur ${total}`,
  restart: 'Recommencer le parcours',
  restartHint: 'Revenez à la première étape sans supprimer le cas d’entreprise choisi.',
  previewTitle: 'Votre expérience',
  previewWithJourney: 'Le parcours en six étapes apparaîtra au tableau de bord et les guides contextuels dans les modules compatibles.',
  previewModules: 'Les guides des modules resteront actifs tandis que le tableau de bord conservera ses indicateurs et favoris.',
  previewInactive: 'Índice conservera sa vue opérationnelle habituelle. Votre progression et votre cas d’entreprise seront conservés.',
  footerSummary: 'Enregistré pour cet utilisateur et cette entreprise dans ce navigateur.',
  cancel: 'Annuler',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
};

const portuguese: LearningModeSettingsCopy = {
  ...english,
  eyebrow: 'Configuração pessoal',
  title: 'Modo aprendiz',
  description: 'Escolha como o Índice acompanha você enquanto conhece cada parte da operação.',
  activeLabel: 'Acompanhamento em todo o Índice',
  activeDescription: 'Mostra explicações práticas nos módulos compatíveis sem interromper o trabalho.',
  activeState: 'Ativo',
  inactiveState: 'Inativo',
  journeyTitle: 'Jornada do painel inicial',
  journeyDescription: 'Mostra as seis etapas da Metodologia Índice no lugar dos KPIs e favoritos do painel.',
  journeyLabel: 'Mostrar a jornada de aprendizagem',
  journeyDisabledHint: 'Ative o Modo aprendiz para mostrar esta jornada.',
  progressTitle: 'Progresso da jornada',
  progressDescription: 'Sua etapa atual é privada para este usuário e empresa.',
  stageLabel: (current, total) => `Etapa ${current} de ${total}`,
  restart: 'Reiniciar jornada',
  restartHint: 'Volte à primeira etapa sem apagar o caso empresarial escolhido.',
  previewTitle: 'Sua experiência',
  previewWithJourney: 'Você verá a jornada de seis etapas no painel e guias contextuais nos módulos compatíveis.',
  previewModules: 'Os guias dos módulos continuarão ativos enquanto o painel mantém seus KPIs e favoritos.',
  previewInactive: 'O Índice manterá a visualização operacional habitual. Seu progresso e caso empresarial serão preservados.',
  footerSummary: 'Salvo para este usuário e empresa neste navegador.',
  cancel: 'Cancelar',
  save: 'Salvar alterações',
  saving: 'Salvando…',
};

const korean: LearningModeSettingsCopy = {
  ...english,
  eyebrow: '개인 설정',
  title: '학습 모드',
  description: '운영의 각 부분을 익히는 동안 Índice가 안내하는 방식을 선택하세요.',
  activeLabel: 'Índice 전체 안내',
  activeDescription: '업무를 방해하지 않고 지원되는 모듈 안에 실용적인 설명을 표시합니다.',
  activeState: '활성',
  inactiveState: '비활성',
  journeyTitle: '홈 대시보드 여정',
  journeyDescription: '대시보드의 KPI와 즐겨찾기 대신 Índice 방법론의 여섯 단계를 표시합니다.',
  journeyLabel: '학습 여정 표시',
  journeyDisabledHint: '이 여정을 보려면 학습 모드를 켜세요.',
  progressTitle: '여정 진행 상황',
  progressDescription: '현재 단계는 이 사용자와 회사에 비공개로 저장됩니다.',
  stageLabel: (current, total) => `${total}단계 중 ${current}단계`,
  restart: '여정 다시 시작',
  restartHint: '선택한 비즈니스 사례를 지우지 않고 첫 단계로 돌아갑니다.',
  previewTitle: '예상 화면',
  previewWithJourney: '대시보드에는 여섯 단계 여정이, 지원되는 모듈에는 상황별 안내가 표시됩니다.',
  previewModules: '모듈 안내는 유지되고 대시보드에는 운영 KPI와 즐겨찾기가 표시됩니다.',
  previewInactive: 'Índice는 일반 운영 화면을 유지합니다. 진행 상황과 비즈니스 사례는 삭제되지 않습니다.',
  footerSummary: '이 브라우저의 현재 사용자와 회사에 저장됩니다.',
  cancel: '취소',
  save: '변경 사항 저장',
  saving: '저장 중…',
};

const chinese: LearningModeSettingsCopy = {
  ...english,
  eyebrow: '个人设置',
  title: '学习模式',
  description: '选择在了解运营各环节时 Índice 为你提供陪伴的方式。',
  activeLabel: '在整个 Índice 中提供指引',
  activeDescription: '在不打断工作的情况下，于支持的模块中显示实用说明。',
  activeState: '已启用',
  inactiveState: '未启用',
  journeyTitle: '主页仪表板学习路径',
  journeyDescription: '在仪表板中以 Índice 方法的六个阶段替代 KPI 和收藏。',
  journeyLabel: '显示学习路径',
  journeyDisabledHint: '启用学习模式后即可显示此路径。',
  progressTitle: '学习进度',
  progressDescription: '当前阶段仅为此用户和公司私密保存。',
  stageLabel: (current, total) => `第 ${current} 阶段，共 ${total} 阶段`,
  restart: '重新开始学习路径',
  restartHint: '返回第一阶段，但不会删除已选择的企业案例。',
  previewTitle: '你的使用体验',
  previewWithJourney: '仪表板会显示六阶段路径，支持的模块中会显示情境指引。',
  previewModules: '模块指引保持启用，仪表板则保留运营 KPI 和收藏。',
  previewInactive: 'Índice 将保留常规运营视图，不会删除你的进度和企业案例。',
  footerSummary: '为此浏览器中的当前用户和公司保存。',
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
