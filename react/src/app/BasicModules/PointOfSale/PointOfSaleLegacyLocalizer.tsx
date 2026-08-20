import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { PointOfSaleLocale } from './translations';

type LegacyLanguage = 'en' | 'es' | 'fr' | 'pt' | 'ko' | 'zh';
type LocalizedText = Partial<Record<LegacyLanguage, string>>;

const localeLanguage: Record<PointOfSaleLocale, LegacyLanguage> = {
  'en-CA': 'en',
  'en-US': 'en',
  'es-MX': 'es',
  'es-CO': 'es',
  'fr-CA': 'fr',
  'pt-BR': 'pt',
  'ko-CA': 'ko',
  'zh-CA': 'zh',
};

const exactAliases: Record<string, string> = {
  'Abrir caja': 'Open register',
  'Abriendo...': 'Opening...',
  'Accion recomendada': 'Recommended action',
  'Actualizar': 'Refresh',
  'Agregar Pago con Tarjeta': 'Add Card Payment',
  'Agregar Pago en Efectivo': 'Add Cash Payment',
  'Agregar Pago por Transferencia': 'Add Transfer Payment',
  'Agregar Venta a Credito': 'Add Credit Sale',
  'Agregar al menos un pago antes de cobrar.': 'Add at least one payment before charging.',
  'Agregar pago': 'Add payment',
  'Agrega pago exacto o captura un metodo personalizado.': 'Add exact payment or enter a custom method.',
  'Agrega productos al ticket antes de cobrar.': 'Add products to the ticket before charging.',
  'Agrega productos al ticket antes de registrar pagos.': 'Add products to the ticket before registering payments.',
  'Almacén': 'Warehouse',
  'Almacén no asignado': 'Warehouse not assigned',
  'Aplicacion directa': 'Direct application',
  'Aplicar descuento': 'Apply discount',
  'Aplica descuentos manuales o reglas disponibles para la línea.': 'Apply manual discounts or available rules to the line.',
  'Autorización o referencia': 'Authorization or reference',
  'BAJO': 'LOW',
  'Buscar por nombre o codigo...': 'Search by name or code...',
  'Buscar por nombre, SKU o código': 'Search by name, SKU, or code',
  'Buscar productos': 'Search products',
  'Buscar producto': 'Search product',
  'Caja abierta': 'Register opened',
  'Caja fuerte': 'Safe',
  'Caja lista': 'Register ready',
  'Caja operativa': 'Operating register',
  'Cambio a devolver': 'Change due',
  'Cambio a devolver MXN': 'Change due MXN',
  'Cambio a entregar': 'Change to return',
  'Cambio de billetes': 'Bill exchange',
  'Cambio pendiente': 'Pending change',
  'Captura efectivo recibido y cambio antes de confirmar.': 'Enter cash received and change before confirming.',
  'Captura USD, valida el tipo de cambio y calcula el cambio en MXN.': 'Enter USD, validate the exchange rate, and calculate change in MXN.',
  'Catálogo POS': 'POS catalog',
  'Catálogo de venta': 'Sales catalog',
  'Cerrar apertura de caja': 'Close register opening',
  'Cerrar busqueda de productos': 'Close product search',
  'Cerrar búsqueda': 'Close search',
  'Cerrar cobro': 'Close checkout',
  'Cerrar cobro en dólares': 'Close dollar checkout',
  'Cerrar configuración fiscal': 'Close fiscal settings',
  'Cerrar descuento': 'Close discount',
  'Cerrar devolución': 'Close return',
  'Cerrar movimiento de efectivo': 'Close cash movement',
  'Cerrar pago': 'Close payment',
  'Cerrar pago con tarjeta': 'Close card payment',
  'Cerrar pago mixto': 'Close split payment',
  'Cerrar pago por transferencia': 'Close transfer payment',
  'Cerrar panel lateral': 'Close side panel',
  'Cerrar resumen del corte': 'Close closing summary',
  'Cerrar ticket': 'Close ticket',
  'Cobrar': 'Charge',
  'Cobro': 'Payment',
  'Cobro POS': 'POS checkout',
  'Cobro dividido': 'Split payment',
  'Cobro en curso': 'Payment in progress',
  'Cobro en dólares': 'Dollar payment',
  'Cobro en efectivo': 'Cash payment',
  'Cobro touch': 'Touch checkout',
  'Comprobante POS': 'POS receipt',
  'Completa la venta y despues imprime o envia el ticket.': 'Complete the sale, then print or send the receipt.',
  'Confirma el fondo inicial para habilitar la terminal de venta.': 'Confirm the opening cash fund to enable the sales terminal.',
  'Confirma el reflejo bancario antes de cerrar el ticket.': 'Confirm the bank posting before closing the ticket.',
  'Confirma la autorización de la terminal antes de cerrar la venta.': 'Confirm terminal authorization before closing the sale.',
  'Configura POS para operar': 'Configure POS to operate',
  'Configura el país fiscal, la divisa de venta y el impuesto antes de cobrar.': 'Configure fiscal country, sales currency, and tax before charging.',
  'Configuración POS': 'POS settings',
  'Consulta del turno': 'Shift review',
  'Contexto pendiente': 'Pending context',
  'Contexto de operación': 'Operating context',
  'Corte POS': 'POS closing',
  'Corte y cierre de caja': 'Register count and closing',
  'Crear caja': 'Create register',
  'Cargando punto de venta': 'Loading point of sale',
  'Descartar ticket pausado': 'Discard suspended ticket',
  'Describe el motivo': 'Describe the reason',
  'Descuento a toda la venta': 'Discount entire sale',
  'Devolucion procesada': 'Return processed',
  'Devolución procesada': 'Return processed',
  'Distribuye el total entre efectivo, dólares, tarjeta y transferencia.': 'Split the total across cash, dollars, card, and transfer.',
  'Divisa de venta': 'Sales currency',
  'Divisa del turno': 'Shift currency',
  'Divisa e impuestos': 'Currency and taxes',
  'El cajero está preparando tu forma de pago': 'The cashier is preparing your payment method',
  'El cajero está registrando tu pago en efectivo': 'The cashier is registering your cash payment',
  'El efectivo contado no puede ser negativo.': 'Counted cash cannot be negative.',
  'El efectivo recibido debe cubrir el monto del pago.': 'Cash received must cover the payment amount.',
  'El efectivo recibido debe ser mayor o igual al monto del pago.': 'Cash received must be greater than or equal to the payment amount.',
  'El fondo inicial no puede ser negativo.': 'Opening cash cannot be negative.',
  'El monto pagado no puede ser menor al total.': 'Paid amount cannot be less than the total.',
  'El monto total pagado debe cubrir el total de la venta.': 'Total paid must cover the sale total.',
  'El pago está completo': 'Payment is complete',
  'El pago ya esta completo.': 'Payment is already complete.',
  'El ticket activo se limpio desde POS.': 'The active ticket was cleared from POS.',
  'El total pagado debe ser igual al total de la venta.': 'Paid total must equal the sale total.',
  'Elige un método, agrega pagos y finaliza la venta.': 'Choose a method, add payments, and complete the sale.',
  'Empieza escaneando o tocando un producto.': 'Start by scanning or tapping a product.',
  'Enter para agregar': 'Enter to add',
  'Entrada de efectivo': 'Cash in',
  'Entrégalo únicamente después de finalizar la venta.': 'Hand it over only after completing the sale.',
  'Escanea código de barras...': 'Scan barcode...',
  'Escanea o toca un producto': 'Scan or tap a product',
  'Escanea un producto o recupera un ticket pausado para mantener la caja activa.': 'Scan a product or resume a suspended ticket to keep the register active.',
  'Escaner activo para venta continua': 'Scanner active for continuous selling',
  'Esperando confirmacion...': 'Waiting for confirmation...',
  'Esperando pago': 'Waiting for payment',
  'Estamos leyendo cajas y turnos activos desde POS.': 'Reading registers and active shifts from POS.',
  'Esta regla requiere autorizacion de supervisor antes de cobrar.': 'This rule requires supervisor authorization before charging.',
  'Falta cubrir el total': 'Remaining total not covered',
  'Falta recibir': 'Still due',
  'Finaliza antes de entregar el cambio': 'Complete before returning change',
  'Finalizar venta': 'Complete sale',
  'Finalizar venta y entregar cambio': 'Complete sale and return change',
  'Fiscal configurado': 'Fiscal settings configured',
  'Fondo adicional': 'Additional cash fund',
  'Fondo inicial': 'Opening fund',
  'Frequent retail': 'Frequent retail',
  'Genera una orden de compra antes del siguiente pico. Este producto ya esta en limite de control.': 'Create a purchase order before the next peak. This product is already at its control limit.',
  'Guardando venta...': 'Saving sale...',
  'Identidad comercial no disponible': 'Business identity unavailable',
  'Ingresa el motivo del movimiento.': 'Enter the movement reason.',
  'Ingresa el numero de venta.': 'Enter the sale number.',
  'Ingresa un monto valido.': 'Enter a valid amount.',
  'Inicio de turno': 'Shift start',
  'Ir a almacenes': 'Go to warehouses',
  'La caja seleccionada no tiene un identificador valido.': 'The selected register does not have a valid identifier.',
  'La moneda del movimiento debe coincidir con la moneda del turno.': 'Movement currency must match the shift currency.',
  'La política de crédito bloquea esta venta.': 'The credit policy blocks this sale.',
  'La politica de credito bloquea esta venta.': 'The credit policy blocks this sale.',
  'La venta está lista para finalizar.': 'The sale is ready to complete.',
  'La venta se esta guardando. Espera a que termine el proceso.': 'The sale is being saved. Wait for the process to finish.',
  'Las ventas a credito se administran desde el modulo de Cartera.': 'Credit sales are managed from the Receivables module.',
  'Limpiar': 'Clear',
  'Lista para recibir pago': 'Ready to receive payment',
  'Listo': 'Ready',
  'Listo para cobrar': 'Ready to charge',
  'Listo para completar venta': 'Ready to complete sale',
  'Monto de descuento por unidad': 'Discount amount per unit',
  'Monto fijo': 'Fixed amount',
  'Monto insuficiente': 'Insufficient amount',
  'Movimiento de efectivo': 'Cash movement',
  'Movimiento de stock': 'Stock movement',
  'No fue posible crear la caja POS.': 'The POS register could not be created.',
  'No fue posible preparar la caja del almacén.': 'The warehouse register could not be prepared.',
  'No fue posible preparar una caja activa para los almacenes disponibles.': 'An active register could not be prepared for the available warehouses.',
  'No hay productos en esta categoria': 'No products in this category',
  'No hay productos para esa busqueda': 'No products match this search',
  'No hay turno activo.': 'No active shift.',
  'No hay una caja activa vinculada al almacén seleccionado.': 'No active register is linked to the selected warehouse.',
  'No hay una caja configurada. Crea una caja desde la configuración POS antes de abrir turno.': 'No register is configured. Create a register from POS settings before opening a shift.',
  'No hay una caja valida seleccionada para cobrar.': 'No valid register is selected for charging.',
  'No hay una divisa valida para guardar la venta.': 'No valid currency is available to save the sale.',
  'No se pudo abrir la caja.': 'The register could not be opened.',
  'No se pudo cargar el contexto de punto de venta.': 'The point-of-sale context could not be loaded.',
  'No se pudo cargar el resumen real de cierre.': 'The real closing summary could not be loaded.',
  'No se pudo cerrar el turno.': 'The shift could not be closed.',
  'No se pudo guardar la venta en POS.': 'The sale could not be saved in POS.',
  'No se pudo registrar el movimiento.': 'The movement could not be recorded.',
  'No se pudo registrar el movimiento de efectivo.': 'The cash movement could not be recorded.',
  'No se pudieron cargar los movimientos de efectivo.': 'Cash movements could not be loaded.',
  'Nombre, SKU o código de barras': 'Name, SKU, or barcode',
  'Nota credito': 'Credit note',
  'Número de referencia': 'Reference number',
  'Ocultar catálogo': 'Hide catalog',
  'Operación sensible': 'Sensitive operation',
  'Pago completo': 'Payment complete',
  'Pago exacto': 'Exact payment',
  'Pago exacto agregado. Finaliza la venta para cerrar el cobro.': 'Exact payment added. Complete the sale to close payment.',
  'Pago listo': 'Payment ready',
  'Pago listo para finalizar': 'Payment ready to complete',
  'Pago mixto': 'Split payment',
  'Pago por transferencia': 'Transfer payment',
  'Pagado': 'Paid',
  'Pagos registrados': 'Registered payments',
  'Pantalla': 'Display',
  'Pausar': 'Suspend',
  'Pendiente': 'Pending',
  'Permite ajustar tasa para este ticket.': 'Allows rate adjustment for this ticket.',
  'Por cobrar': 'To collect',
  'Porcentaje de descuento': 'Discount percentage',
  'Preparando la caja predeterminada del almacén…': 'Preparing the warehouse default register...',
  'Primero crea un almacén para poder abrir una caja POS.': 'Create a warehouse first before opening a POS register.',
  'Procesar devolución': 'Process return',
  'Producto agotado': 'Product out of stock',
  'Producto con alta rotacion': 'High-turnover product',
  'Producto no encontrado en el catalogo compartido.': 'Product not found in the shared catalog.',
  'Productos escaneados': 'Scanned products',
  'Quitar pago': 'Remove payment',
  'Recibo POS': 'POS receipt',
  'Referencia de autorización': 'Authorization reference',
  'Referencia de crédito': 'Credit reference',
  'Referencia de transferencia': 'Transfer reference',
  'Registrar efectivo': 'Register cash',
  'Registrar movimiento': 'Record movement',
  'Registrar pago': 'Register payment',
  'Reintentar': 'Retry',
  'Requiere autorizacion': 'Requires authorization',
  'Resumen de cobro': 'Payment summary',
  'Resumen del corte actual': 'Current closing summary',
  'Retiro a caja fuerte': 'Safe drop',
  'Revisar y finalizar': 'Review and complete',
  'Revisa tus productos y total en pantalla': 'Review your products and total on screen',
  'Ritmo de venta arriba': 'Sales pace above baseline',
  'Salida de efectivo': 'Cash out',
  'Selecciona el almacén desde donde se descontará el inventario.': 'Select the warehouse that inventory will be deducted from.',
  'Selecciona el cliente que recibira la venta a credito.': 'Select the customer that will receive the credit sale.',
  'Selecciona un almacén': 'Select a warehouse',
  'Selecciona un almacén para preparar su caja': 'Select a warehouse to prepare its register',
  'Selecciona una caja': 'Select a register',
  'Selecciona una divisa valida para abrir caja.': 'Select a valid currency to open the register.',
  'Sin cajero activo': 'No active cashier',
  'Sin referencia': 'No reference',
  'Sin tickets en espera': 'No suspended tickets',
  'SIN STOCK': 'OUT OF STOCK',
  'Solicita al cliente pasar su tarjeta por la terminal.': 'Ask the customer to tap or insert the card on the terminal.',
  'Stock bajo': 'Low stock',
  'Stock critico': 'Critical stock',
  'Subtotal': 'Subtotal',
  'Tasa fija del pais fiscal.': 'Fixed rate from the fiscal country.',
  'Ticket': 'Ticket',
  'Ticket abierto': 'Open ticket',
  'Ticket actual': 'Current ticket',
  'Ticket de venta': 'Sales receipt',
  'Ticket limpio': 'Ticket cleared',
  'Tickets pausados': 'Suspended tickets',
  'Todavia no hay pagos capturados.': 'No payments captured yet.',
  'Todos los productos': 'All products',
  'Total a cobrar': 'Total due',
  'Transferencia': 'Transfer',
  'Turno abierto': 'Shift open',
  'Ultimos 4 digitos / Autorizacion': 'Last 4 digits / Authorization',
  'Venta': 'Sale',
  'Venta POS': 'POS sale',
  'Venta cancelada': 'Sale cancelled',
  'Venta completada': 'Sale completed',
  'Venta guardada': 'Sale saved',
  'Venta pausada': 'Sale suspended',
  'Venta pausada reanudada': 'Suspended sale resumed',
  'Verifica el cambio antes de cerrar la venta.': 'Verify change before closing the sale.',
  'Verifica el ticket original antes de restaurar el inventario o generar una nota.': 'Verify the original receipt before restoring inventory or issuing a note.',
  'Vista informativa · No cierra ni modifica el turno': 'Informational view · Does not close or modify the shift',
  'Volver a métodos de pago': 'Back to payment methods',
};

const translations: Record<string, LocalizedText> = {
  'Open register': { es: 'Abrir caja', fr: 'Ouvrir la caisse', pt: 'Abrir caixa', ko: '계산대 열기', zh: '打开收银台' },
  'Opening...': { es: 'Abriendo...', fr: 'Ouverture...', pt: 'Abrindo...', ko: '여는 중...', zh: '正在打开...' },
  'Recommended action': { es: 'Acción recomendada', fr: 'Action recommandée', pt: 'Ação recomendada', ko: '권장 조치', zh: '建议操作' },
  'Refresh': { es: 'Actualizar', fr: 'Actualiser', pt: 'Atualizar', ko: '새로 고침', zh: '刷新' },
  'Add Card Payment': { es: 'Agregar pago con tarjeta', fr: 'Ajouter un paiement par carte', pt: 'Adicionar pagamento com cartão', ko: '카드 결제 추가', zh: '添加银行卡付款' },
  'Add Cash Payment': { es: 'Agregar pago en efectivo', fr: 'Ajouter un paiement comptant', pt: 'Adicionar pagamento em dinheiro', ko: '현금 결제 추가', zh: '添加现金付款' },
  'Add Transfer Payment': { es: 'Agregar pago por transferencia', fr: 'Ajouter un virement', pt: 'Adicionar pagamento por transferência', ko: '이체 결제 추가', zh: '添加转账付款' },
  'Add Credit Sale': { es: 'Agregar venta a crédito', fr: 'Ajouter une vente à crédit', pt: 'Adicionar venda a crédito', ko: '외상 판매 추가', zh: '添加赊销' },
  'Add at least one payment before charging.': { es: 'Agrega al menos un pago antes de cobrar.', fr: 'Ajoutez au moins un paiement avant d’encaisser.', pt: 'Adicione pelo menos um pagamento antes de cobrar.', ko: '결제 전에 결제를 하나 이상 추가하세요.', zh: '收款前请至少添加一笔付款。' },
  'Add payment': { es: 'Agregar pago', fr: 'Ajouter un paiement', pt: 'Adicionar pagamento', ko: '결제 추가', zh: '添加付款' },
  'Add exact payment or enter a custom method.': { es: 'Agrega pago exacto o captura un método personalizado.', fr: 'Ajoutez le paiement exact ou saisissez un mode personnalisé.', pt: 'Adicione pagamento exato ou informe um método personalizado.', ko: '정확한 결제를 추가하거나 사용자 지정 방식을 입력하세요.', zh: '添加精确付款或输入自定义方式。' },
  'Add products to the ticket before charging.': { es: 'Agrega productos al ticket antes de cobrar.', fr: 'Ajoutez des produits au ticket avant d’encaisser.', pt: 'Adicione produtos ao ticket antes de cobrar.', ko: '결제 전에 티켓에 상품을 추가하세요.', zh: '收款前请向小票添加商品。' },
  'Add products to the ticket before registering payments.': { es: 'Agrega productos al ticket antes de registrar pagos.', fr: 'Ajoutez des produits au ticket avant d’enregistrer des paiements.', pt: 'Adicione produtos ao ticket antes de registrar pagamentos.', ko: '결제를 등록하기 전에 티켓에 상품을 추가하세요.', zh: '登记付款前请向小票添加商品。' },
  Warehouse: { es: 'Almacén', fr: 'Entrepôt', pt: 'Armazém', ko: '창고', zh: '仓库' },
  'Warehouse not assigned': { es: 'Almacén no asignado', fr: 'Entrepôt non assigné', pt: 'Armazém não atribuído', ko: '배정되지 않은 창고', zh: '未分配仓库' },
  'Direct application': { es: 'Aplicación directa', fr: 'Application directe', pt: 'Aplicação direta', ko: '직접 적용', zh: '直接应用' },
  'Apply discount': { es: 'Aplicar descuento', fr: 'Appliquer une remise', pt: 'Aplicar desconto', ko: '할인 적용', zh: '应用折扣' },
  'Apply manual discounts or available rules to the line.': { es: 'Aplica descuentos manuales o reglas disponibles para la línea.', fr: 'Appliquez des remises manuelles ou des règles disponibles à la ligne.', pt: 'Aplique descontos manuais ou regras disponíveis à linha.', ko: '라인에 수동 할인 또는 사용 가능한 규칙을 적용하세요.', zh: '为该行应用手动折扣或可用规则。' },
  'Authorization or reference': { es: 'Autorización o referencia', fr: 'Autorisation ou référence', pt: 'Autorização ou referência', ko: '승인 또는 참조', zh: '授权或参考' },
  LOW: { es: 'BAJO', fr: 'BAS', pt: 'BAIXO', ko: '낮음', zh: '偏低' },
  'Search by name or code...': { es: 'Buscar por nombre o código...', fr: 'Rechercher par nom ou code...', pt: 'Buscar por nome ou código...', ko: '이름 또는 코드로 검색...', zh: '按名称或代码搜索...' },
  'Search by name, SKU, or code': { es: 'Buscar por nombre, SKU o código', fr: 'Rechercher par nom, SKU ou code', pt: 'Buscar por nome, SKU ou código', ko: '이름, SKU 또는 코드로 검색', zh: '按名称、SKU 或代码搜索' },
  'Search products': { es: 'Buscar productos', fr: 'Rechercher des produits', pt: 'Buscar produtos', ko: '상품 검색', zh: '搜索产品' },
  'Search product': { es: 'Buscar producto', fr: 'Rechercher un produit', pt: 'Buscar produto', ko: '상품 검색', zh: '搜索产品' },
  'Register opened': { es: 'Caja abierta', fr: 'Caisse ouverte', pt: 'Caixa aberta', ko: '계산대 열림', zh: '收银台已打开' },
  Safe: { es: 'Caja fuerte', fr: 'Coffre', pt: 'Cofre', ko: '금고', zh: '保险箱' },
  'Register ready': { es: 'Caja lista', fr: 'Caisse prête', pt: 'Caixa pronta', ko: '계산대 준비됨', zh: '收银台就绪' },
  'Operating register': { es: 'Caja operativa', fr: 'Caisse opérationnelle', pt: 'Caixa operacional', ko: '운영 계산대', zh: '运营收银台' },
  'Change due': { es: 'Cambio a devolver', fr: 'Monnaie à rendre', pt: 'Troco a devolver', ko: '거스름돈', zh: '应找零' },
  'Change due MXN': { es: 'Cambio a devolver MXN', fr: 'Monnaie à rendre MXN', pt: 'Troco a devolver MXN', ko: '거스름돈 MXN', zh: '应找零 MXN' },
  'Change to return': { es: 'Cambio a entregar', fr: 'Monnaie à remettre', pt: 'Troco a entregar', ko: '반환할 거스름돈', zh: '需交付找零' },
  'Bill exchange': { es: 'Cambio de billetes', fr: 'Change de billets', pt: 'Troca de cédulas', ko: '지폐 교환', zh: '纸币兑换' },
  'Pending change': { es: 'Cambio pendiente', fr: 'Monnaie en attente', pt: 'Troco pendente', ko: '대기 중인 거스름돈', zh: '待找零' },
  'Enter cash received and change before confirming.': { es: 'Captura efectivo recibido y cambio antes de confirmar.', fr: 'Saisissez l’argent reçu et la monnaie avant de confirmer.', pt: 'Informe o dinheiro recebido e o troco antes de confirmar.', ko: '확인 전에 받은 현금과 거스름돈을 입력하세요.', zh: '确认前请输入收到的现金和找零。' },
  'Enter USD, validate the exchange rate, and calculate change in MXN.': { es: 'Captura USD, valida el tipo de cambio y calcula el cambio en MXN.', fr: 'Saisissez les USD, validez le taux et calculez la monnaie en MXN.', pt: 'Informe USD, valide a taxa de câmbio e calcule o troco em MXN.', ko: 'USD를 입력하고 환율을 확인한 뒤 MXN 거스름돈을 계산하세요.', zh: '输入 USD，验证汇率并计算 MXN 找零。' },
  'POS catalog': { es: 'Catálogo POS', fr: 'Catalogue PDV', pt: 'Catálogo POS', ko: 'POS 카탈로그', zh: 'POS 目录' },
  'Sales catalog': { es: 'Catálogo de venta', fr: 'Catalogue de vente', pt: 'Catálogo de venda', ko: '판매 카탈로그', zh: '销售目录' },
  'Close register opening': { es: 'Cerrar apertura de caja', fr: 'Fermer l’ouverture de caisse', pt: 'Fechar abertura da caixa', ko: '계산대 열기 닫기', zh: '关闭开台' },
  'Close product search': { es: 'Cerrar búsqueda de productos', fr: 'Fermer la recherche de produits', pt: 'Fechar busca de produtos', ko: '상품 검색 닫기', zh: '关闭产品搜索' },
  'Close search': { es: 'Cerrar búsqueda', fr: 'Fermer la recherche', pt: 'Fechar busca', ko: '검색 닫기', zh: '关闭搜索' },
  'Close checkout': { es: 'Cerrar cobro', fr: 'Fermer l’encaissement', pt: 'Fechar cobrança', ko: '결제 닫기', zh: '关闭收款' },
  'Close dollar checkout': { es: 'Cerrar cobro en dólares', fr: 'Fermer l’encaissement en dollars', pt: 'Fechar cobrança em dólares', ko: '달러 결제 닫기', zh: '关闭美元收款' },
  'Close fiscal settings': { es: 'Cerrar configuración fiscal', fr: 'Fermer la configuration fiscale', pt: 'Fechar configuração fiscal', ko: '세무 설정 닫기', zh: '关闭税务设置' },
  'Close discount': { es: 'Cerrar descuento', fr: 'Fermer la remise', pt: 'Fechar desconto', ko: '할인 닫기', zh: '关闭折扣' },
  'Close return': { es: 'Cerrar devolución', fr: 'Fermer le retour', pt: 'Fechar devolução', ko: '반품 닫기', zh: '关闭退货' },
  'Close cash movement': { es: 'Cerrar movimiento de efectivo', fr: 'Fermer le mouvement de caisse', pt: 'Fechar movimentação de dinheiro', ko: '현금 이동 닫기', zh: '关闭现金变动' },
  'Close payment': { es: 'Cerrar pago', fr: 'Fermer le paiement', pt: 'Fechar pagamento', ko: '결제 닫기', zh: '关闭付款' },
  'Close card payment': { es: 'Cerrar pago con tarjeta', fr: 'Fermer le paiement par carte', pt: 'Fechar pagamento com cartão', ko: '카드 결제 닫기', zh: '关闭银行卡付款' },
  'Close split payment': { es: 'Cerrar pago mixto', fr: 'Fermer le paiement fractionné', pt: 'Fechar pagamento misto', ko: '분할 결제 닫기', zh: '关闭组合付款' },
  'Close transfer payment': { es: 'Cerrar pago por transferencia', fr: 'Fermer le virement', pt: 'Fechar pagamento por transferência', ko: '이체 결제 닫기', zh: '关闭转账付款' },
  'Close side panel': { es: 'Cerrar panel lateral', fr: 'Fermer le panneau latéral', pt: 'Fechar painel lateral', ko: '사이드 패널 닫기', zh: '关闭侧边栏' },
  'Close closing summary': { es: 'Cerrar resumen del corte', fr: 'Fermer le résumé de fermeture', pt: 'Fechar resumo do fechamento', ko: '마감 요약 닫기', zh: '关闭结算摘要' },
  'Close ticket': { es: 'Cerrar ticket', fr: 'Fermer le ticket', pt: 'Fechar ticket', ko: '티켓 닫기', zh: '关闭小票' },
  Charge: { es: 'Cobrar', fr: 'Encaisser', pt: 'Cobrar', ko: '결제', zh: '收款' },
  Payment: { es: 'Cobro', fr: 'Encaissement', pt: 'Cobrança', ko: '결제', zh: '收款' },
  'POS checkout': { es: 'Cobro POS', fr: 'Encaissement PDV', pt: 'Cobrança POS', ko: 'POS 결제', zh: 'POS 收款' },
  'Split payment': { es: 'Cobro dividido', fr: 'Paiement fractionné', pt: 'Pagamento dividido', ko: '분할 결제', zh: '拆分付款' },
  'Payment in progress': { es: 'Cobro en curso', fr: 'Encaissement en cours', pt: 'Cobrança em andamento', ko: '결제 진행 중', zh: '收款进行中' },
  'Dollar payment': { es: 'Cobro en dólares', fr: 'Paiement en dollars', pt: 'Cobrança em dólares', ko: '달러 결제', zh: '美元付款' },
  'Cash payment': { es: 'Cobro en efectivo', fr: 'Paiement comptant', pt: 'Pagamento em dinheiro', ko: '현금 결제', zh: '现金付款' },
  'Touch checkout': { es: 'Cobro touch', fr: 'Encaissement tactile', pt: 'Cobrança touch', ko: '터치 결제', zh: '触控收款' },
  'POS receipt': { es: 'Comprobante POS', fr: 'Reçu PDV', pt: 'Comprovante POS', ko: 'POS 영수증', zh: 'POS 凭证' },
  'Complete the sale, then print or send the receipt.': { es: 'Completa la venta y después imprime o envía el ticket.', fr: 'Terminez la vente, puis imprimez ou envoyez le reçu.', pt: 'Conclua a venda e depois imprima ou envie o recibo.', ko: '판매를 완료한 뒤 영수증을 인쇄하거나 보내세요.', zh: '完成销售后打印或发送小票。' },
  'Confirm the opening cash fund to enable the sales terminal.': { es: 'Confirma el fondo inicial para habilitar la terminal de venta.', fr: 'Confirmez le fonds initial pour activer le terminal de vente.', pt: 'Confirme o fundo inicial para habilitar o terminal de venda.', ko: '판매 터미널을 활성화하려면 시재금을 확인하세요.', zh: '确认开台备用金以启用销售终端。' },
  'Confirm the bank posting before closing the ticket.': { es: 'Confirma el reflejo bancario antes de cerrar el ticket.', fr: 'Confirmez l’inscription bancaire avant de fermer le ticket.', pt: 'Confirme o lançamento bancário antes de fechar o ticket.', ko: '티켓을 닫기 전에 은행 반영을 확인하세요.', zh: '关闭小票前确认银行入账。' },
  'Confirm terminal authorization before closing the sale.': { es: 'Confirma la autorización de la terminal antes de cerrar la venta.', fr: 'Confirmez l’autorisation du terminal avant de fermer la vente.', pt: 'Confirme a autorização do terminal antes de fechar a venda.', ko: '판매를 닫기 전에 단말기 승인을 확인하세요.', zh: '关闭销售前确认终端授权。' },
  'Configure POS to operate': { es: 'Configura POS para operar', fr: 'Configurer le PDV pour opérer', pt: 'Configure o POS para operar', ko: 'POS 운영 설정', zh: '配置 POS 以开始运营' },
  'Configure fiscal country, sales currency, and tax before charging.': { es: 'Configura el país fiscal, la divisa de venta y el impuesto antes de cobrar.', fr: 'Configurez le pays fiscal, la devise de vente et la taxe avant d’encaisser.', pt: 'Configure o país fiscal, a moeda de venda e o imposto antes de cobrar.', ko: '결제 전에 세무 국가, 판매 통화 및 세금을 설정하세요.', zh: '收款前配置税务国家、销售币种和税费。' },
  'POS settings': { es: 'Configuración POS', fr: 'Configuration PDV', pt: 'Configuração POS', ko: 'POS 설정', zh: 'POS 设置' },
  'Shift review': { es: 'Consulta del turno', fr: 'Consultation du quart', pt: 'Consulta do turno', ko: '교대 조회', zh: '班次查看' },
  'Pending context': { es: 'Contexto pendiente', fr: 'Contexte en attente', pt: 'Contexto pendente', ko: '대기 중인 컨텍스트', zh: '上下文待定' },
  'Operating context': { es: 'Contexto de operación', fr: 'Contexte opérationnel', pt: 'Contexto operacional', ko: '운영 컨텍스트', zh: '运营上下文' },
  'POS closing': { es: 'Corte POS', fr: 'Fermeture PDV', pt: 'Fechamento POS', ko: 'POS 마감', zh: 'POS 结算' },
  'Register count and closing': { es: 'Corte y cierre de caja', fr: 'Comptage et fermeture de caisse', pt: 'Contagem e fechamento de caixa', ko: '계산대 정산 및 마감', zh: '收银台盘点与结算' },
  'Create register': { es: 'Crear caja', fr: 'Créer une caisse', pt: 'Criar caixa', ko: '계산대 생성', zh: '创建收银台' },
  'Loading point of sale': { es: 'Cargando punto de venta', fr: 'Chargement du point de vente', pt: 'Carregando ponto de venda', ko: 'POS 로딩 중', zh: '正在加载销售点' },
  'Discard suspended ticket': { es: 'Descartar ticket pausado', fr: 'Supprimer le ticket suspendu', pt: 'Descartar ticket pausado', ko: '보류 티켓 삭제', zh: '丢弃暂停小票' },
  'Describe the reason': { es: 'Describe el motivo', fr: 'Décrivez le motif', pt: 'Descreva o motivo', ko: '사유 설명', zh: '描述原因' },
  'Discount entire sale': { es: 'Descuento a toda la venta', fr: 'Remise sur toute la vente', pt: 'Desconto em toda a venda', ko: '전체 판매 할인', zh: '整单折扣' },
  'Return processed': { es: 'Devolución procesada', fr: 'Retour traité', pt: 'Devolução processada', ko: '반품 처리됨', zh: '退货已处理' },
  'Split the total across cash, dollars, card, and transfer.': { es: 'Distribuye el total entre efectivo, dólares, tarjeta y transferencia.', fr: 'Répartissez le total entre comptant, dollars, carte et virement.', pt: 'Distribua o total entre dinheiro, dólares, cartão e transferência.', ko: '총액을 현금, 달러, 카드 및 이체로 나누세요.', zh: '将总额分配到现金、美元、银行卡和转账。' },
  'Sales currency': { es: 'Divisa de venta', fr: 'Devise de vente', pt: 'Moeda de venda', ko: '판매 통화', zh: '销售币种' },
  'Shift currency': { es: 'Divisa del turno', fr: 'Devise du quart', pt: 'Moeda do turno', ko: '교대 통화', zh: '班次币种' },
  'Currency and taxes': { es: 'Divisa e impuestos', fr: 'Devise et taxes', pt: 'Moeda e impostos', ko: '통화 및 세금', zh: '币种和税费' },
  'The cashier is preparing your payment method': { es: 'El cajero está preparando tu forma de pago', fr: 'Le caissier prépare votre mode de paiement', pt: 'O caixa está preparando sua forma de pagamento', ko: '계산원이 결제 방법을 준비하고 있습니다', zh: '收银员正在准备您的付款方式' },
  'The cashier is registering your cash payment': { es: 'El cajero está registrando tu pago en efectivo', fr: 'Le caissier enregistre votre paiement comptant', pt: 'O caixa está registrando seu pagamento em dinheiro', ko: '계산원이 현금 결제를 등록하고 있습니다', zh: '收银员正在登记您的现金付款' },
  'Counted cash cannot be negative.': { es: 'El efectivo contado no puede ser negativo.', fr: 'Le comptant compté ne peut pas être négatif.', pt: 'O dinheiro contado não pode ser negativo.', ko: '집계한 현금은 음수일 수 없습니다.', zh: '清点现金不能为负数。' },
  'Cash received must cover the payment amount.': { es: 'El efectivo recibido debe cubrir el monto del pago.', fr: 'Le comptant reçu doit couvrir le montant du paiement.', pt: 'O dinheiro recebido deve cobrir o valor do pagamento.', ko: '받은 현금은 결제 금액 이상이어야 합니다.', zh: '收到的现金必须覆盖付款金额。' },
  'Cash received must be greater than or equal to the payment amount.': { es: 'El efectivo recibido debe ser mayor o igual al monto del pago.', fr: 'Le comptant reçu doit être supérieur ou égal au paiement.', pt: 'O dinheiro recebido deve ser maior ou igual ao valor do pagamento.', ko: '받은 현금은 결제 금액 이상이어야 합니다.', zh: '收到的现金必须大于或等于付款金额。' },
  'Opening cash cannot be negative.': { es: 'El fondo inicial no puede ser negativo.', fr: 'Le fonds initial ne peut pas être négatif.', pt: 'O fundo inicial não pode ser negativo.', ko: '시재금은 음수일 수 없습니다.', zh: '开台备用金不能为负数。' },
  'Paid amount cannot be less than the total.': { es: 'El monto pagado no puede ser menor al total.', fr: 'Le montant payé ne peut pas être inférieur au total.', pt: 'O valor pago não pode ser menor que o total.', ko: '지불 금액은 총액보다 작을 수 없습니다.', zh: '付款金额不能小于总额。' },
  'Total paid must cover the sale total.': { es: 'El monto total pagado debe cubrir el total de la venta.', fr: 'Le total payé doit couvrir le total de la vente.', pt: 'O total pago deve cobrir o total da venda.', ko: '총 결제 금액은 판매 총액을 충당해야 합니다.', zh: '已付总额必须覆盖销售总额。' },
  'Payment is complete': { es: 'El pago está completo', fr: 'Le paiement est complet', pt: 'O pagamento está completo', ko: '결제 완료', zh: '付款已完成' },
  'Payment is already complete.': { es: 'El pago ya está completo.', fr: 'Le paiement est déjà complet.', pt: 'O pagamento já está completo.', ko: '결제가 이미 완료되었습니다.', zh: '付款已经完成。' },
  'The active ticket was cleared from POS.': { es: 'El ticket activo se limpió desde POS.', fr: 'Le ticket actif a été vidé depuis le PDV.', pt: 'O ticket ativo foi limpo no POS.', ko: '활성 티켓이 POS에서 비워졌습니다.', zh: '当前小票已从 POS 清空。' },
  'Paid total must equal the sale total.': { es: 'El total pagado debe ser igual al total de la venta.', fr: 'Le total payé doit être égal au total de la vente.', pt: 'O total pago deve ser igual ao total da venda.', ko: '결제 총액은 판매 총액과 같아야 합니다.', zh: '已付总额必须等于销售总额。' },
  'Choose a method, add payments, and complete the sale.': { es: 'Elige un método, agrega pagos y finaliza la venta.', fr: 'Choisissez un mode, ajoutez les paiements et terminez la vente.', pt: 'Escolha um método, adicione pagamentos e conclua a venda.', ko: '방법을 선택하고 결제를 추가한 뒤 판매를 완료하세요.', zh: '选择方式，添加付款并完成销售。' },
  'Start by scanning or tapping a product.': { es: 'Empieza escaneando o tocando un producto.', fr: 'Commencez par balayer ou toucher un produit.', pt: 'Comece escaneando ou tocando um produto.', ko: '상품을 스캔하거나 탭하여 시작하세요.', zh: '先扫描或点击一个产品。' },
  'Enter to add': { es: 'Enter para agregar', fr: 'Entrée pour ajouter', pt: 'Enter para adicionar', ko: 'Enter로 추가', zh: '按 Enter 添加' },
  'Cash in': { es: 'Entrada de efectivo', fr: 'Entrée de caisse', pt: 'Entrada de dinheiro', ko: '현금 입금', zh: '现金收入' },
  'Hand it over only after completing the sale.': { es: 'Entrégalo únicamente después de finalizar la venta.', fr: 'Remettez-le seulement après avoir terminé la vente.', pt: 'Entregue somente depois de concluir a venda.', ko: '판매 완료 후에만 전달하세요.', zh: '仅在完成销售后交付。' },
  'Scan barcode...': { es: 'Escanea código de barras...', fr: 'Balayez le code-barres...', pt: 'Escaneie o código de barras...', ko: '바코드 스캔...', zh: '扫描条形码...' },
  'Scan or tap a product': { es: 'Escanea o toca un producto', fr: 'Balayez ou touchez un produit', pt: 'Escaneie ou toque em um produto', ko: '상품을 스캔하거나 탭하세요', zh: '扫描或点击产品' },
  'Scanner active for continuous selling': { es: 'Escáner activo para venta continua', fr: 'Lecteur actif pour vente continue', pt: 'Scanner ativo para venda contínua', ko: '연속 판매 스캐너 활성', zh: '连续销售扫描器已启用' },
  'Waiting for confirmation...': { es: 'Esperando confirmación...', fr: 'En attente de confirmation...', pt: 'Aguardando confirmação...', ko: '확인 대기 중...', zh: '正在等待确认...' },
  'Waiting for payment': { es: 'Esperando pago', fr: 'En attente de paiement', pt: 'Aguardando pagamento', ko: '결제 대기 중', zh: '等待付款' },
  'Reading registers and active shifts from POS.': { es: 'Estamos leyendo cajas y turnos activos desde POS.', fr: 'Lecture des caisses et des quarts actifs depuis le PDV.', pt: 'Lendo caixas e turnos ativos do POS.', ko: 'POS에서 계산대와 활성 교대를 읽고 있습니다.', zh: '正在从 POS 读取收银台和活动班次。' },
  'This rule requires supervisor authorization before charging.': { es: 'Esta regla requiere autorización de supervisor antes de cobrar.', fr: 'Cette règle exige l’autorisation d’un superviseur avant l’encaissement.', pt: 'Esta regra exige autorização do supervisor antes de cobrar.', ko: '이 규칙은 결제 전 감독자 승인이 필요합니다.', zh: '此规则要求收款前获得主管授权。' },
  'Remaining total not covered': { es: 'Falta cubrir el total', fr: 'Le total n’est pas couvert', pt: 'Falta cobrir o total', ko: '총액이 아직 부족합니다', zh: '总额尚未覆盖' },
  'Still due': { es: 'Falta recibir', fr: 'Reste à recevoir', pt: 'Falta receber', ko: '아직 받을 금액', zh: '仍需收取' },
  'Complete before returning change': { es: 'Finaliza antes de entregar el cambio', fr: 'Terminez avant de rendre la monnaie', pt: 'Finalize antes de entregar o troco', ko: '거스름돈 전달 전 완료하세요', zh: '找零前请先完成' },
  'Complete sale': { es: 'Finalizar venta', fr: 'Terminer la vente', pt: 'Finalizar venda', ko: '판매 완료', zh: '完成销售' },
  'Complete sale and return change': { es: 'Finalizar venta y entregar cambio', fr: 'Terminer la vente et rendre la monnaie', pt: 'Finalizar venda e entregar troco', ko: '판매 완료 및 거스름돈 전달', zh: '完成销售并找零' },
  'Fiscal settings configured': { es: 'Fiscal configurado', fr: 'Paramètres fiscaux configurés', pt: 'Fiscal configurado', ko: '세무 설정 완료', zh: '税务设置已配置' },
  'Additional cash fund': { es: 'Fondo adicional', fr: 'Fonds additionnel', pt: 'Fundo adicional', ko: '추가 시재금', zh: '额外备用金' },
  'Opening fund': { es: 'Fondo inicial', fr: 'Fonds initial', pt: 'Fundo inicial', ko: '시재금', zh: '开台备用金' },
  'Create a purchase order before the next peak. This product is already at its control limit.': { es: 'Genera una orden de compra antes del siguiente pico. Este producto ya está en límite de control.', fr: 'Créez un bon de commande avant le prochain pic. Ce produit est déjà à sa limite de contrôle.', pt: 'Gere uma ordem de compra antes do próximo pico. Este produto já está no limite de controle.', ko: '다음 피크 전에 구매 주문을 생성하세요. 이 상품은 이미 관리 한계에 도달했습니다.', zh: '请在下一次高峰前创建采购订单。该产品已达到控制限值。' },
  'Saving sale...': { es: 'Guardando venta...', fr: 'Enregistrement de la vente...', pt: 'Salvando venda...', ko: '판매 저장 중...', zh: '正在保存销售...' },
  'Business identity unavailable': { es: 'Identidad comercial no disponible', fr: 'Identité commerciale non disponible', pt: 'Identidade comercial indisponível', ko: '사업자 정보 없음', zh: '商业身份不可用' },
  'Enter the movement reason.': { es: 'Ingresa el motivo del movimiento.', fr: 'Saisissez le motif du mouvement.', pt: 'Informe o motivo da movimentação.', ko: '이동 사유를 입력하세요.', zh: '请输入变动原因。' },
  'Enter the sale number.': { es: 'Ingresa el número de venta.', fr: 'Saisissez le numéro de vente.', pt: 'Informe o número da venda.', ko: '판매 번호를 입력하세요.', zh: '请输入销售编号。' },
  'Enter a valid amount.': { es: 'Ingresa un monto válido.', fr: 'Saisissez un montant valide.', pt: 'Informe um valor válido.', ko: '올바른 금액을 입력하세요.', zh: '请输入有效金额。' },
  'Shift start': { es: 'Inicio de turno', fr: 'Début de quart', pt: 'Início do turno', ko: '교대 시작', zh: '班次开始' },
  'Go to warehouses': { es: 'Ir a almacenes', fr: 'Aller aux entrepôts', pt: 'Ir para armazéns', ko: '창고로 이동', zh: '前往仓库' },
  'The selected register does not have a valid identifier.': { es: 'La caja seleccionada no tiene un identificador válido.', fr: 'La caisse sélectionnée n’a pas d’identifiant valide.', pt: 'A caixa selecionada não tem um identificador válido.', ko: '선택한 계산대에 유효한 식별자가 없습니다.', zh: '所选收银台没有有效标识。' },
  'Movement currency must match the shift currency.': { es: 'La moneda del movimiento debe coincidir con la moneda del turno.', fr: 'La devise du mouvement doit correspondre à celle du quart.', pt: 'A moeda da movimentação deve coincidir com a moeda do turno.', ko: '이동 통화는 교대 통화와 일치해야 합니다.', zh: '变动币种必须与班次币种一致。' },
  'The credit policy blocks this sale.': { es: 'La política de crédito bloquea esta venta.', fr: 'La politique de crédit bloque cette vente.', pt: 'A política de crédito bloqueia esta venda.', ko: '신용 정책이 이 판매를 차단합니다.', zh: '信用政策阻止此销售。' },
  'The sale is ready to complete.': { es: 'La venta está lista para finalizar.', fr: 'La vente est prête à être terminée.', pt: 'A venda está pronta para finalizar.', ko: '판매를 완료할 준비가 되었습니다.', zh: '销售已准备完成。' },
  'The sale is being saved. Wait for the process to finish.': { es: 'La venta se está guardando. Espera a que termine el proceso.', fr: 'La vente est en cours d’enregistrement. Attendez la fin du processus.', pt: 'A venda está sendo salva. Aguarde o processo terminar.', ko: '판매를 저장 중입니다. 프로세스가 끝날 때까지 기다리세요.', zh: '销售正在保存。请等待流程完成。' },
  'Credit sales are managed from the Receivables module.': { es: 'Las ventas a crédito se administran desde el módulo de Cartera.', fr: 'Les ventes à crédit sont gérées depuis le module Comptes clients.', pt: 'Vendas a crédito são administradas no módulo de Contas a Receber.', ko: '외상 판매는 미수금 모듈에서 관리됩니다.', zh: '赊销由应收账款模块管理。' },
  Clear: { es: 'Limpiar', fr: 'Effacer', pt: 'Limpar', ko: '지우기', zh: '清除' },
  'Ready to receive payment': { es: 'Lista para recibir pago', fr: 'Prêt à recevoir le paiement', pt: 'Pronta para receber pagamento', ko: '결제 수신 준비됨', zh: '已准备收款' },
  Ready: { es: 'Listo', fr: 'Prêt', pt: 'Pronto', ko: '준비됨', zh: '就绪' },
  'Ready to charge': { es: 'Listo para cobrar', fr: 'Prêt à encaisser', pt: 'Pronto para cobrar', ko: '결제 준비됨', zh: '准备收款' },
  'Ready to complete sale': { es: 'Listo para completar venta', fr: 'Prêt à terminer la vente', pt: 'Pronto para concluir a venda', ko: '판매 완료 준비됨', zh: '准备完成销售' },
  'Discount amount per unit': { es: 'Monto de descuento por unidad', fr: 'Montant de remise par unité', pt: 'Valor do desconto por unidade', ko: '단위당 할인 금액', zh: '每单位折扣金额' },
  'Fixed amount': { es: 'Monto fijo', fr: 'Montant fixe', pt: 'Valor fixo', ko: '고정 금액', zh: '固定金额' },
  'Insufficient amount': { es: 'Monto insuficiente', fr: 'Montant insuffisant', pt: 'Valor insuficiente', ko: '금액 부족', zh: '金额不足' },
  'Cash movement': { es: 'Movimiento de efectivo', fr: 'Mouvement de caisse', pt: 'Movimentação de dinheiro', ko: '현금 이동', zh: '现金变动' },
  'Stock movement': { es: 'Movimiento de stock', fr: 'Mouvement de stock', pt: 'Movimentação de estoque', ko: '재고 이동', zh: '库存变动' },
  'The POS register could not be created.': { es: 'No fue posible crear la caja POS.', fr: 'Impossible de créer la caisse PDV.', pt: 'Não foi possível criar a caixa POS.', ko: 'POS 계산대를 만들 수 없습니다.', zh: '无法创建 POS 收银台。' },
  'The warehouse register could not be prepared.': { es: 'No fue posible preparar la caja del almacén.', fr: 'Impossible de préparer la caisse de l’entrepôt.', pt: 'Não foi possível preparar a caixa do armazém.', ko: '창고 계산대를 준비할 수 없습니다.', zh: '无法准备仓库收银台。' },
  'An active register could not be prepared for the available warehouses.': { es: 'No fue posible preparar una caja activa para los almacenes disponibles.', fr: 'Impossible de préparer une caisse active pour les entrepôts disponibles.', pt: 'Não foi possível preparar uma caixa ativa para os armazéns disponíveis.', ko: '사용 가능한 창고에 활성 계산대를 준비할 수 없습니다.', zh: '无法为可用仓库准备活动收银台。' },
  'No products in this category': { es: 'No hay productos en esta categoría', fr: 'Aucun produit dans cette catégorie', pt: 'Não há produtos nesta categoria', ko: '이 카테고리에 상품이 없습니다', zh: '此类别没有产品' },
  'No products match this search': { es: 'No hay productos para esa búsqueda', fr: 'Aucun produit ne correspond à cette recherche', pt: 'Nenhum produto corresponde a essa busca', ko: '검색과 일치하는 상품이 없습니다', zh: '没有符合搜索条件的产品' },
  'No active shift.': { es: 'No hay turno activo.', fr: 'Aucun quart actif.', pt: 'Não há turno ativo.', ko: '활성 교대가 없습니다.', zh: '没有活动班次。' },
  'No active register is linked to the selected warehouse.': { es: 'No hay una caja activa vinculada al almacén seleccionado.', fr: 'Aucune caisse active n’est liée à l’entrepôt sélectionné.', pt: 'Não há caixa ativa vinculada ao armazém selecionado.', ko: '선택한 창고에 연결된 활성 계산대가 없습니다.', zh: '所选仓库没有关联的活动收银台。' },
  'No register is configured. Create a register from POS settings before opening a shift.': { es: 'No hay una caja configurada. Crea una caja desde la configuración POS antes de abrir turno.', fr: 'Aucune caisse n’est configurée. Créez une caisse depuis la configuration PDV avant d’ouvrir un quart.', pt: 'Nenhuma caixa está configurada. Crie uma caixa na configuração POS antes de abrir o turno.', ko: '설정된 계산대가 없습니다. 교대를 열기 전에 POS 설정에서 계산대를 생성하세요.', zh: '尚未配置收银台。开班前请在 POS 设置中创建收银台。' },
  'No valid register is selected for charging.': { es: 'No hay una caja válida seleccionada para cobrar.', fr: 'Aucune caisse valide n’est sélectionnée pour encaisser.', pt: 'Nenhuma caixa válida está selecionada para cobrar.', ko: '결제할 유효한 계산대가 선택되지 않았습니다.', zh: '未选择有效收银台进行收款。' },
  'No valid currency is available to save the sale.': { es: 'No hay una divisa válida para guardar la venta.', fr: 'Aucune devise valide n’est disponible pour enregistrer la vente.', pt: 'Não há moeda válida para salvar a venda.', ko: '판매 저장에 사용할 유효한 통화가 없습니다.', zh: '没有有效币种可保存销售。' },
  'The register could not be opened.': { es: 'No se pudo abrir la caja.', fr: 'Impossible d’ouvrir la caisse.', pt: 'Não foi possível abrir a caixa.', ko: '계산대를 열 수 없습니다.', zh: '无法打开收银台。' },
  'The point-of-sale context could not be loaded.': { es: 'No se pudo cargar el contexto de punto de venta.', fr: 'Impossible de charger le contexte du point de vente.', pt: 'Não foi possível carregar o contexto do ponto de venda.', ko: 'POS 컨텍스트를 로드할 수 없습니다.', zh: '无法加载销售点上下文。' },
  'The real closing summary could not be loaded.': { es: 'No se pudo cargar el resumen real de cierre.', fr: 'Impossible de charger le résumé réel de fermeture.', pt: 'Não foi possível carregar o resumo real de fechamento.', ko: '실제 마감 요약을 로드할 수 없습니다.', zh: '无法加载实际结算摘要。' },
  'The shift could not be closed.': { es: 'No se pudo cerrar el turno.', fr: 'Impossible de fermer le quart.', pt: 'Não foi possível fechar o turno.', ko: '교대를 닫을 수 없습니다.', zh: '无法关闭班次。' },
  'The sale could not be saved in POS.': { es: 'No se pudo guardar la venta en POS.', fr: 'Impossible d’enregistrer la vente dans le PDV.', pt: 'Não foi possível salvar a venda no POS.', ko: 'POS에 판매를 저장할 수 없습니다.', zh: '无法在 POS 中保存销售。' },
  'The movement could not be recorded.': { es: 'No se pudo registrar el movimiento.', fr: 'Impossible d’enregistrer le mouvement.', pt: 'Não foi possível registrar a movimentação.', ko: '이동을 기록할 수 없습니다.', zh: '无法记录变动。' },
  'The cash movement could not be recorded.': { es: 'No se pudo registrar el movimiento de efectivo.', fr: 'Impossible d’enregistrer le mouvement de caisse.', pt: 'Não foi possível registrar a movimentação de dinheiro.', ko: '현금 이동을 기록할 수 없습니다.', zh: '无法记录现金变动。' },
  'Cash movements could not be loaded.': { es: 'No se pudieron cargar los movimientos de efectivo.', fr: 'Impossible de charger les mouvements de caisse.', pt: 'Não foi possível carregar as movimentações de dinheiro.', ko: '현금 이동을 로드할 수 없습니다.', zh: '无法加载现金变动。' },
  'Name, SKU, or barcode': { es: 'Nombre, SKU o código de barras', fr: 'Nom, SKU ou code-barres', pt: 'Nome, SKU ou código de barras', ko: '이름, SKU 또는 바코드', zh: '名称、SKU 或条形码' },
  'Credit note': { es: 'Nota crédito', fr: 'Note de crédit', pt: 'Nota de crédito', ko: '대변 메모', zh: '贷项通知' },
  'Reference number': { es: 'Número de referencia', fr: 'Numéro de référence', pt: 'Número de referência', ko: '참조 번호', zh: '参考编号' },
  'Hide catalog': { es: 'Ocultar catálogo', fr: 'Masquer le catalogue', pt: 'Ocultar catálogo', ko: '카탈로그 숨기기', zh: '隐藏目录' },
  'Sensitive operation': { es: 'Operación sensible', fr: 'Opération sensible', pt: 'Operação sensível', ko: '민감한 작업', zh: '敏感操作' },
  'Payment complete': { es: 'Pago completo', fr: 'Paiement complet', pt: 'Pagamento completo', ko: '결제 완료', zh: '付款完成' },
  'Exact payment': { es: 'Pago exacto', fr: 'Paiement exact', pt: 'Pagamento exato', ko: '정확한 결제', zh: '精确付款' },
  'Exact payment added. Complete the sale to close payment.': { es: 'Pago exacto agregado. Finaliza la venta para cerrar el cobro.', fr: 'Paiement exact ajouté. Terminez la vente pour fermer l’encaissement.', pt: 'Pagamento exato adicionado. Finalize a venda para fechar a cobrança.', ko: '정확한 결제가 추가되었습니다. 결제를 닫으려면 판매를 완료하세요.', zh: '已添加精确付款。完成销售以关闭收款。' },
  'Payment ready': { es: 'Pago listo', fr: 'Paiement prêt', pt: 'Pagamento pronto', ko: '결제 준비됨', zh: '付款就绪' },
  'Payment ready to complete': { es: 'Pago listo para finalizar', fr: 'Paiement prêt à finaliser', pt: 'Pagamento pronto para finalizar', ko: '완료할 결제 준비됨', zh: '付款准备完成' },
  'Transfer payment': { es: 'Pago por transferencia', fr: 'Paiement par virement', pt: 'Pagamento por transferência', ko: '이체 결제', zh: '转账付款' },
  Paid: { es: 'Pagado', fr: 'Payé', pt: 'Pago', ko: '결제됨', zh: '已付' },
  'Registered payments': { es: 'Pagos registrados', fr: 'Paiements enregistrés', pt: 'Pagamentos registrados', ko: '등록된 결제', zh: '已登记付款' },
  Display: { es: 'Pantalla', fr: 'Écran', pt: 'Tela', ko: '화면', zh: '显示屏' },
  Suspend: { es: 'Pausar', fr: 'Suspendre', pt: 'Pausar', ko: '보류', zh: '暂停' },
  Pending: { es: 'Pendiente', fr: 'En attente', pt: 'Pendente', ko: '대기 중', zh: '待处理' },
  'Allows rate adjustment for this ticket.': { es: 'Permite ajustar tasa para este ticket.', fr: 'Permet d’ajuster le taux pour ce ticket.', pt: 'Permite ajustar a taxa para este ticket.', ko: '이 티켓의 세율을 조정할 수 있습니다.', zh: '允许为此小票调整税率。' },
  'To collect': { es: 'Por cobrar', fr: 'À encaisser', pt: 'A cobrar', ko: '수금 예정', zh: '待收款' },
  'Discount percentage': { es: 'Porcentaje de descuento', fr: 'Pourcentage de remise', pt: 'Percentual de desconto', ko: '할인율', zh: '折扣百分比' },
  'Preparing the warehouse default register...': { es: 'Preparando la caja predeterminada del almacén...', fr: 'Préparation de la caisse par défaut de l’entrepôt...', pt: 'Preparando a caixa padrão do armazém...', ko: '창고 기본 계산대를 준비 중...', zh: '正在准备仓库默认收银台...' },
  'Create a warehouse first before opening a POS register.': { es: 'Primero crea un almacén para poder abrir una caja POS.', fr: 'Créez d’abord un entrepôt pour ouvrir une caisse PDV.', pt: 'Primeiro crie um armazém para abrir uma caixa POS.', ko: 'POS 계산대를 열기 전에 먼저 창고를 생성하세요.', zh: '打开 POS 收银台前请先创建仓库。' },
  'Process return': { es: 'Procesar devolución', fr: 'Traiter le retour', pt: 'Processar devolução', ko: '반품 처리', zh: '处理退货' },
  'Product out of stock': { es: 'Producto agotado', fr: 'Produit épuisé', pt: 'Produto esgotado', ko: '상품 품절', zh: '产品缺货' },
  'High-turnover product': { es: 'Producto con alta rotación', fr: 'Produit à forte rotation', pt: 'Produto com alta rotação', ko: '회전율 높은 상품', zh: '高周转产品' },
  'Product not found in the shared catalog.': { es: 'Producto no encontrado en el catálogo compartido.', fr: 'Produit introuvable dans le catalogue partagé.', pt: 'Produto não encontrado no catálogo compartilhado.', ko: '공유 카탈로그에서 상품을 찾을 수 없습니다.', zh: '共享目录中未找到产品。' },
  'Scanned products': { es: 'Productos escaneados', fr: 'Produits balayés', pt: 'Produtos escaneados', ko: '스캔한 상품', zh: '已扫描产品' },
  'Remove payment': { es: 'Quitar pago', fr: 'Retirer le paiement', pt: 'Remover pagamento', ko: '결제 제거', zh: '移除付款' },
  'Authorization reference': { es: 'Referencia de autorización', fr: 'Référence d’autorisation', pt: 'Referência de autorização', ko: '승인 참조', zh: '授权参考' },
  'Credit reference': { es: 'Referencia de crédito', fr: 'Référence de crédit', pt: 'Referência de crédito', ko: '신용 참조', zh: '信用参考' },
  'Transfer reference': { es: 'Referencia de transferencia', fr: 'Référence de virement', pt: 'Referência de transferência', ko: '이체 참조', zh: '转账参考' },
  'Register cash': { es: 'Registrar efectivo', fr: 'Enregistrer le comptant', pt: 'Registrar dinheiro', ko: '현금 등록', zh: '登记现金' },
  'Record movement': { es: 'Registrar movimiento', fr: 'Enregistrer le mouvement', pt: 'Registrar movimentação', ko: '이동 기록', zh: '记录变动' },
  'Register payment': { es: 'Registrar pago', fr: 'Enregistrer le paiement', pt: 'Registrar pagamento', ko: '결제 등록', zh: '登记付款' },
  Retry: { es: 'Reintentar', fr: 'Réessayer', pt: 'Tentar novamente', ko: '다시 시도', zh: '重试' },
  'Requires authorization': { es: 'Requiere autorización', fr: 'Autorisation requise', pt: 'Requer autorização', ko: '승인 필요', zh: '需要授权' },
  'Payment summary': { es: 'Resumen de cobro', fr: 'Résumé d’encaissement', pt: 'Resumo da cobrança', ko: '결제 요약', zh: '收款摘要' },
  'Current closing summary': { es: 'Resumen del corte actual', fr: 'Résumé de la fermeture actuelle', pt: 'Resumo do fechamento atual', ko: '현재 마감 요약', zh: '当前结算摘要' },
  'Safe drop': { es: 'Retiro a caja fuerte', fr: 'Dépôt au coffre', pt: 'Retirada para cofre', ko: '금고 입금', zh: '存入保险箱' },
  'Review and complete': { es: 'Revisar y finalizar', fr: 'Réviser et terminer', pt: 'Revisar e finalizar', ko: '검토 및 완료', zh: '查看并完成' },
  'Review your products and total on screen': { es: 'Revisa tus productos y total en pantalla', fr: 'Vérifiez vos produits et le total à l’écran', pt: 'Confira seus produtos e total na tela', ko: '화면에서 상품과 총액을 확인하세요', zh: '请在屏幕上核对商品和总额' },
  'Sales pace above baseline': { es: 'Ritmo de venta arriba', fr: 'Rythme de vente au-dessus de la base', pt: 'Ritmo de venda acima da base', ko: '판매 속도 기준 초과', zh: '销售节奏高于基准' },
  'Cash out': { es: 'Salida de efectivo', fr: 'Sortie de caisse', pt: 'Saída de dinheiro', ko: '현금 출금', zh: '现金支出' },
  'Select the warehouse that inventory will be deducted from.': { es: 'Selecciona el almacén desde donde se descontará el inventario.', fr: 'Sélectionnez l’entrepôt duquel le stock sera déduit.', pt: 'Selecione o armazém de onde o estoque será baixado.', ko: '재고가 차감될 창고를 선택하세요.', zh: '选择库存扣减的仓库。' },
  'Select the customer that will receive the credit sale.': { es: 'Selecciona el cliente que recibirá la venta a crédito.', fr: 'Sélectionnez le client qui recevra la vente à crédit.', pt: 'Selecione o cliente que receberá a venda a crédito.', ko: '외상 판매를 받을 고객을 선택하세요.', zh: '选择接收赊销的客户。' },
  'Select a warehouse': { es: 'Selecciona un almacén', fr: 'Sélectionnez un entrepôt', pt: 'Selecione um armazém', ko: '창고 선택', zh: '选择仓库' },
  'Select a warehouse to prepare its register': { es: 'Selecciona un almacén para preparar su caja', fr: 'Sélectionnez un entrepôt pour préparer sa caisse', pt: 'Selecione um armazém para preparar sua caixa', ko: '계산대를 준비할 창고를 선택하세요', zh: '选择仓库以准备其收银台' },
  'Select a register': { es: 'Selecciona una caja', fr: 'Sélectionnez une caisse', pt: 'Selecione uma caixa', ko: '계산대 선택', zh: '选择收银台' },
  'Select a valid currency to open the register.': { es: 'Selecciona una divisa válida para abrir caja.', fr: 'Sélectionnez une devise valide pour ouvrir la caisse.', pt: 'Selecione uma moeda válida para abrir a caixa.', ko: '계산대를 열 유효한 통화를 선택하세요.', zh: '选择有效币种以打开收银台。' },
  'No active cashier': { es: 'Sin cajero activo', fr: 'Aucun caissier actif', pt: 'Sem caixa ativo', ko: '활성 계산원 없음', zh: '无活动收银员' },
  'No reference': { es: 'Sin referencia', fr: 'Aucune référence', pt: 'Sem referência', ko: '참조 없음', zh: '无参考' },
  'No suspended tickets': { es: 'Sin tickets en espera', fr: 'Aucun ticket suspendu', pt: 'Sem tickets em espera', ko: '보류 티켓 없음', zh: '无暂停小票' },
  'OUT OF STOCK': { es: 'SIN STOCK', fr: 'RUPTURE', pt: 'SEM ESTOQUE', ko: '재고 없음', zh: '缺货' },
  'Ask the customer to tap or insert the card on the terminal.': { es: 'Solicita al cliente pasar su tarjeta por la terminal.', fr: 'Demandez au client de passer sa carte sur le terminal.', pt: 'Peça ao cliente para passar o cartão no terminal.', ko: '고객에게 단말기에 카드를 대거나 삽입하도록 요청하세요.', zh: '请客户在终端刷卡或插卡。' },
  'Low stock': { es: 'Stock bajo', fr: 'Stock bas', pt: 'Estoque baixo', ko: '재고 부족', zh: '库存不足' },
  'Critical stock': { es: 'Stock crítico', fr: 'Stock critique', pt: 'Estoque crítico', ko: '재고 위험', zh: '库存紧张' },
  Subtotal: { es: 'Subtotal', fr: 'Sous-total', pt: 'Subtotal', ko: '소계', zh: '小计' },
  'Fixed rate from the fiscal country.': { es: 'Tasa fija del país fiscal.', fr: 'Taux fixe du pays fiscal.', pt: 'Taxa fixa do país fiscal.', ko: '세무 국가의 고정 세율입니다.', zh: '税务国家固定税率。' },
  Ticket: { es: 'Ticket', fr: 'Ticket', pt: 'Ticket', ko: '티켓', zh: '小票' },
  'Open ticket': { es: 'Ticket abierto', fr: 'Ticket ouvert', pt: 'Ticket aberto', ko: '열린 티켓', zh: '打开的小票' },
  'Current ticket': { es: 'Ticket actual', fr: 'Ticket actuel', pt: 'Ticket atual', ko: '현재 티켓', zh: '当前小票' },
  'Sales receipt': { es: 'Ticket de venta', fr: 'Reçu de vente', pt: 'Recibo de venda', ko: '판매 영수증', zh: '销售小票' },
  'Ticket cleared': { es: 'Ticket limpio', fr: 'Ticket vidé', pt: 'Ticket limpo', ko: '티켓 비움', zh: '小票已清空' },
  'Suspended tickets': { es: 'Tickets pausados', fr: 'Tickets suspendus', pt: 'Tickets pausados', ko: '보류 티켓', zh: '暂停小票' },
  'No payments captured yet.': { es: 'Todavía no hay pagos capturados.', fr: 'Aucun paiement n’a encore été saisi.', pt: 'Ainda não há pagamentos capturados.', ko: '아직 캡처된 결제가 없습니다.', zh: '尚未录入付款。' },
  'All products': { es: 'Todos los productos', fr: 'Tous les produits', pt: 'Todos os produtos', ko: '모든 상품', zh: '所有产品' },
  'Total due': { es: 'Total a cobrar', fr: 'Total à encaisser', pt: 'Total a cobrar', ko: '결제 총액', zh: '应收总额' },
  Transfer: { es: 'Transferencia', fr: 'Virement', pt: 'Transferência', ko: '이체', zh: '转账' },
  'Shift open': { es: 'Turno abierto', fr: 'Quart ouvert', pt: 'Turno aberto', ko: '교대 열림', zh: '班次已打开' },
  'Last 4 digits / Authorization': { es: 'Últimos 4 dígitos / Autorización', fr: '4 derniers chiffres / Autorisation', pt: 'Últimos 4 dígitos / Autorização', ko: '마지막 4자리 / 승인', zh: '末 4 位 / 授权' },
  Sale: { es: 'Venta', fr: 'Vente', pt: 'Venda', ko: '판매', zh: '销售' },
  'POS sale': { es: 'Venta POS', fr: 'Vente PDV', pt: 'Venda POS', ko: 'POS 판매', zh: 'POS 销售' },
  'Sale cancelled': { es: 'Venta cancelada', fr: 'Vente annulée', pt: 'Venda cancelada', ko: '판매 취소됨', zh: '销售已取消' },
  'Sale completed': { es: 'Venta completada', fr: 'Vente terminée', pt: 'Venda concluída', ko: '판매 완료됨', zh: '销售已完成' },
  'Sale saved': { es: 'Venta guardada', fr: 'Vente enregistrée', pt: 'Venda salva', ko: '판매 저장됨', zh: '销售已保存' },
  'Sale suspended': { es: 'Venta pausada', fr: 'Vente suspendue', pt: 'Venda pausada', ko: '판매 보류됨', zh: '销售已暂停' },
  'Suspended sale resumed': { es: 'Venta pausada reanudada', fr: 'Vente suspendue reprise', pt: 'Venda pausada retomada', ko: '보류 판매 재개됨', zh: '暂停销售已恢复' },
  'Verify change before closing the sale.': { es: 'Verifica el cambio antes de cerrar la venta.', fr: 'Vérifiez la monnaie avant de fermer la vente.', pt: 'Verifique o troco antes de fechar a venda.', ko: '판매를 닫기 전에 거스름돈을 확인하세요.', zh: '关闭销售前请核对找零。' },
  'Verify the original receipt before restoring inventory or issuing a note.': { es: 'Verifica el ticket original antes de restaurar el inventario o generar una nota.', fr: 'Vérifiez le reçu original avant de restaurer le stock ou d’émettre une note.', pt: 'Verifique o recibo original antes de restaurar estoque ou gerar uma nota.', ko: '재고 복원 또는 메모 발행 전 원본 영수증을 확인하세요.', zh: '恢复库存或生成单据前请核对原小票。' },
  'Informational view · Does not close or modify the shift': { es: 'Vista informativa · No cierra ni modifica el turno', fr: 'Vue informative · Ne ferme ni ne modifie le quart', pt: 'Vista informativa · Não fecha nem modifica o turno', ko: '정보 보기 · 교대를 닫거나 수정하지 않음', zh: '信息视图 · 不关闭或修改班次' },
  'Back to payment methods': { es: 'Volver a métodos de pago', fr: 'Retour aux modes de paiement', pt: 'Voltar aos métodos de pagamento', ko: '결제 방법으로 돌아가기', zh: '返回付款方式' },
};

function translateCanonical(canonical: string, language: LegacyLanguage) {
  if (language === 'en') return canonical;
  return translations[canonical]?.[language] ?? canonical;
}

function translateLegacyText(sourceText: string, locale: PointOfSaleLocale) {
  const language = localeLanguage[locale] ?? 'en';
  const text = sourceText.replace(/\s+/g, ' ').trim();
  if (!text) return sourceText;

  const canonical = exactAliases[text] ?? text;
  const exact = translateCanonical(canonical, language);
  if (exact !== canonical || exactAliases[text]) {
    return replaceTrimmed(sourceText, exact);
  }

  const dynamic = translateDynamic(text, language);
  return dynamic ? replaceTrimmed(sourceText, dynamic) : sourceText;
}

function translateDynamic(text: string, language: LegacyLanguage) {
  const countInRegister = text.match(/^(\d+) (?:articulo|artículo|articulos|artículos) en caja$/i);
  if (countInRegister) return plural(language, Number(countInRegister[1]), {
    en: ['item in register', 'items in register'],
    es: ['artículo en caja', 'artículos en caja'],
    fr: ['article en caisse', 'articles en caisse'],
    pt: ['item na caixa', 'itens na caixa'],
    ko: ['개 품목 계산대에 있음', '개 품목 계산대에 있음'],
    zh: ['件商品在收银台', '件商品在收银台'],
  });

  const productsAvailable = text.match(/^(\d+) productos disponibles · se agregan directamente al ticket$/i);
  if (productsAvailable) return withCount(language, Number(productsAvailable[1]), {
    en: (count) => `${count} products available · added directly to the ticket`,
    es: (count) => `${count} productos disponibles · se agregan directamente al ticket`,
    fr: (count) => `${count} produits disponibles · ajoutés directement au ticket`,
    pt: (count) => `${count} produtos disponíveis · adicionados diretamente ao ticket`,
    ko: (count) => `${count}개 상품 사용 가능 · 티켓에 바로 추가됨`,
    zh: (count) => `${count} 个产品可用 · 直接添加到小票`,
  });

  const paymentCount = text.match(/^(\d+) pago(?:s)? (?:agregado|agregados|registrado|registrados)$/i);
  if (paymentCount) return plural(language, Number(paymentCount[1]), {
    en: ['payment added', 'payments added'],
    es: ['pago agregado', 'pagos agregados'],
    fr: ['paiement ajouté', 'paiements ajoutés'],
    pt: ['pagamento adicionado', 'pagamentos adicionados'],
    ko: ['건 결제 추가됨', '건 결제 추가됨'],
    zh: ['笔付款已添加', '笔付款已添加'],
  });

  const ticketsWaiting = text.match(/^(\+?)(\d+) ticket(?:s)? en espera$/i);
  if (ticketsWaiting) {
    const prefix = ticketsWaiting[1];
    const count = Number(ticketsWaiting[2]);
    const translated = plural(language, count, {
      en: ['ticket waiting', 'tickets waiting'],
      es: ['ticket en espera', 'tickets en espera'],
      fr: ['ticket en attente', 'tickets en attente'],
      pt: ['ticket em espera', 'tickets em espera'],
      ko: ['개 대기 티켓', '개 대기 티켓'],
      zh: ['张小票待处理', '张小票待处理'],
    });
    return `${prefix}${translated}`;
  }

  const stock = text.match(/^Stock insuficiente para (.+)\. Disponible: (.+)\.$/i);
  if (stock) return select(language, {
    en: `Insufficient stock for ${stock[1]}. Available: ${stock[2]}.`,
    es: `Stock insuficiente para ${stock[1]}. Disponible: ${stock[2]}.`,
    fr: `Stock insuffisant pour ${stock[1]}. Disponible : ${stock[2]}.`,
    pt: `Estoque insuficiente para ${stock[1]}. Disponível: ${stock[2]}.`,
    ko: `${stock[1]} 재고가 부족합니다. 사용 가능: ${stock[2]}.`,
    zh: `${stock[1]} 库存不足。可用：${stock[2]}。`,
  });

  const outOfStock = text.match(/^(.+) esta agotado\. Agrega inventario antes de venderlo en POS\.$/i);
  if (outOfStock) return select(language, {
    en: `${outOfStock[1]} is out of stock. Add inventory before selling it in POS.`,
    es: `${outOfStock[1]} está agotado. Agrega inventario antes de venderlo en POS.`,
    fr: `${outOfStock[1]} est épuisé. Ajoutez du stock avant de le vendre dans le PDV.`,
    pt: `${outOfStock[1]} está esgotado. Adicione estoque antes de vender no POS.`,
    ko: `${outOfStock[1]} 품절입니다. POS에서 판매하기 전에 재고를 추가하세요.`,
    zh: `${outOfStock[1]} 已缺货。在 POS 销售前请先添加库存。`,
  });

  const savedSale = text.match(/^Venta (.+) guardada\.$/i);
  if (savedSale) return select(language, {
    en: `Sale ${savedSale[1]} saved.`,
    es: `Venta ${savedSale[1]} guardada.`,
    fr: `Vente ${savedSale[1]} enregistrée.`,
    pt: `Venda ${savedSale[1]} salva.`,
    ko: `판매 ${savedSale[1]} 저장됨.`,
    zh: `销售 ${savedSale[1]} 已保存。`,
  });

  const returnSale = text.match(/^Venta (.+) · (Devolución total|Devolución parcial)$/i);
  if (returnSale) {
    const full = returnSale[2].toLowerCase().includes('total');
    return select(language, {
      en: `Sale ${returnSale[1]} · ${full ? 'Full return' : 'Partial return'}`,
      es: `Venta ${returnSale[1]} · ${full ? 'Devolución total' : 'Devolución parcial'}`,
      fr: `Vente ${returnSale[1]} · ${full ? 'Retour total' : 'Retour partiel'}`,
      pt: `Venda ${returnSale[1]} · ${full ? 'Devolução total' : 'Devolução parcial'}`,
      ko: `판매 ${returnSale[1]} · ${full ? '전체 반품' : '부분 반품'}`,
      zh: `销售 ${returnSale[1]} · ${full ? '全额退货' : '部分退货'}`,
    });
  }

  return null;
}

function select(language: LegacyLanguage, values: Record<LegacyLanguage, string>) {
  return values[language] ?? values.en;
}

function withCount(language: LegacyLanguage, count: number, values: Record<LegacyLanguage, (count: number) => string>) {
  return values[language]?.(count) ?? values.en(count);
}

function plural(language: LegacyLanguage, count: number, values: Record<LegacyLanguage, [string, string]>) {
  const [singular, pluralValue] = values[language] ?? values.en;
  if (language === 'ko' || language === 'zh') {
    return `${count}${count === 1 ? singular : pluralValue}`;
  }
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function replaceTrimmed(original: string, replacement: string) {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${replacement}${trailing}`;
}

function shouldSkipElement(element: Element) {
  const tag = element.tagName.toLowerCase();
  return tag === 'script' || tag === 'style' || tag === 'textarea';
}

const translatableAttributes = ['aria-label', 'placeholder', 'title', 'alt'] as const;

interface PointOfSaleLegacyLocalizerProps {
  children: ReactNode;
  locale: PointOfSaleLocale;
}

type LegacyTranslationSnapshot = {
  source: string;
  translated: string;
};

function resolveLegacyTranslationSnapshot(
  currentValue: string,
  previous: LegacyTranslationSnapshot | undefined,
  locale: PointOfSaleLocale,
): LegacyTranslationSnapshot {
  const source = previous && currentValue === previous.translated
    ? previous.source
    : currentValue;

  return {
    source,
    translated: translateLegacyText(source, locale),
  };
}

export function PointOfSaleLegacyLocalizer({ children, locale }: PointOfSaleLegacyLocalizerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textSnapshots = useRef(new WeakMap<Text, LegacyTranslationSnapshot>());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const translateTextNode = (node: Text) => {
      const currentValue = node.nodeValue ?? '';
      const snapshot = resolveLegacyTranslationSnapshot(
        currentValue,
        textSnapshots.current.get(node),
        locale,
      );
      textSnapshots.current.set(node, snapshot);
      if (currentValue !== snapshot.translated) {
        node.nodeValue = snapshot.translated;
      }
    };

    const translateElement = (element: Element) => {
      if (shouldSkipElement(element)) return;
      for (const attribute of translatableAttributes) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const attributeKey = attribute.replace(/[^a-z]/gi, '');
        const sourceDataKey = `posI18nSource${attributeKey}`;
        const translatedDataKey = `posI18nTranslated${attributeKey}`;
        const dataset = (element as HTMLElement).dataset;
        const previous = dataset[sourceDataKey] === undefined || dataset[translatedDataKey] === undefined
          ? undefined
          : {
              source: dataset[sourceDataKey],
              translated: dataset[translatedDataKey],
            };
        const snapshot = resolveLegacyTranslationSnapshot(value, previous, locale);
        dataset[sourceDataKey] = snapshot.source;
        dataset[translatedDataKey] = snapshot.translated;
        if (snapshot.translated !== value) element.setAttribute(attribute, snapshot.translated);
      }
    };

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node as Text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      translateElement(element);
      if (shouldSkipElement(element)) return;
      node.childNodes.forEach(walk);
    };

    const run = () => walk(root);
    run();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target as Text);
        }
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElement(mutation.target);
        }
        mutation.addedNodes.forEach(walk);
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: [...translatableAttributes],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  return <div ref={rootRef} className="contents">{children}</div>;
}
