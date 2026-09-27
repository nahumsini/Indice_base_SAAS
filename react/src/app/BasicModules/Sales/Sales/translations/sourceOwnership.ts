const messages: Record<string, string> = {
  es: 'Venta de POS · Solo lectura. Los importes, pagos e inventario pertenecen al ticket original.',
  en: 'POS sale · Read only. Amounts, payments and inventory belong to the original ticket.',
  fr: 'Vente PDV · Lecture seule. Les montants, paiements et stocks relèvent du reçu original.',
  pt: 'Venda de PDV · Somente leitura. Valores, pagamentos e estoque pertencem ao comprovante original.',
  ko: 'POS 판매 · 읽기 전용. 금액, 결제 및 재고는 원래 영수증에서 관리됩니다.',
  zh: 'POS 销售 · 只读。金额、付款和库存由原始小票管理。',
};
export const saleSourceOwnershipMessage = (locale: string) => messages[locale.slice(0, 2)] ?? messages.en;
