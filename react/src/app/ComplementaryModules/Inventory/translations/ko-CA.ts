export const koCA = {
  title: '재고',
  subtitle: '제품, 재고, 공급업체, 구매, 할인 및 채널별 사용 여부를 하나의 작업 공간에서 관리합니다.',
  navLabel: '재고 섹션',
  loading: {
    openingTitle: '재고 로딩 중',
    openingDescription: '선택한 재고 섹션을 열고 있습니다.',
    fallbackTitle: '재고 로딩 중',
    fallbackDescription: '선택한 재고 작업 공간을 준비하고 있습니다.',
  },
  tabs: {
    products: '제품',
    inventory: '재고',
    warehouses: '창고',
    providers: '공급업체',
    purchaseOrders: '구매 주문',
    discounts: '할인',
  },
} as const;
