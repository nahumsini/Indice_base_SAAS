// Customer and company-account presentation only; machine values and entered names are unchanged.
export const paymentRequestLocales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'] as const;
export type PaymentRequestLocale = typeof paymentRequestLocales[number];
const localeIndex: Record<PaymentRequestLocale, number> = { 'en-CA': 0, 'en-US': 0, 'es-MX': 1, 'es-CO': 1, 'fr-CA': 2, 'pt-BR': 3, 'ko-CA': 4, 'zh-CA': 5 };
// Columns: Canadian English, Spanish, Canadian French, Brazilian Portuguese, Korean, Chinese.
const messages = {
  "protection": [
    "Existing benefit keeps access active; this payment deadline is paused.",
    "El beneficio existente mantiene el acceso activo; este plazo de pago está pausado.",
    "Le bénéfice existant maintient l’accès actif; cette échéance de paiement est suspendue.",
    "O benefício existente mantém o acesso ativo; este prazo de pagamento está pausado.",
    "기존 혜택으로 접근이 유지되며 이 결제 기한은 일시 중지됩니다.",
    "现有权益使访问保持有效；此付款期限已暂停。"
  ],
  "requestedDeadline": [
    "Payment requested. Deadline: {date}.",
    "Pago solicitado. Fecha límite: {date}.",
    "Paiement demandé. Échéance : {date}.",
    "Pagamento solicitado. Prazo: {date}.",
    "결제가 요청되었습니다. 기한: {date}.",
    "已请求付款。截止日期：{date}。"
  ],
  "payBeforeDeadline": [
    "Pay before the deadline to keep operational access.",
    "Paga antes del vencimiento para mantener el acceso operativo.",
    "Payez avant l’échéance pour conserver l’accès opérationnel.",
    "Pague antes do prazo para manter o acesso operacional.",
    "업무 접근을 유지하려면 기한 전에 결제하세요.",
    "请在截止日期前付款以保持业务访问权限。"
  ],
  "paymentUnavailable": [
    "Payment is not currently available. Refresh its status.",
    "El pago no está disponible actualmente. Actualiza su estado.",
    "Le paiement n’est pas disponible actuellement. Actualisez son état.",
    "O pagamento não está disponível no momento. Atualize o status.",
    "현재 결제를 이용할 수 없습니다. 상태를 새로 고침하세요.",
    "目前无法付款，请刷新状态。"
  ],
  "ownerMustPay": [
    "The account owner {name} must complete payment.",
    "El propietario {name} debe completar el pago.",
    "Le propriétaire du compte {name} doit effectuer le paiement.",
    "O proprietário da conta {name} deve concluir o pagamento.",
    "계정 소유자 {name}님이 결제해야 합니다.",
    "账户所有者 {name} 需要完成付款。"
  ],
  "reviewPay": [
    "Review and pay",
    "Revisar y pagar",
    "Vérifier et payer",
    "Revisar e pagar",
    "확인 및 결제",
    "查看并付款"
  ],
  "viewStatus": [
    "View payment status",
    "Ver estado del pago",
    "Voir l’état du paiement",
    "Ver status do pagamento",
    "결제 상태 보기",
    "查看付款状态"
  ],
  "verifiedRefresh": [
    "Payment verified. Account access is refreshing.",
    "Pago verificado. El acceso se está actualizando.",
    "Paiement vérifié. L’accès au compte est en cours d’actualisation.",
    "Pagamento verificado. O acesso à conta está sendo atualizado.",
    "결제가 확인되었습니다. 계정 접근을 갱신하고 있습니다.",
    "付款已核实。正在更新账户访问权限。"
  ],
  "notConfirmed": [
    "Payment has not been confirmed yet. You can check again after completing payment.",
    "El pago aún no se confirma. Puedes verificar de nuevo después de pagar.",
    "Le paiement n’est pas encore confirmé. Vérifiez de nouveau après l’avoir effectué.",
    "O pagamento ainda não foi confirmado. Verifique novamente após pagar.",
    "아직 결제가 확인되지 않았습니다. 결제를 마친 후 다시 확인하세요.",
    "付款尚未确认。完成付款后可再次检查。"
  ],
  "checkFailed": [
    "Payment could not be checked. Try again.",
    "No se pudo consultar el pago. Intenta de nuevo.",
    "Impossible de vérifier le paiement. Réessayez.",
    "Não foi possível verificar o pagamento. Tente novamente.",
    "결제를 확인할 수 없습니다. 다시 시도하세요.",
    "无法检查付款，请重试。"
  ],
  "verified": [
    "Payment verified",
    "Pago verificado",
    "Paiement vérifié",
    "Pagamento verificado",
    "결제 확인됨",
    "付款已核实"
  ],
  "paused": [
    "Payment deadline paused",
    "Plazo de pago pausado",
    "Échéance de paiement suspendue",
    "Prazo de pagamento pausado",
    "결제 기한 일시 중지",
    "付款期限已暂停"
  ],
  "required": [
    "Payment required to continue",
    "Pago requerido para continuar",
    "Paiement requis pour continuer",
    "Pagamento necessário para continuar",
    "계속하려면 결제가 필요합니다",
    "需付款才能继续"
  ],
  "reviewRequest": [
    "Review your payment request",
    "Revisa tu solicitud de pago",
    "Vérifiez votre demande de paiement",
    "Revise sua solicitação de pagamento",
    "결제 요청 확인",
    "查看付款请求"
  ],
  "pausedAccess": [
    "Operational access is paused. You can sign in and resolve payment here.",
    "El acceso operativo está pausado. Puedes iniciar sesión y regularizar el pago aquí.",
    "L’accès opérationnel est suspendu. Vous pouvez vous connecter et régler le paiement ici.",
    "O acesso operacional está pausado. Você pode entrar e regularizar o pagamento aqui.",
    "업무 접근이 일시 중지되었습니다. 로그인하여 여기서 결제를 처리할 수 있습니다.",
    "业务访问已暂停。您仍可登录并在此处理付款。"
  ],
  "completeBeforeDeadline": [
    "Complete payment before the deadline to keep operational access.",
    "Completa el pago antes del vencimiento para mantener el acceso operativo.",
    "Effectuez le paiement avant l’échéance pour conserver l’accès opérationnel.",
    "Conclua o pagamento antes do prazo para manter o acesso operacional.",
    "업무 접근을 유지하려면 기한 전에 결제를 완료하세요.",
    "请在截止日期前完成付款以保持业务访问权限。"
  ],
  "invoiceTotal": [
    "Requested invoice total",
    "Total solicitado en facturas",
    "Total des factures demandé",
    "Total solicitado em faturas",
    "요청된 청구서 합계",
    "请求支付的账单总额"
  ],
  "estimatedBeforeTax": [
    "Estimated subscription amount before tax",
    "Importe estimado de suscripción antes de impuestos",
    "Montant estimé de l’abonnement avant taxes",
    "Valor estimado da assinatura antes de impostos",
    "세전 예상 구독 금액",
    "税前预计订阅金额"
  ],
  "taxConfirmed": [
    "Applicable tax is confirmed at secure checkout.",
    "Los impuestos aplicables se confirman en el pago seguro.",
    "Les taxes applicables sont confirmées au paiement sécurisé.",
    "Os impostos aplicáveis são confirmados no pagamento seguro.",
    "적용 세금은 안전한 결제 화면에서 확인됩니다.",
    "适用税费将在安全结账时确认。"
  ],
  "multiInvoiceHelp": [
    "If this request includes multiple invoices, pay each separately. Check the status and continue to the next payment until all requested invoices are confirmed.",
    "Si la solicitud incluye varias facturas, paga cada una por separado. Verifica el estado y continúa al siguiente pago hasta que se confirmen todas las facturas solicitadas.",
    "Si la demande comprend plusieurs factures, payez-les séparément. Vérifiez l’état et passez au paiement suivant jusqu’à confirmation de toutes les factures demandées.",
    "Se a solicitação inclui várias faturas, pague cada uma separadamente. Verifique o status e continue até que todas as faturas solicitadas sejam confirmadas.",
    "여러 청구서가 포함된 경우 각각 결제하세요. 요청된 모든 청구서가 확인될 때까지 상태를 확인하고 다음 결제를 진행하세요.",
    "若此请求包含多张账单，请分别付款。检查状态并继续下一笔付款，直到所请求的所有账单均已确认。"
  ],
  "localDeadline": [
    "Deadline (your local time)",
    "Fecha límite (tu hora local)",
    "Échéance (votre heure locale)",
    "Prazo (seu horário local)",
    "기한(현지 시간)",
    "截止日期（当地时间）"
  ],
  "verifiedAt": [
    "Payment verified at",
    "Pago verificado el",
    "Paiement vérifié le",
    "Pagamento verificado em",
    "결제 확인 시각",
    "付款核实时间"
  ],
  "loadingDetails": [
    "Loading payment details…",
    "Cargando datos del pago…",
    "Chargement des détails du paiement…",
    "Carregando dados do pagamento…",
    "결제 정보 불러오는 중…",
    "正在加载付款详情…"
  ],
  "refreshRequest": [
    "Refresh to load the current payment request.",
    "Actualiza para consultar la solicitud de pago.",
    "Actualisez pour consulter la demande de paiement actuelle.",
    "Atualize para consultar a solicitação de pagamento atual.",
    "현재 결제 요청을 불러오려면 새로 고침하세요.",
    "请刷新以加载当前付款请求。"
  ],
  "onlyOwner": [
    "Only the account owner {name} can complete payment. Contact them to restore access.",
    "Sólo el propietario {name} puede completar el pago. Contáctalo para recuperar el acceso.",
    "Seul le propriétaire du compte {name} peut effectuer le paiement. Contactez-le pour rétablir l’accès.",
    "Só o proprietário da conta {name} pode concluir o pagamento. Entre em contato para restaurar o acesso.",
    "계정 소유자 {name}님만 결제할 수 있습니다. 접근 복구를 위해 연락하세요.",
    "只有账户所有者 {name} 可以完成付款。请联系其恢复访问权限。"
  ],
  "securePayment": [
    "Continue to secure payment",
    "Continuar al pago seguro",
    "Continuer vers le paiement sécurisé",
    "Continuar para pagamento seguro",
    "안전한 결제로 계속",
    "继续安全付款"
  ],
  "checkStatus": [
    "Check payment status",
    "Verificar estado del pago",
    "Vérifier l’état du paiement",
    "Verificar status do pagamento",
    "결제 상태 확인",
    "检查付款状态"
  ],
  "refreshStatus": [
    "Refresh status",
    "Actualizar estado",
    "Actualiser l’état",
    "Atualizar status",
    "상태 새로 고침",
    "刷新状态"
  ],
  "otherHolds": [
    "Access updates after payment is verified. Any separate account restrictions remain in effect.",
    "El acceso se actualiza al verificar el pago. Las demás restricciones de la cuenta siguen vigentes.",
    "L’accès est mis à jour après vérification du paiement. Les autres restrictions du compte restent en vigueur.",
    "O acesso é atualizado após verificar o pagamento. Outras restrições da conta continuam em vigor.",
    "결제 확인 후 접근이 갱신됩니다. 별도의 계정 제한은 계속 적용됩니다.",
    "核实付款后将更新访问权限。账户的其他限制仍然有效。"
  ],
  "loadFailed": [
    "Payment details could not be loaded.",
    "No se pudieron cargar los datos del pago.",
    "Impossible de charger les détails du paiement.",
    "Não foi possível carregar os dados do pagamento.",
    "결제 정보를 불러올 수 없습니다.",
    "无法加载付款详情。"
  ],
  "saved": [
    "Saved. The deadline and reminder schedule are shown below.",
    "Guardado. El plazo y los recordatorios se muestran abajo.",
    "Enregistré. L’échéance et les rappels figurent ci-dessous.",
    "Salvo. O prazo e os lembretes aparecem abaixo.",
    "저장되었습니다. 기한과 알림 일정은 아래에 표시됩니다.",
    "已保存。截止日期和提醒计划显示在下方。"
  ],
  "savedRefreshFailed": [
    "Saved. The customer list could not refresh; refresh it after closing this window.",
    "Guardado. No se pudo actualizar la lista de clientes; actualízala al cerrar esta ventana.",
    "Enregistré. La liste des clients n’a pas pu être actualisée; actualisez-la après avoir fermé cette fenêtre.",
    "Salvo. Não foi possível atualizar a lista de clientes; atualize-a após fechar esta janela.",
    "저장되었습니다. 고객 목록을 새로 고칠 수 없습니다. 이 창을 닫은 후 새로 고침하세요.",
    "已保存。客户列表未能刷新；请关闭此窗口后刷新列表。"
  ],
  "saveFailed": [
    "The request could not be saved.",
    "No se pudo guardar la solicitud.",
    "Impossible d’enregistrer la demande.",
    "Não foi possível salvar a solicitação.",
    "요청을 저장할 수 없습니다.",
    "无法保存请求。"
  ],
  "requestPayment": [
    "Request payment",
    "Solicitar pago",
    "Demander un paiement",
    "Solicitar pagamento",
    "결제 요청",
    "请求付款"
  ],
  "pausedFooter": [
    "Payment deadline paused · existing benefit",
    "Plazo de pago pausado · beneficio existente",
    "Échéance suspendue · bénéfice existant",
    "Prazo pausado · benefício existente",
    "결제 기한 일시 중지 · 기존 혜택",
    "付款期限已暂停 · 现有权益"
  ],
  "sevenDaysFooter": [
    "Seven days to pay · daily reminders to the owner",
    "Siete días para pagar · recordatorios diarios al propietario",
    "Sept jours pour payer · rappels quotidiens au propriétaire",
    "Sete dias para pagar · lembretes diários ao proprietário",
    "결제 기한 7일 · 소유자에게 매일 알림",
    "七天内付款 · 每日提醒所有者"
  ],
  "close": [
    "Close",
    "Cerrar",
    "Fermer",
    "Fechar",
    "닫기",
    "关闭"
  ],
  "addSevenDays": [
    "Add 7 days",
    "Agregar 7 días",
    "Ajouter 7 jours",
    "Adicionar 7 dias",
    "7일 추가",
    "增加 7 天"
  ],
  "sendRequest": [
    "Send payment request",
    "Enviar solicitud de pago",
    "Envoyer la demande de paiement",
    "Enviar solicitação de pagamento",
    "결제 요청 보내기",
    "发送付款请求"
  ],
  "reviewAmountOwner": [
    "Review the amount and owner before sending.",
    "Revisa el importe y el propietario antes de enviar.",
    "Vérifiez le montant et le propriétaire avant l’envoi.",
    "Revise o valor e o proprietário antes de enviar.",
    "보내기 전에 금액과 소유자를 확인하세요.",
    "发送前请确认金额和所有者。"
  ],
  "refresh": [
    "Refresh",
    "Actualizar",
    "Actualiser",
    "Atualizar",
    "새로 고침",
    "刷新"
  ],
  "owner": [
    "Owner",
    "Propietario",
    "Propriétaire",
    "Proprietário",
    "소유자",
    "所有者"
  ],
  "noOwner": [
    "No owner assigned",
    "Sin propietario asignado",
    "Aucun propriétaire assigné",
    "Sem proprietário atribuído",
    "배정된 소유자 없음",
    "未分配所有者"
  ],
  "annualBilling": [
    "Annual billing",
    "Facturación anual",
    "Facturation annuelle",
    "Faturamento anual",
    "연간 청구",
    "按年计费"
  ],
  "monthlyBilling": [
    "Monthly billing",
    "Facturación mensual",
    "Facturation mensuelle",
    "Faturamento mensal",
    "월간 청구",
    "按月计费"
  ],
  "paidThrough": [
    "Paid through",
    "Pagado hasta",
    "Payé jusqu’au",
    "Pago até",
    "결제 적용 기한",
    "已付款至"
  ],
  "requested": [
    "Payment requested",
    "Pago solicitado",
    "Paiement demandé",
    "Pagamento solicitado",
    "결제 요청됨",
    "已请求付款"
  ],
  "deadline": [
    "Deadline",
    "Fecha límite",
    "Échéance",
    "Prazo",
    "기한",
    "截止日期"
  ],
  "paid": [
    "Paid",
    "Pagado",
    "Payé",
    "Pago",
    "결제 완료",
    "已付款"
  ],
  "extendSevenDays": [
    "Extend payment deadline by 7 days",
    "Extender el plazo de pago 7 días",
    "Prolonger l’échéance de paiement de 7 jours",
    "Estender o prazo de pagamento em 7 dias",
    "결제 기한 7일 연장",
    "延长付款期限 7 天"
  ],
  "extensionReason": [
    "Reason for extension",
    "Motivo de la extensión",
    "Motif de prolongation",
    "Motivo da extensão",
    "연장 사유",
    "延期原因"
  ],
  "requestReason": [
    "Reason for payment request",
    "Motivo de la solicitud",
    "Motif de la demande de paiement",
    "Motivo da solicitação de pagamento",
    "결제 요청 사유",
    "付款请求原因"
  ],
  "windowHelp": [
    "The owner receives daily reminders during the seven-day payment window. After the deadline, the account is limited to signing in and payment recovery until payment is verified or the deadline is extended. Existing security restrictions still apply.",
    "El propietario recibe recordatorios diarios durante el plazo de siete días. Después, la cuenta permite iniciar sesión y regularizar el pago hasta que se verifique el pago o se extienda el plazo. Las restricciones de seguridad existentes siguen vigentes.",
    "Le propriétaire reçoit des rappels quotidiens pendant les sept jours. Après l’échéance, le compte permet seulement la connexion et le règlement du paiement jusqu’à sa vérification ou la prolongation du délai. Les restrictions de sécurité restent en vigueur.",
    "O proprietário recebe lembretes diários durante sete dias. Após o prazo, a conta permite apenas entrar e regularizar o pagamento até a verificação ou extensão. As restrições de segurança existentes continuam.",
    "소유자는 7일 동안 매일 알림을 받습니다. 기한 후에는 결제 확인 또는 기한 연장까지 로그인과 결제 복구만 가능합니다. 기존 보안 제한은 유지됩니다.",
    "所有者在七天付款期内每天收到提醒。逾期后，账户仅可登录和处理付款，直到付款被核实或期限延长。现有安全限制仍然适用。"
  ],
  "history": [
    "Reminders and history",
    "Recordatorios e historial",
    "Rappels et historique",
    "Lembretes e histórico",
    "알림 및 이력",
    "提醒和历史"
  ],
  "email": [
    "Email",
    "Correo",
    "Courriel",
    "E-mail",
    "이메일",
    "电子邮件"
  ],
  "inApp": [
    "In-app notification",
    "Notificación en la app",
    "Notification dans l’application",
    "Notificação no aplicativo",
    "앱 내 알림",
    "应用内通知"
  ],
  "attempts": [
    "Attempts",
    "Intentos",
    "Tentatives",
    "Tentativas",
    "시도 횟수",
    "尝试次数"
  ],
  "system": [
    "System",
    "Sistema",
    "Système",
    "Sistema",
    "시스템",
    "系统"
  ],
  "localDates": [
    "Dates are shown in your local time.",
    "Las fechas se muestran en tu hora local.",
    "Les dates sont affichées dans votre heure locale.",
    "As datas são exibidas no seu horário local.",
    "날짜는 현지 시간으로 표시됩니다.",
    "日期按您的当地时间显示。"
  ],
  "scheduled": [
    "Scheduled",
    "Programado",
    "Planifié",
    "Agendado",
    "예정됨",
    "已计划"
  ],
  "sending": [
    "Sending",
    "Enviando",
    "Envoi",
    "Enviando",
    "보내는 중",
    "发送中"
  ],
  "sent": [
    "Sent",
    "Enviado",
    "Envoyé",
    "Enviado",
    "보냄",
    "已发送"
  ],
  "delivered": [
    "Delivered",
    "Entregado",
    "Livré",
    "Entregue",
    "전달됨",
    "已送达"
  ],
  "failedRetry": [
    "Failed · retry pending",
    "Falló · reintento pendiente",
    "Échec · nouvelle tentative en attente",
    "Falhou · nova tentativa pendente",
    "실패 · 재시도 대기",
    "失败 · 等待重试"
  ],
  "canceled": [
    "Canceled",
    "Cancelado",
    "Annulé",
    "Cancelado",
    "취소됨",
    "已取消"
  ],
  "skipped": [
    "Skipped",
    "Omitido",
    "Ignoré",
    "Ignorado",
    "건너뜀",
    "已跳过"
  ],
  "deliveryDisabled": [
    "Delivery disabled",
    "Envío deshabilitado",
    "Envoi désactivé",
    "Envio desativado",
    "전송 비활성화됨",
    "已禁用发送"
  ],
  "statusUnavailable": [
    "Status unavailable",
    "Estado no disponible",
    "État indisponible",
    "Status indisponível",
    "상태 정보 없음",
    "状态不可用"
  ],
  "reviewRequired": [
    "This payment request needs review before it can be sent.",
    "Esta solicitud de pago necesita revisión antes de enviarse.",
    "Cette demande de paiement doit être vérifiée avant l’envoi.",
    "Esta solicitação de pagamento precisa de revisão antes de enviar.",
    "이 결제 요청은 보내기 전에 검토가 필요합니다.",
    "发送此付款请求前需要进行检查。"
  ],
  "COLLECTION_NOT_ENABLED": [
    "Payment requests are not available in this environment yet.",
    "Las solicitudes de pago aún no están disponibles en este entorno.",
    "Les demandes de paiement ne sont pas encore disponibles dans cet environnement.",
    "As solicitações de pagamento ainda não estão disponíveis neste ambiente.",
    "이 환경에서는 아직 결제 요청을 사용할 수 없습니다.",
    "此环境尚不支持付款请求。"
  ],
  "COMPANY_NOT_ELIGIBLE": [
    "This account is not eligible for a payment request.",
    "Esta cuenta no puede recibir una solicitud de pago.",
    "Ce compte n’est pas admissible à une demande de paiement.",
    "Esta conta não é elegível para uma solicitação de pagamento.",
    "이 계정은 결제 요청 대상이 아닙니다.",
    "此账户不符合付款请求条件。"
  ],
  "BILLING_OWNER_REQUIRED": [
    "Assign an active owner with an email address first.",
    "Primero asigna un propietario activo con correo electrónico.",
    "Assignez d’abord un propriétaire actif avec une adresse courriel.",
    "Primeiro atribua um proprietário ativo com e-mail.",
    "먼저 이메일 주소가 있는 활성 소유자를 배정하세요.",
    "请先分配具有邮箱地址的活跃所有者。"
  ],
  "INDEPENDENT_ACCOUNT_HOLD": [
    "Resolve the separate account restriction before requesting payment.",
    "Resuelve la restricción independiente de la cuenta antes de solicitar el pago.",
    "Réglez la restriction indépendante du compte avant de demander un paiement.",
    "Resolva a restrição independente da conta antes de solicitar pagamento.",
    "결제를 요청하기 전에 별도의 계정 제한을 해결하세요.",
    "请求付款前，请先解决账户的其他限制。"
  ],
  "REQUEST_ALREADY_OPEN": [
    "A payment request is already open. Review or extend its deadline.",
    "Ya existe una solicitud de pago abierta. Revisa o extiende su plazo.",
    "Une demande de paiement est déjà ouverte. Vérifiez ou prolongez son échéance.",
    "Já existe uma solicitação de pagamento aberta. Revise ou estenda o prazo.",
    "이미 열린 결제 요청이 있습니다. 기한을 확인하거나 연장하세요.",
    "已有待处理的付款请求。请查看或延长期限。"
  ],
  "STRIPE_NOT_CONFIGURED": [
    "Complete the Stripe connection before requesting payment.",
    "Completa la conexión con Stripe antes de solicitar el pago.",
    "Terminez la connexion Stripe avant de demander un paiement.",
    "Conclua a conexão com o Stripe antes de solicitar pagamento.",
    "결제를 요청하기 전에 Stripe 연결을 완료하세요.",
    "请求付款前，请完成 Stripe 连接。"
  ],
  "STRIPE_ACCOUNT_NOT_READY": [
    "The Stripe account is not ready to accept payments.",
    "La cuenta de Stripe aún no puede aceptar pagos.",
    "Le compte Stripe n’est pas prêt à recevoir des paiements.",
    "A conta Stripe ainda não está pronta para receber pagamentos.",
    "Stripe 계정이 아직 결제를 받을 준비가 되지 않았습니다.",
    "Stripe 账户尚未准备好接收付款。"
  ],
  "STRIPE_CATALOG_MAINTENANCE": [
    "Wait until Stripe catalog maintenance is complete.",
    "Espera a que termine el mantenimiento del catálogo de Stripe.",
    "Attendez la fin de la maintenance du catalogue Stripe.",
    "Aguarde o término da manutenção do catálogo Stripe.",
    "Stripe 카탈로그 유지 관리가 완료될 때까지 기다리세요.",
    "请等待 Stripe 目录维护完成。"
  ],
  "STRIPE_VERIFICATION_UNAVAILABLE": [
    "Stripe could not verify this payment. Refresh and try again.",
    "Stripe no pudo verificar este pago. Actualiza e intenta de nuevo.",
    "Stripe n’a pas pu vérifier ce paiement. Actualisez et réessayez.",
    "O Stripe não pôde verificar este pagamento. Atualize e tente novamente.",
    "Stripe에서 결제를 확인할 수 없습니다. 새로 고친 후 다시 시도하세요.",
    "Stripe 无法核实此付款。请刷新并重试。"
  ],
  "MULTIPLE_STRIPE_SUBSCRIPTIONS": [
    "Review the account’s multiple Stripe subscriptions first.",
    "Primero revisa las múltiples suscripciones de Stripe de esta cuenta.",
    "Vérifiez d’abord les multiples abonnements Stripe du compte.",
    "Revise primeiro as múltiplas assinaturas Stripe da conta.",
    "먼저 계정의 여러 Stripe 구독을 확인하세요.",
    "请先检查此账户的多个 Stripe 订阅。"
  ],
  "PAID_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW": [
    "The account is already paid beyond the proposed seven-day deadline.",
    "La cuenta ya está pagada más allá del plazo propuesto de siete días.",
    "Ce compte est déjà payé au-delà de l’échéance proposée de sept jours.",
    "A conta já está paga além do prazo proposto de sete dias.",
    "계정은 제안된 7일 기한 이후까지 이미 결제되었습니다.",
    "此账户的已付款期限超过拟议的七天截止日期。"
  ],
  "TRIAL_EXTENDS_BEYOND_PAYMENT_WINDOW": [
    "The current trial extends beyond the proposed seven-day deadline.",
    "La prueba actual termina después del plazo propuesto de siete días.",
    "L’essai actuel dépasse l’échéance proposée de sept jours.",
    "O teste atual vai além do prazo proposto de sete dias.",
    "현재 체험 기간이 제안된 7일 기한 이후까지 이어집니다.",
    "当前试用期超过拟议的七天截止日期。"
  ],
  "TOO_MANY_OPEN_INVOICES": [
    "Review the account’s outstanding invoices before requesting payment.",
    "Revisa las facturas pendientes de la cuenta antes de solicitar el pago.",
    "Vérifiez les factures impayées du compte avant de demander un paiement.",
    "Revise as faturas pendentes da conta antes de solicitar pagamento.",
    "결제를 요청하기 전에 계정의 미결제 청구서를 검토하세요.",
    "请求付款前，请检查账户的未付账单。"
  ],
  "INVOICE_NOT_PAYABLE": [
    "The selected invoice can no longer be paid. Refresh its status.",
    "La factura seleccionada ya no se puede pagar. Actualiza su estado.",
    "La facture sélectionnée ne peut plus être payée. Actualisez son état.",
    "A fatura selecionada não pode mais ser paga. Atualize o status.",
    "선택한 청구서를 더 이상 결제할 수 없습니다. 상태를 새로 고침하세요.",
    "所选账单已无法付款。请刷新其状态。"
  ],
  "NO_PAYABLE_INVOICE": [
    "There is no outstanding invoice available to pay.",
    "No hay una factura pendiente disponible para pagar.",
    "Aucune facture impayée disponible à payer.",
    "Não há fatura pendente disponível para pagamento.",
    "결제 가능한 미결제 청구서가 없습니다.",
    "没有可支付的未付账单。"
  ],
  "MIXED_INVOICE_CURRENCIES": [
    "Outstanding invoices use different currencies and need separate review.",
    "Las facturas pendientes usan monedas distintas y necesitan revisión separada.",
    "Les factures impayées utilisent différentes devises et nécessitent un examen distinct.",
    "As faturas pendentes usam moedas diferentes e precisam de revisão separada.",
    "미결제 청구서의 통화가 달라 별도 검토가 필요합니다.",
    "未付账单使用不同币种，需要单独检查。"
  ],
  "ACTIVE_INDEFINITE_BENEFIT": [
    "The account has ongoing courtesy access. Review its benefits first.",
    "La cuenta tiene acceso de cortesía sin vencimiento. Primero revisa sus beneficios.",
    "Ce compte bénéficie d’un accès de courtoisie sans expiration. Vérifiez d’abord ses bénéfices.",
    "A conta tem acesso de cortesia sem vencimento. Revise os benefícios primeiro.",
    "계정에 만료 없는 무료 접근 권한이 있습니다. 먼저 혜택을 검토하세요.",
    "此账户有永久赠送访问权限。请先查看其权益。"
  ],
  "SELECTION_REQUIRED": [
    "Select the account’s subscription products first.",
    "Primero selecciona los productos de la suscripción de la cuenta.",
    "Sélectionnez d’abord les produits de l’abonnement du compte.",
    "Primeiro selecione os produtos da assinatura da conta.",
    "먼저 계정의 구독 제품을 선택하세요.",
    "请先选择账户的订阅产品。"
  ],
  "ACTIVATION_ALREADY_IN_PROGRESS": [
    "Complete or resolve the existing activation before requesting another payment.",
    "Completa o resuelve la activación existente antes de solicitar otro pago.",
    "Terminez ou réglez l’activation existante avant de demander un autre paiement.",
    "Conclua ou resolva a ativação existente antes de solicitar outro pagamento.",
    "다른 결제를 요청하기 전에 기존 활성화를 완료하거나 해결하세요.",
    "请求其他付款前，请完成或处理现有的启用流程。"
  ],
  "TRIAL_EXTENSION_IN_PROGRESS": [
    "Resolve the trial extension in progress before requesting payment.",
    "Resuelve la extensión de prueba en proceso antes de solicitar el pago.",
    "Terminez la prolongation d’essai en cours avant de demander un paiement.",
    "Resolva a extensão de teste em andamento antes de solicitar pagamento.",
    "결제를 요청하기 전에 진행 중인 체험 연장을 해결하세요.",
    "请求付款前，请处理进行中的试用延期。"
  ],
  "PROTECTED_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW": [
    "Existing access extends beyond the proposed seven-day deadline.",
    "El acceso vigente termina después del plazo propuesto de siete días.",
    "L’accès existant dépasse l’échéance proposée de sept jours.",
    "O acesso vigente vai além do prazo proposto de sete dias.",
    "기존 접근 권한이 제안된 7일 기한 이후까지 이어집니다.",
    "现有访问权限超过拟议的七天截止日期。"
  ],
  "SUBSCRIPTION_REFERENCE_INVALID": [
    "Review this account’s subscription configuration first.",
    "Primero revisa la configuración de suscripción de esta cuenta.",
    "Vérifiez d’abord la configuration d’abonnement de ce compte.",
    "Revise primeiro a configuração da assinatura desta conta.",
    "먼저 이 계정의 구독 설정을 확인하세요.",
    "请先检查此账户的订阅配置。"
  ],
  "CATALOG_NOT_PAYABLE": [
    "The selected subscription prices are not ready for payment.",
    "Los precios de la suscripción seleccionada aún no están listos para cobrarse.",
    "Les prix de l’abonnement sélectionné ne sont pas prêts pour le paiement.",
    "Os preços da assinatura selecionada ainda não estão prontos para cobrança.",
    "선택한 구독 가격이 아직 결제 준비가 되지 않았습니다.",
    "所选订阅价格尚未准备好用于付款。"
  ],
  "PROMOTION_NOT_PAYABLE": [
    "Review the subscription promotion before requesting payment.",
    "Revisa la promoción de la suscripción antes de solicitar el pago.",
    "Vérifiez la promotion de l’abonnement avant de demander un paiement.",
    "Revise a promoção da assinatura antes de solicitar pagamento.",
    "결제를 요청하기 전에 구독 프로모션을 확인하세요.",
    "请求付款前，请检查订阅促销。"
  ],
  "requestConflict": [
    "The request changed. Refresh the details and review the deadline before continuing.",
    "La solicitud cambió. Actualiza los datos y revisa el plazo antes de continuar.",
    "La demande a changé. Actualisez les détails et vérifiez l’échéance avant de continuer.",
    "A solicitação mudou. Atualize os dados e revise o prazo antes de continuar.",
    "요청이 변경되었습니다. 계속하기 전에 정보를 새로 고치고 기한을 확인하세요.",
    "请求已变更。继续前，请刷新详情并确认截止日期。"
  ]
} as const satisfies Record<string, readonly [string, string, string, string, string, string]>;
export type PaymentRequestMessage = keyof typeof messages;
export function paymentRequestLocale(value?: string | boolean): PaymentRequestLocale {
  if (typeof value === 'boolean') return value ? 'en-CA' : 'es-MX';
  return paymentRequestLocales.includes(value as PaymentRequestLocale) ? value as PaymentRequestLocale : 'en-CA';
}
export function getPaymentRequestCopy(value?: string | boolean) {
  const locale = paymentRequestLocale(value);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const t = (key: PaymentRequestMessage, values: Record<string, string | number> = {}) => {
    const template: string = messages[key][localeIndex[locale]];
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = values[name];
      return value == null ? placeholder : typeof value === 'number' ? number(value) : value;
    });
  };
  return { locale, t, number };
}
