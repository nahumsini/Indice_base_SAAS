import { useLanguage } from "../../../shared/context";

const en = {
  edit: "Edit campaign",
  step: "Step {current} of {total}",
  detailsHint:
    "Name your campaign and choose how customers will recognize you.",
  audienceHint: "Choose Sales contacts or add a saved recipient list.",
  contentHint: "Prepare the subject and message your contacts will receive.",
  reviewHint: "Review your draft before moving on to the sending checks.",
  identity: "Campaign identity",
  nameHint:
    "An internal name to find this campaign. Your contacts will not see it.",
  namePlaceholder: "E.g. October follow-up · New customers",
  sender: "Sender",
  senderHint: "Choose one of your accounts connected in Email.",
  senderNameHint: "The name your contacts will see in their inbox.",
  replyToHint: "Customer replies will arrive at this address.",
  draftHint:
    "Save your progress at any step. Sending is reviewed separately at the end.",
  configureHint: "Your draft is saved before opening the account settings.",
  discardHint:
    "Your latest unsaved changes will be lost. You can continue editing to keep them.",
  summary: "Campaign summary",
  messagePreview: "Message preview",
  contentMethod: "How would you like to prepare this email?",
  writeFromScratch: "Write from scratch",
  useTemplate: "Use a template",
  writeHint: "Write your subject and message below. Switching options keeps your draft.",
  templateHint: "Choose and preview a template. Your message changes only when you select Apply template.",

};
type Copy = typeof en;
const es: Copy = {
  edit: "Editar campaña",
  step: "Paso {current} de {total}",
  detailsHint:
    "Identifica tu campaña y elige cómo te reconocerán tus clientes.",
  audienceHint:
    "Elige contactos de Ventas o agrega una lista de destinatarios guardada.",
  contentHint: "Prepara el asunto y el mensaje que recibirán tus contactos.",
  reviewHint:
    "Revisa el borrador antes de pasar a las comprobaciones del envío.",
  identity: "Identifica tu campaña",
  nameHint:
    "Nombre interno para encontrar esta campaña. Tus contactos no lo verán.",
  namePlaceholder: "Ej. Seguimiento de octubre · Clientes nuevos",
  sender: "Remitente",
  senderHint: "Elige una de tus cuentas conectadas en Correo electrónico.",
  senderNameHint: "Es el nombre que tus contactos verán en su bandeja.",
  replyToHint: "Las respuestas de tus clientes llegarán a esta dirección.",
  draftHint:
    "Guarda tu avance en cualquier paso. Al terminar revisarás el envío por separado.",
  configureHint:
    "Tu borrador se guarda antes de abrir la configuración de la cuenta.",
  discardHint:
    "Se perderán los últimos cambios sin guardar. Puedes seguir editando para conservarlos.",
  summary: "Resumen de campaña",
  messagePreview: "Vista previa del mensaje",
  contentMethod: "¿Cómo quieres preparar este correo?",
  writeFromScratch: "Escribir desde cero",
  useTemplate: "Usar plantilla",
  writeHint: "Escribe el asunto y el mensaje abajo. Cambiar de opción conserva tu borrador.",
  templateHint: "Elige una plantilla y revisa su vista previa. Tu mensaje cambia solo al pulsar Aplicar plantilla.",

};
const fr: Copy = {
  edit: "Modifier la campagne",
  step: "Étape {current} sur {total}",
  detailsHint:
    "Nommez votre campagne et choisissez comment vos clients vous reconnaîtront.",
  audienceHint:
    "Choisissez des contacts de Ventes ou ajoutez une liste enregistrée.",
  contentHint: "Préparez l’objet et le message que recevront vos contacts.",
  reviewHint: "Vérifiez le brouillon avant de passer aux contrôles d’envoi.",
  identity: "Identifiez votre campagne",
  nameHint:
    "Un nom interne pour retrouver cette campagne. Vos contacts ne le verront pas.",
  namePlaceholder: "Ex. Suivi d’octobre · Nouveaux clients",
  sender: "Expéditeur",
  senderHint: "Choisissez un de vos comptes connectés dans Courriel.",
  senderNameHint:
    "Le nom que vos contacts verront dans leur boîte de réception.",
  replyToHint: "Les réponses de vos clients arriveront à cette adresse.",
  draftHint:
    "Enregistrez à chaque étape. L’envoi sera vérifié séparément à la fin.",
  configureHint:
    "Votre brouillon est enregistré avant l’ouverture des paramètres du compte.",
  discardHint:
    "Les dernières modifications non enregistrées seront perdues. Continuez à modifier pour les conserver.",
  summary: "Résumé de la campagne",
  messagePreview: "Aperçu du message",
  contentMethod: "Comment préparer cet e-mail ?",
  writeFromScratch: "Rédiger librement",
  useTemplate: "Utiliser un modèle",
  writeHint: "Rédigez l’objet et le message ci-dessous. Changer d’option conserve le brouillon.",
  templateHint: "Choisissez un modèle et vérifiez l’aperçu. Le message change uniquement en cliquant sur Appliquer le modèle.",

};
const pt: Copy = {
  edit: "Editar campanha",
  step: "Etapa {current} de {total}",
  detailsHint:
    "Identifique sua campanha e escolha como seus clientes reconhecerão você.",
  audienceHint:
    "Escolha contatos de Vendas ou adicione uma lista de destinatários salva.",
  contentHint: "Prepare o assunto e a mensagem que seus contatos receberão.",
  reviewHint: "Revise o rascunho antes de passar às verificações de envio.",
  identity: "Identifique sua campanha",
  nameHint:
    "Um nome interno para encontrar esta campanha. Seus contatos não o verão.",
  namePlaceholder: "Ex. Acompanhamento de outubro · Novos clientes",
  sender: "Remetente",
  senderHint: "Escolha uma de suas contas conectadas em E-mail.",
  senderNameHint: "O nome que seus contatos verão na caixa de entrada.",
  replyToHint: "As respostas dos clientes chegarão a este endereço.",
  draftHint:
    "Salve seu progresso em qualquer etapa. O envio será revisado separadamente ao final.",
  configureHint:
    "Seu rascunho é salvo antes de abrir as configurações da conta.",
  discardHint:
    "As últimas alterações não salvas serão perdidas. Continue editando para mantê-las.",
  summary: "Resumo da campanha",
  messagePreview: "Prévia da mensagem",
  contentMethod: "Como deseja preparar este e-mail?",
  writeFromScratch: "Escrever do zero",
  useTemplate: "Usar modelo",
  writeHint: "Escreva o assunto e a mensagem abaixo. Trocar de opção mantém o rascunho.",
  templateHint: "Escolha um modelo e confira a prévia. A mensagem só muda ao clicar em Aplicar modelo.",

};
const ko: Copy = {
  edit: "캠페인 수정",
  step: "{total}단계 중 {current}단계",
  detailsHint: "캠페인 이름과 고객에게 표시할 발신자 정보를 정하세요.",
  audienceHint: "영업 연락처를 선택하거나 저장된 수신자 목록을 추가하세요.",
  contentHint: "연락처에 보낼 제목과 메시지를 작성하세요.",
  reviewHint: "발송 점검으로 넘어가기 전에 초안을 확인하세요.",
  identity: "캠페인 식별",
  nameHint: "캠페인을 찾기 위한 내부 이름입니다. 연락처에는 표시되지 않습니다.",
  namePlaceholder: "예: 10월 후속 안내 · 신규 고객",
  sender: "발신자",
  senderHint: "이메일에 연결된 본인의 계정을 선택하세요.",
  senderNameHint: "연락처의 받은편지함에 표시되는 이름입니다.",
  replyToHint: "고객의 답장은 이 주소로 도착합니다.",
  draftHint:
    "어느 단계에서든 저장할 수 있습니다. 마지막에 발송을 별도로 검토합니다.",
  configureHint: "계정 설정을 열기 전에 초안이 저장됩니다.",
  discardHint:
    "저장하지 않은 최근 변경 사항이 사라집니다. 유지하려면 계속 편집하세요.",
  summary: "캠페인 요약",
  messagePreview: "메시지 미리보기",
  contentMethod: "이메일을 어떻게 작성할까요?",
  writeFromScratch: "직접 작성",
  useTemplate: "템플릿 사용",
  writeHint: "아래에서 제목과 메시지를 작성하세요. 옵션을 바꿔도 초안은 유지됩니다.",
  templateHint: "템플릿을 선택하고 미리 보세요. 템플릿 적용을 눌러야 메시지가 변경됩니다.",

};
const zh: Copy = {
  edit: "编辑营销活动",
  step: "第 {current} 步，共 {total} 步",
  detailsHint: "命名营销活动，并选择客户看到的发件人信息。",
  audienceHint: "选择销售联系人或添加已保存的收件人列表。",
  contentHint: "准备联系人将收到的主题和正文。",
  reviewHint: "进入发送检查前，请先核对草稿。",
  identity: "标识营销活动",
  nameHint: "用于查找活动的内部名称，联系人不会看到。",
  namePlaceholder: "例如：十月跟进 · 新客户",
  sender: "发件人",
  senderHint: "选择您在电子邮件模块中连接的账户。",
  senderNameHint: "联系人将在收件箱中看到此名称。",
  replyToHint: "客户的回复将发送到此地址。",
  draftHint: "您可以在任意步骤保存进度，最后单独审核发送。",
  configureHint: "打开账户设置前会先保存草稿。",
  discardHint: "最近未保存的更改将丢失。您可以继续编辑以保留更改。",
  summary: "营销活动摘要",
  messagePreview: "邮件预览",
  contentMethod: "如何准备这封邮件？",
  writeFromScratch: "从头撰写",
  useTemplate: "使用模板",
  writeHint: "在下方填写主题和正文。切换选项会保留草稿。",
  templateHint: "选择模板并查看预览。仅点击应用模板后才会替换邮件内容。",

};
export function useCampaignEditorCopy(): Copy {
  const { currentLanguage } = useLanguage();
  return (
    ({ en, es, fr, pt, ko, zh } as Record<string, Copy>)[
      currentLanguage.code.split("-")[0]
    ] ?? en
  );
}
