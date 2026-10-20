const en = {
  active: 'Your Índice demo', expired: 'Your demo has ended',
  days: '{days} days remaining', day: '1 day remaining', lastDay: 'Less than 24 hours remaining',
  preserved: 'Your company’s data is preserved. Reactivation requires a verified successful payment; no new demo starts.',
  unavailableExpired: 'Regional payment is not available yet. Contact Índice to review activation; your account remains paused.',
  choosePlan: 'Choose plan and register card', activate: 'Activate my account', review: 'Review plan and payment',
};
type Copy = typeof en;
const es: Copy = {
  active: 'Tu demo de Índice', expired: 'Tu demo terminó',
  days: 'Quedan {days} días', day: 'Queda 1 día', lastDay: 'Quedan menos de 24 horas',
  preserved: 'Los datos de tu empresa se conservan. La reactivación requiere un pago exitoso verificado; no comienza otra demo.',
  unavailableExpired: 'El pago regional aún no está disponible. Contacta a Índice para revisar la activación; tu cuenta sigue pausada.',
  choosePlan: 'Elegir plan y registrar tarjeta', activate: 'Activar mi cuenta', review: 'Revisar plan y pago',
};
const fr: Copy = {
  active: 'Votre essai Índice', expired: 'Votre essai est terminé',
  days: 'Il reste {days} jours', day: 'Il reste 1 jour', lastDay: 'Il reste moins de 24 heures',
  preserved: 'Les données de votre entreprise sont conservées. La réactivation exige un paiement réussi et vérifié; aucun nouvel essai ne commence.',
  unavailableExpired: 'Le paiement régional n’est pas encore disponible. Contactez Índice pour examiner l’activation; votre compte reste suspendu.',
  choosePlan: 'Choisir un forfait et enregistrer une carte', activate: 'Activer mon compte', review: 'Consulter le forfait et le paiement',
};
const pt: Copy = {
  active: 'Sua demonstração Índice', expired: 'Sua demonstração terminou',
  days: 'Restam {days} dias', day: 'Resta 1 dia', lastDay: 'Restam menos de 24 horas',
  preserved: 'Os dados da empresa são preservados. A reativação exige um pagamento bem-sucedido e verificado; não começa outra demonstração.',
  unavailableExpired: 'O pagamento regional ainda não está disponível. Fale com a Índice para revisar a ativação; sua conta continua pausada.',
  choosePlan: 'Escolher plano e cadastrar cartão', activate: 'Ativar minha conta', review: 'Revisar plano e pagamento',
};
const ko: Copy = {
  active: 'Índice 체험', expired: '체험이 종료되었습니다',
  days: '{days}일 남음', day: '1일 남음', lastDay: '24시간 미만 남음',
  preserved: '회사 데이터는 보존됩니다. 다시 활성화하려면 확인된 정상 결제가 필요하며 새 체험은 시작되지 않습니다.',
  unavailableExpired: '지역 결제를 아직 사용할 수 없습니다. 활성화를 검토하려면 Índice에 문의하세요. 계정은 계속 일시 중지됩니다.',
  choosePlan: '요금제 선택 및 카드 등록', activate: '계정 활성화', review: '요금제 및 결제 확인',
};
const zh: Copy = {
  active: '您的 Índice 试用', expired: '试用已结束',
  days: '剩余 {days} 天', day: '剩余 1 天', lastDay: '剩余不足 24 小时',
  preserved: '公司数据将被保留。重新激活需要经过验证的成功付款；不会开始新的试用。',
  unavailableExpired: '地区付款暂不可用。请联系 Índice 核实激活；账户仍暂停使用。',
  choosePlan: '选择方案并登记银行卡', activate: '激活我的账户', review: '查看方案与付款',
};
const copies: Record<string, Copy> = { 'en-CA': en, 'en-US': en, 'es-MX': es, 'es-CO': es,
  'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh };
export const getTrialAccountCopy = (locale: string): Copy => copies[locale] ?? en;
