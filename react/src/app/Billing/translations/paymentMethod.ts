type PaymentMethodCopy = {
  paymentMethod: string; loading: string; saved: string; missing: string; expired: string; unavailable: string; ownerOnly: string;
  savedDescription: string; missingDescription: string; expiredDescription: string; unavailableDescription: string; ownerDescription: string;
  stripeDisabled: string; stripeCatalogPending: string;
  card: string; checkedAt: string; manageCards: string; openingPortal: string; stripeSecurity: string; saveBeforePayment: string;
};
const en: PaymentMethodCopy = {
  stripeDisabled: "Stripe billing is currently unavailable.", stripeCatalogPending: "The selected prices are not ready for Stripe checkout.",
  paymentMethod: 'Payment method', loading: 'Checking saved card…', saved: 'Card saved in Stripe', missing: 'No default card', expired: 'Saved card expired', unavailable: 'Card status unavailable', ownerOnly: 'Owner-only card details',
  savedDescription: 'Stripe reports a saved default card for recurring payments. Future payments still require approval by your card issuer.',
  missingDescription: 'No default card is saved for recurring payments. Add or update your card through Stripe.',
  expiredDescription: 'The default card has expired. Update it in Stripe before the next payment.',
  unavailableDescription: 'We could not confirm the current saved-card status. You can review your payment method in Stripe.',
  ownerDescription: 'Only the account owner can view saved-card details or manage payment methods.',
  card: 'Card', checkedAt: 'Last checked', manageCards: 'Manage cards and invoices in Stripe', openingPortal: 'Opening Stripe…',
  stripeSecurity: 'Card details are entered in Stripe. Indice does not receive or store the full card number or security code.',
  saveBeforePayment: 'Save or discard your configuration changes before opening Stripe.',
};
const es: PaymentMethodCopy = {
  stripeDisabled: "La facturación de Stripe no está disponible en este momento.", stripeCatalogPending: "Los precios seleccionados aún no están listos para el Checkout de Stripe.",
  paymentMethod: 'Método de pago', loading: 'Consultando tarjeta guardada…', saved: 'Tarjeta guardada en Stripe', missing: 'Sin tarjeta predeterminada', expired: 'Tarjeta guardada vencida', unavailable: 'Estado de tarjeta no disponible', ownerOnly: 'Datos de tarjeta sólo para el propietario',
  savedDescription: 'Stripe informa que hay una tarjeta predeterminada guardada para pagos recurrentes. Los próximos pagos aún requieren la aprobación del emisor de tu tarjeta.',
  missingDescription: 'No hay una tarjeta predeterminada guardada para pagos recurrentes. Agrega o actualiza tu tarjeta en Stripe.',
  expiredDescription: 'La tarjeta predeterminada venció. Actualízala en Stripe antes del próximo pago.',
  unavailableDescription: 'No pudimos confirmar el estado actual de la tarjeta guardada. Puedes revisar tu método de pago en Stripe.',
  ownerDescription: 'Sólo el propietario de la cuenta puede ver los datos de la tarjeta guardada o administrar los métodos de pago.',
  card: 'Tarjeta', checkedAt: 'Última consulta', manageCards: 'Administrar tarjetas y facturas en Stripe', openingPortal: 'Abriendo Stripe…',
  stripeSecurity: 'Los datos de la tarjeta se ingresan en Stripe. Índice no recibe ni guarda el número completo ni el código de seguridad.',
  saveBeforePayment: 'Guarda o descarta los cambios de configuración antes de abrir Stripe.',
};
const fr: PaymentMethodCopy = {
  stripeDisabled: "La facturation Stripe est actuellement indisponible.", stripeCatalogPending: "Les prix sélectionnés ne sont pas encore prêts pour le paiement Stripe.",
  paymentMethod: 'Mode de paiement', loading: 'Vérification de la carte enregistrée…', saved: 'Carte enregistrée dans Stripe', missing: 'Aucune carte par défaut', expired: 'Carte enregistrée expirée', unavailable: 'État de la carte indisponible', ownerOnly: 'Détails réservés au propriétaire',
  savedDescription: 'Stripe indique qu’une carte par défaut est enregistrée pour les paiements récurrents. Les paiements futurs doivent encore être approuvés par l’émetteur de votre carte.',
  missingDescription: 'Aucune carte par défaut n’est enregistrée pour les paiements récurrents. Ajoutez ou mettez à jour votre carte dans Stripe.',
  expiredDescription: 'La carte par défaut a expiré. Mettez-la à jour dans Stripe avant le prochain paiement.',
  unavailableDescription: 'Nous n’avons pas pu confirmer l’état actuel de la carte enregistrée. Vous pouvez vérifier votre mode de paiement dans Stripe.',
  ownerDescription: 'Seul le propriétaire du compte peut consulter les détails de la carte enregistrée ou gérer les modes de paiement.',
  card: 'Carte', checkedAt: 'Dernière vérification', manageCards: 'Gérer les cartes et les factures dans Stripe', openingPortal: 'Ouverture de Stripe…',
  stripeSecurity: 'Les renseignements de carte sont saisis dans Stripe. Indice ne reçoit ni ne conserve le numéro complet ou le code de sécurité.',
  saveBeforePayment: 'Enregistrez ou annulez vos changements de configuration avant d’ouvrir Stripe.',
};
const pt: PaymentMethodCopy = {
  stripeDisabled: "O faturamento pelo Stripe está indisponível no momento.", stripeCatalogPending: "Os preços selecionados ainda não estão prontos para o Checkout do Stripe.",
  paymentMethod: 'Forma de pagamento', loading: 'Consultando cartão salvo…', saved: 'Cartão salvo no Stripe', missing: 'Sem cartão padrão', expired: 'Cartão salvo vencido', unavailable: 'Status do cartão indisponível', ownerOnly: 'Dados do cartão restritos ao proprietário',
  savedDescription: 'O Stripe informa que há um cartão padrão salvo para pagamentos recorrentes. Pagamentos futuros ainda dependem da aprovação do emissor do cartão.',
  missingDescription: 'Não há cartão padrão salvo para pagamentos recorrentes. Adicione ou atualize seu cartão no Stripe.',
  expiredDescription: 'O cartão padrão venceu. Atualize-o no Stripe antes do próximo pagamento.',
  unavailableDescription: 'Não foi possível confirmar o status atual do cartão salvo. Você pode consultar sua forma de pagamento no Stripe.',
  ownerDescription: 'Somente o proprietário da conta pode ver os dados do cartão salvo ou gerenciar formas de pagamento.',
  card: 'Cartão', checkedAt: 'Última consulta', manageCards: 'Gerenciar cartões e faturas no Stripe', openingPortal: 'Abrindo o Stripe…',
  stripeSecurity: 'Os dados do cartão são inseridos no Stripe. O Indice não recebe nem armazena o número completo ou o código de segurança.',
  saveBeforePayment: 'Salve ou descarte as alterações de configuração antes de abrir o Stripe.',
};
const ko: PaymentMethodCopy = {
  stripeDisabled: "현재 Stripe 결제를 사용할 수 없습니다.", stripeCatalogPending: "선택한 가격이 아직 Stripe Checkout에 준비되지 않았습니다.",
  paymentMethod: '결제 수단', loading: '저장된 카드 확인 중…', saved: 'Stripe에 카드 저장됨', missing: '기본 카드 없음', expired: '저장된 카드 만료됨', unavailable: '카드 상태 확인 불가', ownerOnly: '카드 정보는 소유자만 확인 가능',
  savedDescription: 'Stripe에 정기 결제용 기본 카드가 저장되어 있습니다. 향후 결제는 카드 발급사의 승인을 받아야 합니다.',
  missingDescription: '정기 결제용 기본 카드가 저장되어 있지 않습니다. Stripe에서 카드를 추가하거나 변경하세요.',
  expiredDescription: '기본 카드가 만료되었습니다. 다음 결제 전에 Stripe에서 변경하세요.',
  unavailableDescription: '저장된 카드의 현재 상태를 확인하지 못했습니다. Stripe에서 결제 수단을 확인할 수 있습니다.',
  ownerDescription: '계정 소유자만 저장된 카드 정보를 확인하거나 결제 수단을 관리할 수 있습니다.',
  card: '카드', checkedAt: '마지막 확인', manageCards: 'Stripe에서 카드 및 청구서 관리', openingPortal: 'Stripe 여는 중…',
  stripeSecurity: '카드 정보는 Stripe에서 입력합니다. Indice는 전체 카드 번호나 보안 코드를 받거나 저장하지 않습니다.',
  saveBeforePayment: 'Stripe를 열기 전에 설정 변경 사항을 저장하거나 취소하세요.',
};
const zh: PaymentMethodCopy = {
  stripeDisabled: "Stripe 计费目前不可用。", stripeCatalogPending: "所选价格尚未准备好用于 Stripe 结账。",
  paymentMethod: '付款方式', loading: '正在查询已保存的卡…', saved: '卡已保存在 Stripe', missing: '未设置默认卡', expired: '已保存的卡已过期', unavailable: '无法确认卡状态', ownerOnly: '仅账户所有者可查看卡信息',
  savedDescription: 'Stripe 显示已保存用于定期付款的默认卡。未来付款仍需发卡机构批准。',
  missingDescription: '尚未保存用于定期付款的默认卡。请在 Stripe 中添加或更新您的卡。',
  expiredDescription: '默认卡已过期。请在下次付款前到 Stripe 更新。',
  unavailableDescription: '无法确认已保存卡的当前状态。您可以在 Stripe 中查看付款方式。',
  ownerDescription: '只有账户所有者可以查看已保存的卡信息或管理付款方式。',
  card: '卡', checkedAt: '上次查询', manageCards: '在 Stripe 中管理卡和发票', openingPortal: '正在打开 Stripe…',
  stripeSecurity: '卡信息在 Stripe 中输入。Indice 不会接收或保存完整卡号或安全码。',
  saveBeforePayment: '打开 Stripe 前，请保存或放弃配置更改。',
};
export const paymentMethodCopies: Record<string, PaymentMethodCopy> = { 'en-CA': en, 'en-US': en, 'es-MX': es, 'es-CO': es, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh };
export const getPaymentMethodCopy = (locale: string): PaymentMethodCopy => Object.prototype.hasOwnProperty.call(paymentMethodCopies, locale) ? paymentMethodCopies[locale] : en;
export type { PaymentMethodCopy };
