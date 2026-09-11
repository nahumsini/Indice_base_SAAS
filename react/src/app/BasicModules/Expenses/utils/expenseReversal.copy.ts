const en = {
  title: 'Correct a payment', undo: 'Undo last payment', confirm: 'Confirm payment reversal', reason: 'Reason for correction',
  hint: 'Undo a payment recorded by mistake. Earlier installments and supporting files are preserved. Only an actual account debit is restored.',
  noBank: 'No payment account was assigned. The correction will reopen the balance without creating a bank deposit.',
  failed: 'Could not reverse the payment. Your reason is preserved; you can retry.',
  loadFailed: 'Could not load payment history.', loading: 'Loading payments…', retry: 'Retry', cancel: 'Cancel',
  reversed: 'Payment reversed', last: 'Last recorded payment', balance: 'Balance after correction',
  success: 'Payment reversed. The expense balance has been updated.', noPayments: 'There are no active payments to undo.',
};
type Copy = typeof en;
const es: Copy = {
  title: 'Corregir un pago', undo: 'Deshacer último pago', confirm: 'Confirmar reversión del pago', reason: 'Motivo de la corrección',
  hint: 'Deshaz un pago registrado por error. Se conservan los abonos anteriores y los comprobantes. Solo se devuelve a la cuenta una salida realmente registrada.',
  noBank: 'No se asignó una cuenta de pago. La corrección reabrirá el saldo sin generar un depósito bancario.',
  failed: 'No se pudo deshacer el pago. El motivo se conserva para reintentar.',
  loadFailed: 'No se pudo cargar el historial de pagos.', loading: 'Cargando pagos…', retry: 'Reintentar', cancel: 'Cancelar',
  reversed: 'Pago revertido', last: 'Último pago registrado', balance: 'Saldo después de corregir',
  success: 'Pago revertido. Se actualizó el saldo del gasto.', noPayments: 'No hay pagos activos que deshacer.',
};
const fr: Copy = {
  title: 'Corriger un paiement', undo: 'Annuler le dernier paiement', confirm: 'Confirmer l’annulation du paiement', reason: 'Motif de correction',
  hint: 'Annulez un paiement enregistré par erreur. Les versements antérieurs et justificatifs sont conservés. Seul un débit réellement enregistré est restitué.',
  noBank: 'Aucun compte de paiement attribué. La correction rétablit le solde sans créer de dépôt bancaire.',
  failed: 'Impossible d’annuler le paiement. Le motif est conservé pour réessayer.', loadFailed: 'Impossible de charger les paiements.',
  loading: 'Chargement des paiements…', retry: 'Réessayer', cancel: 'Annuler', reversed: 'Paiement annulé', last: 'Dernier paiement enregistré',
  balance: 'Solde après correction', success: 'Paiement annulé. Le solde de la dépense a été actualisé.', noPayments: 'Aucun paiement actif à annuler.',
};
const pt: Copy = {
  title: 'Corrigir um pagamento', undo: 'Desfazer último pagamento', confirm: 'Confirmar estorno do pagamento', reason: 'Motivo da correção',
  hint: 'Desfaça um pagamento registrado por engano. Parcelas anteriores e comprovantes são preservados. Apenas um débito realmente registrado é devolvido.',
  noBank: 'Nenhuma conta de pagamento foi atribuída. A correção reabrirá o saldo sem criar um depósito bancário.',
  failed: 'Não foi possível estornar o pagamento. O motivo foi preservado para tentar novamente.', loadFailed: 'Não foi possível carregar os pagamentos.',
  loading: 'Carregando pagamentos…', retry: 'Tentar novamente', cancel: 'Cancelar', reversed: 'Pagamento estornado', last: 'Último pagamento registrado',
  balance: 'Saldo após correção', success: 'Pagamento estornado. O saldo da despesa foi atualizado.', noPayments: 'Não há pagamentos ativos para estornar.',
};
const ko: Copy = {
  title: '지급 수정', undo: '최근 지급 취소', confirm: '지급 취소 확인', reason: '수정 사유',
  hint: '잘못 기록한 지급을 취소합니다. 이전 지급과 증빙은 보존되며 실제 출금만 계좌로 반환됩니다.',
  noBank: '지급 계좌가 지정되지 않았습니다. 은행 입금 없이 잔액이 복원됩니다.',
  failed: '지급을 취소할 수 없습니다. 사유가 보존되어 다시 시도할 수 있습니다.', loadFailed: '지급 내역을 불러올 수 없습니다.',
  loading: '지급 내역 불러오는 중…', retry: '다시 시도', cancel: '취소', reversed: '지급 취소됨', last: '최근 등록한 지급',
  balance: '수정 후 잔액', success: '지급이 취소되고 지출 잔액이 업데이트되었습니다.', noPayments: '취소할 유효한 지급이 없습니다.',
};
const zh: Copy = {
  title: '更正付款', undo: '撤销最近付款', confirm: '确认撤销付款', reason: '更正原因',
  hint: '撤销误记的付款。保留以前的付款和凭证，仅退回实际记录的账户支出。',
  noBank: '未指定付款账户。更正将恢复余额，不会产生银行存款。',
  failed: '无法撤销付款。原因已保留，可以重试。', loadFailed: '无法加载付款历史。',
  loading: '正在加载付款…', retry: '重试', cancel: '取消', reversed: '付款已撤销', last: '最近登记的付款',
  balance: '更正后余额', success: '付款已撤销，费用余额已更新。', noPayments: '没有可撤销的有效付款。',
};
export const getExpenseReversalCopy = (locale: string): Copy => ({ en, es, fr, pt, ko, zh }[locale.split('-')[0]] ?? en);
