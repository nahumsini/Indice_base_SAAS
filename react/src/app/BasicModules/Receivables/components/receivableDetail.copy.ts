import type { ReceivablesLocale } from '../translations';

export type ReceivableDetailCopy = {
  actions: string;
  accountData: string;
  detail: string;
  dueDate: string;
  installments: string;
  noInstallments: string;
  noPayments: string;
  openReceipt: string;
  paid: string;
  payments: string;
  printAging: string;
  receipt: string;
  registerPayment: string;
  title: string;
};

const english: ReceivableDetailCopy = {
  actions: 'Actions',
  accountData: 'Account information',
  detail: 'View account',
  dueDate: 'Next due date',
  installments: 'Installment schedule',
  noInstallments: 'No installments are registered for this account.',
  noPayments: 'No payments have been registered for this account.',
  openReceipt: 'Open receipt',
  paid: 'Paid',
  payments: 'Payment and receipt history',
  printAging: 'Print ageing report',
  receipt: 'Receipt attached',
  registerPayment: 'Register payment',
  title: 'Receivable account file',
};

const spanish: ReceivableDetailCopy = {
  actions: 'Acciones',
  accountData: 'Datos de la cuenta',
  detail: 'Ver expediente',
  dueDate: 'Próximo vencimiento',
  installments: 'Calendario de parcialidades',
  noInstallments: 'Esta cuenta no tiene parcialidades registradas.',
  noPayments: 'Esta cuenta todavía no tiene abonos registrados.',
  openReceipt: 'Abrir comprobante',
  paid: 'Pagado',
  payments: 'Historial de abonos y comprobantes',
  printAging: 'Imprimir antigüedad',
  receipt: 'Comprobante adjunto',
  registerPayment: 'Registrar abono',
  title: 'Expediente de cuenta por cobrar',
};

const french: ReceivableDetailCopy = {
  actions: 'Actions',
  accountData: 'Données du compte',
  detail: 'Voir le dossier',
  dueDate: 'Prochaine échéance',
  installments: 'Calendrier des versements',
  noInstallments: 'Aucun versement n’est enregistré pour ce compte.',
  noPayments: 'Aucun paiement n’est encore enregistré pour ce compte.',
  openReceipt: 'Ouvrir le reçu',
  paid: 'Payé',
  payments: 'Historique des paiements et reçus',
  printAging: 'Imprimer l’ancienneté',
  receipt: 'Reçu joint',
  registerPayment: 'Enregistrer un paiement',
  title: 'Dossier du compte client',
};

const portuguese: ReceivableDetailCopy = {
  actions: 'Ações',
  accountData: 'Dados da conta',
  detail: 'Ver cadastro',
  dueDate: 'Próximo vencimento',
  installments: 'Cronograma de parcelas',
  noInstallments: 'Esta conta não possui parcelas registradas.',
  noPayments: 'Esta conta ainda não possui pagamentos registrados.',
  openReceipt: 'Abrir comprovante',
  paid: 'Pago',
  payments: 'Histórico de pagamentos e comprovantes',
  printAging: 'Imprimir antiguidade',
  receipt: 'Comprovante anexado',
  registerPayment: 'Registrar pagamento',
  title: 'Cadastro da conta a receber',
};

const korean: ReceivableDetailCopy = {
  actions: '작업',
  accountData: '계정 정보',
  detail: '계정 파일 보기',
  dueDate: '다음 만기일',
  installments: '할부 일정',
  noInstallments: '등록된 할부가 없습니다.',
  noPayments: '등록된 결제가 없습니다.',
  openReceipt: '영수증 열기',
  paid: '결제됨',
  payments: '결제 및 영수증 내역',
  printAging: '연령 분석 인쇄',
  receipt: '영수증 첨부됨',
  registerPayment: '결제 등록',
  title: '미수금 계정 파일',
};

const chinese: ReceivableDetailCopy = {
  actions: '操作',
  accountData: '账户信息',
  detail: '查看账户档案',
  dueDate: '下次到期日',
  installments: '分期计划',
  noInstallments: '此账户没有已登记的分期。',
  noPayments: '此账户尚未登记付款。',
  openReceipt: '打开收据',
  paid: '已支付',
  payments: '付款与收据记录',
  printAging: '打印账龄报告',
  receipt: '已附收据',
  registerPayment: '登记付款',
  title: '应收账户档案',
};

export function getReceivableDetailCopy(locale: ReceivablesLocale): ReceivableDetailCopy {
  if (locale.startsWith('es')) return spanish;
  if (locale === 'fr-CA') return french;
  if (locale === 'pt-BR') return portuguese;
  if (locale === 'ko-CA') return korean;
  if (locale === 'zh-CA') return chinese;
  return english;
}
