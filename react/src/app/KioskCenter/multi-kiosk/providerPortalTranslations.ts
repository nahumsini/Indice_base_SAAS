export interface ProviderPortalCopy {
  home: string;
  navigationLabel: string;
  homeTitle: string;
  homeDescription: string;
  productPathTitle: string;
  productPathDescription: string;
  servicePathTitle: string;
  servicePathDescription: string;
  applicationsTitle: string;
  applicationsDescription: string;
  safeSession: string;
  openPath: string;
  unsavedTitle: string;
  unsavedDescription: string;
  stay: string;
  leave: string;
  procurementModule: string;
  expensesModule: string;
  shortAppLabels: Record<string, string>;
}

const esMX: ProviderPortalCopy = {
  home: 'Inicio',
  navigationLabel: 'Navegación del portal de proveedores',
  homeTitle: '¿Qué necesitas hacer hoy?',
  homeDescription: 'Elige el camino que corresponde a tu operación. Puedes cambiar de aplicación sin volver a identificarte.',
  productPathTitle: 'Vendí productos',
  productPathDescription: 'Envía una propuesta, responde órdenes y entrega la factura cuando corresponda.',
  servicePathTitle: 'Presté un servicio',
  servicePathDescription: 'Registra una cuenta sin orden de compra para que Gastos la revise.',
  applicationsTitle: 'Tus aplicaciones',
  applicationsDescription: 'Cada aplicación muestra solamente la información autorizada para tu empresa proveedora.',
  safeSession: 'Sesión protegida del proveedor',
  openPath: 'Comenzar',
  unsavedTitle: 'Hay una propuesta sin guardar',
  unsavedDescription: 'Si cambias de aplicación, perderás la información capturada en este borrador.',
  stay: 'Seguir editando',
  leave: 'Salir sin guardar',
  procurementModule: 'Compras',
  expensesModule: 'Gastos',
  shortAppLabels: {
    'provider.proposals@1': 'Propuestas',
    'provider.orders-and-invoices@1': 'Órdenes',
    'provider.payables@1': 'Cuentas',
    'provider.tracking@1': 'Seguimiento',
  },
};

const enCA: ProviderPortalCopy = {
  home: 'Home',
  navigationLabel: 'Supplier portal navigation',
  homeTitle: 'What do you need to do today?',
  homeDescription: 'Choose the path that matches your transaction. You can switch apps without signing in again.',
  productPathTitle: 'I sold products',
  productPathDescription: 'Send a proposal, respond to orders and submit the invoice when it is ready.',
  servicePathTitle: 'I provided a service',
  servicePathDescription: 'Submit an account without a purchase order for Expenses to review.',
  applicationsTitle: 'Your apps',
  applicationsDescription: 'Each app shows only the information authorized for your supplier company.',
  safeSession: 'Protected supplier session',
  openPath: 'Start',
  unsavedTitle: 'You have an unsaved proposal',
  unsavedDescription: 'If you switch apps, the information in this draft will be lost.',
  stay: 'Keep editing',
  leave: 'Leave without saving',
  procurementModule: 'Procurement',
  expensesModule: 'Expenses',
  shortAppLabels: {
    'provider.proposals@1': 'Proposals',
    'provider.orders-and-invoices@1': 'Orders',
    'provider.payables@1': 'Accounts',
    'provider.tracking@1': 'Tracking',
  },
};

const frCA: ProviderPortalCopy = {
  ...enCA,
  home: 'Accueil',
  navigationLabel: 'Navigation du portail fournisseurs',
  homeTitle: "Que souhaitez-vous faire aujourd’hui?",
  homeDescription: 'Choisissez le parcours correspondant à votre opération. Vous pouvez changer d’application sans vous identifier de nouveau.',
  productPathTitle: 'J’ai vendu des produits',
  productPathDescription: 'Envoyez une proposition, répondez aux commandes et transmettez la facture au bon moment.',
  servicePathTitle: 'J’ai fourni un service',
  servicePathDescription: 'Soumettez un compte sans bon de commande pour examen par les Dépenses.',
  applicationsTitle: 'Vos applications',
  applicationsDescription: 'Chaque application affiche uniquement les renseignements autorisés pour votre entreprise.',
  safeSession: 'Session fournisseur protégée',
  openPath: 'Commencer',
  unsavedTitle: 'Une proposition n’est pas enregistrée',
  unsavedDescription: 'Si vous changez d’application, les renseignements de ce brouillon seront perdus.',
  stay: 'Continuer la saisie',
  leave: 'Quitter sans enregistrer',
  procurementModule: 'Achats',
  expensesModule: 'Dépenses',
  shortAppLabels: {
    'provider.proposals@1': 'Propositions',
    'provider.orders-and-invoices@1': 'Commandes',
    'provider.payables@1': 'Comptes',
    'provider.tracking@1': 'Suivi',
  },
};

const ptBR: ProviderPortalCopy = {
  ...enCA,
  home: 'Início',
  navigationLabel: 'Navegação do portal de fornecedores',
  homeTitle: 'O que você precisa fazer hoje?',
  homeDescription: 'Escolha o caminho da sua operação. Você pode trocar de aplicativo sem entrar novamente.',
  productPathTitle: 'Vendi produtos',
  productPathDescription: 'Envie uma proposta, responda aos pedidos e entregue a nota quando estiver pronta.',
  servicePathTitle: 'Prestei um serviço',
  servicePathDescription: 'Registre uma conta sem pedido de compra para análise de Despesas.',
  applicationsTitle: 'Seus aplicativos',
  applicationsDescription: 'Cada aplicativo mostra somente as informações autorizadas para sua empresa.',
  safeSession: 'Sessão protegida do fornecedor',
  openPath: 'Começar',
  unsavedTitle: 'Há uma proposta não salva',
  unsavedDescription: 'Ao trocar de aplicativo, as informações deste rascunho serão perdidas.',
  stay: 'Continuar editando',
  leave: 'Sair sem salvar',
  procurementModule: 'Compras',
  expensesModule: 'Despesas',
  shortAppLabels: {
    'provider.proposals@1': 'Propostas',
    'provider.orders-and-invoices@1': 'Pedidos',
    'provider.payables@1': 'Contas',
    'provider.tracking@1': 'Acompanhamento',
  },
};

const koCA: ProviderPortalCopy = {
  ...enCA,
  home: '홈',
  navigationLabel: '공급업체 포털 탐색',
  homeTitle: '오늘 어떤 작업을 하시겠어요?',
  homeDescription: '거래에 맞는 경로를 선택하세요. 다시 로그인하지 않고 앱을 전환할 수 있습니다.',
  productPathTitle: '제품을 판매했어요',
  productPathDescription: '제안서를 보내고 주문에 응답한 뒤 준비되면 송장을 제출하세요.',
  servicePathTitle: '서비스를 제공했어요',
  servicePathDescription: '구매 주문이 없는 계정을 비용 검토로 제출하세요.',
  applicationsTitle: '내 앱',
  applicationsDescription: '각 앱에는 공급업체에 허용된 정보만 표시됩니다.',
  safeSession: '보호된 공급업체 세션',
  openPath: '시작',
  unsavedTitle: '저장되지 않은 제안이 있습니다',
  unsavedDescription: '앱을 전환하면 이 초안에 입력한 정보가 사라집니다.',
  stay: '계속 편집',
  leave: '저장하지 않고 나가기',
  procurementModule: '구매',
  expensesModule: '비용',
  shortAppLabels: {
    'provider.proposals@1': '제안',
    'provider.orders-and-invoices@1': '주문',
    'provider.payables@1': '계정',
    'provider.tracking@1': '추적',
  },
};

const zhCA: ProviderPortalCopy = {
  ...enCA,
  home: '首页',
  navigationLabel: '供应商门户导航',
  homeTitle: '今天需要做什么？',
  homeDescription: '请选择与业务相符的路径。切换应用时无需重新登录。',
  productPathTitle: '我销售了产品',
  productPathDescription: '发送提案、回复订单，并在准备好后提交发票。',
  servicePathTitle: '我提供了服务',
  servicePathDescription: '提交没有采购订单的应付账款，供费用部门审核。',
  applicationsTitle: '您的应用',
  applicationsDescription: '每个应用仅显示已授权给贵公司的信息。',
  safeSession: '受保护的供应商会话',
  openPath: '开始',
  unsavedTitle: '有未保存的提案',
  unsavedDescription: '切换应用后，此草稿中的信息将丢失。',
  stay: '继续编辑',
  leave: '不保存并离开',
  procurementModule: '采购',
  expensesModule: '费用',
  shortAppLabels: {
    'provider.proposals@1': '提案',
    'provider.orders-and-invoices@1': '订单',
    'provider.payables@1': '账款',
    'provider.tracking@1': '跟踪',
  },
};

const copies: Record<string, ProviderPortalCopy> = {
  'en-CA': enCA,
  'en-US': enCA,
  'es-CO': esMX,
  'es-MX': esMX,
  'fr-CA': frCA,
  'ko-CA': koCA,
  'pt-BR': ptBR,
  'zh-CA': zhCA,
};

export const getProviderPortalCopy = (locale?: string | null) => copies[locale ?? ''] ?? enCA;
