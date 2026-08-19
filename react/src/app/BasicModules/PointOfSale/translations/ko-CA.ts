export const koCA = {
  title: '판매 시점 관리',
  subtitle: '매장 판매, 영수증, 현금 마감, 고객, 키오스크, 운영 KPI를 관리합니다.',
  back: '뒤로',
  navLabel: '판매 시점 관리 섹션',
  loading: {
    openingTitle: '판매 시점 관리 열기',
    openingDescription: '선택한 운영 작업 공간을 준비하고 있습니다.',
    fallbackTitle: '작업 공간 로딩 중',
    fallbackDescription: '선택한 POS 섹션만 불러오고 있습니다.',
  },
  tabs: {
    kiosks: '키오스크',
    cajas: '계산대 및 근무조',
    sale: '판매',
    cortes: '현금 마감',
    clientes: '고객',
    kpis: '지표',
  },
} as const;
