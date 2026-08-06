import type { ExpensesLocale } from '../translations';

export type ExpenseDetailCopy = {
  title: string;
  subtitle: string;
  overview: string;
  financialSummary: string;
  total: string;
  paid: string;
  balance: string;
  provider: string;
  classification: string;
  dates: string;
  expenseDate: string;
  dueDate: string;
  paymentDate: string;
  activity: string;
  paymentHistory: string;
  accumulatedPayment: string;
  evidence: string;
  files: string;
  noPayments: string;
  noFiles: string;
  created: string;
  updated: string;
  audit: string;
  edit: string;
  recordPayment: string;
  close: string;
  loading: string;
  loadFailed: string;
  paymentEvidence: string;
  supportingFile: string;
  printVoucher: string;
  paymentEvidenceUploadFailed: string;
};

const en: ExpenseDetailCopy = {
  title: 'Expense record', subtitle: 'Financial context, payments, evidence, and audit in one place.', overview: 'Overview', financialSummary: 'Financial summary', total: 'Total', paid: 'Paid', balance: 'Balance', provider: 'Provider', classification: 'Classification', dates: 'Dates', expenseDate: 'Expense date', dueDate: 'Due date', paymentDate: 'Last payment', activity: 'Activity and evidence', paymentHistory: 'Payment history', accumulatedPayment: 'Accumulated payment', evidence: 'Evidence', files: 'Supporting files', noPayments: 'No payments have been recorded.', noFiles: 'No supporting files have been uploaded.', created: 'Created', updated: 'Last updated', audit: 'Audit trail', edit: 'Edit expense', recordPayment: 'Record payment', close: 'Close', loading: 'Loading financial record…', loadFailed: 'Supporting files could not be loaded.', paymentEvidence: 'Payment evidence', supportingFile: 'Expense support', printVoucher: 'Print voucher', paymentEvidenceUploadFailed: 'The payment was recorded, but one or more supporting files could not be uploaded.',
};

const es: ExpenseDetailCopy = {
  title: 'Expediente del gasto', subtitle: 'Contexto financiero, abonos, comprobantes y auditoría en un solo lugar.', overview: 'Resumen', financialSummary: 'Resumen financiero', total: 'Total', paid: 'Abonado', balance: 'Saldo', provider: 'Proveedor', classification: 'Clasificación', dates: 'Fechas', expenseDate: 'Fecha del gasto', dueDate: 'Vencimiento', paymentDate: 'Último pago', activity: 'Actividad y evidencia', paymentHistory: 'Historial de abonos', accumulatedPayment: 'Abono acumulado', evidence: 'Comprobante', files: 'Archivos de respaldo', noPayments: 'Todavía no se han registrado abonos.', noFiles: 'No se han cargado archivos de respaldo.', created: 'Creado', updated: 'Última actualización', audit: 'Trazabilidad', edit: 'Editar gasto', recordPayment: 'Registrar abono', close: 'Cerrar', loading: 'Cargando expediente financiero…', loadFailed: 'No fue posible cargar los archivos de respaldo.', paymentEvidence: 'Comprobante de abono', supportingFile: 'Soporte del gasto', printVoucher: 'Imprimir comprobante', paymentEvidenceUploadFailed: 'El abono se registró, pero uno o más comprobantes no pudieron cargarse.',
};

const fr: ExpenseDetailCopy = {
  ...en, title: 'Dossier de dépense', subtitle: 'Contexte financier, paiements, justificatifs et audit au même endroit.', overview: 'Résumé', financialSummary: 'Résumé financier', paid: 'Payé', balance: 'Solde', provider: 'Fournisseur', classification: 'Classification', dates: 'Dates', expenseDate: 'Date de dépense', dueDate: 'Échéance', paymentDate: 'Dernier paiement', activity: 'Activité et justificatifs', paymentHistory: 'Historique des paiements', accumulatedPayment: 'Paiement cumulé', files: 'Pièces justificatives', noPayments: 'Aucun paiement enregistré.', noFiles: 'Aucune pièce justificative téléversée.', created: 'Créé', updated: 'Dernière mise à jour', audit: 'Piste d’audit', edit: 'Modifier la dépense', recordPayment: 'Enregistrer un paiement', close: 'Fermer', loading: 'Chargement du dossier financier…', loadFailed: 'Impossible de charger les pièces justificatives.', paymentEvidence: 'Justificatif de paiement', supportingFile: 'Justificatif de dépense', printVoucher: 'Imprimer le justificatif', paymentEvidenceUploadFailed: 'Le paiement a été enregistré, mais certains justificatifs n’ont pas pu être téléversés.',
};

const pt: ExpenseDetailCopy = {
  ...en, title: 'Dossiê da despesa', subtitle: 'Contexto financeiro, pagamentos, comprovantes e auditoria em um só lugar.', overview: 'Resumo', financialSummary: 'Resumo financeiro', paid: 'Pago', balance: 'Saldo', provider: 'Fornecedor', classification: 'Classificação', dates: 'Datas', expenseDate: 'Data da despesa', dueDate: 'Vencimento', paymentDate: 'Último pagamento', activity: 'Atividade e comprovantes', paymentHistory: 'Histórico de pagamentos', accumulatedPayment: 'Pagamento acumulado', files: 'Arquivos de suporte', noPayments: 'Nenhum pagamento registrado.', noFiles: 'Nenhum arquivo de suporte enviado.', created: 'Criado', updated: 'Última atualização', audit: 'Trilha de auditoria', edit: 'Editar despesa', recordPayment: 'Registrar pagamento', close: 'Fechar', loading: 'Carregando dossiê financeiro…', loadFailed: 'Não foi possível carregar os arquivos.', paymentEvidence: 'Comprovante de pagamento', supportingFile: 'Suporte da despesa', printVoucher: 'Imprimir comprovante', paymentEvidenceUploadFailed: 'O pagamento foi registrado, mas não foi possível enviar um ou mais comprovantes.',
};

const ko: ExpenseDetailCopy = { ...en, title: '지출 기록', subtitle: '재무 정보, 지급, 증빙 및 감사를 한곳에서 확인합니다.', overview: '개요', financialSummary: '재무 요약', paid: '지급액', balance: '잔액', provider: '공급업체', dates: '날짜', expenseDate: '지출일', dueDate: '만기일', paymentDate: '최근 지급', activity: '활동 및 증빙', paymentHistory: '지급 내역', accumulatedPayment: '누적 지급', files: '증빙 파일', noPayments: '등록된 지급이 없습니다.', noFiles: '업로드된 증빙 파일이 없습니다.', created: '생성', updated: '최근 업데이트', audit: '감사 추적', edit: '지출 수정', recordPayment: '지급 등록', close: '닫기', loading: '재무 기록 불러오는 중…', loadFailed: '증빙 파일을 불러올 수 없습니다.', paymentEvidence: '지급 증빙', supportingFile: '지출 증빙', printVoucher: '증빙 인쇄', paymentEvidenceUploadFailed: '지급은 등록되었지만 일부 증빙 파일을 업로드하지 못했습니다.' };
const zh: ExpenseDetailCopy = { ...en, title: '费用档案', subtitle: '集中查看财务信息、付款、凭证和审计记录。', overview: '概览', financialSummary: '财务摘要', paid: '已付', balance: '余额', provider: '供应商', dates: '日期', expenseDate: '费用日期', dueDate: '到期日', paymentDate: '最近付款', activity: '活动与凭证', paymentHistory: '付款历史', accumulatedPayment: '累计付款', files: '支持文件', noPayments: '尚未记录付款。', noFiles: '尚未上传支持文件。', created: '创建时间', updated: '最近更新', audit: '审计轨迹', edit: '编辑费用', recordPayment: '记录付款', close: '关闭', loading: '正在加载财务档案…', loadFailed: '无法加载支持文件。', paymentEvidence: '付款凭证', supportingFile: '费用凭证', printVoucher: '打印凭证', paymentEvidenceUploadFailed: '付款已记录，但一个或多个凭证文件上传失败。' };

export function getExpenseDetailCopy(locale: ExpensesLocale): ExpenseDetailCopy {
  if (locale.startsWith('es-')) return es;
  if (locale === 'fr-CA') return fr;
  if (locale === 'pt-BR') return pt;
  if (locale === 'ko-CA') return ko;
  if (locale === 'zh-CA') return zh;
  return en;
}
