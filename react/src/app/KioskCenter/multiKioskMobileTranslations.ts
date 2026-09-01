export interface MultiKioskMobileCopy {
  moduleNames: Record<string, string>;
  errors: {
    rateLimit: string;
    authorization: string;
    unavailable: string;
    generic: string;
    sessionExpired: string;
  };
  header: {
    employeeGreeting: (employee: string) => string;
    defaultDescription: string;
  };
  pin: {
    backspace: string;
    clear: string;
    description: string;
    ariaLabel: string;
    privacy: string;
    submit: string;
    title: string;
  };
  launcher: {
    activeSession: string;
    signOut: string;
    searchPlaceholder: string;
    available: string;
    verificationRequired: string;
    noAccess: string;
    noMatches: string;
  };
  tasks: {
    pending: string;
    overdue: string;
    inScope: string;
    quickCapture: string;
    titlePlaceholder: string;
    add: string;
    searchPlaceholder: string;
    complete: string;
    empty: string;
  };
  workspace: {
    back: string;
    verificationTitle: string;
    verificationDescription: string;
    connected: string;
  };
}

const esMX: MultiKioskMobileCopy = {
  moduleNames: {
    PROCESS_TASKS: 'Procesos y tareas', HUMAN_RESOURCES: 'Recursos Humanos', EXPENSES: 'Gastos',
    PETTY_CASH: 'Caja chica', SALES: 'Ventas', POINT_OF_SALE: 'Punto de venta',
  },
  errors: {
    rateLimit: 'Se alcanzó el límite de intentos. Espera un momento antes de volver a intentar.',
    authorization: 'El PIN no es válido o tu acceso ya no está activo.',
    unavailable: 'Este Multikiosco ya no está disponible.',
    generic: 'No fue posible completar la operación. Intenta nuevamente.',
    sessionExpired: 'Tu sesión terminó o tu acceso cambió. Ingresa de nuevo con tu PIN.',
  },
  header: {
    employeeGreeting: employee => `Hola, ${employee}. Elige dónde trabajar.`,
    defaultDescription: 'Accede a tus herramientas de trabajo.',
  },
  pin: {
    backspace: 'Borrar último dígito', clear: 'Limpiar PIN',
    description: 'Usa tu PIN personal. El enlace identifica al Multikiosco; el PIN confirma quién eres.',
    ariaLabel: 'PIN personal de cinco dígitos',
    privacy: 'Tu PIN nunca se muestra ni se guarda en este dispositivo. La sesión se cierra por inactividad o cuando cambia tu acceso.',
    submit: 'Entrar a mis kioscos', title: 'Identifícate para continuar',
  },
  launcher: {
    activeSession: 'Sesión activa en este dispositivo', signOut: 'Cerrar sesión / Cambiar colaborador',
    searchPlaceholder: 'Buscar una actividad', available: 'Accesos disponibles',
    verificationRequired: 'Solicitará verificación al abrir',
    noAccess: 'Tu PIN fue reconocido, pero tus permisos actuales no habilitan ningún kiosco de esta compañía. Solicita acceso al módulo o scope correspondiente.',
    noMatches: 'No hay accesos que coincidan con tu búsqueda.',
  },
  tasks: {
    pending: 'Pendientes', overdue: 'Vencidas', inScope: 'En alcance', quickCapture: 'Captura rápida',
    titlePlaceholder: '¿Qué tarea necesitas registrar?', add: 'Agregar tarea',
    searchPlaceholder: 'Buscar en mis tareas', complete: 'Completar', empty: 'No hay tareas para mostrar.',
  },
  workspace: {
    back: 'Todos mis kioscos', verificationTitle: 'Verificación especializada requerida',
    verificationDescription: 'Este kiosco requiere que el módulo complete su paso seguro de identidad antes de permitir operaciones.',
    connected: 'El kiosco está conectado y listo para que su módulo publique esta experiencia de trabajo.',
  },
};

const enCA: MultiKioskMobileCopy = {
  moduleNames: {
    PROCESS_TASKS: 'Processes and tasks', HUMAN_RESOURCES: 'Human Resources', EXPENSES: 'Expenses',
    PETTY_CASH: 'Petty cash', SALES: 'Sales', POINT_OF_SALE: 'Point of sale',
  },
  errors: {
    rateLimit: 'The attempt limit was reached. Wait a moment before trying again.',
    authorization: 'The PIN is not valid or your access is no longer active.',
    unavailable: 'This Multi-kiosk is no longer available.',
    generic: 'The operation could not be completed. Try again.',
    sessionExpired: 'Your session ended or your access changed. Enter your PIN again.',
  },
  header: {
    employeeGreeting: employee => `Hello, ${employee}. Choose where to work.`,
    defaultDescription: 'Access your work tools.',
  },
  pin: {
    backspace: 'Delete last digit', clear: 'Clear PIN',
    description: 'Use your personal PIN. The link identifies the Multi-kiosk; the PIN confirms who you are.',
    ariaLabel: 'Five-digit personal PIN',
    privacy: 'Your PIN is never displayed or stored on this device. The session closes after inactivity or when your access changes.',
    submit: 'Open my kiosks', title: 'Identify yourself to continue',
  },
  launcher: {
    activeSession: 'Active session on this device', signOut: 'Sign out / Change employee',
    searchPlaceholder: 'Search for an activity', available: 'Available access',
    verificationRequired: 'Verification will be required when opened',
    noAccess: 'Your PIN was recognized, but your current permissions do not enable any company kiosk. Request the corresponding module or tab scope.',
    noMatches: 'No access matches your search.',
  },
  tasks: {
    pending: 'Pending', overdue: 'Overdue', inScope: 'In scope', quickCapture: 'Quick capture',
    titlePlaceholder: 'What task do you need to record?', add: 'Add task',
    searchPlaceholder: 'Search my tasks', complete: 'Complete', empty: 'There are no tasks to display.',
  },
  workspace: {
    back: 'All my kiosks', verificationTitle: 'Specialized verification required',
    verificationDescription: 'This kiosk requires the module to complete its secure identity step before operations are allowed.',
    connected: 'The kiosk is connected and ready for its module to publish this work experience.',
  },
};

const frCA: MultiKioskMobileCopy = {
  moduleNames: {
    PROCESS_TASKS: 'Processus et tâches', HUMAN_RESOURCES: 'Ressources humaines', EXPENSES: 'Dépenses',
    PETTY_CASH: 'Petite caisse', SALES: 'Ventes', POINT_OF_SALE: 'Point de vente',
  },
  errors: {
    rateLimit: 'La limite de tentatives a été atteinte. Attendez un moment avant de réessayer.',
    authorization: 'Le NIP est invalide ou votre accès n’est plus actif.',
    unavailable: 'Ce multikiosque n’est plus disponible.',
    generic: 'L’opération n’a pas pu être terminée. Réessayez.',
    sessionExpired: 'Votre session est terminée ou votre accès a changé. Entrez de nouveau votre NIP.',
  },
  header: {
    employeeGreeting: employee => `Bonjour, ${employee}. Choisissez votre espace de travail.`,
    defaultDescription: 'Accédez à vos outils de travail.',
  },
  pin: {
    backspace: 'Effacer le dernier chiffre', clear: 'Effacer le NIP',
    description: 'Utilisez votre NIP personnel. Le lien identifie le multikiosque; le NIP confirme votre identité.',
    ariaLabel: 'NIP personnel à cinq chiffres',
    privacy: 'Votre NIP n’est jamais affiché ni stocké sur cet appareil. La session se ferme après une période d’inactivité ou si votre accès change.',
    submit: 'Ouvrir mes kiosques', title: 'Identifiez-vous pour continuer',
  },
  launcher: {
    activeSession: 'Session active sur cet appareil', signOut: 'Fermer la session / Changer d’employé',
    searchPlaceholder: 'Rechercher une activité', available: 'Accès disponibles',
    verificationRequired: 'Une vérification sera demandée à l’ouverture',
    noAccess: 'Votre NIP a été reconnu, mais vos autorisations actuelles ne donnent accès à aucun kiosque de l’entreprise. Demandez le module ou la portée requis.',
    noMatches: 'Aucun accès ne correspond à votre recherche.',
  },
  tasks: {
    pending: 'En attente', overdue: 'En retard', inScope: 'Dans la portée', quickCapture: 'Saisie rapide',
    titlePlaceholder: 'Quelle tâche devez-vous enregistrer?', add: 'Ajouter la tâche',
    searchPlaceholder: 'Rechercher dans mes tâches', complete: 'Terminer', empty: 'Aucune tâche à afficher.',
  },
  workspace: {
    back: 'Tous mes kiosques', verificationTitle: 'Vérification spécialisée requise',
    verificationDescription: 'Ce kiosque exige que le module termine son étape sécurisée d’identité avant d’autoriser les opérations.',
    connected: 'Le kiosque est connecté et prêt à recevoir l’expérience de travail de son module.',
  },
};

const ptBR: MultiKioskMobileCopy = {
  moduleNames: {
    PROCESS_TASKS: 'Processos e tarefas', HUMAN_RESOURCES: 'Recursos Humanos', EXPENSES: 'Despesas',
    PETTY_CASH: 'Caixa pequeno', SALES: 'Vendas', POINT_OF_SALE: 'Ponto de venda',
  },
  errors: {
    rateLimit: 'O limite de tentativas foi atingido. Aguarde um momento antes de tentar novamente.',
    authorization: 'O PIN não é válido ou seu acesso não está mais ativo.',
    unavailable: 'Este Multiquiosque não está mais disponível.',
    generic: 'Não foi possível concluir a operação. Tente novamente.',
    sessionExpired: 'Sua sessão terminou ou seu acesso mudou. Digite seu PIN novamente.',
  },
  header: {
    employeeGreeting: employee => `Olá, ${employee}. Escolha onde trabalhar.`,
    defaultDescription: 'Acesse suas ferramentas de trabalho.',
  },
  pin: {
    backspace: 'Apagar último dígito', clear: 'Limpar PIN',
    description: 'Use seu PIN pessoal. O link identifica o Multiquiosque; o PIN confirma quem você é.',
    ariaLabel: 'PIN pessoal de cinco dígitos',
    privacy: 'Seu PIN nunca é exibido nem armazenado neste dispositivo. A sessão é encerrada por inatividade ou quando seu acesso muda.',
    submit: 'Abrir meus quiosques', title: 'Identifique-se para continuar',
  },
  launcher: {
    activeSession: 'Sessão ativa neste dispositivo', signOut: 'Encerrar sessão / Trocar colaborador',
    searchPlaceholder: 'Buscar uma atividade', available: 'Acessos disponíveis',
    verificationRequired: 'Será solicitada uma verificação ao abrir',
    noAccess: 'Seu PIN foi reconhecido, mas suas permissões atuais não habilitam nenhum quiosque da empresa. Solicite o módulo ou escopo correspondente.',
    noMatches: 'Nenhum acesso corresponde à sua busca.',
  },
  tasks: {
    pending: 'Pendentes', overdue: 'Atrasadas', inScope: 'No escopo', quickCapture: 'Registro rápido',
    titlePlaceholder: 'Qual tarefa você precisa registrar?', add: 'Adicionar tarefa',
    searchPlaceholder: 'Buscar nas minhas tarefas', complete: 'Concluir', empty: 'Não há tarefas para exibir.',
  },
  workspace: {
    back: 'Todos os meus quiosques', verificationTitle: 'Verificação especializada necessária',
    verificationDescription: 'Este quiosque exige que o módulo conclua a etapa segura de identidade antes de permitir operações.',
    connected: 'O quiosque está conectado e pronto para que seu módulo publique esta experiência de trabalho.',
  },
};

const koCA: MultiKioskMobileCopy = {
  moduleNames: {
    PROCESS_TASKS: '프로세스 및 작업', HUMAN_RESOURCES: '인사 관리', EXPENSES: '비용',
    PETTY_CASH: '소액 현금', SALES: '영업', POINT_OF_SALE: '판매 시점',
  },
  errors: {
    rateLimit: '시도 횟수 한도에 도달했습니다. 잠시 후 다시 시도하세요.',
    authorization: 'PIN이 올바르지 않거나 접근 권한이 더 이상 유효하지 않습니다.',
    unavailable: '이 멀티 키오스크는 더 이상 사용할 수 없습니다.',
    generic: '작업을 완료할 수 없습니다. 다시 시도하세요.',
    sessionExpired: '세션이 종료되었거나 접근 권한이 변경되었습니다. PIN을 다시 입력하세요.',
  },
  header: {
    employeeGreeting: employee => `${employee}님, 안녕하세요. 작업할 곳을 선택하세요.`,
    defaultDescription: '업무 도구에 접근하세요.',
  },
  pin: {
    backspace: '마지막 숫자 지우기', clear: 'PIN 지우기',
    description: '개인 PIN을 사용하세요. 링크는 멀티 키오스크를 식별하고 PIN은 본인임을 확인합니다.',
    ariaLabel: '다섯 자리 개인 PIN',
    privacy: 'PIN은 이 기기에 표시되거나 저장되지 않습니다. 비활성 상태가 지속되거나 접근 권한이 바뀌면 세션이 종료됩니다.',
    submit: '내 키오스크 열기', title: '계속하려면 본인 확인을 하세요',
  },
  launcher: {
    activeSession: '이 기기에서 세션 활성화됨', signOut: '로그아웃 / 직원 변경',
    searchPlaceholder: '활동 검색', available: '사용 가능한 접근',
    verificationRequired: '열 때 추가 확인이 필요합니다',
    noAccess: 'PIN은 확인되었지만 현재 권한으로 사용할 수 있는 회사 키오스크가 없습니다. 필요한 모듈이나 탭 범위를 요청하세요.',
    noMatches: '검색과 일치하는 접근이 없습니다.',
  },
  tasks: {
    pending: '대기 중', overdue: '기한 초과', inScope: '범위 내', quickCapture: '빠른 등록',
    titlePlaceholder: '등록할 작업은 무엇인가요?', add: '작업 추가',
    searchPlaceholder: '내 작업 검색', complete: '완료', empty: '표시할 작업이 없습니다.',
  },
  workspace: {
    back: '내 모든 키오스크', verificationTitle: '전문 확인 필요',
    verificationDescription: '이 키오스크는 작업을 허용하기 전에 해당 모듈의 보안 본인 확인 단계를 완료해야 합니다.',
    connected: '키오스크가 연결되었으며 모듈의 업무 환경을 제공할 준비가 되었습니다.',
  },
};

const zhCA: MultiKioskMobileCopy = {
  moduleNames: {
    PROCESS_TASKS: '流程和任务', HUMAN_RESOURCES: '人力资源', EXPENSES: '费用',
    PETTY_CASH: '备用金', SALES: '销售', POINT_OF_SALE: '销售点',
  },
  errors: {
    rateLimit: '已达到尝试次数上限。请稍后再试。',
    authorization: 'PIN 无效或您的访问权限已失效。',
    unavailable: '此多功能自助终端已不可用。',
    generic: '无法完成操作。请重试。',
    sessionExpired: '您的会话已结束或访问权限已更改。请重新输入 PIN。',
  },
  header: {
    employeeGreeting: employee => `${employee}，您好。请选择工作区域。`,
    defaultDescription: '访问您的工作工具。',
  },
  pin: {
    backspace: '删除最后一位数字', clear: '清除 PIN',
    description: '请使用您的个人 PIN。链接用于识别多功能自助终端，PIN 用于确认您的身份。',
    ariaLabel: '五位个人 PIN',
    privacy: '您的 PIN 不会在此设备上显示或存储。长时间无操作或访问权限变更时，会话将关闭。',
    submit: '打开我的自助终端', title: '请先验证身份',
  },
  launcher: {
    activeSession: '此设备上的会话处于活动状态', signOut: '退出登录 / 更换员工',
    searchPlaceholder: '搜索活动', available: '可用访问',
    verificationRequired: '打开时需要进一步验证',
    noAccess: 'PIN 已确认，但您当前的权限未启用任何公司自助终端。请申请相应的模块或页面权限。',
    noMatches: '没有与搜索匹配的访问。',
  },
  tasks: {
    pending: '待处理', overdue: '已逾期', inScope: '范围内', quickCapture: '快速登记',
    titlePlaceholder: '需要登记什么任务？', add: '添加任务',
    searchPlaceholder: '搜索我的任务', complete: '完成', empty: '没有可显示的任务。',
  },
  workspace: {
    back: '我的所有自助终端', verificationTitle: '需要专项验证',
    verificationDescription: '此自助终端要求所属模块先完成安全身份验证，然后才能执行操作。',
    connected: '自助终端已连接，可由所属模块提供此工作体验。',
  },
};

const copies: Record<string, MultiKioskMobileCopy> = {
  'en-CA': enCA,
  'en-US': enCA,
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': esMX,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function getMultiKioskMobileCopy(locale?: string | null): MultiKioskMobileCopy {
  return copies[locale ?? ''] ?? enCA;
}
