import type {
  BusinessHealthQuadrant,
  InventoryIntelligenceQuadrant,
  ProductProfitabilityQuadrant,
} from './types';

type QuadrantCopy = { title: string; description: string; action: string };

export type DecisionMatrixViewCopy<Quadrant extends string> = {
  eyebrow: string;
  title: string;
  subtitle: string;
  xAxis: string;
  yAxis: string;
  low: string;
  high: string;
  threshold: string;
  selectPrompt: string;
  noData: string;
  methodology: string;
  quadrants: Record<Quadrant, QuadrantCopy>;
  metrics: Record<string, string>;
};

export type DecisionMatrixCopy = {
  common: {
    ready: string;
    review: string;
    evidence: string;
    recommendation: string;
    unclassified: string;
    openSales: string;
    openInventory: string;
    openProcesses: string;
    unit: string;
    business: string;
    reading: string;
  };
  health: DecisionMatrixViewCopy<BusinessHealthQuadrant>;
  profitability: DecisionMatrixViewCopy<ProductProfitabilityQuadrant>;
  inventory: DecisionMatrixViewCopy<InventoryIntelligenceQuadrant>;
};

const es: DecisionMatrixCopy = {
  common: {
    ready: 'Lectura lista para orientar decisiones', review: 'Revisión de evidencia requerida',
    evidence: 'Evidencia observada', recommendation: 'Siguiente decisión', unclassified: 'Sin clasificar',
    openSales: 'Abrir Ventas', openInventory: 'Abrir Inventario', openProcesses: 'Abrir Procesos y tareas',
    unit: 'Unidad', business: 'Negocio', reading: 'Lectura',
  },
  health: {
    eyebrow: 'Índice IME · empresa completa', title: 'Matriz de salud empresarial',
    subtitle: 'Cruza rentabilidad y ejecución para reconocer qué unidades impulsan el negocio y cuáles necesitan intervención.',
    xAxis: 'Ejecución operativa', yAxis: 'Margen operativo', low: 'Bajo', high: 'Alto', threshold: 'Corte de referencia',
    selectPrompt: 'Selecciona una unidad o negocio para leer su evidencia y decisión sugerida.',
    noData: 'Todavía no hay unidades con ventas y tareas suficientes para construir esta lectura.',
    methodology: 'El eje operativo combina cumplimiento, rezago y asistencia. El eje financiero usa el margen observado del periodo.',
    quadrants: {
      engine: { title: 'Motores del negocio', description: 'Rentabilidad y ejecución avanzan juntas.', action: 'Proteger capacidad, documentar la práctica y escalar lo que funciona.' },
      contained_potential: { title: 'Potencial contenido', description: 'La operación responde, pero el resultado financiero no acompaña.', action: 'Revisar precio, mezcla comercial y estructura de gasto.' },
      fragile_growth: { title: 'Crecimiento frágil', description: 'El resultado es favorable, pero la ejecución puede romperlo.', action: 'Cerrar rezagos, responsables y controles antes de acelerar.' },
      priority_intervention: { title: 'Intervención prioritaria', description: 'Bajo resultado y bajo control operativo.', action: 'Definir un plan de recuperación con dueño, plazo y seguimiento semanal.' },
      unclassified: { title: 'Evidencia incompleta', description: 'No existe una base comparable suficiente.', action: 'Completar ventas, costos, tareas o moneda antes de decidir.' },
    },
    metrics: {
      revenue: 'Ventas', profit: 'Utilidad operativa', margin: 'Margen operativo', execution: 'Ejecución',
      completion: 'Cumplimiento de tareas', attendance: 'Asistencia', overdueTasks: 'Tareas vencidas', receivables: 'Cartera vencida',
    },
  },
  profitability: {
    eyebrow: 'Portafolio · decisión comercial', title: 'Matriz Rentabilidad–Rotación',
    subtitle: 'Distingue los productos que ganan por margen, por velocidad o por ambos, usando el costo capturado en cada venta.',
    xAxis: 'Velocidad de venta diaria', yAxis: 'Margen de contribución', low: 'Baja', high: 'Alta', threshold: 'Mediana del portafolio',
    selectPrompt: 'Selecciona un producto para revisar ventas, costo, margen, velocidad e inventario.',
    noData: 'No hay productos con renglones de venta atribuibles en este periodo.',
    methodology: 'Margen estimado = ingreso neto menos costo capturado en los renglones vendidos. Los costos ausentes no se estiman.',
    quadrants: {
      winner: { title: 'Ganadores', description: 'Alta rotación y alto margen.', action: 'Proteger disponibilidad y sostener precio, servicio y exposición.' },
      sacrificed_volume: { title: 'Volumen sacrificado', description: 'Se vende rápido, pero deja poco margen.', action: 'Revisar descuento, costo, comisión o presentación comercial.' },
      hidden_gem: { title: 'Joyas ocultas', description: 'Buen margen con rotación todavía baja.', action: 'Mejorar visibilidad, recomendación cruzada y cobertura comercial.' },
      catalog_drain: { title: 'Drenaje de catálogo', description: 'Baja rotación y bajo margen.', action: 'Replantear precio, compra, promoción o permanencia en catálogo.' },
      unclassified: { title: 'Costo incompleto', description: 'La rentabilidad no puede demostrarse.', action: 'Capturar o corregir el costo antes de tomar una decisión.' },
    },
    metrics: {
      revenue: 'Ingreso neto', cost: 'Costo capturado', contribution: 'Contribución', margin: 'Margen',
      units: 'Unidades vendidas', velocity: 'Unidades por día', stock: 'Existencia disponible', category: 'Categoría',
    },
  },
  inventory: {
    eyebrow: 'Inventario · demanda observada', title: 'Matriz de inventario inteligente',
    subtitle: 'Convierte ventas e inventario actual en una lectura de quiebre, equilibrio, sobrestock o inmovilidad.',
    xAxis: 'Velocidad de venta diaria', yAxis: 'Días de cobertura', low: 'Baja', high: 'Alta', threshold: 'Cobertura objetivo',
    selectPrompt: 'Selecciona un producto para revisar demanda, existencia, mínimo y cobertura.',
    noData: 'No hay productos vendidos con inventario rastreable en este alcance.',
    methodology: 'Cobertura = existencia disponible ÷ velocidad promedio diaria del periodo. No es un pronóstico de demanda futura.',
    quadrants: {
      stockout_risk: { title: 'Riesgo de quiebre', description: 'La demanda supera la cobertura disponible.', action: 'Reabastecer, redistribuir o proteger compromisos de venta.' },
      balanced: { title: 'Inventario saludable', description: 'Demanda y cobertura permanecen en rango operativo.', action: 'Mantener mínimos y vigilar cambios en la velocidad.' },
      overstock: { title: 'Sobrestock', description: 'La cobertura excede la demanda observada.', action: 'Reducir compra, redistribuir o activar promoción responsable.' },
      stagnant: { title: 'Producto detenido', description: 'Hay existencia sin velocidad de venta en el periodo.', action: 'Revisar visibilidad, precio, sustitución o salida de catálogo.' },
      unclassified: { title: 'Inventario no rastreable', description: 'No existe saldo válido para calcular cobertura.', action: 'Activar inventario y corregir cantidades antes de decidir.' },
    },
    metrics: {
      revenue: 'Ingreso asociado', units: 'Unidades vendidas', velocity: 'Unidades por día', available: 'Existencia disponible',
      minimum: 'Existencia mínima', coverage: 'Días de cobertura', category: 'Categoría', stockStatus: 'Estado de inventario',
    },
  },
};

const en: DecisionMatrixCopy = {
  common: {
    ready: 'Reading ready to guide decisions', review: 'Evidence review required', evidence: 'Observed evidence',
    recommendation: 'Next decision', unclassified: 'Unclassified', openSales: 'Open Sales',
    openInventory: 'Open Inventory', openProcesses: 'Open Processes and tasks',
    unit: 'Unit', business: 'Business', reading: 'Reading',
  },
  health: {
    eyebrow: 'IME Index · complete enterprise', title: 'Business health matrix',
    subtitle: 'Crosses profitability and execution to identify which units drive the business and which require intervention.',
    xAxis: 'Operational execution', yAxis: 'Operating margin', low: 'Low', high: 'High', threshold: 'Reference threshold',
    selectPrompt: 'Select a unit or business to review its evidence and suggested decision.', noData: 'There are not enough unit sales and task records yet.',
    methodology: 'The execution axis combines completion, backlog, and attendance. The financial axis uses observed operating margin.',
    quadrants: {
      engine: { title: 'Business engines', description: 'Profitability and execution advance together.', action: 'Protect capacity, document the practice, and scale what works.' },
      contained_potential: { title: 'Contained potential', description: 'Operations respond, but financial results lag.', action: 'Review price, commercial mix, and expense structure.' },
      fragile_growth: { title: 'Fragile growth', description: 'Results are favorable, but execution can break them.', action: 'Close backlog, ownership, and controls before accelerating.' },
      priority_intervention: { title: 'Priority intervention', description: 'Low results and low operational control.', action: 'Create a recovery plan with an owner, deadline, and weekly follow-up.' },
      unclassified: { title: 'Incomplete evidence', description: 'There is no sufficient comparable base.', action: 'Complete sales, costs, tasks, or currency evidence first.' },
    },
    metrics: { revenue: 'Sales', profit: 'Operating profit', margin: 'Operating margin', execution: 'Execution', completion: 'Task completion', attendance: 'Attendance', overdueTasks: 'Overdue tasks', receivables: 'Overdue receivables' },
  },
  profitability: {
    eyebrow: 'Portfolio · commercial decision', title: 'Profitability–Rotation matrix', subtitle: 'Separates products that win through margin, velocity, or both, using captured sale-line cost.',
    xAxis: 'Daily sales velocity', yAxis: 'Contribution margin', low: 'Low', high: 'High', threshold: 'Portfolio median',
    selectPrompt: 'Select a product to review sales, cost, margin, velocity, and inventory.', noData: 'There are no attributable product sales in this period.',
    methodology: 'Estimated margin equals net revenue minus captured cost. Missing costs are never inferred.',
    quadrants: {
      winner: { title: 'Winners', description: 'High rotation and high margin.', action: 'Protect availability and sustain price, service, and exposure.' },
      sacrificed_volume: { title: 'Sacrificed volume', description: 'Fast sales with little margin.', action: 'Review discounts, cost, commission, or commercial presentation.' },
      hidden_gem: { title: 'Hidden gems', description: 'Good margin with low rotation.', action: 'Improve visibility, cross-selling, and commercial coverage.' },
      catalog_drain: { title: 'Catalog drain', description: 'Low rotation and low margin.', action: 'Reconsider price, purchasing, promotion, or catalog permanence.' },
      unclassified: { title: 'Incomplete cost', description: 'Profitability cannot be demonstrated.', action: 'Capture or correct cost before making a decision.' },
    },
    metrics: { revenue: 'Net revenue', cost: 'Captured cost', contribution: 'Contribution', margin: 'Margin', units: 'Units sold', velocity: 'Units per day', stock: 'Available stock', category: 'Category' },
  },
  inventory: {
    eyebrow: 'Inventory · observed demand', title: 'Smart inventory matrix', subtitle: 'Turns sales and current inventory into a stockout, balance, overstock, or stagnation reading.',
    xAxis: 'Daily sales velocity', yAxis: 'Coverage days', low: 'Low', high: 'High', threshold: 'Target coverage',
    selectPrompt: 'Select a product to review demand, stock, minimum, and coverage.', noData: 'There are no sold products with trackable inventory in this scope.',
    methodology: 'Coverage equals available stock divided by average daily velocity. It is not a future demand forecast.',
    quadrants: {
      stockout_risk: { title: 'Stockout risk', description: 'Demand exceeds available coverage.', action: 'Replenish, redistribute, or protect sales commitments.' },
      balanced: { title: 'Healthy inventory', description: 'Demand and coverage remain in range.', action: 'Maintain minimums and monitor velocity changes.' },
      overstock: { title: 'Overstock', description: 'Coverage exceeds observed demand.', action: 'Reduce purchasing, redistribute, or activate responsible promotion.' },
      stagnant: { title: 'Stagnant product', description: 'Inventory has no sales velocity.', action: 'Review visibility, price, substitution, or catalog exit.' },
      unclassified: { title: 'Untracked inventory', description: 'There is no valid stock balance.', action: 'Enable inventory and correct quantities first.' },
    },
    metrics: { revenue: 'Associated revenue', units: 'Units sold', velocity: 'Units per day', available: 'Available stock', minimum: 'Minimum stock', coverage: 'Coverage days', category: 'Category', stockStatus: 'Inventory status' },
  },
};

const translated = (base: DecisionMatrixCopy, labels: {
  health: string; profitability: string; inventory: string; ready: string; review: string;
}): DecisionMatrixCopy => ({
  ...base,
  common: { ...base.common, ready: labels.ready, review: labels.review },
  health: { ...base.health, title: labels.health },
  profitability: { ...base.profitability, title: labels.profitability },
  inventory: { ...base.inventory, title: labels.inventory },
});

export const decisionMatrixTranslations: Record<string, DecisionMatrixCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': translated(en, { health: 'Matrice de santé de l’entreprise', profitability: 'Matrice Rentabilité–Rotation', inventory: 'Matrice d’inventaire intelligente', ready: 'Lecture prête à guider les décisions', review: 'Révision des données requise' }),
  'pt-BR': translated(en, { health: 'Matriz de saúde empresarial', profitability: 'Matriz Rentabilidade–Rotação', inventory: 'Matriz de estoque inteligente', ready: 'Leitura pronta para orientar decisões', review: 'Revisão de dados necessária' }),
  'ko-CA': translated(en, { health: '기업 건강 매트릭스', profitability: '수익성–회전율 매트릭스', inventory: '스마트 재고 매트릭스', ready: '의사결정 참고 가능', review: '데이터 검토 필요' }),
  'zh-CA': translated(en, { health: '企业健康矩阵', profitability: '盈利能力–周转矩阵', inventory: '智能库存矩阵', ready: '可用于辅助决策', review: '需要检查数据' }),
};
