export type BillingCopy = {
  back: string;
  refresh: string;
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
  retry: string;
  catalog: string;
  catalogDescription: string;
  baseModules: string;
  baseModulesDescription: string;
  complementaryModules: string;
  complementaryModulesDescription: string;
  selected: (count: number) => string;
  emptySelection: string;
  includedUsers: string;
  additionalUsers: string;
  usedUsers: string;
  billingCycle: string;
  billingCycleLocked: string;
  monthly: string;
  annual: string;
  estimate: string;
  baseSubtotal: string;
  complementarySubtotal: string;
  usersSubtotal: string;
  taxes: string;
  currentPlan: string;
  currentAccess: string;
  save: string;
  saving: string;
  saved: string;
  reset: string;
  noCatalog: string;
  trialTiming: string;
  activeTiming: string;
  courtesyTiming: string;
  courtesySeats: string;
  activateStripe: string;
  activating: string;
  activationFailed: string;
  stripeBilling: string;
  openPortal: string;
  openingPortal: string;
  cancel: string;
  cancelling: string;
  resume: string;
  resuming: string;
  cancelScheduled: string;
  accessActive: string;
  accessAttention: string;
  moduleFallback: string;
  accountSummary: string;
  selectedModules: string;
  catalogVersion: string;
  customAccess: string;
  userCapacity: string;
  usedOfLicensed: string;
  availableShort: string;
  nextCharge: string;
  atTrialEnd: string;
  atRenewal: string;
  afterStripe: string;
  noDate: string;
  exactUsers: string;
  exactUsersHelp: string;
  licensedUsers: string;
  activeUsers: string;
  availableUsers: string;
  pendingInvitations: string;
  minimumCapacity: string;
  paymentMethod: string;
  paymentReady: string;
  paymentMissing: string;
  paymentReadyDescription: string;
  paymentMissingDescription: string;
  stripeSecurity: string;
  priceDetail: string;
  configurationGuide: string;
  planStep: string;
  peopleStep: string;
  paymentStep: string;
  saveBeforePayment: string;
  invoiceHistory: string;
  invoiceHistoryDescription: string;
  invoiceStorageNote: string;
  noInvoices: string;
  noInvoicesDescription: string;
  invoicePeriod: string;
  invoiceReference: string;
  invoiceAmount: string;
  invoiceStatus: string;
  invoiceDocument: string;
  downloadPdf: string;
  viewInvoice: string;
  manageInvoices: string;
  paid: string;
  open: string;
  draft: string;
  void: string;
  uncollectible: string;
};

const es: BillingCopy = {
  back: 'Volver al panel', refresh: 'Actualizar', eyebrow: 'Suscripción de Índice',
  title: 'Plan, personas y pagos',
  description: 'Elige qué necesita tu empresa, define cuántas personas usarán Índice y autoriza el cobro seguro en Stripe.',
  loading: 'Cargando configuración comercial…', retry: 'Reintentar', catalog: 'Módulos disponibles',
  catalogDescription: 'Elige el paquete base y los complementos publicados en el catálogo vigente.',
  baseModules: 'Paquete base', baseModulesDescription: 'La cantidad elegida determina la tarifa base.',
  complementaryModules: 'Complementos', complementaryModulesDescription: 'Cada complemento se suma individualmente al total.',
  selected: (count) => `${count} módulo(s) seleccionado(s)`,
  emptySelection: 'Selecciona al menos un módulo para continuar.', includedUsers: 'Usuarios incluidos',
  additionalUsers: 'Usuarios adicionales', usedUsers: 'Usuarios e invitaciones en uso',
  billingCycle: 'Periodicidad', billingCycleLocked: 'La periodicidad se conserva hasta la renovación.', monthly: 'Mensual', annual: 'Anual', estimate: 'Próxima factura estimada',
  baseSubtotal: 'Paquete base', complementarySubtotal: 'Complementos', usersSubtotal: 'Usuarios extra',
  taxes: 'Importes antes de impuestos.',
  currentPlan: 'Configuración comercial', currentAccess: 'Acceso actual', save: 'Guardar configuración',
  saving: 'Guardando…', saved: 'Configuración guardada y accesos sincronizados.', reset: 'Restablecer',
  noCatalog: 'No hay módulos comerciales publicados. Contacta al equipo de Índice.',
  trialTiming: 'Estás en prueba: no se cobra ahora. Stripe cobrará esta selección al finalizar el periodo.',
  activeTiming: 'La suscripción está activa: el acceso cambia ahora, no se cobra al guardar y Stripe aplicará el total en la próxima factura.',
  courtesyTiming: 'Esta cuenta tiene acceso administrativo sin método de pago. Puedes ajustar módulos; para automatizar el cobro debes vincular Stripe.',
  courtesySeats: 'Los usuarios adicionales se habilitan al vincular un método de pago.',
  activateStripe: 'Vincular Stripe y activar cobro', activating: 'Abriendo pago seguro…',
  activationFailed: 'No se pudo iniciar la activación de cobro.',
  stripeBilling: 'Tarjeta protegida por Stripe', openPortal: 'Administrar tarjeta y facturas',
  openingPortal: 'Abriendo Stripe…', cancel: 'Cancelar renovación', cancelling: 'Cancelando…',
  resume: 'Reanudar renovación', resuming: 'Reanudando…',
  cancelScheduled: 'La cancelación ya está programada.', accessActive: 'Acceso activo',
  accessAttention: 'Acceso requiere atención', moduleFallback: 'Acceso operativo',
  accountSummary: 'Resumen de la suscripción', selectedModules: 'Módulos seleccionados',
  catalogVersion: 'Catálogo', customAccess: 'Selección actual', userCapacity: 'Capacidad de usuarios',
  usedOfLicensed: 'En uso / capacidad contratada', availableShort: 'disponibles', nextCharge: 'Próximo cobro estimado',
  atTrialEnd: 'Al terminar la prueba', atRenewal: 'En la renovación', afterStripe: 'Al vincular Stripe',
  noDate: 'Fecha pendiente', exactUsers: '¿Cuántas personas usarán Índice?',
  exactUsersHelp: 'Indica la capacidad total. Índice calcula automáticamente los usuarios incluidos y adicionales.',
  licensedUsers: 'Usuarios totales requeridos', activeUsers: 'Activos', availableUsers: 'Disponibles',
  pendingInvitations: 'Invitaciones pendientes', minimumCapacity: 'Mínimo por usuarios e invitaciones en uso',
  paymentMethod: 'Método de pago', paymentReady: 'Administrado en Stripe', paymentMissing: 'Falta agregar tarjeta',
  paymentReadyDescription: 'Tu tarjeta, tus facturas y los próximos cobros se administran en el portal seguro de Stripe.',
  paymentMissingDescription: 'Agrega una tarjeta en el Checkout seguro de Stripe para activar la renovación automática.',
  stripeSecurity: 'Stripe conserva los datos de la tarjeta y procesa los cargos. Índice nunca recibe ni guarda el número o el CVV.',
  priceDetail: 'Detalle del importe', configurationGuide: 'Tu suscripción en tres decisiones',
  planStep: 'Plan', peopleStep: 'Personas', paymentStep: 'Pago',
  saveBeforePayment: 'Guarda primero los cambios del plan antes de administrar el método de pago.',
  invoiceHistory: 'Facturas y comprobantes',
  invoiceHistoryDescription: 'Consulta los cobros emitidos para esta cuenta y descarga su comprobante fiscal.',
  invoiceStorageNote: 'Stripe genera y resguarda los documentos. Índice conserva la referencia segura y los muestra aquí automáticamente.',
  noInvoices: 'Aún no hay facturas emitidas',
  noInvoicesDescription: 'La primera factura aparecerá aquí cuando Stripe procese el primer cobro de la suscripción.',
  invoicePeriod: 'Periodo', invoiceReference: 'Factura', invoiceAmount: 'Importe', invoiceStatus: 'Estado',
  invoiceDocument: 'Documento', downloadPdf: 'Descargar PDF', viewInvoice: 'Ver factura',
  manageInvoices: 'Administrar en Stripe', paid: 'Pagada', open: 'Pendiente', draft: 'Borrador',
  void: 'Anulada', uncollectible: 'Incobrable',
};

const en: BillingCopy = {
  back: 'Back to dashboard', refresh: 'Refresh', eyebrow: 'Indice subscription',
  title: 'Plan, people and payments',
  description: 'Choose what your company needs, define how many people will use Indice, and authorize secure Stripe billing.',
  loading: 'Loading commercial configuration…', retry: 'Try again', catalog: 'Available modules',
  catalogDescription: 'Choose the base package and add-ons published in the current catalog.',
  baseModules: 'Base package', baseModulesDescription: 'The number selected determines the base rate.',
  complementaryModules: 'Add-ons', complementaryModulesDescription: 'Each add-on is added individually to the total.',
  selected: (count) => `${count} module(s) selected`, emptySelection: 'Select at least one module to continue.',
  includedUsers: 'Included users', additionalUsers: 'Additional users', usedUsers: 'Users and invitations in use',
  billingCycle: 'Billing cycle', billingCycleLocked: 'The billing cycle stays unchanged until renewal.', monthly: 'Monthly', annual: 'Annual', estimate: 'Estimated next invoice',
  baseSubtotal: 'Base package', complementarySubtotal: 'Add-ons', usersSubtotal: 'Extra users',
  taxes: 'Amounts before taxes.',
  currentPlan: 'Commercial configuration', currentAccess: 'Current access', save: 'Save configuration',
  saving: 'Saving…', saved: 'Configuration saved and access synchronized.', reset: 'Reset',
  noCatalog: 'No commercial modules are published. Contact the Indice team.',
  trialTiming: 'You are in trial: nothing is charged now. Stripe will charge this selection when the trial ends.',
  activeTiming: 'The subscription is active: access changes now, nothing is charged on save, and Stripe applies the full total on the next invoice.',
  courtesyTiming: 'This account has administrative access without a payment method. Modules can be changed; link Stripe to automate billing.',
  courtesySeats: 'Additional users are enabled after a payment method is linked.',
  activateStripe: 'Link Stripe and activate billing', activating: 'Opening secure checkout…',
  activationFailed: 'Billing activation could not be started.',
  stripeBilling: 'Card protected by Stripe', openPortal: 'Manage card and invoices',
  openingPortal: 'Opening Stripe…', cancel: 'Cancel renewal', cancelling: 'Cancelling…',
  resume: 'Resume renewal', resuming: 'Resuming…', cancelScheduled: 'Cancellation is already scheduled.',
  accessActive: 'Access active', accessAttention: 'Access needs attention', moduleFallback: 'Operational access',
  accountSummary: 'Subscription summary', selectedModules: 'Selected modules', catalogVersion: 'Catalog',
  customAccess: 'Current selection', userCapacity: 'User capacity', usedOfLicensed: 'In use / licensed capacity',
  availableShort: 'available', nextCharge: 'Estimated next charge', atTrialEnd: 'At trial end',
  atRenewal: 'At renewal', afterStripe: 'After linking Stripe', noDate: 'Date pending',
  exactUsers: 'How many people will use Indice?',
  exactUsersHelp: 'Enter the total capacity. Indice calculates included and additional users automatically.',
  licensedUsers: 'Total users required', activeUsers: 'Active', availableUsers: 'Available',
  pendingInvitations: 'Pending invitations', minimumCapacity: 'Minimum for users and invitations in use',
  paymentMethod: 'Payment method', paymentReady: 'Managed in Stripe', paymentMissing: 'Card required',
  paymentReadyDescription: 'Your card, invoices, and upcoming charges are managed in the secure Stripe portal.',
  paymentMissingDescription: 'Add a card in secure Stripe Checkout to activate automatic renewal.',
  stripeSecurity: 'Stripe stores card details and processes charges. Indice never receives or stores the card number or CVV.',
  priceDetail: 'Amount breakdown', configurationGuide: 'Your subscription in three decisions',
  planStep: 'Plan', peopleStep: 'People', paymentStep: 'Payment',
  saveBeforePayment: 'Save plan changes before managing the payment method.',
  invoiceHistory: 'Invoices and receipts',
  invoiceHistoryDescription: 'Review charges issued for this account and download each receipt.',
  invoiceStorageNote: 'Stripe generates and stores the documents. Indice keeps their secure reference and displays them here automatically.',
  noInvoices: 'No invoices have been issued yet',
  noInvoicesDescription: 'The first invoice will appear here after Stripe processes the subscription’s first charge.',
  invoicePeriod: 'Period', invoiceReference: 'Invoice', invoiceAmount: 'Amount', invoiceStatus: 'Status',
  invoiceDocument: 'Document', downloadPdf: 'Download PDF', viewInvoice: 'View invoice',
  manageInvoices: 'Manage in Stripe', paid: 'Paid', open: 'Open', draft: 'Draft', void: 'Void',
  uncollectible: 'Uncollectible',
};

const fr: BillingCopy = {
  ...en,
  back: 'Retour au tableau de bord', refresh: 'Actualiser', eyebrow: 'Abonnement Indice',
  title: 'Modules, utilisateurs et facturation',
  description: 'Configurez les accès depuis le catalogue actif et vérifiez le total avant de confirmer.',
  loading: 'Chargement de la configuration commerciale…', retry: 'Réessayer', catalog: 'Modules disponibles',
  catalogDescription: 'Seuls les produits BASIC actifs du catalogue courant sont affichés.',
  selected: (count) => `${count} module(s) sélectionné(s)`, emptySelection: 'Sélectionnez au moins un module.',
  includedUsers: 'Utilisateurs inclus', additionalUsers: 'Utilisateurs supplémentaires',
  usedUsers: 'Utilisateurs et invitations utilisés', billingCycle: 'Périodicité', monthly: 'Mensuel', annual: 'Annuel',
  estimate: 'Total estimé', taxes: 'Avant taxes. Le paiement sécurisé est traité dans Indice avec Stripe.',
  currentPlan: 'Configuration commerciale', currentAccess: 'Accès actuel', save: 'Enregistrer', saving: 'Enregistrement…',
  saved: 'Configuration enregistrée et accès synchronisés.', reset: 'Réinitialiser',
  noCatalog: 'Aucun module BASIC publié. Contactez l’équipe Indice.',
  trialTiming: 'Période d’essai : aucun débit maintenant. Stripe facturera cette sélection à la fin de l’essai.',
  activeTiming: 'Abonnement actif : les accès changent maintenant et Stripe facturera le nouveau total au prochain renouvellement.',
  courtesyTiming: 'Ce compte administratif n’a pas de mode de paiement. Liez Stripe pour automatiser la facturation.',
  courtesySeats: 'Les utilisateurs supplémentaires sont activés après l’ajout d’un mode de paiement.',
  activateStripe: 'Lier Stripe et activer la facturation', activating: 'Ouverture du paiement sécurisé…',
  activationFailed: 'Impossible de démarrer l’activation de la facturation.',
  stripeBilling: 'Paiements protégés par Stripe', openPortal: 'Paiement et factures', openingPortal: 'Ouverture de Stripe…',
  cancel: 'Annuler le renouvellement', cancelling: 'Annulation…', resume: 'Reprendre le renouvellement',
  resuming: 'Reprise…', cancelScheduled: 'L’annulation est déjà planifiée.', accessActive: 'Accès actif',
  accessAttention: 'Accès à vérifier', moduleFallback: 'Accès opérationnel',
};

const pt: BillingCopy = {
  ...en,
  back: 'Voltar ao painel', refresh: 'Atualizar', eyebrow: 'Assinatura Índice', title: 'Módulos, usuários e cobrança',
  description: 'Configure o acesso pelo catálogo ativo e revise o total antes de confirmar.',
  loading: 'Carregando configuração comercial…', retry: 'Tentar novamente', catalog: 'Módulos disponíveis',
  catalogDescription: 'Somente produtos BASIC ativos do catálogo vigente aparecem aqui.',
  selected: (count) => `${count} módulo(s) selecionado(s)`, emptySelection: 'Selecione pelo menos um módulo.',
  includedUsers: 'Usuários incluídos', additionalUsers: 'Usuários adicionais', usedUsers: 'Usuários e convites em uso',
  billingCycle: 'Periodicidade', monthly: 'Mensal', annual: 'Anual', estimate: 'Total estimado',
  taxes: 'Antes dos impostos. O pagamento seguro é processado no Índice pelo Stripe.', currentPlan: 'Configuração comercial',
  currentAccess: 'Acesso atual', save: 'Salvar configuração', saving: 'Salvando…',
  saved: 'Configuração salva e acessos sincronizados.', reset: 'Restaurar',
  noCatalog: 'Não há módulos BASIC publicados. Fale com a equipe Índice.',
  trialTiming: 'Período de teste: nada é cobrado agora. O Stripe cobrará esta seleção no fim do teste.',
  activeTiming: 'Assinatura ativa: o acesso muda agora e o Stripe cobrará o novo total na próxima fatura.',
  courtesyTiming: 'Esta conta administrativa não possui forma de pagamento. Vincule o Stripe para automatizar a cobrança.',
  courtesySeats: 'Usuários adicionais são habilitados após vincular uma forma de pagamento.',
  activateStripe: 'Vincular Stripe e ativar cobrança', activating: 'Abrindo pagamento seguro…',
  activationFailed: 'Não foi possível iniciar a ativação da cobrança.',
  stripeBilling: 'Pagamentos protegidos pelo Stripe', openPortal: 'Pagamento e faturas', openingPortal: 'Abrindo Stripe…',
  cancel: 'Cancelar renovação', cancelling: 'Cancelando…', resume: 'Retomar renovação', resuming: 'Retomando…',
  cancelScheduled: 'O cancelamento já está programado.', accessActive: 'Acesso ativo',
  accessAttention: 'Acesso requer atenção', moduleFallback: 'Acesso operacional',
};

const ko: BillingCopy = {
  ...en,
  back: '대시보드로', refresh: '새로고침', eyebrow: 'Indice 구독', title: '모듈, 사용자 및 결제',
  description: '현재 카탈로그에서 회사 액세스를 구성하고 확인 전에 총액을 검토하세요.', loading: '상업 설정 불러오는 중…',
  retry: '다시 시도', catalog: '사용 가능한 모듈', catalogDescription: '현재 카탈로그에 게시된 활성 BASIC 제품만 표시됩니다.',
  selected: (count) => `${count}개 모듈 선택됨`, emptySelection: '하나 이상의 모듈을 선택하세요.', includedUsers: '포함 사용자',
  additionalUsers: '추가 사용자', usedUsers: '사용 중인 사용자 및 초대', billingCycle: '결제 주기', monthly: '월간', annual: '연간',
  estimate: '예상 합계', taxes: '세금 별도. 안전한 결제는 Indice 내 Stripe로 처리됩니다.', currentPlan: '상업 설정',
  currentAccess: '현재 액세스', save: '설정 저장', saving: '저장 중…', saved: '설정과 액세스가 동기화되었습니다.', reset: '초기화',
  noCatalog: '게시된 BASIC 모듈이 없습니다. Indice 팀에 문의하세요.',
  trialTiming: '체험 기간에는 지금 청구되지 않으며 종료 시 Stripe가 이 선택을 청구합니다.',
  activeTiming: '활성 구독입니다. 액세스는 지금 변경되며 새 총액은 다음 청구서에 반영됩니다.',
  courtesyTiming: '이 관리 계정에는 결제 수단이 없습니다. 자동 결제를 위해 Stripe를 연결하세요.',
  courtesySeats: '결제 수단 연결 후 추가 사용자를 활성화할 수 있습니다.', stripeBilling: 'Stripe 보안 결제',
  activateStripe: 'Stripe 연결 및 결제 활성화', activating: '보안 결제 여는 중…',
  activationFailed: '결제 활성화를 시작할 수 없습니다.',
  openPortal: '결제 수단 및 청구서', openingPortal: 'Stripe 여는 중…', cancel: '갱신 취소', cancelling: '취소 중…',
  resume: '갱신 재개', resuming: '재개 중…', cancelScheduled: '취소가 이미 예약되었습니다.', accessActive: '액세스 활성',
  accessAttention: '액세스 확인 필요', moduleFallback: '운영 액세스',
};

const zh: BillingCopy = {
  ...en,
  back: '返回面板', refresh: '刷新', eyebrow: 'Indice 订阅', title: '模块、用户与账单',
  description: '从当前目录配置公司访问权限，并在确认前查看总额。', loading: '正在加载商业配置…', retry: '重试',
  catalog: '可用模块', catalogDescription: '这里只显示当前目录中已发布的活跃 BASIC 产品。',
  selected: (count) => `已选择 ${count} 个模块`, emptySelection: '请至少选择一个模块。', includedUsers: '包含用户',
  additionalUsers: '额外用户', usedUsers: '已使用的用户和邀请', billingCycle: '账单周期', monthly: '每月', annual: '每年',
  estimate: '预计总额', taxes: '税前价格。安全付款由 Indice 内的 Stripe 处理。', currentPlan: '商业配置',
  currentAccess: '当前访问', save: '保存配置', saving: '保存中…', saved: '配置已保存，访问权限已同步。', reset: '重置',
  noCatalog: '没有已发布的 BASIC 模块。请联系 Indice 团队。',
  trialTiming: '试用期内现在不会扣款；试用结束时 Stripe 将按此选择收费。',
  activeTiming: '订阅已激活；访问权限立即更新，新总额将在下一张账单中收取。',
  courtesyTiming: '此管理账户没有付款方式。请关联 Stripe 以自动计费。',
  courtesySeats: '关联付款方式后可启用额外用户。', stripeBilling: 'Stripe 安全支付', openPortal: '付款方式和发票',
  activateStripe: '关联 Stripe 并启用计费', activating: '正在打开安全结账…',
  activationFailed: '无法启动计费激活。',
  openingPortal: '正在打开 Stripe…', cancel: '取消续订', cancelling: '正在取消…', resume: '恢复续订', resuming: '正在恢复…',
  cancelScheduled: '取消已安排。', accessActive: '访问正常', accessAttention: '访问需要处理', moduleFallback: '运营访问',
};

const copies: Record<string, BillingCopy> = {
  'es-MX': es, 'es-CO': es, 'en-US': en, 'en-CA': en,
  'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};

export const getBillingCopy = (code: string) => copies[code] ?? en;
