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
  draftSelection: string;
  scheduledSelection: string;
  syncingSelection: string;
  effectiveOn: string;
  stripeDisabled: string;
  stripeCatalogPending: string;
  ownerPaymentRequired: string;
  retrySync: string;
  noImmediateCharge: string;
  planAtCutoff: string;
  currentToNext: string;
  modulesShort: string;
  scheduledAccessHelp: string;
  cutoffDate: string;
  scheduleChanges: string;
  saveDraft: string;
  noPendingChanges: string;
  packagePrice: string;
  includedElsewhere: string;
  pricePending: string;
  perMonth: string;
  perYear: string;
  rootReview: string;
  portfolioClient: string;
  readOnlyDescription: string;
  delegatedReadOnly: (companyName: string) => string;
  moduleNames: Record<string, string>;
  capabilityNames: Record<string, string>;
  paid: string;
  open: string;
  draft: string;
  void: string;
  uncollectible: string;
};

const moduleNamesEn: Record<string, string> = {
  human_resources: 'Human resources',
  processes: 'Tasks and processes',
  expenses_petty_cash: 'Expenses + petty cash',
  pos_inventory: 'Point of sale + inventory',
  sales_inventory: 'Sales + inventory',
  receivables: 'Receivables',
  maintenance: 'Maintenance',
  control_minutes: 'Minute control',
};

const capabilityNamesEn: Record<string, string> = {
  human_resources: 'People', processes: 'Processes', expenses: 'Expenses', petty_cash: 'Petty cash',
  pos: 'Point of sale', inventory: 'Inventory', sales: 'Sales', receivables: 'Receivables',
  maintenance: 'Maintenance', control_minutes: 'Minutes',
};

const moduleNamesEs: Record<string, string> = {
  human_resources: 'Recursos Humanos',
  processes: 'Tareas y Procesos',
  expenses_petty_cash: 'Gastos + Caja Chica',
  pos_inventory: 'Punto de Venta + Inventarios',
  sales_inventory: 'Ventas + Inventarios',
  receivables: 'Cartera',
  maintenance: 'Mantenimiento',
  control_minutes: 'Control de minutos',
};

const capabilityNamesEs: Record<string, string> = {
  human_resources: 'Personas', processes: 'Procesos', expenses: 'Gastos', petty_cash: 'Caja chica',
  pos: 'Punto de venta', inventory: 'Inventarios', sales: 'Ventas', receivables: 'Cartera',
  maintenance: 'Mantenimiento', control_minutes: 'Minutos',
};

const moduleNamesFr: Record<string, string> = {
  human_resources: 'Ressources humaines', processes: 'Tâches et processus',
  expenses_petty_cash: 'Dépenses + petite caisse', pos_inventory: 'Point de vente + stocks',
  sales_inventory: 'Ventes + stocks', receivables: 'Comptes clients', maintenance: 'Maintenance',
  control_minutes: 'Contrôle des minutes',
};

const capabilityNamesFr: Record<string, string> = {
  human_resources: 'Équipe', processes: 'Processus', expenses: 'Dépenses', petty_cash: 'Petite caisse',
  pos: 'Point de vente', inventory: 'Stocks', sales: 'Ventes', receivables: 'Comptes clients',
  maintenance: 'Maintenance', control_minutes: 'Minutes',
};

const moduleNamesPt: Record<string, string> = {
  human_resources: 'Recursos Humanos', processes: 'Tarefas e Processos',
  expenses_petty_cash: 'Despesas + Caixa Pequeno', pos_inventory: 'Ponto de Venda + Estoque',
  sales_inventory: 'Vendas + Estoque', receivables: 'Contas a receber', maintenance: 'Manutenção',
  control_minutes: 'Controle de minutos',
};

const capabilityNamesPt: Record<string, string> = {
  human_resources: 'Pessoas', processes: 'Processos', expenses: 'Despesas', petty_cash: 'Caixa pequeno',
  pos: 'Ponto de venda', inventory: 'Estoque', sales: 'Vendas', receivables: 'Contas a receber',
  maintenance: 'Manutenção', control_minutes: 'Minutos',
};

const moduleNamesKo: Record<string, string> = {
  human_resources: '인사 관리', processes: '업무 및 프로세스', expenses_petty_cash: '경비 + 소액 현금',
  pos_inventory: '판매 시점 + 재고', sales_inventory: '영업 + 재고', receivables: '미수금',
  maintenance: '유지보수', control_minutes: '시간 관리',
};

const capabilityNamesKo: Record<string, string> = {
  human_resources: '인사', processes: '프로세스', expenses: '경비', petty_cash: '소액 현금',
  pos: '판매 시점', inventory: '재고', sales: '영업', receivables: '미수금',
  maintenance: '유지보수', control_minutes: '시간',
};

const moduleNamesZh: Record<string, string> = {
  human_resources: '人力资源', processes: '任务与流程', expenses_petty_cash: '费用 + 备用金',
  pos_inventory: '销售点 + 库存', sales_inventory: '销售 + 库存', receivables: '应收账款',
  maintenance: '维护', control_minutes: '工时控制',
};

const capabilityNamesZh: Record<string, string> = {
  human_resources: '人员', processes: '流程', expenses: '费用', petty_cash: '备用金',
  pos: '销售点', inventory: '库存', sales: '销售', receivables: '应收账款',
  maintenance: '维护', control_minutes: '工时',
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
  saving: 'Guardando…', saved: 'Configuración guardada. No se realizó ningún cargo.', reset: 'Restablecer',
  noCatalog: 'No hay módulos comerciales publicados. Contacta al equipo de Índice.',
  trialTiming: 'Estás en prueba: no se cobra ahora. Stripe cobrará esta selección al finalizar el periodo.',
  activeTiming: 'El cambio queda programado: Stripe cobrará el nuevo total en la fecha de corte y el acceso se actualizará al confirmar ese pago.',
  courtesyTiming: 'Esta selección es un borrador de contratación. Guardarla no concede módulos ni genera cargos; se activa únicamente al completar Stripe.',
  courtesySeats: 'La capacidad elegida forma parte del borrador y se habilita después de completar Stripe.',
  activateStripe: 'Vincular Stripe y activar cobro', activating: 'Abriendo pago seguro…',
  activationFailed: 'No se pudo iniciar la activación de cobro.',
  stripeBilling: 'Tarjeta protegida por Stripe', openPortal: 'Administrar tarjetas y facturas en Stripe',
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
  manageInvoices: 'Administrar en Stripe', draftSelection: 'Borrador sin activar',
  scheduledSelection: 'Programado para el corte', syncingSelection: 'Sincronizando con Stripe', effectiveOn: 'Vigente desde',
  stripeDisabled: 'Stripe todavía no está habilitado para contratar.',
  stripeCatalogPending: 'Los precios de esta selección todavía no están validados en Stripe.',
  ownerPaymentRequired: 'Sólo el propietario de la cuenta puede activar el cobro o administrar tarjetas.',
  retrySync: 'Reintentar sincronización',
  noImmediateCharge: 'Guardar no realiza cargos fuera del día de corte.',
  planAtCutoff: 'Tu plan al próximo corte', currentToNext: 'Configuración actual → próxima',
  modulesShort: 'módulos', scheduledAccessHelp: 'Los cambios se aplican al confirmar el cobro del corte.',
  cutoffDate: 'Día de corte', scheduleChanges: 'Programar para el próximo corte',
  saveDraft: 'Guardar borrador sin cobrar', noPendingChanges: 'Tu configuración está actualizada',
  packagePrice: 'Precio de paquete', includedElsewhere: 'Ya está incluido en otra selección.',
  pricePending: 'Precio pendiente', perMonth: '/mes', perYear: '/año',
  rootReview: 'Consulta Root', portfolioClient: 'Cliente de tu cartera',
  readOnlyDescription: 'Estás viendo su plan, capacidad, módulos e historial en modo de solo lectura. Los cobros y cambios contractuales permanecen protegidos.',
  delegatedReadOnly: (companyName) => `El acceso delegado a la facturación de ${companyName} es de solo lectura.`,
  moduleNames: moduleNamesEs, capabilityNames: capabilityNamesEs,
  paid: 'Pagada', open: 'Pendiente', draft: 'Borrador',
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
  saving: 'Saving…', saved: 'Configuration saved. No charge was made.', reset: 'Reset',
  noCatalog: 'No commercial modules are published. Contact the Indice team.',
  trialTiming: 'You are in trial: nothing is charged now. Stripe will charge this selection when the trial ends.',
  activeTiming: 'The change is scheduled: Stripe charges the new total on the cut-off date and access updates after payment confirmation.',
  courtesyTiming: 'This selection is a purchase draft. Saving it grants no modules and makes no charge; it activates only after Stripe checkout.',
  courtesySeats: 'Selected capacity is part of the draft and becomes active after Stripe checkout.',
  activateStripe: 'Link Stripe and activate billing', activating: 'Opening secure checkout…',
  activationFailed: 'Billing activation could not be started.',
  stripeBilling: 'Card protected by Stripe', openPortal: 'Manage cards and invoices in Stripe',
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
  manageInvoices: 'Manage in Stripe', draftSelection: 'Inactive draft',
  scheduledSelection: 'Scheduled for cut-off', syncingSelection: 'Syncing with Stripe', effectiveOn: 'Effective on',
  stripeDisabled: 'Stripe is not enabled for purchases yet.',
  stripeCatalogPending: 'The prices in this selection are not validated in Stripe yet.',
  ownerPaymentRequired: 'Only the account owner can activate billing or manage payment cards.',
  retrySync: 'Retry synchronization',
  noImmediateCharge: 'Saving never creates an off-cycle charge.',
  planAtCutoff: 'Your plan at the next cut-off', currentToNext: 'Current configuration → next',
  modulesShort: 'modules', scheduledAccessHelp: 'Changes apply after the cut-off payment is confirmed.',
  cutoffDate: 'Cut-off date', scheduleChanges: 'Schedule for the next cut-off',
  saveDraft: 'Save draft without charging', noPendingChanges: 'Your configuration is up to date',
  packagePrice: 'Package price', includedElsewhere: 'Already included in another selection.',
  pricePending: 'Price pending', perMonth: '/month', perYear: '/year',
  rootReview: 'Root review', portfolioClient: 'Portfolio client',
  readOnlyDescription: 'You are viewing this client’s plan, capacity, modules, and history in read-only mode. Charges and contract changes remain protected.',
  delegatedReadOnly: (companyName) => `Delegated billing access for ${companyName} is read-only.`,
  moduleNames: moduleNamesEn, capabilityNames: capabilityNamesEn,
  paid: 'Paid', open: 'Open', draft: 'Draft', void: 'Void',
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
  saved: 'Configuration enregistrée. Aucun débit n’a été effectué.', reset: 'Réinitialiser',
  noCatalog: 'Aucun module BASIC publié. Contactez l’équipe Indice.',
  trialTiming: 'Période d’essai : aucun débit maintenant. Stripe facturera cette sélection à la fin de l’essai.',
  activeTiming: 'Le changement est programmé : Stripe facture le nouveau total à la date de renouvellement et l’accès est mis à jour après confirmation du paiement.',
  courtesyTiming: 'Cette sélection est un brouillon. Son enregistrement n’accorde aucun module et ne génère aucun débit; elle est activée uniquement après Checkout Stripe.',
  courtesySeats: 'La capacité choisie fait partie du brouillon et devient active après Checkout Stripe.',
  activateStripe: 'Lier Stripe et activer la facturation', activating: 'Ouverture du paiement sécurisé…',
  activationFailed: 'Impossible de démarrer l’activation de la facturation.',
  stripeBilling: 'Paiements protégés par Stripe', openPortal: 'Paiement et factures', openingPortal: 'Ouverture de Stripe…',
  cancel: 'Annuler le renouvellement', cancelling: 'Annulation…', resume: 'Reprendre le renouvellement',
  resuming: 'Reprise…', cancelScheduled: 'L’annulation est déjà planifiée.', accessActive: 'Accès actif',
  accessAttention: 'Accès à vérifier', moduleFallback: 'Accès opérationnel',
  noImmediateCharge: 'L’enregistrement ne déclenche jamais de débit hors cycle.',
  planAtCutoff: 'Votre plan au prochain renouvellement', currentToNext: 'Configuration actuelle → prochaine',
  modulesShort: 'modules', scheduledAccessHelp: 'Les changements s’appliquent après confirmation du paiement.',
  cutoffDate: 'Date de renouvellement', scheduleChanges: 'Programmer au prochain renouvellement',
  saveDraft: 'Enregistrer sans débiter', noPendingChanges: 'Votre configuration est à jour',
  packagePrice: 'Prix du forfait', includedElsewhere: 'Déjà inclus dans une autre sélection.',
  pricePending: 'Prix en attente', perMonth: '/mois', perYear: '/an', rootReview: 'Consultation Root',
  portfolioClient: 'Client du portefeuille',
  readOnlyDescription: 'Vous consultez le plan, la capacité, les modules et l’historique en lecture seule. Les débits et changements contractuels restent protégés.',
  delegatedReadOnly: (companyName) => `L’accès délégué à la facturation de ${companyName} est en lecture seule.`,
  moduleNames: moduleNamesFr, capabilityNames: capabilityNamesFr,
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
  saved: 'Configuração salva. Nenhuma cobrança foi realizada.', reset: 'Restaurar',
  noCatalog: 'Não há módulos BASIC publicados. Fale com a equipe Índice.',
  trialTiming: 'Período de teste: nada é cobrado agora. O Stripe cobrará esta seleção no fim do teste.',
  activeTiming: 'A alteração fica programada: o Stripe cobra o novo total na data de renovação e o acesso é atualizado após a confirmação do pagamento.',
  courtesyTiming: 'Esta seleção é um rascunho. Salvá-la não concede módulos nem gera cobrança; ela só é ativada após o Checkout do Stripe.',
  courtesySeats: 'A capacidade escolhida faz parte do rascunho e é ativada após o Checkout do Stripe.',
  activateStripe: 'Vincular Stripe e ativar cobrança', activating: 'Abrindo pagamento seguro…',
  activationFailed: 'Não foi possível iniciar a ativação da cobrança.',
  stripeBilling: 'Pagamentos protegidos pelo Stripe', openPortal: 'Pagamento e faturas', openingPortal: 'Abrindo Stripe…',
  cancel: 'Cancelar renovação', cancelling: 'Cancelando…', resume: 'Retomar renovação', resuming: 'Retomando…',
  cancelScheduled: 'O cancelamento já está programado.', accessActive: 'Acesso ativo',
  accessAttention: 'Acesso requer atenção', moduleFallback: 'Acesso operacional',
  noImmediateCharge: 'Salvar nunca gera cobrança fora do ciclo.',
  planAtCutoff: 'Seu plano no próximo fechamento', currentToNext: 'Configuração atual → próxima',
  modulesShort: 'módulos', scheduledAccessHelp: 'As alterações são aplicadas após a confirmação do pagamento.',
  cutoffDate: 'Data de fechamento', scheduleChanges: 'Programar para o próximo fechamento',
  saveDraft: 'Salvar rascunho sem cobrar', noPendingChanges: 'Sua configuração está atualizada',
  packagePrice: 'Preço do pacote', includedElsewhere: 'Já incluído em outra seleção.',
  pricePending: 'Preço pendente', perMonth: '/mês', perYear: '/ano', rootReview: 'Consulta Root',
  portfolioClient: 'Cliente da carteira',
  readOnlyDescription: 'Você está vendo plano, capacidade, módulos e histórico em modo somente leitura. Cobranças e mudanças contratuais permanecem protegidas.',
  delegatedReadOnly: (companyName) => `O acesso delegado ao faturamento de ${companyName} é somente leitura.`,
  moduleNames: moduleNamesPt, capabilityNames: capabilityNamesPt,
};

const ko: BillingCopy = {
  ...en,
  back: '대시보드로', refresh: '새로고침', eyebrow: 'Indice 구독', title: '모듈, 사용자 및 결제',
  description: '현재 카탈로그에서 회사 액세스를 구성하고 확인 전에 총액을 검토하세요.', loading: '상업 설정 불러오는 중…',
  retry: '다시 시도', catalog: '사용 가능한 모듈', catalogDescription: '현재 카탈로그에 게시된 활성 BASIC 제품만 표시됩니다.',
  selected: (count) => `${count}개 모듈 선택됨`, emptySelection: '하나 이상의 모듈을 선택하세요.', includedUsers: '포함 사용자',
  additionalUsers: '추가 사용자', usedUsers: '사용 중인 사용자 및 초대', billingCycle: '결제 주기', monthly: '월간', annual: '연간',
  estimate: '예상 합계', taxes: '세금 별도. 안전한 결제는 Indice 내 Stripe로 처리됩니다.', currentPlan: '상업 설정',
  currentAccess: '현재 액세스', save: '설정 저장', saving: '저장 중…', saved: '설정이 저장되었습니다. 결제는 발생하지 않았습니다.', reset: '초기화',
  noCatalog: '게시된 BASIC 모듈이 없습니다. Indice 팀에 문의하세요.',
  trialTiming: '체험 기간에는 지금 청구되지 않으며 종료 시 Stripe가 이 선택을 청구합니다.',
  activeTiming: '변경 사항은 갱신일에 예약되며 Stripe 결제가 확인된 후 액세스가 업데이트됩니다.',
  courtesyTiming: '이 선택은 초안입니다. 저장해도 모듈이 부여되거나 결제되지 않으며 Stripe Checkout 완료 후에만 활성화됩니다.',
  courtesySeats: '선택한 용량은 초안에 포함되며 Stripe Checkout 완료 후 활성화됩니다.', stripeBilling: 'Stripe 보안 결제',
  activateStripe: 'Stripe 연결 및 결제 활성화', activating: '보안 결제 여는 중…',
  activationFailed: '결제 활성화를 시작할 수 없습니다.',
  openPortal: '결제 수단 및 청구서', openingPortal: 'Stripe 여는 중…', cancel: '갱신 취소', cancelling: '취소 중…',
  resume: '갱신 재개', resuming: '재개 중…', cancelScheduled: '취소가 이미 예약되었습니다.', accessActive: '액세스 활성',
  accessAttention: '액세스 확인 필요', moduleFallback: '운영 액세스',
  noImmediateCharge: '저장해도 결제 주기 외 청구가 발생하지 않습니다.',
  planAtCutoff: '다음 결제일의 요금제', currentToNext: '현재 구성 → 다음 구성', modulesShort: '모듈',
  scheduledAccessHelp: '결제 확인 후 변경 사항이 적용됩니다.', cutoffDate: '결제일',
  scheduleChanges: '다음 결제일에 예약', saveDraft: '청구 없이 초안 저장', noPendingChanges: '설정이 최신 상태입니다',
  packagePrice: '패키지 가격', includedElsewhere: '다른 선택 항목에 이미 포함되어 있습니다.',
  pricePending: '가격 대기 중', perMonth: '/월', perYear: '/년', rootReview: 'Root 조회',
  portfolioClient: '포트폴리오 고객',
  readOnlyDescription: '고객의 요금제, 용량, 모듈 및 내역을 읽기 전용으로 보고 있습니다. 청구와 계약 변경은 보호됩니다.',
  delegatedReadOnly: (companyName) => `${companyName}의 위임 결제 액세스는 읽기 전용입니다.`,
  moduleNames: moduleNamesKo, capabilityNames: capabilityNamesKo,
};

const zh: BillingCopy = {
  ...en,
  back: '返回面板', refresh: '刷新', eyebrow: 'Indice 订阅', title: '模块、用户与账单',
  description: '从当前目录配置公司访问权限，并在确认前查看总额。', loading: '正在加载商业配置…', retry: '重试',
  catalog: '可用模块', catalogDescription: '这里只显示当前目录中已发布的活跃 BASIC 产品。',
  selected: (count) => `已选择 ${count} 个模块`, emptySelection: '请至少选择一个模块。', includedUsers: '包含用户',
  additionalUsers: '额外用户', usedUsers: '已使用的用户和邀请', billingCycle: '账单周期', monthly: '每月', annual: '每年',
  estimate: '预计总额', taxes: '税前价格。安全付款由 Indice 内的 Stripe 处理。', currentPlan: '商业配置',
  currentAccess: '当前访问', save: '保存配置', saving: '保存中…', saved: '配置已保存，未产生扣款。', reset: '重置',
  noCatalog: '没有已发布的 BASIC 模块。请联系 Indice 团队。',
  trialTiming: '试用期内现在不会扣款；试用结束时 Stripe 将按此选择收费。',
  activeTiming: '更改将在续费日生效，Stripe 确认付款后才会更新访问权限。',
  courtesyTiming: '此选择是草稿。保存不会授予模块或产生扣款；仅在完成 Stripe Checkout 后激活。',
  courtesySeats: '所选容量属于草稿，并在完成 Stripe Checkout 后激活。', stripeBilling: 'Stripe 安全支付', openPortal: '付款方式和发票',
  activateStripe: '关联 Stripe 并启用计费', activating: '正在打开安全结账…',
  activationFailed: '无法启动计费激活。',
  openingPortal: '正在打开 Stripe…', cancel: '取消续订', cancelling: '正在取消…', resume: '恢复续订', resuming: '正在恢复…',
  cancelScheduled: '取消已安排。', accessActive: '访问正常', accessAttention: '访问需要处理', moduleFallback: '运营访问',
  noImmediateCharge: '保存不会产生账期外扣款。', planAtCutoff: '下一个结算日的方案',
  currentToNext: '当前配置 → 下一配置', modulesShort: '模块', scheduledAccessHelp: '付款确认后应用更改。',
  cutoffDate: '结算日', scheduleChanges: '安排到下一个结算日', saveDraft: '保存草稿且不扣款',
  noPendingChanges: '配置已是最新', packagePrice: '套餐价格', includedElsewhere: '已包含在其他选择中。',
  pricePending: '价格待定', perMonth: '/月', perYear: '/年', rootReview: 'Root 查看',
  portfolioClient: '客户组合',
  readOnlyDescription: '你正在以只读模式查看客户的方案、容量、模块和历史记录。扣款与合同变更仍受保护。',
  delegatedReadOnly: (companyName) => `${companyName} 的委派账单访问为只读。`,
  moduleNames: moduleNamesZh, capabilityNames: capabilityNamesZh,
};

const copies: Record<string, BillingCopy> = {
  'es-MX': es, 'es-CO': es, 'en-US': en, 'en-CA': en,
  'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};

export const getBillingCopy = (code: string) => copies[code] ?? en;
