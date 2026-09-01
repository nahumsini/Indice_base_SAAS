export type MultiKioskAdminCopy = {
  locale: string;
  moduleNames: Record<string, string>;
  toolNames: Record<string, string>;
  toolDescriptions: Record<string, string>;
  center: {
    title: string;
    subtitle: string;
    create: string;
    toolsPublished: string;
    configuredTitle: string;
    configuredSubtitle: string;
    emptyTitle: string;
    emptyDescription: string;
    authorizedTools: string;
    toolCount: (count: number) => string;
  };
  editor: {
    newEyebrow: string;
    editEyebrow: (name: string) => string;
    createTitle: string;
    editTitle: string;
    description: string;
    stepData: string;
    stepTools: string;
    footerSummary: (step: number, selected: number, available: number, legacy: number) => string;
    cancel: string;
    previous: string;
    continue: string;
    create: string;
    save: string;
    saveError: string;
    companyAccessTitle: string;
    companyAccessDescription: string;
    name: string;
    namePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    colour: string;
    colourBlue: string;
    colourGreen: string;
    colourYellow: string;
    colourCoral: string;
    initialLanguage: string;
    initialLanguageHelp: string;
    expiry: string;
    catalogTitle: string;
    catalogDescription: string;
    legacyNotice: (count: number) => string;
    searchPlaceholder: string;
    emptyTools: string;
    companyAudience: string;
    authorizedAudience: string;
    available: string;
    setupRequired: string;
    unavailable: string;
    addTool: (name: string) => string;
    removeTool: (name: string) => string;
    moveUp: string;
    moveDown: string;
  };
};

const sharedModuleNames = {
  PROCESS_TASKS: 'Processes and tasks',
  HUMAN_RESOURCES: 'Human Resources',
  EXPENSES: 'Expenses',
  PETTY_CASH: 'Petty cash',
  SALES: 'Sales',
  POINT_OF_SALE: 'Point of sale',
  INVENTORY: 'Inventory',
};

const enCA: MultiKioskAdminCopy = {
  locale: 'en-CA',
  moduleNames: sharedModuleNames,
  toolNames: { ATTENDANCE: 'Record attendance', MY_TASKS: 'My tasks', TASKS: 'My tasks', PETTY_CASH: 'Petty cash' },
  toolDescriptions: {
    ATTENDANCE: 'Clock in, clock out, and review today’s activity.',
    MY_TASKS: 'Review and complete work assigned to you.',
    TASKS: 'Review and complete work assigned to you.',
    PETTY_CASH: 'Capture receipts and work with authorized funds.',
  },
  center: {
    title: 'Kiosk centre',
    subtitle: 'Create one operational link for computer, tablet, and mobile. Each collaborator signs in with their PIN and receives only their authorized tools.',
    create: 'Create Multi-kiosk',
    toolsPublished: 'Published tools',
    configuredTitle: 'Configured Multi-kiosks',
    configuredSubtitle: 'The link identifies the workspace; the personal PIN identifies the collaborator.',
    emptyTitle: 'No Multi-kiosks yet',
    emptyDescription: 'Create the first one and choose the company tools available through the shared access.',
    authorizedTools: 'Authorized tools',
    toolCount: count => `${count} ${count === 1 ? 'tool' : 'tools'}`,
  },
  editor: {
    newEyebrow: 'New operational access', editEyebrow: name => `Editing · ${name}`,
    createTitle: 'Create Multi-kiosk', editTitle: 'Edit Multi-kiosk',
    description: 'Create one company access; each collaborator sees only the tools authorized by their permissions.',
    stepData: 'Details', stepTools: 'Tools',
    footerSummary: (step, selected, available, legacy) => `Step ${step} of 2 · ${selected} tools · ${available} available${legacy ? ` · ${legacy} previous accesses preserved` : ''}`,
    cancel: 'Cancel', previous: 'Back', continue: 'Continue', create: 'Create Multi-kiosk', save: 'Save changes',
    saveError: 'The Multi-kiosk could not be saved. Review its details and tools.',
    companyAccessTitle: 'Company access, personal identity',
    companyAccessDescription: 'Any active collaborator with a personal PIN can identify. Modules and permissions automatically determine which tools they can open.',
    name: 'Name', namePlaceholder: 'For example, Morning shift operations',
    descriptionLabel: 'Short description', descriptionPlaceholder: 'What the collaborator will find when opening this access',
    colour: 'Colour', colourBlue: 'Indice blue', colourGreen: 'Green', colourYellow: 'Yellow', colourCoral: 'Coral',
    initialLanguage: 'Initial language', initialLanguageHelp: 'Used only when the device has not selected another language.',
    expiry: 'Optional expiry', catalogTitle: 'Native module catalogue',
    catalogDescription: 'Choose the company work tools. They do not depend on created kiosks; after the PIN, the server applies each collaborator’s current permissions.',
    legacyNotice: count => `This Multi-kiosk keeps ${count} previous ${count === 1 ? 'access' : 'accesses'}. They remain in place while you complete the transition to native tools.`,
    searchPlaceholder: 'Search tool or module', emptyTools: 'No native tools match this search.',
    companyAudience: 'Entire company', authorizedAudience: 'According to authorization',
    available: 'Available', setupRequired: 'Setup required', unavailable: 'Unavailable',
    addTool: name => `Add ${name}`, removeTool: name => `Remove ${name}`, moveUp: 'Move up', moveDown: 'Move down',
  },
};

const esMX: MultiKioskAdminCopy = {
  locale: 'es-MX',
  moduleNames: {
    PROCESS_TASKS: 'Procesos y tareas', HUMAN_RESOURCES: 'Recursos Humanos', EXPENSES: 'Gastos',
    PETTY_CASH: 'Caja chica', SALES: 'Ventas', POINT_OF_SALE: 'Punto de venta', INVENTORY: 'Inventarios',
  },
  toolNames: { ATTENDANCE: 'Registrar asistencia', MY_TASKS: 'Mis tareas', TASKS: 'Mis tareas', PETTY_CASH: 'Caja chica' },
  toolDescriptions: {
    ATTENDANCE: 'Registra entrada, salida y consulta la actividad de hoy.',
    MY_TASKS: 'Consulta y completa el trabajo que tienes asignado.',
    TASKS: 'Consulta y completa el trabajo que tienes asignado.',
    PETTY_CASH: 'Captura comprobantes y opera fondos autorizados.',
  },
  center: {
    title: 'Centro de kioscos',
    subtitle: 'Crea un enlace operativo común para computadora, tablet y celular. Cada colaborador entra con su PIN y recibe únicamente sus herramientas autorizadas.',
    create: 'Crear Multikiosco', toolsPublished: 'Herramientas publicadas', configuredTitle: 'Multikioscos configurados',
    configuredSubtitle: 'El enlace identifica el espacio; el PIN personal identifica al colaborador.',
    emptyTitle: 'Aún no hay Multikioscos', emptyDescription: 'Crea el primero y elige las herramientas de compañía disponibles mediante el acceso común.',
    authorizedTools: 'Herramientas autorizadas', toolCount: count => `${count} ${count === 1 ? 'herramienta' : 'herramientas'}`,
  },
  editor: {
    newEyebrow: 'Nuevo acceso operativo', editEyebrow: name => `Edición · ${name}`,
    createTitle: 'Crear Multikiosco', editTitle: 'Editar Multikiosco',
    description: 'Crea un acceso común para la compañía; cada colaborador verá únicamente las herramientas que sus permisos autorizan.',
    stepData: 'Datos', stepTools: 'Herramientas',
    footerSummary: (step, selected, available, legacy) => `Paso ${step} de 2 · ${selected} herramientas · ${available} disponibles${legacy ? ` · ${legacy} accesos anteriores conservados` : ''}`,
    cancel: 'Cancelar', previous: 'Anterior', continue: 'Continuar', create: 'Crear Multikiosco', save: 'Guardar cambios',
    saveError: 'No fue posible guardar el Multikiosco. Revisa sus datos y herramientas.',
    companyAccessTitle: 'Acceso de compañía, identidad personal',
    companyAccessDescription: 'Cualquier colaborador activo con PIN personal puede identificarse. Los módulos y permisos determinan automáticamente qué herramientas puede abrir.',
    name: 'Nombre', namePlaceholder: 'Ej. Operación turno mañana', descriptionLabel: 'Descripción breve',
    descriptionPlaceholder: 'Qué encontrará el colaborador al abrir este acceso',
    colour: 'Color', colourBlue: 'Azul Índice', colourGreen: 'Verde', colourYellow: 'Amarillo', colourCoral: 'Coral',
    initialLanguage: 'Idioma inicial', initialLanguageHelp: 'Se aplica solo si el dispositivo no eligió otro idioma.',
    expiry: 'Vigencia opcional', catalogTitle: 'Catálogo nativo de módulos',
    catalogDescription: 'Selecciona las herramientas de trabajo de la compañía. No dependen de kioscos creados; después del PIN, el servidor aplica los permisos vigentes de cada colaborador.',
    legacyNotice: count => `Este Multikiosco conserva ${count} ${count === 1 ? 'acceso anterior' : 'accesos anteriores'}. Se mantendrán al guardar mientras completas su transición a herramientas nativas.`,
    searchPlaceholder: 'Buscar herramienta o módulo', emptyTools: 'No hay herramientas nativas disponibles con esta búsqueda.',
    companyAudience: 'Toda la compañía', authorizedAudience: 'Según autorización', available: 'Disponible',
    setupRequired: 'Requiere configuración', unavailable: 'No disponible', addTool: name => `Agregar ${name}`,
    removeTool: name => `Quitar ${name}`, moveUp: 'Subir', moveDown: 'Bajar',
  },
};

const frCA: MultiKioskAdminCopy = {
  ...enCA,
  locale: 'fr-CA',
  moduleNames: { ...sharedModuleNames, PROCESS_TASKS: 'Processus et tâches', HUMAN_RESOURCES: 'Ressources humaines', EXPENSES: 'Dépenses', PETTY_CASH: 'Petite caisse', SALES: 'Ventes', POINT_OF_SALE: 'Point de vente', INVENTORY: 'Inventaire' },
  toolNames: { ATTENDANCE: 'Enregistrer la présence', MY_TASKS: 'Mes tâches', TASKS: 'Mes tâches', PETTY_CASH: 'Petite caisse' },
  toolDescriptions: { ATTENDANCE: 'Enregistrez l’arrivée, le départ et consultez l’activité du jour.', MY_TASKS: 'Consultez et terminez le travail qui vous est attribué.', TASKS: 'Consultez et terminez le travail qui vous est attribué.', PETTY_CASH: 'Saisissez les reçus et utilisez les fonds autorisés.' },
  center: { title: 'Centre de kiosques', subtitle: 'Créez un accès opérationnel commun pour ordinateur, tablette et mobile. Chaque collaborateur utilise son NIP et ne reçoit que ses outils autorisés.', create: 'Créer un Multikiosque', toolsPublished: 'Outils publiés', configuredTitle: 'Multikiosques configurés', configuredSubtitle: 'Le lien identifie l’espace; le NIP personnel identifie le collaborateur.', emptyTitle: 'Aucun Multikiosque', emptyDescription: 'Créez le premier et choisissez les outils de l’entreprise offerts dans l’accès commun.', authorizedTools: 'Outils autorisés', toolCount: count => `${count} ${count === 1 ? 'outil' : 'outils'}` },
  editor: { ...enCA.editor, newEyebrow: 'Nouvel accès opérationnel', editEyebrow: name => `Modification · ${name}`, createTitle: 'Créer un Multikiosque', editTitle: 'Modifier le Multikiosque', description: 'Créez un accès commun à l’entreprise; chaque collaborateur ne voit que les outils autorisés.', stepData: 'Détails', stepTools: 'Outils', footerSummary: (step, selected, available, legacy) => `Étape ${step} sur 2 · ${selected} outils · ${available} disponibles${legacy ? ` · ${legacy} accès antérieurs conservés` : ''}`, cancel: 'Annuler', previous: 'Précédent', continue: 'Continuer', create: 'Créer le Multikiosque', save: 'Enregistrer', saveError: 'Impossible d’enregistrer le Multikiosque. Vérifiez les détails et les outils.', companyAccessTitle: 'Accès d’entreprise, identité personnelle', companyAccessDescription: 'Tout collaborateur actif avec un NIP personnel peut s’identifier. Les modules et autorisations déterminent les outils disponibles.', name: 'Nom', namePlaceholder: 'Ex. Opérations du quart du matin', descriptionLabel: 'Brève description', descriptionPlaceholder: 'Ce que le collaborateur trouvera dans cet accès', colour: 'Couleur', colourBlue: 'Bleu Indice', colourGreen: 'Vert', colourYellow: 'Jaune', colourCoral: 'Corail', initialLanguage: 'Langue initiale', initialLanguageHelp: 'Utilisée seulement si l’appareil n’a pas choisi une autre langue.', expiry: 'Expiration facultative', catalogTitle: 'Catalogue natif des modules', catalogDescription: 'Choisissez les outils de travail de l’entreprise. Ils ne dépendent pas de kiosques créés; après le NIP, le serveur applique les autorisations actuelles.', legacyNotice: count => `Ce Multikiosque conserve ${count} accès antérieurs pendant la transition vers les outils natifs.`, searchPlaceholder: 'Rechercher un outil ou un module', emptyTools: 'Aucun outil natif ne correspond à cette recherche.', companyAudience: 'Toute l’entreprise', authorizedAudience: 'Selon les autorisations', available: 'Disponible', setupRequired: 'Configuration requise', unavailable: 'Indisponible', addTool: name => `Ajouter ${name}`, removeTool: name => `Retirer ${name}`, moveUp: 'Monter', moveDown: 'Descendre' },
};

const ptBR: MultiKioskAdminCopy = {
  ...enCA,
  locale: 'pt-BR',
  moduleNames: { ...sharedModuleNames, PROCESS_TASKS: 'Processos e tarefas', HUMAN_RESOURCES: 'Recursos Humanos', EXPENSES: 'Despesas', PETTY_CASH: 'Caixa pequeno', SALES: 'Vendas', POINT_OF_SALE: 'Ponto de venda', INVENTORY: 'Estoque' },
  toolNames: { ATTENDANCE: 'Registrar presença', MY_TASKS: 'Minhas tarefas', TASKS: 'Minhas tarefas', PETTY_CASH: 'Caixa pequeno' },
  toolDescriptions: { ATTENDANCE: 'Registre entrada, saída e consulte a atividade de hoje.', MY_TASKS: 'Consulte e conclua o trabalho atribuído a você.', TASKS: 'Consulte e conclua o trabalho atribuído a você.', PETTY_CASH: 'Registre comprovantes e opere fundos autorizados.' },
  center: { title: 'Central de quiosques', subtitle: 'Crie um acesso operacional comum para computador, tablet e celular. Cada colaborador entra com seu PIN e recebe apenas suas ferramentas autorizadas.', create: 'Criar Multiquiosque', toolsPublished: 'Ferramentas publicadas', configuredTitle: 'Multiquiosques configurados', configuredSubtitle: 'O link identifica o espaço; o PIN pessoal identifica o colaborador.', emptyTitle: 'Ainda não há Multiquiosques', emptyDescription: 'Crie o primeiro e escolha as ferramentas da empresa disponíveis no acesso comum.', authorizedTools: 'Ferramentas autorizadas', toolCount: count => `${count} ${count === 1 ? 'ferramenta' : 'ferramentas'}` },
  editor: { ...enCA.editor, newEyebrow: 'Novo acesso operacional', editEyebrow: name => `Edição · ${name}`, createTitle: 'Criar Multiquiosque', editTitle: 'Editar Multiquiosque', description: 'Crie um acesso comum para a empresa; cada colaborador vê apenas as ferramentas autorizadas.', stepData: 'Dados', stepTools: 'Ferramentas', footerSummary: (step, selected, available, legacy) => `Etapa ${step} de 2 · ${selected} ferramentas · ${available} disponíveis${legacy ? ` · ${legacy} acessos anteriores preservados` : ''}`, cancel: 'Cancelar', previous: 'Anterior', continue: 'Continuar', create: 'Criar Multiquiosque', save: 'Salvar alterações', saveError: 'Não foi possível salvar o Multiquiosque. Revise os dados e as ferramentas.', companyAccessTitle: 'Acesso da empresa, identidade pessoal', companyAccessDescription: 'Qualquer colaborador ativo com PIN pessoal pode se identificar. Módulos e permissões determinam as ferramentas disponíveis.', name: 'Nome', namePlaceholder: 'Ex. Operação do turno da manhã', descriptionLabel: 'Descrição breve', descriptionPlaceholder: 'O que o colaborador encontrará neste acesso', colour: 'Cor', colourBlue: 'Azul Indice', colourGreen: 'Verde', colourYellow: 'Amarelo', colourCoral: 'Coral', initialLanguage: 'Idioma inicial', initialLanguageHelp: 'Aplicado somente se o dispositivo não escolheu outro idioma.', expiry: 'Validade opcional', catalogTitle: 'Catálogo nativo de módulos', catalogDescription: 'Escolha as ferramentas de trabalho da empresa. Elas não dependem de quiosques criados; após o PIN, o servidor aplica as permissões atuais.', legacyNotice: count => `Este Multiquiosque preserva ${count} acessos anteriores durante a transição para ferramentas nativas.`, searchPlaceholder: 'Buscar ferramenta ou módulo', emptyTools: 'Nenhuma ferramenta nativa corresponde à busca.', companyAudience: 'Toda a empresa', authorizedAudience: 'Conforme autorização', available: 'Disponível', setupRequired: 'Configuração necessária', unavailable: 'Indisponível', addTool: name => `Adicionar ${name}`, removeTool: name => `Remover ${name}`, moveUp: 'Subir', moveDown: 'Descer' },
};

const koCA: MultiKioskAdminCopy = {
  ...enCA,
  locale: 'ko-CA',
  moduleNames: { ...sharedModuleNames, PROCESS_TASKS: '프로세스 및 작업', HUMAN_RESOURCES: '인사 관리', EXPENSES: '비용', PETTY_CASH: '소액 현금', SALES: '영업', POINT_OF_SALE: '판매 시점', INVENTORY: '재고' },
  toolNames: { ATTENDANCE: '근태 기록', MY_TASKS: '내 작업', TASKS: '내 작업', PETTY_CASH: '소액 현금' },
  toolDescriptions: { ATTENDANCE: '출근과 퇴근을 기록하고 오늘의 활동을 확인합니다.', MY_TASKS: '배정된 작업을 확인하고 완료합니다.', TASKS: '배정된 작업을 확인하고 완료합니다.', PETTY_CASH: '영수증을 등록하고 승인된 자금을 처리합니다.' },
  center: { title: '키오스크 센터', subtitle: '컴퓨터, 태블릿 및 모바일을 위한 공용 운영 링크를 만듭니다. 각 직원은 PIN으로 로그인하고 승인된 도구만 받습니다.', create: '멀티키오스크 만들기', toolsPublished: '게시된 도구', configuredTitle: '설정된 멀티키오스크', configuredSubtitle: '링크는 작업 공간을 식별하고 개인 PIN은 직원을 식별합니다.', emptyTitle: '멀티키오스크가 없습니다', emptyDescription: '첫 번째 멀티키오스크를 만들고 공용 액세스에 제공할 회사 도구를 선택하세요.', authorizedTools: '승인된 도구', toolCount: count => `${count}개 도구` },
  editor: { ...enCA.editor, newEyebrow: '새 운영 액세스', editEyebrow: name => `편집 · ${name}`, createTitle: '멀티키오스크 만들기', editTitle: '멀티키오스크 편집', description: '회사 공용 액세스를 만들며 각 직원은 권한이 허용하는 도구만 봅니다.', stepData: '정보', stepTools: '도구', footerSummary: (step, selected, available, legacy) => `2단계 중 ${step} · 도구 ${selected}개 · 사용 가능 ${available}개${legacy ? ` · 이전 액세스 ${legacy}개 유지` : ''}`, cancel: '취소', previous: '이전', continue: '계속', create: '멀티키오스크 만들기', save: '변경 사항 저장', saveError: '멀티키오스크를 저장할 수 없습니다. 정보와 도구를 확인하세요.', companyAccessTitle: '회사 액세스, 개인 식별', companyAccessDescription: '개인 PIN이 있는 모든 활성 직원이 본인을 식별할 수 있습니다. 모듈과 권한이 사용 가능한 도구를 결정합니다.', name: '이름', namePlaceholder: '예: 오전 근무 운영', descriptionLabel: '간단한 설명', descriptionPlaceholder: '직원이 이 액세스에서 확인할 내용', colour: '색상', colourBlue: 'Indice 파랑', colourGreen: '초록', colourYellow: '노랑', colourCoral: '코랄', initialLanguage: '초기 언어', initialLanguageHelp: '기기에서 다른 언어를 선택하지 않은 경우에만 적용됩니다.', expiry: '선택적 만료', catalogTitle: '기본 모듈 카탈로그', catalogDescription: '회사 업무 도구를 선택하세요. 생성된 키오스크에 의존하지 않으며 PIN 이후 서버가 현재 권한을 적용합니다.', legacyNotice: count => `기본 도구로 전환하는 동안 이전 액세스 ${count}개를 유지합니다.`, searchPlaceholder: '도구 또는 모듈 검색', emptyTools: '검색과 일치하는 기본 도구가 없습니다.', companyAudience: '회사 전체', authorizedAudience: '권한에 따라', available: '사용 가능', setupRequired: '설정 필요', unavailable: '사용 불가', addTool: name => `${name} 추가`, removeTool: name => `${name} 제거`, moveUp: '위로', moveDown: '아래로' },
};

const zhCA: MultiKioskAdminCopy = {
  ...enCA,
  locale: 'zh-CA',
  moduleNames: { ...sharedModuleNames, PROCESS_TASKS: '流程和任务', HUMAN_RESOURCES: '人力资源', EXPENSES: '费用', PETTY_CASH: '备用金', SALES: '销售', POINT_OF_SALE: '销售点', INVENTORY: '库存' },
  toolNames: { ATTENDANCE: '记录考勤', MY_TASKS: '我的任务', TASKS: '我的任务', PETTY_CASH: '备用金' },
  toolDescriptions: { ATTENDANCE: '记录签到、签退并查看今天的活动。', MY_TASKS: '查看并完成分配给您的工作。', TASKS: '查看并完成分配给您的工作。', PETTY_CASH: '登记凭证并处理获准资金。' },
  center: { title: '自助终端中心', subtitle: '为电脑、平板和手机创建统一运营入口。每位员工使用个人 PIN 登录，并只获得获准工具。', create: '创建多功能终端', toolsPublished: '已发布工具', configuredTitle: '已配置的多功能终端', configuredSubtitle: '链接标识工作空间；个人 PIN 标识员工。', emptyTitle: '尚无多功能终端', emptyDescription: '创建第一个多功能终端并选择统一入口中可用的公司工具。', authorizedTools: '获准工具', toolCount: count => `${count} 个工具` },
  editor: { ...enCA.editor, newEyebrow: '新运营入口', editEyebrow: name => `编辑 · ${name}`, createTitle: '创建多功能终端', editTitle: '编辑多功能终端', description: '创建公司统一入口；每位员工只会看到其权限允许的工具。', stepData: '信息', stepTools: '工具', footerSummary: (step, selected, available, legacy) => `第 ${step}/2 步 · 已选 ${selected} 个工具 · ${available} 个可用${legacy ? ` · 保留 ${legacy} 个旧入口` : ''}`, cancel: '取消', previous: '上一步', continue: '继续', create: '创建多功能终端', save: '保存更改', saveError: '无法保存多功能终端。请检查信息和工具。', companyAccessTitle: '公司入口，个人身份', companyAccessDescription: '任何拥有个人 PIN 的在职员工都可以验证身份。模块和权限会自动决定可打开的工具。', name: '名称', namePlaceholder: '例如：早班运营', descriptionLabel: '简短说明', descriptionPlaceholder: '员工打开此入口后将看到什么', colour: '颜色', colourBlue: 'Indice 蓝', colourGreen: '绿色', colourYellow: '黄色', colourCoral: '珊瑚色', initialLanguage: '初始语言', initialLanguageHelp: '仅当设备未选择其他语言时应用。', expiry: '可选有效期', catalogTitle: '原生模块目录', catalogDescription: '选择公司工作工具。它们不依赖已创建的自助终端；输入 PIN 后，服务器会应用每位员工的当前权限。', legacyNotice: count => `在迁移到原生工具期间，此多功能终端会保留 ${count} 个旧入口。`, searchPlaceholder: '搜索工具或模块', emptyTools: '没有与搜索匹配的原生工具。', companyAudience: '全公司', authorizedAudience: '按授权', available: '可用', setupRequired: '需要配置', unavailable: '不可用', addTool: name => `添加${name}`, removeTool: name => `移除${name}`, moveUp: '上移', moveDown: '下移' },
};

const catalogs: Record<string, MultiKioskAdminCopy> = {
  'en-CA': enCA,
  'en-US': { ...enCA, locale: 'en-US' },
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': { ...esMX, locale: 'es-CO' },
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const getMultiKioskAdminCopy = (locale?: string | null) => catalogs[locale ?? ''] ?? enCA;
