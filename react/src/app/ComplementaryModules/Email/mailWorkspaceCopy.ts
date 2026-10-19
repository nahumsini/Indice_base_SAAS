import { useLanguage } from '../../shared/context';
const en = {
  filters: 'Filters', clearSearch: 'Clear search', showMessages: 'Show messages', mailboxSubtitle: 'Read, organize and reply to your client emails from your connected accounts.',
  folders: 'Folders', collapseFolders: 'Collapse folders', expandFolders: 'Expand folders', expandReading: 'Expand reading', restoreReading: 'Back to mailbox', settings: 'Mailbox settings', more: 'More', filterMessages: 'Filter messages', organize: 'Organize message', closeFolders: 'Close folders',
  inbox: 'Inbox', archive: 'Archive', spam: 'Spam', details: 'Message details', localGroup: 'In Índice', safeView: 'Protected view', pageCount: 'Messages on this page',
  all: 'All', junk: 'Spam / Junk', newFolder: 'New folder', folderName: 'Folder name', create: 'Create folder',
  folderHint: 'Created in your mail account and available in webmail and other apps. Use letters, numbers, spaces, hyphens or underscores.',
  folderError: 'Could not create the folder. Check its name and your connection, then try again.',
  folderHelp: 'Your server folders',
  folderGuide: 'Inbox, Sent, Archive, Spam and Trash belong to your mail provider. Moving a message updates that account. Spam filtering is managed by your provider.',
  localDrafts: 'Drafts in Índice', localOutbox: 'Sending status',
  localGuide: 'Drafts and sending status are saved in Índice. After SMTP accepts a message, its copy is saved to the Sent folder configured in Preferences.',
  move: 'Move to folder', search: 'Client email, sender, recipient or subject',
  list: 'Mail', emptyReader: 'Your client conversations, at hand', readerHint: 'Select a message to reply, organize it or review its sending status. Star messages that need follow-up.',
  unknown: 'The server did not confirm this send. Check webmail or ask the recipient before sending again; it may have been delivered.',
  rejected: 'The server rejected this message. It was not sent. Create a new draft after correcting the problem.',
  recipient: 'The server rejected a recipient. Check the addresses before creating a new draft.',
  sender: 'The server rejected this sender. Check the account address and its sending permissions.',
  content: 'The server rejected the message content or its policy requirements. Review the content and contact your provider.',
  size: 'The server rejected the message size. Reduce the attachments before trying a new draft.',
  temporary: 'The provider temporarily rejected this send. Wait before creating a new draft.',
};
type Copy = typeof en;
const es: Copy = {
  filters: 'Filtros', clearSearch: 'Limpiar búsqueda', showMessages: 'Mostrar correos', mailboxSubtitle: 'Consulta, organiza y responde los correos de tus clientes desde tus cuentas conectadas.',
  folders: 'Carpetas', collapseFolders: 'Contraer carpetas', expandFolders: 'Expandir carpetas', expandReading: 'Ampliar lectura', restoreReading: 'Volver al buzón', settings: 'Ajustes del buzón', more: 'Más', filterMessages: 'Filtrar correos', organize: 'Organizar correo', closeFolders: 'Cerrar carpetas',
  inbox: 'Recibidos', archive: 'Archivo', spam: 'Spam', details: 'Detalles del mensaje', localGroup: 'En Índice', safeView: 'Vista protegida', pageCount: 'Correos en esta página',
  all: 'Todos', junk: 'Spam / No deseado', newFolder: 'Nueva carpeta', folderName: 'Nombre de la carpeta', create: 'Crear carpeta',
  folderHint: 'Se crea en tu cuenta de correo y aparece también en webmail y otras aplicaciones. Usa letras, números, espacios, guiones o guiones bajos.',
  folderError: 'No se pudo crear la carpeta. Revisa el nombre y la conexión e intenta de nuevo.',
  folderHelp: 'Tus carpetas del servidor',
  folderGuide: 'Recibidos, Enviados, Archivo, Spam y Papelera pertenecen a tu proveedor. Mover un correo actualiza esa cuenta. El filtro de spam lo administra tu proveedor.',
  localDrafts: 'Borradores en Índice', localOutbox: 'Estado de envíos',
  localGuide: 'Los borradores y el estado de envío se guardan en Índice. Cuando SMTP acepta un correo, se guarda su copia en la carpeta de enviados elegida en Preferencias.',
  move: 'Mover a carpeta', search: 'Correo del cliente, remitente, destinatario o asunto',
  list: 'Correos', emptyReader: 'Las conversaciones con tus clientes, a la mano', readerHint: 'Selecciona un correo para responder, organizarlo o revisar su envío. Destaca los que necesitan seguimiento.',
  unknown: 'El servidor no confirmó este envío. Revisa webmail o consulta al destinatario antes de volver a enviarlo; pudo haberse entregado.',
  rejected: 'El servidor rechazó este correo. No se envió. Crea un nuevo borrador después de corregir el problema.',
  recipient: 'El servidor rechazó un destinatario. Revisa las direcciones antes de crear un nuevo borrador.',
  sender: 'El servidor rechazó al remitente. Revisa la dirección de la cuenta y sus permisos de envío.',
  content: 'El servidor rechazó el contenido o sus políticas de envío. Revisa el mensaje y consulta a tu proveedor.',
  size: 'El servidor rechazó el tamaño del correo. Reduce los adjuntos antes de crear un nuevo borrador.',
  temporary: 'El proveedor rechazó temporalmente el envío. Espera antes de crear un nuevo borrador.',
};
const fr: Copy = {
  filters: 'Filtres', clearSearch: 'Effacer la recherche', showMessages: 'Afficher les courriels', mailboxSubtitle: 'Consultez, classez et répondez aux courriels de vos clients depuis vos comptes connectés.',
  folders: 'Dossiers', collapseFolders: 'Réduire les dossiers', expandFolders: 'Afficher les dossiers', expandReading: 'Agrandir la lecture', restoreReading: 'Retour à la boîte', settings: 'Réglages de la boîte', more: 'Plus', filterMessages: 'Filtrer les courriels', organize: 'Organiser le courriel', closeFolders: 'Fermer les dossiers',
  inbox: 'Réception', archive: 'Archives', spam: 'Indésirables', details: 'Détails du message', localGroup: 'Dans Índice', safeView: 'Vue protégée', pageCount: 'Courriels sur cette page',
  all:'Tous',junk:'Spam / Indésirables',newFolder:'Nouveau dossier',folderName:'Nom du dossier',create:'Créer le dossier',folderHint:'Créé dans votre compte et disponible dans les autres applications. Utilisez lettres, chiffres, espaces, tirets ou traits de soulignement.',folderError:'Impossible de créer le dossier. Vérifiez le nom et la connexion.',folderHelp:'Vos dossiers du serveur',folderGuide:'Réception, Envoyés, Archives, Spam et Corbeille appartiennent au fournisseur. Déplacer un courriel actualise le compte. Le fournisseur gère le filtre antispam.',localDrafts:'Brouillons dans Índice',localOutbox:'État des envois dans Índice',localGuide:'Brouillons et état des envois sont enregistrés dans Índice. Après acceptation SMTP, une copie est enregistrée dans le dossier Envoyés des Préférences.',move:'Déplacer vers un dossier',search:'Courriel du client, expéditeur, destinataire ou objet',list:'Courriels',emptyReader:'Vos échanges clients à portée de main',readerHint:'Sélectionnez un courriel pour répondre, le classer ou vérifier son envoi. Ajoutez une étoile pour le suivi.',unknown:'Le serveur n’a pas confirmé cet envoi. Vérifiez le webmail ou consultez le destinataire avant de renvoyer : il peut avoir été livré.',rejected:'Le serveur a refusé ce courriel. Il n’a pas été envoyé. Corrigez le problème puis créez un brouillon.',recipient:'Le serveur a refusé un destinataire. Vérifiez les adresses.',sender:'Le serveur a refusé l’expéditeur. Vérifiez l’adresse et les autorisations du compte.',content:'Le serveur a refusé le contenu ou ses règles d’envoi. Consultez votre fournisseur.',size:'Le serveur a refusé la taille du courriel. Réduisez les pièces jointes.',temporary:'Le fournisseur a temporairement refusé cet envoi. Patientez avant de créer un nouveau brouillon.',
};
const pt: Copy = {
  filters: 'Filtros', clearSearch: 'Limpar busca', showMessages: 'Mostrar emails', mailboxSubtitle: 'Consulte, organize e responda aos emails de seus clientes pelas contas conectadas.',
  folders: 'Pastas', collapseFolders: 'Recolher pastas', expandFolders: 'Expandir pastas', expandReading: 'Ampliar leitura', restoreReading: 'Voltar à caixa', settings: 'Configurações da caixa', more: 'Mais', filterMessages: 'Filtrar emails', organize: 'Organizar email', closeFolders: 'Fechar pastas',
  inbox: 'Entrada', archive: 'Arquivo', spam: 'Spam', details: 'Detalhes da mensagem', localGroup: 'No Índice', safeView: 'Visualização protegida', pageCount: 'Emails nesta página',
  all:'Todos',junk:'Spam / Indesejados',newFolder:'Nova pasta',folderName:'Nome da pasta',create:'Criar pasta',folderHint:'Criada na sua conta e disponível no webmail e outros aplicativos. Use letras, números, espaços, hífens ou sublinhados.',folderError:'Não foi possível criar a pasta. Verifique o nome e a conexão.',folderHelp:'Suas pastas do servidor',folderGuide:'Entrada, Enviados, Arquivo, Spam e Lixeira pertencem ao provedor. Mover um email atualiza essa conta. O filtro de spam é gerenciado pelo provedor.',localDrafts:'Rascunhos no Índice',localOutbox:'Status de envios no Índice',localGuide:'Rascunhos e status de envios são salvos no Índice. Após aceitação SMTP, uma cópia é salva na pasta de enviados das Preferências.',move:'Mover para pasta',search:'Email do cliente, remetente, destinatário ou assunto',list:'Emails',emptyReader:'As conversas com seus clientes à mão',readerHint:'Selecione um email para responder, organizar ou verificar o envio. Destaque mensagens que precisam de acompanhamento.',unknown:'O servidor não confirmou este envio. Verifique o webmail ou consulte o destinatário antes de reenviar; pode ter sido entregue.',rejected:'O servidor recusou o email. Não foi enviado. Corrija o problema antes de criar um rascunho.',recipient:'O servidor recusou um destinatário. Verifique os endereços.',sender:'O servidor recusou o remetente. Verifique o endereço e as permissões.',content:'O servidor recusou o conteúdo ou suas políticas. Consulte o provedor.',size:'O servidor recusou o tamanho do email. Reduza os anexos.',temporary:'O provedor recusou temporariamente o envio. Aguarde antes de criar outro rascunho.',
};
const ko: Copy = {
  filters: '필터', clearSearch: '검색 지우기', showMessages: '메일 표시', mailboxSubtitle: '연결된 계정에서 고객 이메일을 읽고 정리하고 답장하세요.',
  folders: '폴더', collapseFolders: '폴더 접기', expandFolders: '폴더 펼치기', expandReading: '읽기 확대', restoreReading: '메일함으로 돌아가기', settings: '메일함 설정', more: '더 보기', filterMessages: '메일 필터', organize: '메일 정리', closeFolders: '폴더 닫기',
  inbox: '받은편지함', archive: '보관함', spam: '스팸', details: '메시지 상세', localGroup: 'Índice', safeView: '보호된 보기', pageCount: '이 페이지의 메일',
  all:'전체',junk:'스팸',newFolder:'새 폴더',folderName:'폴더 이름',create:'폴더 만들기',folderHint:'메일 계정에 생성되어 웹메일과 다른 앱에도 표시됩니다. 문자, 숫자, 공백, 하이픈 또는 밑줄을 사용하세요.',folderError:'폴더를 만들 수 없습니다. 이름과 연결을 확인하세요.',folderHelp:'서버 폴더',folderGuide:'받은편지함, 보낸편지함, 보관함, 스팸 및 휴지통은 메일 제공업체의 폴더입니다. 이동하면 계정에 반영됩니다. 스팸 필터는 제공업체에서 관리합니다.',localDrafts:'Índice 임시 보관함',localOutbox:'Índice 전송 상태',localGuide:'임시 메일과 전송 상태는 Índice에 저장됩니다. SMTP 수락 후 환경설정의 보낸편지함에 사본이 저장됩니다.',move:'폴더로 이동',search:'고객 이메일, 보낸 사람, 받는 사람 또는 제목',list:'이메일',emptyReader:'고객과의 대화를 한곳에서',readerHint:'메일을 선택하여 답장, 정리 또는 전송 상태를 확인하세요. 후속 조치가 필요한 메일에 별표를 표시하세요.',unknown:'서버가 전송을 확인하지 않았습니다. 전달되었을 수 있으므로 다시 보내기 전에 웹메일이나 수신자를 확인하세요.',rejected:'서버에서 거부하여 전송되지 않았습니다. 문제를 수정한 후 새 초안을 만드세요.',recipient:'수신자가 거부되었습니다. 주소를 확인하세요.',sender:'발신자가 거부되었습니다. 계정 주소와 전송 권한을 확인하세요.',content:'서버가 내용 또는 전송 정책으로 거부했습니다. 제공업체에 문의하세요.',size:'메일 크기가 거부되었습니다. 첨부 파일을 줄이세요.',temporary:'일시적으로 전송이 거부되었습니다. 잠시 후 새 초안을 만드세요.',
};
const zh: Copy = {
  filters: '筛选', clearSearch: '清除搜索', showMessages: '显示邮件', mailboxSubtitle: '通过已连接的账户阅读、整理和回复客户邮件。',
  folders: '文件夹', collapseFolders: '收起文件夹', expandFolders: '展开文件夹', expandReading: '展开阅读', restoreReading: '返回邮箱', settings: '邮箱设置', more: '更多', filterMessages: '筛选邮件', organize: '整理邮件', closeFolders: '关闭文件夹',
  inbox: '收件箱', archive: '归档', spam: '垃圾邮件', details: '邮件详情', localGroup: 'Índice 内', safeView: '受保护视图', pageCount: '本页邮件',
  all:'全部',junk:'垃圾邮件',newFolder:'新建文件夹',folderName:'文件夹名称',create:'创建文件夹',folderHint:'在邮箱账户中创建，也会显示在网页邮箱和其他应用中。请使用字母、数字、空格、连字符或下划线。',folderError:'无法创建文件夹。请检查名称和连接。',folderHelp:'服务器文件夹',folderGuide:'收件箱、已发送、归档、垃圾邮件和废纸篓属于邮件服务商。移动邮件会更新该账户。垃圾邮件过滤由服务商管理。',localDrafts:'Índice 草稿',localOutbox:'Índice 发送状态',localGuide:'草稿和发送状态保存在 Índice 中。SMTP 接受邮件后，副本保存在偏好设置指定的已发送文件夹中。',move:'移动到文件夹',search:'客户邮箱、发件人、收件人或主题',list:'邮件',emptyReader:'轻松管理客户往来邮件',readerHint:'选择邮件以回复、整理或检查发送状态。为需要跟进的邮件加星标。',unknown:'服务器未确认发送。邮件可能已送达；请在重新发送前检查网页邮箱或向收件人确认。',rejected:'服务器拒绝了邮件，邮件未发送。请修正问题后创建新草稿。',recipient:'服务器拒绝了收件人。请检查地址。',sender:'服务器拒绝了发件人。请检查账户地址和发送权限。',content:'服务器因内容或发送政策拒绝了邮件。请联系服务商。',size:'服务器拒绝了邮件大小。请减少附件。',temporary:'服务商暂时拒绝了发送。请稍后创建新草稿。',
};
export function useMailWorkspaceCopy(): Copy { const {currentLanguage}=useLanguage(); return ({es,en,fr,pt,ko,zh} as Record<string,Copy>)[currentLanguage.code.split('-')[0]] ?? en; }
export function sendFailureText(code: string | null, text: Copy): string | undefined {
  return ({email_send_unknown:text.unknown,email_send_failed:text.rejected,email_send_recipient_rejected:text.recipient,email_send_sender_rejected:text.sender,email_send_content_rejected:text.content,email_send_size_rejected:text.size,email_send_temporarily_rejected:text.temporary} as Record<string,string>)[code ?? ''];
}
