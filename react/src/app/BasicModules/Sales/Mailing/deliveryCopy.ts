import { useLanguage } from "../../../shared/context";
const en = {
  waitingForQuota: "Waiting for sending capacity",
  quotaWaitHint:
    "This account has reached 30 sends in the last hour. Pending recipients resume automatically as capacity becomes available; checked every five minutes.",

  subjectRequired:
    "Add the email subject in the draft’s Content step. The campaign name is separate.",
  bodyRequired: "Write the email message in the draft’s Content step.",
  contentRequired:
    "Complete the sender account, subject and message in the draft before sending a test or campaign.",
  reviewChanged:
    "The campaign changed. Go back and refresh the review before sending.",
  testRecipientInvalid: "Enter a valid test email address.",

  senderRequired: "Choose a sender account in the campaign draft.",
  senderUnverified:
    "This account is selected, but its SMTP connection has not been verified. Open Email accounts and choose Test SMTP.",
  checkAccount: "Verify email account",
  editDraft: "Edit draft",
  footerRequired: "Enter the sender’s contact details and postal address.",
  recipientsRequired: "Select at least one eligible recipient.",
  sendPermissionRequired: "You do not have permission to send this campaign.",
  readyToReview: "Ready to review the send.",

  selectAll: "Select all",
  selectRecipient: "Select recipient",
  selectionHint:
    "Includes all pages. Invalid and duplicate addresses and unsubscribed contacts are excluded.",
  notSelected: "Not selected",
  recipients: "Recipients",
  title: "Delivery and results",
  note: "Choose recipients, review the message and send or schedule your campaign.",
  review: "Review send",
  launch: "Send campaign",
  schedule: "Schedule campaign",
  when: "Send date and time",
  now: "Send as soon as possible",
  footer: "Sender contact details and postal address",
  footerHint:
    "Included at the end of every email, together with the unsubscribe link.",
  selected: "Selected",
  eligible: "Eligible recipients",
  excluded: "Excluded",
  test: "Send a test",
  testTo: "Test recipient",
  confirmTest: "Send this test email?",
  confirm: "Confirm send",
  confirmHint:
    "Only selected recipients will be contacted. Content and addresses are fixed when sending starts. Limit: 30 submissions per hour per account.",
  pause: "Pause",
  resume: "Resume",
  cancel: "Cancel campaign",
  cancelHint:
    "Pending recipients will not be contacted. An email already being submitted may finish.",
  results: "Results",
  refresh: "Refresh",
  back: "Back",
  close: "Close",
  error:
    "Unable to complete the operation. Refresh the review and verify permissions and account settings.",
  senderMissing:
    "Select an account in the draft and verify SMTP in Email → Accounts.",
  publicMissing:
    "Campaign sending requires the application’s public HTTPS address so recipients can unsubscribe. Test emails are available.",
  testResult: "Test result",
  acceptedHint:
    "Accepted means accepted by SMTP; it does not confirm inbox delivery or opening.",
  unsaved: "Your changes have not been saved. Close this view?",
  stay: "Keep editing",
  leave: "Discard changes",
  states: {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    RUNNING: "Sending",
    PAUSED: "Paused",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    PENDING: "Pending",
    SUBMITTING: "Submitting",
    ACCEPTED: "Accepted by server",
    FAILED: "Failed",
    UNKNOWN: "Unconfirmed",
    SUPPRESSED: "Unsubscribed",
    READY: "Ready to send",
    CONSENT_REQUIRED: "Consent required",
    INVALID: "Invalid email",
    DUPLICATE: "Duplicate",
  },
};
type Copy = typeof en;
const es: Copy = {
  waitingForQuota: "En espera de cupo",
  quotaWaitHint:
    "La cuenta alcanzó 30 envíos en la última hora. Los pendientes continúan automáticamente al liberarse cupo; se comprueba cada cinco minutos.",

  subjectRequired:
    "Completa el asunto del correo en Contenido del borrador. El nombre de campaña es independiente.",
  bodyRequired: "Escribe el mensaje del correo en Contenido del borrador.",
  contentRequired:
    "Completa la cuenta remitente, el asunto y el mensaje del borrador antes de enviar una prueba o campaña.",
  reviewChanged:
    "La campaña cambió. Vuelve y actualiza la revisión antes de enviar.",
  testRecipientInvalid: "Escribe un correo válido para la prueba.",

  senderRequired: "Elige una cuenta remitente en el borrador de la campaña.",
  senderUnverified:
    "La cuenta está seleccionada, pero falta verificar su conexión SMTP. Abre Cuentas de correo y elige Probar SMTP.",
  checkAccount: "Verificar cuenta de correo",
  editDraft: "Editar borrador",
  footerRequired:
    "Completa los datos de contacto y la dirección postal del remitente.",
  recipientsRequired: "Selecciona al menos un destinatario habilitado.",
  sendPermissionRequired: "No tienes permiso para enviar esta campaña.",
  readyToReview: "Todo listo para revisar el envío.",

  selectAll: "Seleccionar todos",
  selectRecipient: "Seleccionar destinatario",
  selectionHint:
    "Incluye todas las páginas. Los correos inválidos, duplicados y las bajas quedan excluidos.",
  notSelected: "Sin seleccionar",
  recipients: "Destinatarios",
  title: "Envío y resultados",
  note: "Elige destinatarios, revisa el mensaje y envía o programa tu campaña.",
  review: "Revisar envío",
  launch: "Enviar campaña",
  schedule: "Programar campaña",
  when: "Fecha y hora de envío",
  now: "Enviar lo antes posible",
  footer: "Datos de contacto y dirección postal del remitente",
  footerHint:
    "Se incluyen al final de cada correo, junto con el enlace para darse de baja.",
  selected: "Seleccionados",
  eligible: "Destinatarios habilitados",
  excluded: "Excluidos",
  test: "Enviar prueba",
  testTo: "Destinatario de prueba",
  confirmTest: "¿Enviar este correo de prueba?",
  confirm: "Confirmar envío",
  confirmHint:
    "Se enviará únicamente a los destinatarios seleccionados. El contenido y las direcciones quedan fijos al iniciar. Límite: 30 envíos por hora y cuenta.",
  pause: "Pausar",
  resume: "Reanudar",
  cancel: "Cancelar campaña",
  cancelHint:
    "No se enviará a los destinatarios pendientes. Un correo que ya se esté enviando puede terminar.",
  results: "Resultados",
  refresh: "Actualizar",
  back: "Volver",
  close: "Cerrar",
  error:
    "No se pudo completar. Actualiza la revisión y verifica permisos y configuración de la cuenta.",
  senderMissing:
    "Elige una cuenta en el borrador y verifica SMTP en Correo → Cuentas.",
  publicMissing:
    "Para enviar campañas se requiere la dirección pública HTTPS de la aplicación, donde los destinatarios puedan darse de baja. Puedes enviar correos de prueba.",
  testResult: "Resultado de prueba",
  acceptedHint:
    "Aceptado significa que SMTP aceptó el correo; no confirma llegada a la bandeja ni apertura.",
  unsaved: "Hay cambios sin guardar. ¿Cerrar esta vista?",
  stay: "Seguir editando",
  leave: "Descartar cambios",
  states: {
    DRAFT: "Borrador",
    SCHEDULED: "Programada",
    RUNNING: "Enviando",
    PAUSED: "Pausada",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
    PENDING: "Pendiente",
    SUBMITTING: "Enviando",
    ACCEPTED: "Aceptado por el servidor",
    FAILED: "Falló",
    UNKNOWN: "Sin confirmar",
    SUPPRESSED: "Baja registrada",
    READY: "Listo para enviar",
    CONSENT_REQUIRED: "Falta consentimiento",
    INVALID: "Correo inválido",
    DUPLICATE: "Duplicado",
  },
};
const fr: Copy = {
  waitingForQuota: "En attente de capacité d’envoi",
  quotaWaitHint:
    "Ce compte a atteint 30 envois au cours de la dernière heure. Les envois en attente reprennent automatiquement selon la capacité disponible, vérifiée toutes les cinq minutes.",

  subjectRequired:
    "Ajoutez l’objet du courriel dans le contenu du brouillon. Le nom de la campagne est distinct.",
  bodyRequired: "Rédigez le message dans le contenu du brouillon.",
  contentRequired:
    "Complétez le compte expéditeur, l’objet et le message du brouillon avant tout envoi de test ou de campagne.",
  reviewChanged:
    "La campagne a changé. Revenez en arrière et actualisez la vérification avant l’envoi.",
  testRecipientInvalid: "Saisissez une adresse courriel de test valide.",

  senderRequired:
    "Choisissez un compte expéditeur dans le brouillon de la campagne.",
  senderUnverified:
    "Le compte est sélectionné, mais sa connexion SMTP doit être vérifiée. Ouvrez Comptes de courriel et choisissez Tester SMTP.",
  checkAccount: "Vérifier le compte de courriel",
  editDraft: "Modifier le brouillon",
  footerRequired:
    "Complétez les coordonnées et l’adresse postale de l’expéditeur.",
  recipientsRequired: "Sélectionnez au moins un destinataire admissible.",
  sendPermissionRequired:
    "Vous n’avez pas l’autorisation d’envoyer cette campagne.",
  readyToReview: "Tout est prêt pour vérifier l’envoi.",

  selectAll: "Tout sélectionner",
  selectRecipient: "Sélectionner le destinataire",
  selectionHint:
    "Inclut toutes les pages. Les adresses invalides, les doublons et les contacts désabonnés sont exclus.",
  notSelected: "Non sélectionnés",
  recipients: "Destinataires",
  title: "Envoi et résultats",
  note: "Choisissez les destinataires, vérifiez le message et envoyez ou programmez votre campagne.",
  review: "Vérifier l’envoi",
  launch: "Envoyer la campagne",
  schedule: "Planifier",
  when: "Date et heure",
  now: "Envoyer dès que possible",
  footer: "Coordonnées et adresse postale",
  footerHint: "Ajoutées à chaque courriel avec le lien de désabonnement.",
  selected: "Sélectionnés",
  eligible: "Destinataires admissibles",
  excluded: "Exclus",
  test: "Envoyer un test",
  testTo: "Destinataire du test",
  confirmTest: "Envoyer ce test?",
  confirm: "Confirmer l’envoi",
  confirmHint:
    "Seuls les destinataires sélectionnés seront contactés. Le contenu et les adresses sont figés au démarrage. Limite : 30 envois par heure et par compte.",
  pause: "Suspendre",
  resume: "Reprendre",
  cancel: "Annuler la campagne",
  cancelHint:
    "Les envois en attente seront annulés. Un envoi en cours peut se terminer.",
  results: "Résultats",
  refresh: "Actualiser",
  back: "Retour",
  close: "Fermer",
  error:
    "Opération impossible. Actualisez et vérifiez le compte et les autorisations.",
  senderMissing:
    "Choisissez un compte et vérifiez SMTP dans Courriel → Comptes.",
  publicMissing:
    "Les campagnes nécessitent une adresse HTTPS publique pour le désabonnement. Les tests restent disponibles.",
  testResult: "Résultat du test",
  acceptedHint: "Accepté par SMTP ne confirme ni livraison ni ouverture.",
  unsaved: "Modifications non enregistrées. Fermer?",
  stay: "Continuer",
  leave: "Abandonner",
  states: {
    DRAFT: "Brouillon",
    SCHEDULED: "Planifiée",
    RUNNING: "Envoi",
    PAUSED: "Suspendue",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
    PENDING: "En attente",
    SUBMITTING: "Transmission",
    ACCEPTED: "Accepté",
    FAILED: "Échec",
    UNKNOWN: "Non confirmé",
    SUPPRESSED: "Désabonné",
    READY: "Prêt à envoyer",
    CONSENT_REQUIRED: "Consentement requis",
    INVALID: "Courriel invalide",
    DUPLICATE: "Doublon",
  },
};
const pt: Copy = {
  waitingForQuota: "Aguardando disponibilidade de envio",
  quotaWaitHint:
    "A conta atingiu 30 envios na última hora. Os pendentes continuam automaticamente quando houver disponibilidade, verificada a cada cinco minutos.",

  subjectRequired:
    "Preencha o assunto do email no conteúdo do rascunho. O nome da campanha é separado.",
  bodyRequired: "Escreva a mensagem no conteúdo do rascunho.",
  contentRequired:
    "Preencha a conta remetente, o assunto e a mensagem do rascunho antes de enviar um teste ou campanha.",
  reviewChanged:
    "A campanha mudou. Volte e atualize a revisão antes de enviar.",
  testRecipientInvalid: "Informe um email válido para o teste.",

  senderRequired: "Escolha uma conta remetente no rascunho da campanha.",
  senderUnverified:
    "A conta está selecionada, mas falta verificar a conexão SMTP. Abra Contas de e-mail e escolha Testar SMTP.",
  checkAccount: "Verificar conta de e-mail",
  editDraft: "Editar rascunho",
  footerRequired:
    "Preencha os dados de contato e o endereço postal do remetente.",
  recipientsRequired: "Selecione pelo menos um destinatário habilitado.",
  sendPermissionRequired: "Você não tem permissão para enviar esta campanha.",
  readyToReview: "Tudo pronto para revisar o envio.",

  selectAll: "Selecionar todos",
  selectRecipient: "Selecionar destinatário",
  selectionHint:
    "Inclui todas as páginas. Endereços inválidos, duplicados e contatos descadastrados são excluídos.",
  notSelected: "Não selecionados",
  recipients: "Destinatários",
  title: "Envio e resultados",
  note: "Escolha os destinatários, revise a mensagem e envie ou agende sua campanha.",
  review: "Revisar envio",
  launch: "Enviar campanha",
  schedule: "Agendar campanha",
  when: "Data e hora",
  now: "Enviar assim que possível",
  footer: "Contato e endereço postal do remetente",
  footerHint: "Incluídos no fim de cada email com o link de cancelamento.",
  selected: "Selecionados",
  eligible: "Destinatários habilitados",
  excluded: "Excluídos",
  test: "Enviar teste",
  testTo: "Destinatário do teste",
  confirmTest: "Enviar este teste?",
  confirm: "Confirmar envio",
  confirmHint:
    "Somente os destinatários selecionados serão contatados. Conteúdo e endereços ficam fixos ao iniciar. Limite: 30 envios por hora por conta.",
  pause: "Pausar",
  resume: "Retomar",
  cancel: "Cancelar campanha",
  cancelHint:
    "Pendentes não serão enviados. Um envio já iniciado pode terminar.",
  results: "Resultados",
  refresh: "Atualizar",
  back: "Voltar",
  close: "Fechar",
  error: "Não foi possível concluir. Atualize e verifique permissões e conta.",
  senderMissing: "Escolha uma conta e verifique SMTP em Email → Contas.",
  publicMissing:
    "Campanhas exigem endereço HTTPS público para cancelar a inscrição. Testes estão disponíveis.",
  testResult: "Resultado do teste",
  acceptedHint: "Aceito por SMTP não confirma entrega ou abertura.",
  unsaved: "Alterações não salvas. Fechar?",
  stay: "Continuar editando",
  leave: "Descartar",
  states: {
    DRAFT: "Rascunho",
    SCHEDULED: "Agendada",
    RUNNING: "Enviando",
    PAUSED: "Pausada",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
    PENDING: "Pendente",
    SUBMITTING: "Enviando",
    ACCEPTED: "Aceito pelo servidor",
    FAILED: "Falhou",
    UNKNOWN: "Não confirmado",
    SUPPRESSED: "Inscrição cancelada",
    READY: "Pronto para enviar",
    CONSENT_REQUIRED: "Consentimento necessário",
    INVALID: "Email inválido",
    DUPLICATE: "Duplicado",
  },
};
const ko: Copy = {
  waitingForQuota: "발송 한도 대기 중",
  quotaWaitHint:
    "이 계정은 지난 한 시간 동안 30회 발송 한도에 도달했습니다. 한도가 확보되면 대기 중인 발송이 자동으로 재개되며 5분마다 확인합니다.",

  subjectRequired:
    "초안의 콘텐츠 단계에서 이메일 제목을 입력하세요. 캠페인 이름과는 별개입니다.",
  bodyRequired: "초안의 콘텐츠 단계에서 이메일 메시지를 작성하세요.",
  contentRequired:
    "테스트 또는 캠페인을 보내기 전에 초안의 발신 계정, 제목 및 메시지를 완성하세요.",
  reviewChanged:
    "캠페인이 변경되었습니다. 뒤로 돌아가 검토 내용을 새로 고친 후 발송하세요.",
  testRecipientInvalid: "유효한 테스트 이메일 주소를 입력하세요.",

  senderRequired: "캠페인 초안에서 발신 계정을 선택하세요.",
  senderUnverified:
    "계정은 선택되었지만 SMTP 연결을 확인해야 합니다. 이메일 계정을 열고 SMTP 테스트를 선택하세요.",
  checkAccount: "이메일 계정 확인",
  editDraft: "초안 편집",
  footerRequired: "발신자의 연락처와 우편 주소를 입력하세요.",
  recipientsRequired: "발송 가능한 수신자를 한 명 이상 선택하세요.",
  sendPermissionRequired: "이 캠페인을 발송할 권한이 없습니다.",
  readyToReview: "발송을 검토할 준비가 되었습니다.",

  selectAll: "모두 선택",
  selectRecipient: "수신자 선택",
  selectionHint:
    "모든 페이지에 적용됩니다. 잘못된 주소, 중복 주소 및 수신 거부 연락처는 제외됩니다.",
  notSelected: "선택하지 않음",
  recipients: "수신자",
  title: "발송 및 결과",
  note: "수신자를 선택하고 메시지를 검토한 후 캠페인을 보내거나 예약하세요.",
  review: "발송 검토",
  launch: "캠페인 보내기",
  schedule: "예약 발송",
  when: "발송 날짜 및 시간",
  now: "가능한 한 빨리 발송",
  footer: "발신자 연락처 및 우편 주소",
  footerHint: "수신 거부 링크와 함께 각 이메일에 포함됩니다.",
  selected: "선택됨",
  eligible: "발송 가능 수신자",
  excluded: "제외됨",
  test: "테스트 발송",
  testTo: "테스트 수신자",
  confirmTest: "테스트 메일을 발송할까요?",
  confirm: "발송 확인",
  confirmHint:
    "선택한 수신자에게만 발송됩니다. 발송을 시작하면 내용과 주소가 고정됩니다. 계정당 시간당 30건으로 제한됩니다.",
  pause: "일시 중지",
  resume: "재개",
  cancel: "캠페인 취소",
  cancelHint:
    "대기 중인 발송은 취소됩니다. 진행 중인 발송은 완료될 수 있습니다.",
  results: "결과",
  refresh: "새로 고침",
  back: "뒤로",
  close: "닫기",
  error: "완료하지 못했습니다. 계정 및 권한을 확인하세요.",
  senderMissing: "계정을 선택하고 이메일 → 계정에서 SMTP를 확인하세요.",
  publicMissing:
    "수신 거부를 위한 공개 HTTPS 주소가 필요합니다. 테스트 발송은 가능합니다.",
  testResult: "테스트 결과",
  acceptedHint: "SMTP 수락은 배달이나 열람 확인이 아닙니다.",
  unsaved: "저장되지 않은 변경사항이 있습니다. 닫을까요?",
  stay: "계속 편집",
  leave: "변경 취소",
  states: {
    DRAFT: "초안",
    SCHEDULED: "예약됨",
    RUNNING: "발송 중",
    PAUSED: "일시 중지",
    COMPLETED: "완료",
    CANCELLED: "취소",
    PENDING: "대기",
    SUBMITTING: "전송 중",
    ACCEPTED: "서버 수락",
    FAILED: "실패",
    UNKNOWN: "미확인",
    SUPPRESSED: "수신 거부",
    READY: "발송 가능",
    CONSENT_REQUIRED: "동의 필요",
    INVALID: "잘못된 주소",
    DUPLICATE: "중복",
  },
};
const zh: Copy = {
  waitingForQuota: "等待发送额度",
  quotaWaitHint:
    "此账户在过去一小时内已发送30封邮件。额度释放后将自动继续发送待处理邮件，每五分钟检查一次。",

  subjectRequired:
    "请在草稿的内容步骤中填写邮件主题。营销活动名称是单独的字段。",
  bodyRequired: "请在草稿的内容步骤中填写邮件正文。",
  contentRequired: "发送测试或营销活动前，请完善草稿中的发件账户、主题和正文。",
  reviewChanged: "营销活动已更改。请返回并刷新审核内容后再发送。",
  testRecipientInvalid: "请输入有效的测试邮箱地址。",

  senderRequired: "请在营销活动草稿中选择发件账户。",
  senderUnverified:
    "账户已选定，但尚需验证 SMTP 连接。请打开邮件账户并选择测试 SMTP。",
  checkAccount: "验证邮件账户",
  editDraft: "编辑草稿",
  footerRequired: "请填写发件人的联系方式和邮寄地址。",
  recipientsRequired: "请至少选择一名可发送的收件人。",
  sendPermissionRequired: "您没有发送此营销活动的权限。",
  readyToReview: "已准备好审核发送。",

  selectAll: "全选",
  selectRecipient: "选择收件人",
  selectionHint: "包括所有页面。无效地址、重复地址及已退订的联系人将被排除。",
  notSelected: "未选择",
  recipients: "收件人",
  title: "发送与结果",
  note: "选择收件人、检查邮件，然后发送或安排活动。",
  review: "检查发送",
  launch: "发送活动",
  schedule: "预约发送",
  when: "发送日期与时间",
  now: "尽快发送",
  footer: "发件人联系方式和邮政地址",
  footerHint: "与退订链接一起添加到每封邮件末尾。",
  selected: "已选择",
  eligible: "可发送收件人",
  excluded: "已排除",
  test: "发送测试",
  testTo: "测试收件人",
  confirmTest: "发送此测试邮件？",
  confirm: "确认发送",
  confirmHint:
    "仅向所选收件人发送。开始发送后内容和地址将固定。每个账户每小时最多发送30封。",
  pause: "暂停",
  resume: "继续",
  cancel: "取消活动",
  cancelHint: "不会发送待处理邮件，正在发送的邮件可能完成。",
  results: "结果",
  refresh: "刷新",
  back: "返回",
  close: "关闭",
  error: "无法完成，请检查账户与权限。",
  senderMissing: "请选择账户并在邮件 → 账户中验证SMTP。",
  publicMissing: "活动需要公开HTTPS地址以提供退订功能。仍可发送测试邮件。",
  testResult: "测试结果",
  acceptedHint: "SMTP接受不代表送达或打开。",
  unsaved: "有未保存的更改，关闭吗？",
  stay: "继续编辑",
  leave: "放弃更改",
  states: {
    DRAFT: "草稿",
    SCHEDULED: "已预约",
    RUNNING: "发送中",
    PAUSED: "已暂停",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
    PENDING: "待处理",
    SUBMITTING: "正在提交",
    ACCEPTED: "服务器已接受",
    FAILED: "失败",
    UNKNOWN: "未确认",
    SUPPRESSED: "已退订",
    READY: "可发送",
    CONSENT_REQUIRED: "需要同意",
    INVALID: "无效地址",
    DUPLICATE: "重复",
  },
};
export function useDeliveryCopy() {
  const { currentLanguage } = useLanguage();
  return (
    ({ en, es, fr, pt, ko, zh } as Record<string, Copy>)[
      currentLanguage.code.split("-")[0]
    ] ?? en
  );
}
export type DeliveryCopy = Copy;
