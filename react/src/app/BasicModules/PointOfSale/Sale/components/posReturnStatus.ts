import type { PointOfSaleLocale } from '../../translations';

const labels: Record<string, Record<string, string>> = {
  en: { APPROVED: 'Approved', PARTIALLY_REFUNDED: 'Partially refunded', REFUNDED: 'Refunded', WAITING: 'Waiting', SUBMITTING: 'Submitting', PENDING: 'Pending', UNCERTAIN: 'Verification required', CONFIRMED: 'Confirmed', REJECTED: 'Rejected', FAILED: 'Failed', NOT_SUBMITTED: 'Not submitted', RECONCILIATION_REQUIRED: 'Manual reconciliation required', DEAD_LETTER: 'Manual review required' },
  es: { APPROVED: 'Aprobado', PARTIALLY_REFUNDED: 'Reembolso parcial', REFUNDED: 'Reembolsado', WAITING: 'En espera', SUBMITTING: 'Enviando', PENDING: 'Pendiente', UNCERTAIN: 'Requiere verificación', CONFIRMED: 'Confirmado', REJECTED: 'Rechazado', FAILED: 'Fallido', NOT_SUBMITTED: 'No enviado', RECONCILIATION_REQUIRED: 'Requiere conciliación manual', DEAD_LETTER: 'Requiere revisión manual' },
  fr: { APPROVED: 'Approuvé', PARTIALLY_REFUNDED: 'Partiellement remboursé', REFUNDED: 'Remboursé', WAITING: 'En attente', SUBMITTING: 'Envoi', PENDING: 'En attente', UNCERTAIN: 'Vérification requise', CONFIRMED: 'Confirmé', REJECTED: 'Rejeté', FAILED: 'Échoué', NOT_SUBMITTED: 'Non soumis', RECONCILIATION_REQUIRED: 'Rapprochement manuel requis', DEAD_LETTER: 'Révision manuelle requise' },
  pt: { APPROVED: 'Aprovado', PARTIALLY_REFUNDED: 'Parcialmente reembolsado', REFUNDED: 'Reembolsado', WAITING: 'Aguardando', SUBMITTING: 'Enviando', PENDING: 'Pendente', UNCERTAIN: 'Requer verificação', CONFIRMED: 'Confirmado', REJECTED: 'Rejeitado', FAILED: 'Falhou', NOT_SUBMITTED: 'Não enviado', RECONCILIATION_REQUIRED: 'Conciliação manual necessária', DEAD_LETTER: 'Revisão manual necessária' },
  ko: { APPROVED: '승인됨', PARTIALLY_REFUNDED: '부분 환불됨', REFUNDED: '환불됨', WAITING: '대기 중', SUBMITTING: '전송 중', PENDING: '보류 중', UNCERTAIN: '확인 필요', CONFIRMED: '확인됨', REJECTED: '거부됨', FAILED: '실패함', NOT_SUBMITTED: '전송되지 않음', RECONCILIATION_REQUIRED: '수동 조정 필요', DEAD_LETTER: '수동 검토 필요' },
  zh: { APPROVED: '已批准', PARTIALLY_REFUNDED: '部分退款', REFUNDED: '已退款', WAITING: '等待中', SUBMITTING: '提交中', PENDING: '待处理', UNCERTAIN: '需要核验', CONFIRMED: '已确认', REJECTED: '已拒绝', FAILED: '失败', NOT_SUBMITTED: '未提交', RECONCILIATION_REQUIRED: '需要人工对账', DEAD_LETTER: '需要人工审核' },
};

export const posReturnStatusText = (locale: PointOfSaleLocale, status?: string | null) => {
  if (!status) return '—';
  return labels[locale.slice(0, 2)]?.[status.toUpperCase()] ?? status.replace(/_/g, ' ');
};
