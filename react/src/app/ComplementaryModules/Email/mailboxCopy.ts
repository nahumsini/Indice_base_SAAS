import { useLanguage } from '../../shared/context';
const en = {
  moveUnsupported: 'This server does not support moving messages from Índice. Use your provider’s mailbox.',
  account: 'Mailbox account', sync: 'Sync mail', syncing: 'Synchronizing…', neverSynced: 'Not synchronized yet', lastSync: 'Last synchronized',
  start: 'Bring your messages into Índice', startHint: 'Synchronize to load the latest 50 messages. You can load older messages from each folder.',
  imapRequired: 'Configure IMAP to receive messages. You can still create drafts and send through SMTP.',
  outbox: 'Sending status', moreFolders: 'Server folders', chooseFolder: 'Choose a folder', older: 'Load older mail', previous: 'Previous', next: 'Next',
  loadError: 'Unable to load the mailbox. Try again.', operationError: 'The operation could not be completed. Check the connection and try again.',
  busyError: 'Another operation is running for this account. Wait a moment and try again.', conflict: 'The account or message changed. Reload it before continuing.',
  rateError: 'The account limit was reached. Wait before trying again.', accessError: 'You no longer have access to this account.',
  syncDone: 'Mailbox synchronized.', syncedHint: 'Showing synchronized messages. Refresh to retrieve changes from your server.',
  composerTitle: 'Write email', composerHint: 'Write your message and save it as a draft or review it before sending.',
  cc: 'Cc', bcc: 'Bcc', recipientsHint: 'Separate email addresses with commas. Up to 20 recipients in total.',
  draftSaved: 'Draft saved.', sendReview: 'Review send', sendNow: 'Send email', reviewTitle: 'Send this email?', reviewHint: 'Check the account, recipients and content. Sending will contact these recipients.',
  invalid: 'Use valid, unique email addresses. Sending also requires a subject and message.',
  accepted: 'Accepted by the mail server', acceptedHint: 'Your server accepted the message. This does not confirm delivery to the recipient. The sent copy is saved in Índice.',
  failed: 'Could not submit', failedHint: 'The connection failed before submission. You can create a new draft from this message.',
  unknown: 'Unconfirmed result', unknownHint: 'The server may have received this email. Check with your provider before composing another copy; it will not be retried automatically.',
  submitting: 'Submission in progress', submittingHint: 'The send request is recorded. Refresh to check its result.',
  draft: 'Draft', received: 'Received', plainText: 'Safe text view', truncated: 'This message is long; only its first section is displayed.',
  attachments: 'This message contains attachments. Open your provider’s mailbox to download them in this version.',
  replyAll: 'Reply all', editDraft: 'Edit draft', copyDraft: 'Create new draft', deleteDraft: 'Discard draft', deleteTitle: 'Discard this draft?', deleteHint: 'The draft will leave the active list. No email will be sent.',
  from: 'From', searchHint: 'Sender or subject', saveError: 'Unable to save. Your changes remain here.', sendCheck: 'Unable to confirm the result. Keep this message open and check its status before trying again.',
  checkResult: 'Check result', noBody: 'No text content.', moveDone: 'Message moved. Synchronize the destination folder to see it.',
};
export type MailboxCopy = typeof en;
const es: MailboxCopy = {
  moveUnsupported: 'Este servidor no admite mover mensajes desde Índice. Usa el buzón de tu proveedor.',
  account: 'Cuenta del buzón', sync: 'Sincronizar correo', syncing: 'Sincronizando…', neverSynced: 'Sin sincronizar', lastSync: 'Última sincronización',
  start: 'Trae tus mensajes a Índice', startHint: 'Sincroniza para cargar los 50 mensajes más recientes. Puedes cargar correos anteriores desde cada carpeta.',
  imapRequired: 'Configura IMAP para recibir mensajes. Puedes guardar borradores y enviar mediante SMTP.',
  outbox: 'Estado de envíos', moreFolders: 'Carpetas del servidor', chooseFolder: 'Elegir carpeta', older: 'Cargar correos anteriores', previous: 'Anterior', next: 'Siguiente',
  loadError: 'No se pudo cargar el buzón. Intenta de nuevo.', operationError: 'No se pudo completar la operación. Revisa la conexión e intenta de nuevo.',
  busyError: 'Hay otra operación en curso para esta cuenta. Espera un momento e intenta de nuevo.', conflict: 'La cuenta o el mensaje cambió. Vuelve a cargarlo antes de continuar.',
  rateError: 'Se alcanzó el límite de la cuenta. Espera antes de intentar de nuevo.', accessError: 'Ya no tienes acceso a esta cuenta.',
  syncDone: 'Buzón sincronizado.', syncedHint: 'Se muestran los mensajes sincronizados. Actualiza para obtener los cambios del servidor.',
  composerTitle: 'Redactar correo', composerHint: 'Escribe tu mensaje y guárdalo como borrador o revísalo antes de enviarlo.',
  cc: 'CC', bcc: 'CCO', recipientsHint: 'Separa los correos con comas. Hasta 20 destinatarios en total.',
  draftSaved: 'Borrador guardado.', sendReview: 'Revisar envío', sendNow: 'Enviar correo', reviewTitle: '¿Enviar este correo?', reviewHint: 'Revisa la cuenta, los destinatarios y el contenido. El envío contactará a estas personas.',
  invalid: 'Usa correos válidos y sin duplicados. Para enviar también se requiere asunto y mensaje.',
  accepted: 'Aceptado por el servidor', acceptedHint: 'Tu servidor aceptó el mensaje. Esto no confirma que el destinatario lo haya recibido. La copia enviada queda guardada en Índice.',
  failed: 'No se pudo enviar', failedHint: 'La conexión falló antes de enviar. Puedes crear un nuevo borrador a partir de este mensaje.',
  unknown: 'Resultado sin confirmar', unknownHint: 'El servidor pudo haber recibido este correo. Verifícalo con tu proveedor antes de crear otra copia; no se reintentará automáticamente.',
  submitting: 'Envío en curso', submittingHint: 'La solicitud está registrada. Actualiza para consultar su resultado.',
  draft: 'Borrador', received: 'Recibido', plainText: 'Vista de texto segura', truncated: 'Este mensaje es extenso; se muestra solo la primera parte.',
  attachments: 'Este mensaje tiene adjuntos. En esta versión, abre el buzón de tu proveedor para descargarlos.',
  replyAll: 'Responder a todos', editDraft: 'Editar borrador', copyDraft: 'Crear nuevo borrador', deleteDraft: 'Descartar borrador', deleteTitle: '¿Descartar este borrador?', deleteHint: 'El borrador saldrá de la lista activa. No se enviará ningún correo.',
  from: 'De', searchHint: 'Remitente o asunto', saveError: 'No se pudo guardar. Tus cambios permanecen aquí.', sendCheck: 'No se pudo confirmar el resultado. Conserva este mensaje abierto y consulta su estado antes de volver a intentar.',
  checkResult: 'Consultar resultado', noBody: 'Sin contenido de texto.', moveDone: 'Mensaje movido. Sincroniza la carpeta de destino para verlo.',
};
const fr: MailboxCopy = {
  moveUnsupported: 'Ce serveur ne permet pas de déplacer les messages depuis Índice. Utilisez la boîte du fournisseur.',
  account: 'Compte de messagerie', sync: 'Synchroniser', syncing: 'Synchronisation…', neverSynced: 'Pas encore synchronisé', lastSync: 'Dernière synchronisation',
  start: 'Retrouvez vos messages dans Índice', startHint: 'Chargez les 50 messages les plus récents, puis les messages antérieurs de chaque dossier.', imapRequired: 'Configurez IMAP pour recevoir. Les brouillons et l’envoi SMTP restent disponibles.',
  outbox: 'État des envois', moreFolders: 'Dossiers du serveur', chooseFolder: 'Choisir un dossier', older: 'Charger les anciens messages', previous: 'Précédent', next: 'Suivant',
  loadError: 'Impossible de charger la boîte. Réessayez.', operationError: 'Opération impossible. Vérifiez la connexion.', busyError: 'Une autre opération est en cours. Patientez.', conflict: 'Le compte ou message a changé. Rechargez-le.', rateError: 'Limite atteinte. Patientez avant de réessayer.', accessError: 'Vous n’avez plus accès à ce compte.',
  syncDone: 'Boîte synchronisée.', syncedHint: 'Messages synchronisés. Actualisez pour récupérer les changements du serveur.', composerTitle: 'Rédiger un courriel', composerHint: 'Enregistrez un brouillon ou vérifiez le message avant l’envoi.', cc: 'Cc', bcc: 'Cci', recipientsHint: 'Séparez les adresses par des virgules. Maximum 20 destinataires.',
  draftSaved: 'Brouillon enregistré.', sendReview: 'Vérifier l’envoi', sendNow: 'Envoyer', reviewTitle: 'Envoyer ce courriel?', reviewHint: 'Vérifiez le compte, les destinataires et le contenu. Ces personnes recevront votre envoi.', invalid: 'Utilisez des adresses valides et uniques. L’envoi exige un objet et un message.',
  accepted: 'Accepté par le serveur', acceptedHint: 'Le serveur a accepté le message; la réception n’est pas confirmée. La copie envoyée est conservée dans Índice.', failed: 'Envoi impossible', failedHint: 'La connexion a échoué avant l’envoi. Vous pouvez créer un nouveau brouillon.', unknown: 'Résultat non confirmé', unknownHint: 'Le serveur a peut-être reçu le message. Vérifiez auprès du fournisseur avant de créer une copie. Aucun nouvel essai automatique.', submitting: 'Envoi en cours', submittingHint: 'La demande est enregistrée. Actualisez pour voir le résultat.',
  draft: 'Brouillon', received: 'Reçu', plainText: 'Texte sécurisé', truncated: 'Seule la première partie de ce long message est affichée.', attachments: 'Ce message contient des pièces jointes. Téléchargez-les depuis la boîte de votre fournisseur dans cette version.', replyAll: 'Répondre à tous', editDraft: 'Modifier le brouillon', copyDraft: 'Créer un brouillon', deleteDraft: 'Abandonner le brouillon', deleteTitle: 'Abandonner ce brouillon?', deleteHint: 'Le brouillon quittera la liste active. Aucun courriel ne sera envoyé.', from: 'De', searchHint: 'Expéditeur ou objet', saveError: 'Enregistrement impossible. Vos modifications sont conservées ici.', sendCheck: 'Résultat non confirmé. Gardez le message ouvert et vérifiez son état.', checkResult: 'Vérifier le résultat', noBody: 'Aucun texte.', moveDone: 'Message déplacé. Synchronisez le dossier de destination.',
};
const pt: MailboxCopy = {
  moveUnsupported: 'Este servidor não permite mover mensagens pelo Índice. Use a caixa do provedor.',
  account: 'Conta de e-mail', sync: 'Sincronizar e-mail', syncing: 'Sincronizando…', neverSynced: 'Ainda não sincronizado', lastSync: 'Última sincronização', start: 'Traga suas mensagens para o Índice', startHint: 'Carregue as 50 mensagens mais recentes e depois as anteriores de cada pasta.', imapRequired: 'Configure IMAP para receber. Rascunhos e envio SMTP continuam disponíveis.',
  outbox: 'Estado dos envios', moreFolders: 'Pastas do servidor', chooseFolder: 'Escolher pasta', older: 'Carregar mensagens anteriores', previous: 'Anterior', next: 'Próxima', loadError: 'Não foi possível carregar a caixa. Tente novamente.', operationError: 'Não foi possível concluir. Confira a conexão.', busyError: 'Outra operação está em andamento. Aguarde.', conflict: 'A conta ou mensagem mudou. Recarregue.', rateError: 'Limite atingido. Aguarde antes de tentar.', accessError: 'Você não tem mais acesso a esta conta.',
  syncDone: 'Caixa sincronizada.', syncedHint: 'Mensagens sincronizadas. Atualize para buscar alterações do servidor.', composerTitle: 'Escrever e-mail', composerHint: 'Salve um rascunho ou revise a mensagem antes de enviar.', cc: 'Cc', bcc: 'Cco', recipientsHint: 'Separe os e-mails por vírgulas. Até 20 destinatários.', draftSaved: 'Rascunho salvo.', sendReview: 'Revisar envio', sendNow: 'Enviar e-mail', reviewTitle: 'Enviar este e-mail?', reviewHint: 'Confira a conta, destinatários e conteúdo. Estas pessoas serão contatadas.', invalid: 'Use e-mails válidos e únicos. O envio exige assunto e mensagem.',
  accepted: 'Aceito pelo servidor', acceptedHint: 'O servidor aceitou a mensagem; a entrega não está confirmada. A cópia enviada fica no Índice.', failed: 'Falha no envio', failedHint: 'A conexão falhou antes do envio. Você pode criar outro rascunho.', unknown: 'Resultado não confirmado', unknownHint: 'O servidor pode ter recebido o e-mail. Consulte o provedor antes de criar outra cópia. Não haverá nova tentativa automática.', submitting: 'Envio em andamento', submittingHint: 'A solicitação foi registrada. Atualize para ver o resultado.', draft: 'Rascunho', received: 'Recebido', plainText: 'Texto seguro', truncated: 'Esta mensagem é longa; apenas a primeira parte é exibida.', attachments: 'Esta mensagem contém anexos. Nesta versão, baixe-os na caixa do provedor.',
  replyAll: 'Responder a todos', editDraft: 'Editar rascunho', copyDraft: 'Criar novo rascunho', deleteDraft: 'Descartar rascunho', deleteTitle: 'Descartar este rascunho?', deleteHint: 'O rascunho sairá da lista ativa. Nenhum e-mail será enviado.', from: 'De', searchHint: 'Remetente ou assunto', saveError: 'Não foi possível salvar. Suas alterações continuam aqui.', sendCheck: 'Resultado não confirmado. Mantenha a mensagem aberta e consulte seu estado.', checkResult: 'Consultar resultado', noBody: 'Sem texto.', moveDone: 'Mensagem movida. Sincronize a pasta de destino.',
};
const ko: MailboxCopy = {
  moveUnsupported: '이 서버는 Índice에서 메시지 이동을 지원하지 않습니다. 제공업체 메일함을 이용하세요.',
  account: '메일 계정', sync: '메일 동기화', syncing: '동기화 중…', neverSynced: '아직 동기화하지 않음', lastSync: '최근 동기화', start: 'Índice에서 메일 확인하기', startHint: '최근 메시지 50개를 불러온 뒤 폴더별로 이전 메시지를 추가로 불러올 수 있습니다.', imapRequired: '수신하려면 IMAP을 설정하세요. 임시 저장과 SMTP 발신은 사용할 수 있습니다.',
  outbox: '발신 상태', moreFolders: '서버 폴더', chooseFolder: '폴더 선택', older: '이전 메일 불러오기', previous: '이전', next: '다음', loadError: '메일함을 불러올 수 없습니다. 다시 시도하세요.', operationError: '작업을 완료할 수 없습니다. 연결을 확인하세요.', busyError: '다른 작업이 진행 중입니다. 잠시 기다리세요.', conflict: '계정이나 메시지가 변경되었습니다. 다시 불러오세요.', rateError: '한도에 도달했습니다. 잠시 후 다시 시도하세요.', accessError: '이 계정에 더 이상 접근할 수 없습니다.',
  syncDone: '동기화되었습니다.', syncedHint: '동기화된 메시지입니다. 서버 변경 사항을 확인하려면 새로 고침하세요.', composerTitle: '메일 작성', composerHint: '임시 저장하거나 발송 전에 메시지를 확인하세요.', cc: '참조', bcc: '숨은 참조', recipientsHint: '주소는 쉼표로 구분하세요. 받는 사람은 총 20명까지입니다.', draftSaved: '임시 저장되었습니다.', sendReview: '발송 검토', sendNow: '메일 보내기', reviewTitle: '메일을 보낼까요?', reviewHint: '계정, 받는 사람, 내용을 확인하세요. 해당 수신자에게 발송됩니다.', invalid: '유효하고 중복되지 않는 주소를 입력하세요. 발송하려면 제목과 내용이 필요합니다.',
  accepted: '서버에서 접수함', acceptedHint: '서버에서 메시지를 접수했습니다. 수신자에게 전달되었다는 확인은 아닙니다. 보낸 사본은 Índice에 저장됩니다.', failed: '발송 실패', failedHint: '발송 전에 연결이 실패했습니다. 새 초안을 만들 수 있습니다.', unknown: '결과 확인 필요', unknownHint: '서버가 메일을 받았을 수 있습니다. 새 사본을 만들기 전에 제공업체에서 확인하세요. 자동 재시도하지 않습니다.', submitting: '발송 중', submittingHint: '요청이 기록되었습니다. 새로 고침하여 결과를 확인하세요.', draft: '임시 저장', received: '받음', plainText: '안전한 텍스트 보기', truncated: '긴 메시지의 앞부분만 표시합니다.', attachments: '첨부파일이 있습니다. 이 버전에서는 제공업체의 메일함에서 다운로드하세요.',
  replyAll: '전체 답장', editDraft: '초안 편집', copyDraft: '새 초안 만들기', deleteDraft: '초안 버리기', deleteTitle: '이 초안을 버릴까요?', deleteHint: '활성 목록에서 초안이 제외됩니다. 메일은 발송되지 않습니다.', from: '보낸 사람', searchHint: '보낸 사람 또는 제목', saveError: '저장할 수 없습니다. 변경 내용은 유지됩니다.', sendCheck: '결과를 확인할 수 없습니다. 메시지를 열어 둔 상태에서 발송 상태를 확인하세요.', checkResult: '결과 확인', noBody: '텍스트가 없습니다.', moveDone: '메시지를 이동했습니다. 대상 폴더를 동기화하세요.',
};
const zh: MailboxCopy = {
  moveUnsupported: '此服务器不支持从 Índice 移动邮件，请使用服务商邮箱。',
  account: '邮箱账户', sync: '同步邮件', syncing: '正在同步…', neverSynced: '尚未同步', lastSync: '上次同步', start: '在 Índice 中查看邮件', startHint: '先加载最近 50 封邮件，再按文件夹加载更早的邮件。', imapRequired: '请配置 IMAP 接收邮件。仍可保存草稿并通过 SMTP 发送。',
  outbox: '发送状态', moreFolders: '服务器文件夹', chooseFolder: '选择文件夹', older: '加载更早的邮件', previous: '上一页', next: '下一页', loadError: '无法加载邮箱，请重试。', operationError: '无法完成操作，请检查连接。', busyError: '此账户有其他操作正在进行，请稍候。', conflict: '账户或邮件已更改，请重新加载。', rateError: '已达到限额，请稍后重试。', accessError: '您已无权访问此账户。',
  syncDone: '邮箱已同步。', syncedHint: '当前显示已同步的邮件。刷新以获取服务器上的更改。', composerTitle: '撰写邮件', composerHint: '保存草稿或在发送前检查邮件。', cc: '抄送', bcc: '密送', recipientsHint: '请用逗号分隔地址，收件人总数最多为 20 人。', draftSaved: '草稿已保存。', sendReview: '检查发送', sendNow: '发送邮件', reviewTitle: '发送此邮件？', reviewHint: '请检查账户、收件人和内容。邮件将发送给这些人。', invalid: '请输入有效且不重复的地址。发送时还需要主题和正文。',
  accepted: '服务器已接受', acceptedHint: '服务器已接受邮件，但尚未确认收件人已收到。发送副本保存在 Índice 中。', failed: '发送失败', failedHint: '提交前连接失败，您可以创建新草稿。', unknown: '结果未确认', unknownHint: '服务器可能已收到此邮件。创建新副本前请向服务商核实，不会自动重试。', submitting: '正在发送', submittingHint: '发送请求已记录，请刷新查看结果。', draft: '草稿', received: '已接收', plainText: '安全文本视图', truncated: '邮件较长，仅显示第一部分。', attachments: '此邮件包含附件。此版本请在服务商邮箱中下载。',
  replyAll: '回复全部', editDraft: '编辑草稿', copyDraft: '创建新草稿', deleteDraft: '丢弃草稿', deleteTitle: '丢弃此草稿？', deleteHint: '草稿将移出活动列表，不会发送邮件。', from: '发件人', searchHint: '发件人或主题', saveError: '无法保存，您的更改仍保留在此处。', sendCheck: '无法确认结果，请保持邮件打开并检查发送状态。', checkResult: '查看结果', noBody: '没有文本内容。', moveDone: '邮件已移动，请同步目标文件夹。',
};
export function useMailboxCopy() {
  const { currentLanguage } = useLanguage();
  return ({ en, es, fr, pt, ko, zh }[currentLanguage.code.split('-')[0] as 'en'] ?? en);
}
