export type PublicPlansCopy = {
  locale: string;
  logoAlt: string;
  navLabel: string;
  methodology: string;
  modules: string;
  learningMode: string;
  plans: string;
  login: string;
  language: string;
  menu: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroAction: string;
  heroSecondaryAction: string;
  pillars: [string, string, string, string];
  publishedOffer: string;
  publishedOfferDescription: string;
  tierOne: string;
  tierTwo: string;
  tierThree: string;
  tierAll: string;
  directPricingTitle: string;
  directPricingDescription: string;
  pricesBeforeTaxes: string;
  builderBadge: string;
  builderTitle: string;
  builderDescription: string;
  builderSteps: [string, string, string];
  selectionProgress: (selected: number, total: number) => string;
  selectedModulesTitle: string;
  emptySelection: string;
  selectAll: string;
  clear: string;
  addModule: string;
  removeModule: string;
  selectedModule: string;
  countsAsOne: string;
  moduleOffer: string;
  packageOffer: string;
  selectionConflict: string;
  billingCycle: string;
  monthly: string;
  annual: string;
  teamTitle: string;
  teamDescription: (includedSeats: number) => string;
  totalPeople: string;
  decreasePeople: string;
  increasePeople: string;
  country: string;
  summaryBadge: string;
  summaryTitle: string;
  selected: (count: number) => string;
  basePlan: string;
  extraUsers: string;
  estimatedTotal: string;
  taxNote: string;
  chooseAtLeastOne: string;
  pricePending: string;
  start: string;
  notReady: string;
  loading: string;
  loadError: string;
  retry: string;
  trialTrust: (days: number) => string;
  cardTrust: string;
  securityTrust: string;
  consultingTrust: (sessions: number, minutes: number) => string;
  storageTrust: (includedGiB: number, blockGiB: number, blockPrice: string) => string;
  annualTrust: (discountPercent: number) => string;
  footer: string;
  productLabels: Record<string, string>;
  productDescriptions: Record<string, string>;
  countryLabels: Record<string, string>;
};

const productLabelsEs = {
  basic_hr: 'Recursos Humanos', basic_process_tasks: 'Tareas y Procesos',
  basic_expenses: 'Gastos + Caja Chica', basic_pos_inventory: 'Punto de Venta + Inventarios',
  basic_sales_inventory: 'Ventas + Inventarios', basic_receivables: 'Cartera',
  module_hr: 'Recursos Humanos', module_process_tasks: 'Tareas y Procesos',
  module_expenses: 'Gastos + Caja Chica', module_pos_inventory: 'Punto de Venta + Inventarios',
  module_sales_inventory: 'Ventas + Inventarios', module_receivables: 'Cartera',
  controla: 'Controla', escala_sales: 'Escala · Ventas', escala_pos: 'Escala · Punto de Venta',
  corporativiza: 'Corporativiza',
};

const productLabelsEn = {
  basic_hr: 'Human Resources', basic_process_tasks: 'Tasks and Processes',
  basic_expenses: 'Expenses + Petty Cash', basic_pos_inventory: 'Point of Sale + Inventory',
  basic_sales_inventory: 'Sales + Inventory', basic_receivables: 'Receivables',
  module_hr: 'Human Resources', module_process_tasks: 'Tasks and Processes',
  module_expenses: 'Expenses + Petty Cash', module_pos_inventory: 'Point of Sale + Inventory',
  module_sales_inventory: 'Sales + Inventory', module_receivables: 'Receivables',
  controla: 'Controla', escala_sales: 'Escala · Sales', escala_pos: 'Escala · Point of Sale',
  corporativiza: 'Corporativiza',
};

const productDescriptionsEs = {
  basic_hr: 'Organiza equipo, expedientes, asistencia y desempeño en un solo lugar.',
  basic_process_tasks: 'Convierte pendientes y proyectos en trabajo claro y trazable.',
  basic_expenses: 'Controla gastos, caja chica y comprobaciones sin perder detalle.',
  basic_pos_inventory: 'Vende, cobra y mantén tus existencias sincronizadas.',
  basic_sales_inventory: 'Conecta clientes, oportunidades, ventas e inventario.',
  basic_receivables: 'Da seguimiento a saldos, vencimientos y cobranza.',
  module_hr: 'Organiza equipo, expedientes, asistencia y desempeño en un solo lugar.',
  module_process_tasks: 'Convierte pendientes y proyectos en trabajo claro y trazable.',
  module_expenses: 'Controla gastos, caja chica y comprobaciones sin perder detalle.',
  module_pos_inventory: 'Vende, cobra y mantén tus existencias sincronizadas.',
  module_sales_inventory: 'Conecta clientes, oportunidades, ventas e inventario.',
  module_receivables: 'Da seguimiento a saldos, vencimientos y cobranza.',
  controla: 'Recursos Humanos y Tareas y Procesos en un solo paquete.',
  escala_sales: 'Controla más Gastos y Ventas con inventarios.',
  escala_pos: 'Controla más Gastos y Punto de Venta con inventarios.',
  corporativiza: 'Todos los módulos básicos, incluyendo Ventas, Punto de Venta y Cartera.',
};

const productDescriptionsEn = {
  basic_hr: 'Keep people, records, attendance, and performance in one place.',
  basic_process_tasks: 'Turn projects and pending work into clear, traceable execution.',
  basic_expenses: 'Control expenses, petty cash, and receipts without losing detail.',
  basic_pos_inventory: 'Sell, collect, and keep inventory synchronized.',
  basic_sales_inventory: 'Connect customers, opportunities, sales, and inventory.',
  basic_receivables: 'Track balances, due dates, and collections.',
  module_hr: 'Keep people, records, attendance, and performance in one place.',
  module_process_tasks: 'Turn projects and pending work into clear, traceable execution.',
  module_expenses: 'Control expenses, petty cash, and receipts without losing detail.',
  module_pos_inventory: 'Sell, collect, and keep inventory synchronized.',
  module_sales_inventory: 'Connect customers, opportunities, sales, and inventory.',
  module_receivables: 'Track balances, due dates, and collections.',
  controla: 'Human Resources and Tasks and Processes in one package.',
  escala_sales: 'Controla plus Expenses and Sales with inventory.',
  escala_pos: 'Controla plus Expenses and Point of Sale with inventory.',
  corporativiza: 'Every core module, including Sales, Point of Sale, and Receivables.',
};

const productDescriptionsFr = {
  basic_hr: 'Centralisez l’équipe, les dossiers, les présences et la performance.',
  basic_process_tasks: 'Transformez projets et tâches en exécution claire et traçable.',
  basic_expenses: 'Contrôlez les dépenses, la petite caisse et les justificatifs.',
  basic_pos_inventory: 'Vendez, encaissez et gardez les stocks synchronisés.',
  basic_sales_inventory: 'Reliez clients, occasions, ventes et stocks.',
  basic_receivables: 'Suivez les soldes, les échéances et les encaissements.',
  module_hr: 'Centralisez l’équipe, les dossiers, les présences et la performance.',
  module_process_tasks: 'Transformez projets et tâches en exécution claire et traçable.',
  module_expenses: 'Contrôlez les dépenses, la petite caisse et les justificatifs.',
  module_pos_inventory: 'Vendez, encaissez et gardez les stocks synchronisés.',
  module_sales_inventory: 'Reliez clients, occasions, ventes et stocks.',
  module_receivables: 'Suivez les soldes, les échéances et les encaissements.',
  controla: 'Ressources humaines et Tâches et processus.',
  escala_sales: 'Controla avec Dépenses et Ventes avec stocks.',
  escala_pos: 'Controla avec Dépenses et Point de vente avec stocks.',
  corporativiza: 'Tous les modules de base, y compris ventes, point de vente et comptes clients.',
};

const productDescriptionsPt = {
  basic_hr: 'Organize equipe, registros, presença e desempenho em um só lugar.',
  basic_process_tasks: 'Transforme projetos e pendências em execução clara e rastreável.',
  basic_expenses: 'Controle despesas, caixa pequeno e comprovantes sem perder detalhes.',
  basic_pos_inventory: 'Venda, receba e mantenha o estoque sincronizado.',
  basic_sales_inventory: 'Conecte clientes, oportunidades, vendas e estoque.',
  basic_receivables: 'Acompanhe saldos, vencimentos e cobranças.',
  module_hr: 'Organize equipe, registros, presença e desempenho em um só lugar.',
  module_process_tasks: 'Transforme projetos e pendências em execução clara e rastreável.',
  module_expenses: 'Controle despesas, caixa pequeno e comprovantes sem perder detalhes.',
  module_pos_inventory: 'Venda, receba e mantenha o estoque sincronizado.',
  module_sales_inventory: 'Conecte clientes, oportunidades, vendas e estoque.',
  module_receivables: 'Acompanhe saldos, vencimentos e cobranças.',
  controla: 'Recursos Humanos e Tarefas e Processos.',
  escala_sales: 'Controla mais Despesas e Vendas com estoque.',
  escala_pos: 'Controla mais Despesas e Ponto de Venda com estoque.',
  corporativiza: 'Todos os módulos básicos, incluindo Vendas, Ponto de Venda e Contas a Receber.',
};

const productDescriptionsKo = {
  basic_hr: '팀, 인사 기록, 출결, 성과를 한곳에서 관리합니다.',
  basic_process_tasks: '프로젝트와 할 일을 명확하고 추적 가능한 실행으로 전환합니다.',
  basic_expenses: '지출, 소액 현금, 증빙을 세부적으로 관리합니다.',
  basic_pos_inventory: '판매, 수금, 재고를 동기화합니다.',
  basic_sales_inventory: '고객, 영업 기회, 판매, 재고를 연결합니다.',
  basic_receivables: '잔액, 만기일, 수금을 추적합니다.',
  module_hr: '팀, 인사 기록, 출결, 성과를 한곳에서 관리합니다.',
  module_process_tasks: '프로젝트와 할 일을 명확하고 추적 가능한 실행으로 전환합니다.',
  module_expenses: '지출, 소액 현금, 증빙을 세부적으로 관리합니다.',
  module_pos_inventory: '판매, 수금, 재고를 동기화합니다.',
  module_sales_inventory: '고객, 영업 기회, 판매, 재고를 연결합니다.',
  module_receivables: '잔액, 만기일, 수금을 추적합니다.',
  controla: '인사 관리와 작업 및 프로세스 패키지입니다.',
  escala_sales: 'Controla에 비용 및 재고 연동 영업을 더합니다.',
  escala_pos: 'Controla에 비용 및 재고 연동 판매 시점을 더합니다.',
  corporativiza: '영업, 판매 시점, 미수금을 포함한 모든 기본 모듈입니다.',
};

const productDescriptionsZh = {
  basic_hr: '在一个地方管理员工、档案、考勤和绩效。',
  basic_process_tasks: '将项目和待办事项转化为清晰、可追踪的执行。',
  basic_expenses: '细致管理费用、备用金和凭证。',
  basic_pos_inventory: '同步销售、收款和库存。',
  basic_sales_inventory: '连接客户、商机、销售和库存。',
  basic_receivables: '跟踪余额、到期日和收款。',
  module_hr: '在一个地方管理员工、档案、考勤和绩效。',
  module_process_tasks: '将项目和待办事项转化为清晰、可追踪的执行。',
  module_expenses: '细致管理费用、备用金和凭证。',
  module_pos_inventory: '同步销售点、收款和库存。',
  module_sales_inventory: '连接客户、商机、销售和库存。',
  module_receivables: '跟踪余额、到期日和收款。',
  controla: '人力资源与任务和流程组合。',
  escala_sales: 'Controla 加费用与库存联动销售。',
  escala_pos: 'Controla 加费用与库存联动销售点。',
  corporativiza: '包含销售、销售点和应收账款在内的全部基础模块。',
};

const countriesEs = { MX: 'México', CA: 'Canadá', US: 'Estados Unidos', CO: 'Colombia', BR: 'Brasil' };
const countriesEn = { MX: 'Mexico', CA: 'Canada', US: 'United States', CO: 'Colombia', BR: 'Brazil' };

const es: PublicPlansCopy = {
  locale: 'es-MX', logoAlt: 'Índice', navLabel: 'Navegación principal', methodology: 'Cómo funciona',
  modules: 'Módulos', learningMode: 'Modo aprendiz', plans: 'Planes', login: 'Iniciar sesión',
  language: 'País e idioma', menu: 'Abrir menú', heroBadge: 'Plan a tu medida',
  heroTitle: 'Elige lo que necesitas. Ve tu precio al instante.',
  heroDescription: 'Combina los módulos de Índice y continúa al registro con una configuración lista para validar.',
  heroAction: 'Configura tu plan', heroSecondaryAction: 'Conoce el método Índice',
  pillars: ['Personas', 'Procesos', 'Productos', 'Finanzas'],
  publishedOffer: 'Oferta publicada por Índice',
  publishedOfferDescription: 'Los importes se leen del catálogo activo. Stripe confirmará impuestos y total antes de cualquier cargo.',
  tierOne: '1 combinación', tierTwo: '2 combinaciones', tierThree: '3 combinaciones', tierAll: '4 o todas',
  directPricingTitle: 'Cada módulo y paquete conserva su precio publicado',
  directPricingDescription: 'Tu total es la suma exacta de lo que elijas más las personas adicionales.',
  pricesBeforeTaxes: 'Precios en USD antes de impuestos.', builderBadge: 'Módulos básicos elegibles',
  builderTitle: 'Arma la base de tu operación',
  builderDescription: 'Cada tarjeta cuenta como una combinación, aunque conecte varias funciones.',
  builderSteps: ['Elige módulos', 'Define tu equipo', 'Crea tu cuenta'],
  selectionProgress: (selected, total) => `${selected} de ${total} módulos elegidos`,
  selectedModulesTitle: 'Tu selección', emptySelection: 'Empieza por el área que más necesita tu negocio.',
  selectAll: 'Elegir todos', clear: 'Limpiar', addModule: 'Agregar', removeModule: 'Quitar',
  selectedModule: 'Seleccionado', countsAsOne: 'Cuenta como 1', moduleOffer: 'Módulo',
  packageOffer: 'Paquete', selectionConflict: 'Esta combinación repite funciones. Elige el paquete o los módulos individuales.', billingCycle: 'Periodicidad',
  monthly: 'Mensual', annual: 'Anual', teamTitle: 'Personas que usarán Índice',
  teamDescription: (includedSeats) => `Tu plan incluye ${includedSeats}. Agrega capacidad cuando tu equipo la necesite.`,
  totalPeople: 'Capacidad total', decreasePeople: 'Reducir capacidad', increasePeople: 'Aumentar capacidad',
  country: 'País de facturación', summaryBadge: 'Tu configuración',
  summaryTitle: 'Precio estimado', selected: (count) => `${count} combinación${count === 1 ? '' : 'es'} seleccionada${count === 1 ? '' : 's'}`,
  basePlan: 'Plan base', extraUsers: 'Personas adicionales', estimatedTotal: 'Total recurrente estimado',
  taxNote: 'Importe antes de impuestos. El cálculo fiscal definitivo se realiza en Stripe con la dirección de facturación.',
  chooseAtLeastOne: 'Elige al menos un módulo para calcular tu configuración.',
  pricePending: 'Precio pendiente de publicación', start: 'Crear cuenta y comenzar',
  notReady: 'La contratación todavía no está habilitada. Puedes revisar la oferta, pero no iniciar el cobro.',
  loading: 'Cargando la oferta publicada…', loadError: 'No pudimos cargar la oferta comercial.', retry: 'Reintentar',
  trialTrust: (days) => `${days} días para conocer Índice`, cardTrust: 'Tarjeta protegida por Stripe',
  securityTrust: 'Precios y acceso validados por el servidor',
  consultingTrust: (sessions, minutes) => `${sessions} consultoría de ${minutes} minutos incluida cada mes, no acumulable`,
  storageTrust: (included, block, price) => `${included} GiB incluidos; cada ${block} GiB adicionales cuestan ${price} y se cargan en la próxima factura`,
  annualTrust: (discount) => `${discount}% de descuento anual en módulos y paquetes; usuarios adicionales sin descuento`,
  footer: 'La selección se confirmará durante el registro. No se realiza ningún cargo en esta página.',
  productLabels: productLabelsEs, productDescriptions: productDescriptionsEs, countryLabels: countriesEs,
};

const en: PublicPlansCopy = {
  locale: 'en-CA', logoAlt: 'Indice', navLabel: 'Main navigation', methodology: 'How it works',
  modules: 'Modules', learningMode: 'Learning mode', plans: 'Plans', login: 'Sign in',
  language: 'Country and language', menu: 'Open menu', heroBadge: 'A plan made for you',
  heroTitle: 'Choose what you need. See your price instantly.',
  heroDescription: 'Combine Indice modules and continue to signup with a configuration ready to validate.',
  heroAction: 'Build your plan', heroSecondaryAction: 'Explore the Indice method',
  pillars: ['People', 'Processes', 'Products', 'Finance'],
  publishedOffer: 'Offer published by Indice',
  publishedOfferDescription: 'Amounts come from the active catalog. Stripe confirms taxes and the final total before any charge.',
  tierOne: '1 combination', tierTwo: '2 combinations', tierThree: '3 combinations', tierAll: '4 or all',
  directPricingTitle: 'Every module and package keeps its published price',
  directPricingDescription: 'Your total is the exact sum of your selection plus any additional people.',
  pricesBeforeTaxes: 'Prices in USD before taxes.', builderBadge: 'Eligible core modules',
  builderTitle: 'Build the foundation of your operation',
  builderDescription: 'Each card counts as one combination, even when it connects several functions.',
  builderSteps: ['Choose modules', 'Set up your team', 'Create your account'],
  selectionProgress: (selected, total) => `${selected} of ${total} modules selected`,
  selectedModulesTitle: 'Your selection', emptySelection: 'Start with the area your business needs most.',
  selectAll: 'Select all', clear: 'Clear', addModule: 'Add', removeModule: 'Remove',
  selectedModule: 'Selected', countsAsOne: 'Counts as 1', moduleOffer: 'Module',
  packageOffer: 'Package', selectionConflict: 'This selection repeats capabilities. Choose the package or the individual modules.', billingCycle: 'Billing cycle',
  monthly: 'Monthly', annual: 'Annual', teamTitle: 'People who will use Indice',
  teamDescription: (includedSeats) => `Your plan includes ${includedSeats}. Add capacity as your team grows.`,
  totalPeople: 'Total capacity', decreasePeople: 'Decrease capacity', increasePeople: 'Increase capacity',
  country: 'Billing country', summaryBadge: 'Your configuration',
  summaryTitle: 'Estimated price', selected: (count) => `${count} combination${count === 1 ? '' : 's'} selected`,
  basePlan: 'Base plan', extraUsers: 'Additional people', estimatedTotal: 'Estimated recurring total',
  taxNote: 'Amount before taxes. Stripe calculates final taxes from the billing address.',
  chooseAtLeastOne: 'Choose at least one module to calculate your configuration.',
  pricePending: 'Price pending publication', start: 'Create account and start',
  notReady: 'Purchasing is not enabled yet. You can review the offer, but cannot start billing.',
  loading: 'Loading the published offer…', loadError: 'We could not load the commercial offer.', retry: 'Try again',
  trialTrust: (days) => `${days} days to discover Indice`, cardTrust: 'Card protected by Stripe',
  securityTrust: 'Prices and access validated by the server',
  consultingTrust: (sessions, minutes) => `${sessions} ${minutes}-minute consultation included each month; it does not roll over`,
  storageTrust: (included, block, price) => `${included} GiB included; each additional ${block} GiB costs ${price} on the next invoice`,
  annualTrust: (discount) => `${discount}% annual discount on modules and packages; additional users are not discounted`,
  footer: 'Your selection is confirmed during signup. No charge is made on this page.',
  productLabels: productLabelsEn, productDescriptions: productDescriptionsEn, countryLabels: countriesEn,
};

const fr: PublicPlansCopy = {
  ...en, locale: 'fr-CA', methodology: 'Comment ça fonctionne', modules: 'Modules', learningMode: 'Mode apprentissage',
  plans: 'Forfaits', login: 'Se connecter', language: 'Pays et langue', menu: 'Ouvrir le menu',
  heroBadge: 'Un forfait sur mesure', heroTitle: 'Choisissez ce dont vous avez besoin. Voyez le prix instantanément.',
  heroDescription: 'Combinez les modules Indice et poursuivez vers l’inscription avec une configuration prête à valider.',
  heroAction: 'Configurer mon forfait', heroSecondaryAction: 'Découvrir la méthode Indice',
  pillars: ['Personnes', 'Processus', 'Produits', 'Finances'],
  publishedOffer: 'Offre publiée par Indice', publishedOfferDescription: 'Les montants proviennent du catalogue actif. Stripe confirme les taxes et le total avant tout débit.',
  tierOne: '1 combinaison', tierTwo: '2 combinaisons', tierThree: '3 combinaisons', tierAll: '4 ou toutes',
  pricesBeforeTaxes: 'Prix en USD avant taxes.', builderBadge: 'Modules de base admissibles',
  builderTitle: 'Construisez la base de vos opérations', builderDescription: 'Chaque carte compte comme une combinaison.',
  builderSteps: ['Choisir les modules', 'Définir l’équipe', 'Créer le compte'],
  selectionProgress: (selected, total) => `${selected} modules sur ${total} sélectionnés`,
  selectedModulesTitle: 'Votre sélection', emptySelection: 'Commencez par le besoin principal de votre entreprise.',
  selectAll: 'Tout choisir', clear: 'Effacer', addModule: 'Ajouter', removeModule: 'Retirer',
  selectedModule: 'Sélectionné', countsAsOne: 'Compte pour 1', billingCycle: 'Périodicité',
  monthly: 'Mensuel', annual: 'Annuel', teamTitle: 'Personnes qui utiliseront Indice',
  teamDescription: (includedSeats) => `Votre forfait comprend ${includedSeats} personnes.`, totalPeople: 'Capacité totale',
  decreasePeople: 'Réduire la capacité', increasePeople: 'Augmenter la capacité',
  country: 'Pays de facturation', summaryBadge: 'Votre configuration', summaryTitle: 'Prix estimé',
  selected: (count) => `${count} combinaison${count === 1 ? '' : 's'} sélectionnée${count === 1 ? '' : 's'}`,
  basePlan: 'Forfait de base', extraUsers: 'Personnes supplémentaires', estimatedTotal: 'Total récurrent estimé',
  taxNote: 'Montant avant taxes. Stripe calcule les taxes finales avec l’adresse de facturation.',
  chooseAtLeastOne: 'Choisissez au moins un module pour calculer votre configuration.',
  pricePending: 'Prix en attente de publication', start: 'Créer un compte et commencer',
  notReady: 'La souscription n’est pas encore activée.', loading: 'Chargement de l’offre publiée…',
  loadError: 'Impossible de charger l’offre commerciale.', retry: 'Réessayer',
  trialTrust: (days) => `${days} jours pour découvrir Indice`, cardTrust: 'Carte protégée par Stripe',
  securityTrust: 'Prix et accès validés par le serveur',
  consultingTrust: (sessions, minutes) => `${sessions} consultation de ${minutes} minutes incluse chaque mois, non cumulable`,
  storageTrust: (included, block, price) => `${included} Gio inclus; chaque bloc supplémentaire de ${block} Gio coûte ${price} sur la prochaine facture`,
  annualTrust: (discount) => `${discount} % de réduction annuelle sur les modules et forfaits; les utilisateurs supplémentaires ne sont pas remisés`,
  footer: 'Votre sélection sera confirmée pendant l’inscription. Aucun débit sur cette page.',
  productDescriptions: productDescriptionsFr,
};

const pt: PublicPlansCopy = {
  ...en, locale: 'pt-BR', methodology: 'Como funciona', modules: 'Módulos', learningMode: 'Modo aprendiz',
  plans: 'Planos', login: 'Entrar', language: 'País e idioma', menu: 'Abrir menu', heroBadge: 'Plano sob medida',
  heroTitle: 'Escolha o que precisa. Veja o preço na hora.',
  heroDescription: 'Combine os módulos do Índice e continue para o cadastro com uma configuração pronta para validar.',
  heroAction: 'Monte seu plano', heroSecondaryAction: 'Conheça o método Índice',
  pillars: ['Pessoas', 'Processos', 'Produtos', 'Finanças'],
  publishedOffer: 'Oferta publicada pelo Índice', publishedOfferDescription: 'Os valores vêm do catálogo ativo. O Stripe confirma impostos e total antes de qualquer cobrança.',
  tierOne: '1 combinação', tierTwo: '2 combinações', tierThree: '3 combinações', tierAll: '4 ou todas',
  pricesBeforeTaxes: 'Preços em USD antes dos impostos.', builderBadge: 'Módulos básicos elegíveis',
  builderTitle: 'Monte a base da sua operação', builderDescription: 'Cada cartão conta como uma combinação.',
  builderSteps: ['Escolha os módulos', 'Defina sua equipe', 'Crie sua conta'],
  selectionProgress: (selected, total) => `${selected} de ${total} módulos selecionados`,
  selectedModulesTitle: 'Sua seleção', emptySelection: 'Comece pela área que sua empresa mais precisa.',
  selectAll: 'Selecionar todos', clear: 'Limpar', addModule: 'Adicionar', removeModule: 'Remover',
  selectedModule: 'Selecionado', countsAsOne: 'Conta como 1', billingCycle: 'Periodicidade',
  monthly: 'Mensal', annual: 'Anual', teamTitle: 'Pessoas que usarão o Índice',
  teamDescription: (includedSeats) => `Seu plano inclui ${includedSeats} pessoas.`, totalPeople: 'Capacidade total',
  decreasePeople: 'Reduzir capacidade', increasePeople: 'Aumentar capacidade',
  country: 'País de cobrança', summaryBadge: 'Sua configuração', summaryTitle: 'Preço estimado',
  selected: (count) => `${count} combinaç${count === 1 ? 'ão' : 'ões'} selecionada${count === 1 ? '' : 's'}`,
  basePlan: 'Plano base', extraUsers: 'Pessoas adicionais', estimatedTotal: 'Total recorrente estimado',
  taxNote: 'Valor antes dos impostos. O Stripe calcula os impostos finais pelo endereço de cobrança.',
  chooseAtLeastOne: 'Escolha pelo menos um módulo para calcular sua configuração.',
  pricePending: 'Preço pendente de publicação', start: 'Criar conta e começar', notReady: 'A contratação ainda não está habilitada.',
  loading: 'Carregando a oferta publicada…', loadError: 'Não foi possível carregar a oferta comercial.', retry: 'Tentar novamente',
  trialTrust: (days) => `${days} dias para conhecer o Índice`, cardTrust: 'Cartão protegido pelo Stripe',
  securityTrust: 'Preços e acesso validados pelo servidor',
  consultingTrust: (sessions, minutes) => `${sessions} consultoria de ${minutes} minutos incluída por mês, não acumulável`,
  storageTrust: (included, block, price) => `${included} GiB incluídos; cada ${block} GiB adicionais custam ${price} na próxima fatura`,
  annualTrust: (discount) => `${discount}% de desconto anual em módulos e pacotes; usuários adicionais sem desconto`,
  footer: 'A seleção será confirmada no cadastro. Nenhuma cobrança é feita nesta página.',
  productDescriptions: productDescriptionsPt,
};

const ko: PublicPlansCopy = {
  ...en, locale: 'ko-CA', methodology: '이용 방법', modules: '모듈', learningMode: '학습 모드', plans: '요금제',
  login: '로그인', language: '국가 및 언어', menu: '메뉴 열기', heroBadge: '맞춤 요금제',
  heroTitle: '필요한 항목을 선택하고 가격을 바로 확인하세요.',
  heroDescription: 'Indice 모듈을 조합한 뒤 검증 가능한 구성으로 가입을 계속하세요.',
  heroAction: '요금제 구성하기', heroSecondaryAction: 'Indice 방식 알아보기',
  pillars: ['사람', '프로세스', '제품', '재무'],
  publishedOffer: 'Indice가 게시한 요금', publishedOfferDescription: '금액은 활성 카탈로그에서 불러오며 결제 전 Stripe가 세금과 총액을 확인합니다.',
  tierOne: '1개 조합', tierTwo: '2개 조합', tierThree: '3개 조합', tierAll: '4개 또는 전체',
  pricesBeforeTaxes: '세전 USD 가격입니다.', builderBadge: '선택 가능한 기본 모듈', builderTitle: '운영 기반 구성',
  builderDescription: '여러 기능을 연결해도 카드 하나는 한 조합입니다.',
  builderSteps: ['모듈 선택', '팀 설정', '계정 만들기'],
  selectionProgress: (selected, total) => `${total}개 중 ${selected}개 모듈 선택`,
  selectedModulesTitle: '선택한 모듈', emptySelection: '비즈니스에 가장 필요한 영역부터 선택하세요.',
  selectAll: '전체 선택', clear: '지우기', addModule: '추가', removeModule: '제거',
  selectedModule: '선택됨', countsAsOne: '1개로 계산', billingCycle: '결제 주기', monthly: '월간', annual: '연간',
  teamTitle: 'Indice를 사용할 인원', teamDescription: (includedSeats) => `요금제에 ${includedSeats}명이 포함됩니다.`,
  totalPeople: '전체 인원', decreasePeople: '인원 줄이기', increasePeople: '인원 늘리기',
  country: '청구 국가', summaryBadge: '내 구성', summaryTitle: '예상 가격',
  selected: (count) => `${count}개 조합 선택`, basePlan: '기본 요금제', extraUsers: '추가 인원',
  estimatedTotal: '예상 반복 결제액', taxNote: '세전 금액입니다. Stripe가 청구 주소로 최종 세금을 계산합니다.',
  chooseAtLeastOne: '구성을 계산하려면 모듈을 하나 이상 선택하세요.',
  pricePending: '가격 게시 대기 중', start: '계정 만들고 시작하기', notReady: '아직 구매가 활성화되지 않았습니다.',
  loading: '게시된 요금을 불러오는 중…', loadError: '요금을 불러올 수 없습니다.', retry: '다시 시도',
  trialTrust: (days) => `${days}일 동안 Indice 체험`, cardTrust: 'Stripe로 카드 보호',
  securityTrust: '서버에서 가격과 접근 권한 검증',
  consultingTrust: (sessions, minutes) => `매월 ${minutes}분 상담 ${sessions}회 포함, 이월 불가`,
  storageTrust: (included, block, price) => `${included} GiB 포함; 추가 ${block} GiB당 ${price}가 다음 청구서에 반영됩니다`,
  annualTrust: (discount) => `모듈 및 패키지 연간 결제 ${discount}% 할인; 추가 사용자는 할인 제외`,
  footer: '가입 과정에서 선택을 확인합니다. 이 페이지에서는 청구되지 않습니다.',
  productDescriptions: productDescriptionsKo,
};

const zh: PublicPlansCopy = {
  ...en, locale: 'zh-CA', methodology: '使用方式', modules: '模块', learningMode: '学习模式', plans: '方案',
  login: '登录', language: '国家和语言', menu: '打开菜单', heroBadge: '定制方案',
  heroTitle: '选择所需内容，即时查看价格。', heroDescription: '组合 Indice 模块，并带着待验证的配置继续注册。',
  heroAction: '配置方案', heroSecondaryAction: '了解 Indice 方法',
  pillars: ['人员', '流程', '产品', '财务'],
  publishedOffer: 'Indice 已发布报价', publishedOfferDescription: '金额来自当前目录；Stripe 会在扣款前确认税费和总额。',
  tierOne: '1 个组合', tierTwo: '2 个组合', tierThree: '3 个组合', tierAll: '4 个或全部',
  pricesBeforeTaxes: '税前美元价格。', builderBadge: '可选基础模块', builderTitle: '构建运营基础',
  builderDescription: '即使连接多个功能，每张卡仍计为一个组合。',
  builderSteps: ['选择模块', '设置团队', '创建账户'],
  selectionProgress: (selected, total) => `已选择 ${selected}/${total} 个模块`,
  selectedModulesTitle: '你的选择', emptySelection: '从企业最需要的领域开始。',
  selectAll: '全选', clear: '清除', addModule: '添加', removeModule: '移除',
  selectedModule: '已选择', countsAsOne: '计为 1 个', billingCycle: '账单周期', monthly: '每月', annual: '每年',
  teamTitle: '使用 Indice 的人数', teamDescription: (includedSeats) => `方案包含 ${includedSeats} 人。`,
  totalPeople: '总容量', decreasePeople: '减少容量', increasePeople: '增加容量',
  country: '账单国家', summaryBadge: '你的配置', summaryTitle: '预估价格',
  selected: (count) => `已选择 ${count} 个组合`, basePlan: '基础方案', extraUsers: '额外人员',
  estimatedTotal: '预计周期总额', taxNote: '税前金额。Stripe 将根据账单地址计算最终税费。',
  chooseAtLeastOne: '请至少选择一个模块以计算配置。',
  pricePending: '价格待发布', start: '创建账户并开始', notReady: '购买功能尚未启用。',
  loading: '正在加载已发布报价…', loadError: '无法加载商业报价。', retry: '重试',
  trialTrust: (days) => `${days} 天体验 Indice`, cardTrust: 'Stripe 保护银行卡',
  securityTrust: '服务器验证价格与访问权限',
  consultingTrust: (sessions, minutes) => `每月包含 ${sessions} 次 ${minutes} 分钟咨询，不可累积`,
  storageTrust: (included, block, price) => `包含 ${included} GiB；每增加 ${block} GiB，将在下一张账单收取 ${price}`,
  annualTrust: (discount) => `模块和套餐按年支付享 ${discount}% 优惠；额外用户不享优惠`,
  footer: '注册时会确认你的选择。本页面不会扣款。',
  productDescriptions: productDescriptionsZh,
};

const copies: Record<string, PublicPlansCopy> = {
  'es-MX': es, 'es-CO': { ...es, locale: 'es-CO' }, 'en-US': { ...en, locale: 'en-US' },
  'en-CA': en, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};

export function getPublicPlansCopy(languageCode: string) {
  return copies[languageCode] ?? en;
}
