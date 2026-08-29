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
  publishedOffer: string;
  publishedOfferDescription: string;
  tierOne: string;
  tierTwo: string;
  tierThree: string;
  tierAll: string;
  pricesBeforeTaxes: string;
  builderBadge: string;
  builderTitle: string;
  builderDescription: string;
  selectAll: string;
  clear: string;
  countsAsOne: string;
  billingCycle: string;
  monthly: string;
  annual: string;
  teamTitle: string;
  teamDescription: (includedSeats: number) => string;
  totalPeople: string;
  country: string;
  summaryBadge: string;
  summaryTitle: string;
  selected: (count: number) => string;
  basePlan: string;
  extraUsers: string;
  estimatedTotal: string;
  taxNote: string;
  pricePending: string;
  start: string;
  notReady: string;
  loading: string;
  loadError: string;
  retry: string;
  trialTrust: (days: number) => string;
  cardTrust: string;
  securityTrust: string;
  footer: string;
  productLabels: Record<string, string>;
  countryLabels: Record<string, string>;
};

const productLabelsEs = {
  basic_hr: 'Recursos Humanos', basic_process_tasks: 'Tareas y Procesos',
  basic_expenses: 'Gastos + Caja Chica', basic_pos_inventory: 'Punto de Venta + Inventarios',
  basic_sales_inventory: 'Ventas + Inventarios', basic_receivables: 'Cartera',
};

const productLabelsEn = {
  basic_hr: 'Human Resources', basic_process_tasks: 'Tasks and Processes',
  basic_expenses: 'Expenses + Petty Cash', basic_pos_inventory: 'Point of Sale + Inventory',
  basic_sales_inventory: 'Sales + Inventory', basic_receivables: 'Receivables',
};

const countriesEs = { MX: 'México', CA: 'Canadá', US: 'Estados Unidos', CO: 'Colombia', BR: 'Brasil' };
const countriesEn = { MX: 'Mexico', CA: 'Canada', US: 'United States', CO: 'Colombia', BR: 'Brazil' };

const es: PublicPlansCopy = {
  locale: 'es-MX', logoAlt: 'Índice', navLabel: 'Navegación principal', methodology: 'Cómo funciona',
  modules: 'Módulos', learningMode: 'Modo aprendiz', plans: 'Planes', login: 'Iniciar sesión',
  language: 'País e idioma', menu: 'Abrir menú', heroBadge: 'Plan a tu medida',
  heroTitle: 'Elige lo que necesitas. Ve tu precio al instante.',
  heroDescription: 'Combina los módulos de Índice y continúa al registro con una configuración lista para validar.',
  publishedOffer: 'Oferta publicada por Índice',
  publishedOfferDescription: 'Los importes se leen del catálogo activo. Stripe confirmará impuestos y total antes de cualquier cargo.',
  tierOne: '1 combinación', tierTwo: '2 combinaciones', tierThree: '3 combinaciones', tierAll: '4 o todas',
  pricesBeforeTaxes: 'Precios en USD antes de impuestos.', builderBadge: 'Módulos básicos elegibles',
  builderTitle: 'Arma la base de tu operación',
  builderDescription: 'Cada tarjeta cuenta como una combinación, aunque conecte varias funciones.',
  selectAll: 'Elegir todos', clear: 'Limpiar', countsAsOne: 'Cuenta como 1', billingCycle: 'Periodicidad',
  monthly: 'Mensual', annual: 'Anual', teamTitle: 'Personas que usarán Índice',
  teamDescription: (includedSeats) => `Tu plan incluye ${includedSeats}. Agrega capacidad cuando tu equipo la necesite.`,
  totalPeople: 'Capacidad total', country: 'País de facturación', summaryBadge: 'Tu configuración',
  summaryTitle: 'Precio estimado', selected: (count) => `${count} combinación${count === 1 ? '' : 'es'} seleccionada${count === 1 ? '' : 's'}`,
  basePlan: 'Plan base', extraUsers: 'Personas adicionales', estimatedTotal: 'Total recurrente estimado',
  taxNote: 'Importe antes de impuestos. El cálculo fiscal definitivo se realiza en Stripe con la dirección de facturación.',
  pricePending: 'Precio pendiente de publicación', start: 'Crear cuenta y comenzar',
  notReady: 'La contratación todavía no está habilitada. Puedes revisar la oferta, pero no iniciar el cobro.',
  loading: 'Cargando la oferta publicada…', loadError: 'No pudimos cargar la oferta comercial.', retry: 'Reintentar',
  trialTrust: (days) => `${days} días para conocer Índice`, cardTrust: 'Tarjeta protegida por Stripe',
  securityTrust: 'Precios y acceso validados por el servidor',
  footer: 'La selección se confirmará durante el registro. No se realiza ningún cargo en esta página.',
  productLabels: productLabelsEs, countryLabels: countriesEs,
};

const en: PublicPlansCopy = {
  locale: 'en-CA', logoAlt: 'Indice', navLabel: 'Main navigation', methodology: 'How it works',
  modules: 'Modules', learningMode: 'Learning mode', plans: 'Plans', login: 'Sign in',
  language: 'Country and language', menu: 'Open menu', heroBadge: 'A plan made for you',
  heroTitle: 'Choose what you need. See your price instantly.',
  heroDescription: 'Combine Indice modules and continue to signup with a configuration ready to validate.',
  publishedOffer: 'Offer published by Indice',
  publishedOfferDescription: 'Amounts come from the active catalog. Stripe confirms taxes and the final total before any charge.',
  tierOne: '1 combination', tierTwo: '2 combinations', tierThree: '3 combinations', tierAll: '4 or all',
  pricesBeforeTaxes: 'Prices in USD before taxes.', builderBadge: 'Eligible core modules',
  builderTitle: 'Build the foundation of your operation',
  builderDescription: 'Each card counts as one combination, even when it connects several functions.',
  selectAll: 'Select all', clear: 'Clear', countsAsOne: 'Counts as 1', billingCycle: 'Billing cycle',
  monthly: 'Monthly', annual: 'Annual', teamTitle: 'People who will use Indice',
  teamDescription: (includedSeats) => `Your plan includes ${includedSeats}. Add capacity as your team grows.`,
  totalPeople: 'Total capacity', country: 'Billing country', summaryBadge: 'Your configuration',
  summaryTitle: 'Estimated price', selected: (count) => `${count} combination${count === 1 ? '' : 's'} selected`,
  basePlan: 'Base plan', extraUsers: 'Additional people', estimatedTotal: 'Estimated recurring total',
  taxNote: 'Amount before taxes. Stripe calculates final taxes from the billing address.',
  pricePending: 'Price pending publication', start: 'Create account and start',
  notReady: 'Purchasing is not enabled yet. You can review the offer, but cannot start billing.',
  loading: 'Loading the published offer…', loadError: 'We could not load the commercial offer.', retry: 'Try again',
  trialTrust: (days) => `${days} days to discover Indice`, cardTrust: 'Card protected by Stripe',
  securityTrust: 'Prices and access validated by the server',
  footer: 'Your selection is confirmed during signup. No charge is made on this page.',
  productLabels: productLabelsEn, countryLabels: countriesEn,
};

const fr: PublicPlansCopy = {
  ...en, locale: 'fr-CA', methodology: 'Comment ça fonctionne', modules: 'Modules', learningMode: 'Mode apprentissage',
  plans: 'Forfaits', login: 'Se connecter', language: 'Pays et langue', menu: 'Ouvrir le menu',
  heroBadge: 'Un forfait sur mesure', heroTitle: 'Choisissez ce dont vous avez besoin. Voyez le prix instantanément.',
  heroDescription: 'Combinez les modules Indice et poursuivez vers l’inscription avec une configuration prête à valider.',
  publishedOffer: 'Offre publiée par Indice', publishedOfferDescription: 'Les montants proviennent du catalogue actif. Stripe confirme les taxes et le total avant tout débit.',
  tierOne: '1 combinaison', tierTwo: '2 combinaisons', tierThree: '3 combinaisons', tierAll: '4 ou toutes',
  pricesBeforeTaxes: 'Prix en USD avant taxes.', builderBadge: 'Modules de base admissibles',
  builderTitle: 'Construisez la base de vos opérations', builderDescription: 'Chaque carte compte comme une combinaison.',
  selectAll: 'Tout choisir', clear: 'Effacer', countsAsOne: 'Compte pour 1', billingCycle: 'Périodicité',
  monthly: 'Mensuel', annual: 'Annuel', teamTitle: 'Personnes qui utiliseront Indice',
  teamDescription: (includedSeats) => `Votre forfait comprend ${includedSeats} personnes.`, totalPeople: 'Capacité totale',
  country: 'Pays de facturation', summaryBadge: 'Votre configuration', summaryTitle: 'Prix estimé',
  selected: (count) => `${count} combinaison${count === 1 ? '' : 's'} sélectionnée${count === 1 ? '' : 's'}`,
  basePlan: 'Forfait de base', extraUsers: 'Personnes supplémentaires', estimatedTotal: 'Total récurrent estimé',
  taxNote: 'Montant avant taxes. Stripe calcule les taxes finales avec l’adresse de facturation.',
  pricePending: 'Prix en attente de publication', start: 'Créer un compte et commencer',
  notReady: 'La souscription n’est pas encore activée.', loading: 'Chargement de l’offre publiée…',
  loadError: 'Impossible de charger l’offre commerciale.', retry: 'Réessayer',
  trialTrust: (days) => `${days} jours pour découvrir Indice`, cardTrust: 'Carte protégée par Stripe',
  securityTrust: 'Prix et accès validés par le serveur',
  footer: 'Votre sélection sera confirmée pendant l’inscription. Aucun débit sur cette page.',
};

const pt: PublicPlansCopy = {
  ...en, locale: 'pt-BR', methodology: 'Como funciona', modules: 'Módulos', learningMode: 'Modo aprendiz',
  plans: 'Planos', login: 'Entrar', language: 'País e idioma', menu: 'Abrir menu', heroBadge: 'Plano sob medida',
  heroTitle: 'Escolha o que precisa. Veja o preço na hora.',
  heroDescription: 'Combine os módulos do Índice e continue para o cadastro com uma configuração pronta para validar.',
  publishedOffer: 'Oferta publicada pelo Índice', publishedOfferDescription: 'Os valores vêm do catálogo ativo. O Stripe confirma impostos e total antes de qualquer cobrança.',
  tierOne: '1 combinação', tierTwo: '2 combinações', tierThree: '3 combinações', tierAll: '4 ou todas',
  pricesBeforeTaxes: 'Preços em USD antes dos impostos.', builderBadge: 'Módulos básicos elegíveis',
  builderTitle: 'Monte a base da sua operação', builderDescription: 'Cada cartão conta como uma combinação.',
  selectAll: 'Selecionar todos', clear: 'Limpar', countsAsOne: 'Conta como 1', billingCycle: 'Periodicidade',
  monthly: 'Mensal', annual: 'Anual', teamTitle: 'Pessoas que usarão o Índice',
  teamDescription: (includedSeats) => `Seu plano inclui ${includedSeats} pessoas.`, totalPeople: 'Capacidade total',
  country: 'País de cobrança', summaryBadge: 'Sua configuração', summaryTitle: 'Preço estimado',
  selected: (count) => `${count} combinaç${count === 1 ? 'ão' : 'ões'} selecionada${count === 1 ? '' : 's'}`,
  basePlan: 'Plano base', extraUsers: 'Pessoas adicionais', estimatedTotal: 'Total recorrente estimado',
  taxNote: 'Valor antes dos impostos. O Stripe calcula os impostos finais pelo endereço de cobrança.',
  pricePending: 'Preço pendente de publicação', start: 'Criar conta e começar', notReady: 'A contratação ainda não está habilitada.',
  loading: 'Carregando a oferta publicada…', loadError: 'Não foi possível carregar a oferta comercial.', retry: 'Tentar novamente',
  trialTrust: (days) => `${days} dias para conhecer o Índice`, cardTrust: 'Cartão protegido pelo Stripe',
  securityTrust: 'Preços e acesso validados pelo servidor', footer: 'A seleção será confirmada no cadastro. Nenhuma cobrança é feita nesta página.',
};

const ko: PublicPlansCopy = {
  ...en, locale: 'ko-CA', methodology: '이용 방법', modules: '모듈', learningMode: '학습 모드', plans: '요금제',
  login: '로그인', language: '국가 및 언어', menu: '메뉴 열기', heroBadge: '맞춤 요금제',
  heroTitle: '필요한 항목을 선택하고 가격을 바로 확인하세요.',
  heroDescription: 'Indice 모듈을 조합한 뒤 검증 가능한 구성으로 가입을 계속하세요.',
  publishedOffer: 'Indice가 게시한 요금', publishedOfferDescription: '금액은 활성 카탈로그에서 불러오며 결제 전 Stripe가 세금과 총액을 확인합니다.',
  tierOne: '1개 조합', tierTwo: '2개 조합', tierThree: '3개 조합', tierAll: '4개 또는 전체',
  pricesBeforeTaxes: '세전 USD 가격입니다.', builderBadge: '선택 가능한 기본 모듈', builderTitle: '운영 기반 구성',
  builderDescription: '여러 기능을 연결해도 카드 하나는 한 조합입니다.', selectAll: '전체 선택', clear: '지우기',
  countsAsOne: '1개로 계산', billingCycle: '결제 주기', monthly: '월간', annual: '연간',
  teamTitle: 'Indice를 사용할 인원', teamDescription: (includedSeats) => `요금제에 ${includedSeats}명이 포함됩니다.`,
  totalPeople: '전체 인원', country: '청구 국가', summaryBadge: '내 구성', summaryTitle: '예상 가격',
  selected: (count) => `${count}개 조합 선택`, basePlan: '기본 요금제', extraUsers: '추가 인원',
  estimatedTotal: '예상 반복 결제액', taxNote: '세전 금액입니다. Stripe가 청구 주소로 최종 세금을 계산합니다.',
  pricePending: '가격 게시 대기 중', start: '계정 만들고 시작하기', notReady: '아직 구매가 활성화되지 않았습니다.',
  loading: '게시된 요금을 불러오는 중…', loadError: '요금을 불러올 수 없습니다.', retry: '다시 시도',
  trialTrust: (days) => `${days}일 동안 Indice 체험`, cardTrust: 'Stripe로 카드 보호',
  securityTrust: '서버에서 가격과 접근 권한 검증', footer: '가입 과정에서 선택을 확인합니다. 이 페이지에서는 청구되지 않습니다.',
};

const zh: PublicPlansCopy = {
  ...en, locale: 'zh-CA', methodology: '使用方式', modules: '模块', learningMode: '学习模式', plans: '方案',
  login: '登录', language: '国家和语言', menu: '打开菜单', heroBadge: '定制方案',
  heroTitle: '选择所需内容，即时查看价格。', heroDescription: '组合 Indice 模块，并带着待验证的配置继续注册。',
  publishedOffer: 'Indice 已发布报价', publishedOfferDescription: '金额来自当前目录；Stripe 会在扣款前确认税费和总额。',
  tierOne: '1 个组合', tierTwo: '2 个组合', tierThree: '3 个组合', tierAll: '4 个或全部',
  pricesBeforeTaxes: '税前美元价格。', builderBadge: '可选基础模块', builderTitle: '构建运营基础',
  builderDescription: '即使连接多个功能，每张卡仍计为一个组合。', selectAll: '全选', clear: '清除',
  countsAsOne: '计为 1 个', billingCycle: '账单周期', monthly: '每月', annual: '每年',
  teamTitle: '使用 Indice 的人数', teamDescription: (includedSeats) => `方案包含 ${includedSeats} 人。`,
  totalPeople: '总容量', country: '账单国家', summaryBadge: '你的配置', summaryTitle: '预估价格',
  selected: (count) => `已选择 ${count} 个组合`, basePlan: '基础方案', extraUsers: '额外人员',
  estimatedTotal: '预计周期总额', taxNote: '税前金额。Stripe 将根据账单地址计算最终税费。',
  pricePending: '价格待发布', start: '创建账户并开始', notReady: '购买功能尚未启用。',
  loading: '正在加载已发布报价…', loadError: '无法加载商业报价。', retry: '重试',
  trialTrust: (days) => `${days} 天体验 Indice`, cardTrust: 'Stripe 保护银行卡',
  securityTrust: '服务器验证价格与访问权限', footer: '注册时会确认你的选择。本页面不会扣款。',
};

const copies: Record<string, PublicPlansCopy> = {
  'es-MX': es, 'es-CO': { ...es, locale: 'es-CO' }, 'en-US': { ...en, locale: 'en-US' },
  'en-CA': en, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};

export function getPublicPlansCopy(languageCode: string) {
  return copies[languageCode] ?? en;
}
