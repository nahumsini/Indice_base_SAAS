import type { ProductPortfolioQuadrant, ProductPortfolioStockStatus } from './types';

type QuadrantCopy = { title: string; description: string; action: string };

export type ProductPortfolioCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  summary: { revenue: string; eligible: string; classified: string; comparison: string };
  axes: { share: string; growth: string; low: string; high: string };
  quadrants: Record<ProductPortfolioQuadrant, QuadrantCopy>;
  metrics: {
    currentRevenue: string;
    previousRevenue: string;
    growth: string;
    relativeShare: string;
    portfolioShare: string;
    units: string;
    category: string;
    sku: string;
    stock: string;
  };
  stock: Record<ProductPortfolioStockStatus, string>;
  selectedProduct: string;
  selectPrompt: string;
  noProducts: string;
  noComparable: string;
  dataReady: string;
  dataReview: string;
  internalNote: string;
  thresholdNote: string;
  displayedNote: string;
  unavailable: string;
  reportTitle: string;
  columns: { product: string; quadrant: string; action: string };
};

const es: ProductPortfolioCopy = {
  eyebrow: 'Portafolio automatizado · portfolio-bcg/1.0',
  title: 'Matriz BCG de productos',
  subtitle: 'Prioriza el portafolio con el crecimiento de ventas y la fuerza relativa de cada producto dentro de su categoría.',
  summary: { revenue: 'Venta neta actual', eligible: 'Productos elegibles', classified: 'Productos clasificados', comparison: 'Periodo comparable' },
  axes: { share: 'Fuerza relativa en la categoría', growth: 'Crecimiento de venta', low: 'Baja', high: 'Alta' },
  quadrants: {
    star: { title: 'Estrellas', description: 'Alta fuerza y alto crecimiento.', action: 'Proteger disponibilidad y sostener el crecimiento rentable.' },
    cash_cow: { title: 'Vacas', description: 'Alta fuerza y crecimiento bajo.', action: 'Defender margen, rotación y generación de efectivo.' },
    question_mark: { title: 'Interrogantes', description: 'Baja fuerza y alto crecimiento.', action: 'Probar canal, precio o promoción antes de escalar inversión.' },
    dog: { title: 'Perros', description: 'Baja fuerza y crecimiento bajo.', action: 'Revisar surtido, precio y continuidad con evidencia de margen.' },
    unclassified: { title: 'Sin clasificar', description: 'Sin base comparable completa.', action: 'Capturar un periodo anterior válido antes de decidir.' },
  },
  metrics: { currentRevenue: 'Venta actual', previousRevenue: 'Venta anterior', growth: 'Crecimiento', relativeShare: 'Fuerza en categoría', portfolioShare: 'Peso del portafolio', units: 'Unidades actuales', category: 'Categoría', sku: 'SKU', stock: 'Inventario' },
  stock: { not_tracked: 'No administrado', unavailable: 'No disponible', out_of_stock: 'Agotado', low_stock: 'Inventario bajo', healthy: 'Disponible' },
  selectedProduct: 'Producto seleccionado', selectPrompt: 'Selecciona una burbuja para revisar evidencia y acción.',
  noProducts: 'No hay ventas atribuibles a productos en este periodo.', noComparable: 'Productos sin periodo anterior comparable',
  dataReady: 'Evidencia lista para orientar la revisión del portafolio.', dataReview: 'La cobertura es parcial; revisa los datos antes de decidir.',
  internalNote: 'Es una matriz interna del portafolio. No representa participación de mercado ni utiliza datos de competidores.',
  thresholdNote: 'Alta fuerza: al menos 50% de la venta del líder de su categoría. Alto crecimiento: 0% o más frente al periodo anterior.',
  displayedNote: 'La gráfica muestra los productos de mayor venta; los totales consideran todo el portafolio elegible.',
  unavailable: 'Sin datos', reportTitle: 'Matriz BCG de productos',
  columns: { product: 'Producto', quadrant: 'Cuadrante', action: 'Acción sugerida' },
};

const en: ProductPortfolioCopy = {
  eyebrow: 'Automated portfolio · portfolio-bcg/1.0',
  title: 'Product BCG matrix',
  subtitle: 'Prioritizes the portfolio using sales growth and each product’s relative strength within its category.',
  summary: { revenue: 'Current net sales', eligible: 'Eligible products', classified: 'Classified products', comparison: 'Comparable period' },
  axes: { share: 'Relative category strength', growth: 'Sales growth', low: 'Low', high: 'High' },
  quadrants: {
    star: { title: 'Stars', description: 'High strength and high growth.', action: 'Protect availability and sustain profitable growth.' },
    cash_cow: { title: 'Cash cows', description: 'High strength and low growth.', action: 'Defend margin, turnover, and cash generation.' },
    question_mark: { title: 'Question marks', description: 'Low strength and high growth.', action: 'Test channel, price, or promotion before scaling investment.' },
    dog: { title: 'Dogs', description: 'Low strength and low growth.', action: 'Review assortment, price, and continuity with margin evidence.' },
    unclassified: { title: 'Unclassified', description: 'No complete comparable baseline.', action: 'Capture a valid prior period before deciding.' },
  },
  metrics: { currentRevenue: 'Current sales', previousRevenue: 'Previous sales', growth: 'Growth', relativeShare: 'Category strength', portfolioShare: 'Portfolio weight', units: 'Current units', category: 'Category', sku: 'SKU', stock: 'Inventory' },
  stock: { not_tracked: 'Not managed', unavailable: 'Unavailable', out_of_stock: 'Out of stock', low_stock: 'Low stock', healthy: 'Available' },
  selectedProduct: 'Selected product', selectPrompt: 'Select a bubble to review its evidence and action.',
  noProducts: 'There are no sales attributable to products in this period.', noComparable: 'Products without a comparable prior period',
  dataReady: 'Evidence is ready to guide the portfolio review.', dataReview: 'Coverage is partial; review the data before deciding.',
  internalNote: 'This is an internal portfolio matrix. It does not represent market share or use competitor data.',
  thresholdNote: 'High strength: at least 50% of the category leader’s sales. High growth: 0% or more versus the prior period.',
  displayedNote: 'The chart shows the highest-selling products; totals cover the full eligible portfolio.',
  unavailable: 'No data', reportTitle: 'Product BCG matrix',
  columns: { product: 'Product', quadrant: 'Quadrant', action: 'Suggested action' },
};

const fr: ProductPortfolioCopy = {
  ...en,
  eyebrow: 'Portefeuille automatisé · portfolio-bcg/1.0', title: 'Matrice BCG des produits',
  subtitle: 'Priorise le portefeuille selon la croissance des ventes et la force relative de chaque produit dans sa catégorie.',
  summary: { revenue: 'Ventes nettes actuelles', eligible: 'Produits admissibles', classified: 'Produits classés', comparison: 'Période comparable' },
  axes: { share: 'Force relative dans la catégorie', growth: 'Croissance des ventes', low: 'Faible', high: 'Élevée' },
  quadrants: {
    star: { title: 'Vedettes', description: 'Force et croissance élevées.', action: 'Protéger la disponibilité et soutenir une croissance rentable.' },
    cash_cow: { title: 'Vaches à lait', description: 'Force élevée et faible croissance.', action: 'Défendre la marge, la rotation et la génération de trésorerie.' },
    question_mark: { title: 'Dilemmes', description: 'Faible force et forte croissance.', action: 'Tester le canal, le prix ou la promotion avant d’accroître l’investissement.' },
    dog: { title: 'Poids morts', description: 'Faible force et faible croissance.', action: 'Réviser l’assortiment, le prix et la continuité avec les données de marge.' },
    unclassified: { title: 'Non classés', description: 'Aucune base comparative complète.', action: 'Obtenir une période antérieure valide avant de décider.' },
  },
  metrics: { currentRevenue: 'Ventes actuelles', previousRevenue: 'Ventes précédentes', growth: 'Croissance', relativeShare: 'Force dans la catégorie', portfolioShare: 'Poids du portefeuille', units: 'Unités actuelles', category: 'Catégorie', sku: 'UGS', stock: 'Stock' },
  stock: { not_tracked: 'Non géré', unavailable: 'Indisponible', out_of_stock: 'Rupture de stock', low_stock: 'Stock faible', healthy: 'Disponible' },
  selectedProduct: 'Produit sélectionné', selectPrompt: 'Sélectionnez une bulle pour consulter les données et l’action.',
  noProducts: 'Aucune vente attribuable à un produit pour cette période.', noComparable: 'Produits sans période antérieure comparable',
  dataReady: 'Les données sont prêtes pour orienter la revue du portefeuille.', dataReview: 'La couverture est partielle; vérifiez les données avant de décider.',
  internalNote: 'Il s’agit d’une matrice interne du portefeuille. Elle ne représente pas la part de marché et n’utilise aucune donnée concurrentielle.',
  thresholdNote: 'Force élevée : au moins 50 % des ventes du leader de la catégorie. Croissance élevée : 0 % ou plus par rapport à la période précédente.',
  displayedNote: 'Le graphique présente les produits les plus vendus; les totaux couvrent tout le portefeuille admissible.',
  unavailable: 'Aucune donnée', reportTitle: 'Matrice BCG des produits',
  columns: { product: 'Produit', quadrant: 'Quadrant', action: 'Action suggérée' },
};

const pt: ProductPortfolioCopy = {
  ...en,
  eyebrow: 'Portfólio automatizado · portfolio-bcg/1.0', title: 'Matriz BCG de produtos',
  subtitle: 'Prioriza o portfólio pelo crescimento das vendas e pela força relativa de cada produto em sua categoria.',
  summary: { revenue: 'Venda líquida atual', eligible: 'Produtos elegíveis', classified: 'Produtos classificados', comparison: 'Período comparável' },
  axes: { share: 'Força relativa na categoria', growth: 'Crescimento das vendas', low: 'Baixa', high: 'Alta' },
  quadrants: {
    star: { title: 'Estrelas', description: 'Força e crescimento altos.', action: 'Proteger a disponibilidade e sustentar o crescimento rentável.' },
    cash_cow: { title: 'Vacas leiteiras', description: 'Força alta e crescimento baixo.', action: 'Defender margem, giro e geração de caixa.' },
    question_mark: { title: 'Interrogações', description: 'Força baixa e crescimento alto.', action: 'Testar canal, preço ou promoção antes de ampliar o investimento.' },
    dog: { title: 'Cães', description: 'Força e crescimento baixos.', action: 'Revisar sortimento, preço e continuidade com evidências de margem.' },
    unclassified: { title: 'Sem classificação', description: 'Sem base comparável completa.', action: 'Registrar um período anterior válido antes de decidir.' },
  },
  metrics: { currentRevenue: 'Venda atual', previousRevenue: 'Venda anterior', growth: 'Crescimento', relativeShare: 'Força na categoria', portfolioShare: 'Peso do portfólio', units: 'Unidades atuais', category: 'Categoria', sku: 'SKU', stock: 'Estoque' },
  stock: { not_tracked: 'Não gerenciado', unavailable: 'Indisponível', out_of_stock: 'Sem estoque', low_stock: 'Estoque baixo', healthy: 'Disponível' },
  selectedProduct: 'Produto selecionado', selectPrompt: 'Selecione uma bolha para revisar evidências e ação.',
  noProducts: 'Não há vendas atribuíveis a produtos neste período.', noComparable: 'Produtos sem período anterior comparável',
  dataReady: 'As evidências estão prontas para orientar a revisão do portfólio.', dataReview: 'A cobertura é parcial; revise os dados antes de decidir.',
  internalNote: 'Esta é uma matriz interna do portfólio. Não representa participação de mercado nem usa dados de concorrentes.',
  thresholdNote: 'Força alta: pelo menos 50% das vendas do líder da categoria. Crescimento alto: 0% ou mais em relação ao período anterior.',
  displayedNote: 'O gráfico mostra os produtos mais vendidos; os totais cobrem todo o portfólio elegível.',
  unavailable: 'Sem dados', reportTitle: 'Matriz BCG de produtos',
  columns: { product: 'Produto', quadrant: 'Quadrante', action: 'Ação sugerida' },
};

const ko: ProductPortfolioCopy = {
  ...en,
  eyebrow: '자동 포트폴리오 · portfolio-bcg/1.0', title: '제품 BCG 매트릭스',
  subtitle: '판매 성장률과 카테고리 내 제품의 상대적 강도를 기준으로 포트폴리오 우선순위를 정합니다.',
  summary: { revenue: '현재 순매출', eligible: '대상 제품', classified: '분류된 제품', comparison: '비교 기간' },
  axes: { share: '카테고리 내 상대적 강도', growth: '매출 성장률', low: '낮음', high: '높음' },
  quadrants: {
    star: { title: '스타', description: '강도와 성장률이 모두 높습니다.', action: '재고 가용성을 보호하고 수익성 있는 성장을 유지하세요.' },
    cash_cow: { title: '캐시카우', description: '강도는 높고 성장률은 낮습니다.', action: '마진, 회전율, 현금 창출을 방어하세요.' },
    question_mark: { title: '물음표', description: '강도는 낮고 성장률은 높습니다.', action: '투자를 확대하기 전에 채널, 가격 또는 프로모션을 시험하세요.' },
    dog: { title: '도그', description: '강도와 성장률이 모두 낮습니다.', action: '마진 근거를 바탕으로 구성, 가격 및 지속 여부를 검토하세요.' },
    unclassified: { title: '미분류', description: '완전한 비교 기준이 없습니다.', action: '결정 전에 유효한 이전 기간 데이터를 확보하세요.' },
  },
  metrics: { currentRevenue: '현재 매출', previousRevenue: '이전 매출', growth: '성장률', relativeShare: '카테고리 강도', portfolioShare: '포트폴리오 비중', units: '현재 수량', category: '카테고리', sku: 'SKU', stock: '재고' },
  stock: { not_tracked: '관리하지 않음', unavailable: '사용 불가', out_of_stock: '품절', low_stock: '재고 부족', healthy: '재고 있음' },
  selectedProduct: '선택한 제품', selectPrompt: '근거와 조치를 확인할 버블을 선택하세요.',
  noProducts: '이 기간에는 제품에 귀속할 수 있는 판매가 없습니다.', noComparable: '이전 비교 기간이 없는 제품',
  dataReady: '포트폴리오 검토에 사용할 근거가 준비되었습니다.', dataReview: '데이터 범위가 일부이므로 결정 전에 검토하세요.',
  internalNote: '내부 포트폴리오 매트릭스이며 시장 점유율이나 경쟁사 데이터를 나타내지 않습니다.',
  thresholdNote: '높은 강도: 카테고리 리더 매출의 50% 이상. 높은 성장: 이전 기간 대비 0% 이상.',
  displayedNote: '차트는 매출 상위 제품을 표시하며 합계는 전체 대상 포트폴리오를 반영합니다.',
  unavailable: '데이터 없음', reportTitle: '제품 BCG 매트릭스',
  columns: { product: '제품', quadrant: '사분면', action: '권장 조치' },
};

const zh: ProductPortfolioCopy = {
  ...en,
  eyebrow: '自动化产品组合 · portfolio-bcg/1.0', title: '产品 BCG 矩阵',
  subtitle: '根据销售增长率及产品在所属品类中的相对强度确定产品组合优先级。',
  summary: { revenue: '本期净销售额', eligible: '适用产品', classified: '已分类产品', comparison: '对比期间' },
  axes: { share: '品类相对强度', growth: '销售增长率', low: '低', high: '高' },
  quadrants: {
    star: { title: '明星', description: '强度高且增长率高。', action: '保障供应，并维持有利润的增长。' },
    cash_cow: { title: '现金牛', description: '强度高但增长率低。', action: '维护利润率、周转率及现金贡献。' },
    question_mark: { title: '问题产品', description: '强度低但增长率高。', action: '扩大投入前先测试渠道、价格或促销。' },
    dog: { title: '瘦狗', description: '强度和增长率均低。', action: '结合利润依据复核产品组合、价格及是否保留。' },
    unclassified: { title: '未分类', description: '没有完整的对比基准。', action: '决策前先取得有效的上一期间数据。' },
  },
  metrics: { currentRevenue: '本期销售额', previousRevenue: '上期销售额', growth: '增长率', relativeShare: '品类强度', portfolioShare: '产品组合占比', units: '本期数量', category: '品类', sku: 'SKU', stock: '库存' },
  stock: { not_tracked: '未管理', unavailable: '不可用', out_of_stock: '缺货', low_stock: '库存偏低', healthy: '有库存' },
  selectedProduct: '所选产品', selectPrompt: '请选择气泡以查看依据和建议操作。',
  noProducts: '本期没有可归属到产品的销售记录。', noComparable: '缺少上一对比期间的产品',
  dataReady: '数据依据已可用于产品组合复核。', dataReview: '数据覆盖不完整，请在决策前复核。',
  internalNote: '这是内部产品组合矩阵，不代表市场份额，也不使用竞争对手数据。',
  thresholdNote: '高强度：至少达到品类领先产品销售额的 50%。高增长：较上一期间增长 0% 或以上。',
  displayedNote: '图表显示销售额最高的产品；汇总涵盖全部适用产品。',
  unavailable: '无数据', reportTitle: '产品 BCG 矩阵',
  columns: { product: '产品', quadrant: '象限', action: '建议操作' },
};

export const productPortfolioTranslations: Record<string, ProductPortfolioCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};
