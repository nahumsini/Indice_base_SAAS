import { AttachmentError } from './attachmentRules';
const en = {
  preparingFile: 'Preparing file…', openReady: 'File ready. Tap it to open.', downloadError: 'Could not open the file. Tap it again to retry.', attach: 'Attach', photos: 'Photos', files: 'Files', remove: 'Remove attachment', open: 'Open file',
  help: 'Up to 5 files · 8 MB each · JPG, PNG, WebP, PDF, Word or Excel',
  queued: 'Ready to send', uploading: 'Uploading…', ready: 'Uploaded', failed: 'Upload failed',
  count: 'You can attach up to 5 files per message.', empty: '“{name}” is empty. Choose another file.',
  size: '“{name}” exceeds 8 MB. Choose a smaller file.', format: '“{name}”: choose JPG, PNG, WebP, PDF, Word or Excel. For HEIC, export as JPG.',
  upload: 'Could not upload “{name}”. Check your connection and press Send to retry. Your draft is kept.',
  verification: 'The file could not be verified. Remove it and attach a valid copy.',
  storage: 'File storage is unavailable. Try again shortly; your draft is kept.',
  actions: 'Conversation actions', placeholder: 'Write a message…', attachment: 'Attachment',
  emptyTitle: 'Your team, one message away', emptyHint: 'Choose a conversation or start one to share updates, photos and files.',
};
type Copy = typeof en;
const es: Copy = {
  preparingFile: 'Preparando archivo…', openReady: 'Archivo listo. Toca la tarjeta para abrirlo.', downloadError: 'No se pudo abrir el archivo. Vuelve a tocarlo para reintentar.', attach: 'Adjuntar', photos: 'Fotos', files: 'Archivos', remove: 'Quitar adjunto', open: 'Abrir archivo',
  help: 'Hasta 5 archivos · 8 MB cada uno · JPG, PNG, WebP, PDF, Word o Excel',
  queued: 'Listo para enviar', uploading: 'Subiendo…', ready: 'Cargado', failed: 'No se pudo subir',
  count: 'Puedes adjuntar hasta 5 archivos por mensaje.', empty: '“{name}” está vacío. Selecciona otro archivo.',
  size: '“{name}” supera los 8 MB. Elige un archivo más pequeño.', format: '“{name}”: elige JPG, PNG, WebP, PDF, Word o Excel. Si es HEIC, expórtalo como JPG.',
  upload: 'No se pudo subir “{name}”. Revisa tu conexión y pulsa Enviar para reintentar. Tu borrador sigue aquí.',
  verification: 'No se pudo verificar el archivo. Quítalo y adjunta una copia válida.',
  storage: 'El almacenamiento no está disponible. Intenta de nuevo en un momento; tu borrador sigue aquí.',
  actions: 'Acciones de la conversación', placeholder: 'Escribe un mensaje…', attachment: 'Adjunto',
  emptyTitle: 'Tu equipo, a un mensaje de distancia', emptyHint: 'Elige una conversación o inicia una para compartir novedades, fotos y archivos.',
};
const fr: Copy = {
  preparingFile: 'Préparation du fichier…', openReady: 'Fichier prêt. Touchez la carte pour l’ouvrir.', downloadError: 'Impossible d’ouvrir le fichier. Touchez-le pour réessayer.', attach: 'Joindre', photos: 'Photos', files: 'Fichiers', remove: 'Retirer la pièce jointe', open: 'Ouvrir le fichier',
  help: '5 fichiers maximum · 8 Mo chacun · JPG, PNG, WebP, PDF, Word ou Excel', queued: 'Prêt à envoyer', uploading: 'Envoi…', ready: 'Téléversé', failed: 'Échec du téléversement',
  count: 'Joignez au maximum 5 fichiers par message.', empty: '« {name} » est vide. Choisissez un autre fichier.', size: '« {name} » dépasse 8 Mo. Choisissez un fichier plus petit.',
  format: '« {name} » : choisissez JPG, PNG, WebP, PDF, Word ou Excel. Exportez HEIC en JPG.', upload: 'Impossible de téléverser « {name} ». Vérifiez la connexion puis appuyez sur Envoyer. Le brouillon est conservé.',
  verification: 'Fichier non vérifié. Retirez-le et joignez une copie valide.', storage: 'Stockage indisponible. Réessayez bientôt ; le brouillon est conservé.', actions: 'Actions de la conversation', placeholder: 'Écrivez un message…', attachment: 'Pièce jointe', emptyTitle: 'Votre équipe, à un message de vous', emptyHint: 'Choisissez une conversation ou créez-en une pour partager des nouvelles, des photos et des fichiers.',
};
const pt: Copy = {
  preparingFile: 'Preparando arquivo…', openReady: 'Arquivo pronto. Toque para abrir.', downloadError: 'Não foi possível abrir o arquivo. Toque novamente para tentar.', attach: 'Anexar', photos: 'Fotos', files: 'Arquivos', remove: 'Remover anexo', open: 'Abrir arquivo', help: 'Até 5 arquivos · 8 MB cada · JPG, PNG, WebP, PDF, Word ou Excel',
  queued: 'Pronto para enviar', uploading: 'Enviando…', ready: 'Carregado', failed: 'Falha no envio', count: 'Anexe até 5 arquivos por mensagem.', empty: '“{name}” está vazio. Escolha outro arquivo.', size: '“{name}” excede 8 MB. Escolha um arquivo menor.',
  format: '“{name}”: escolha JPG, PNG, WebP, PDF, Word ou Excel. Exporte HEIC como JPG.', upload: 'Não foi possível enviar “{name}”. Verifique a conexão e pressione Enviar. O rascunho foi mantido.', verification: 'Arquivo não verificado. Remova e anexe uma cópia válida.', storage: 'Armazenamento indisponível. Tente em breve; o rascunho foi mantido.', actions: 'Ações da conversa', placeholder: 'Escreva uma mensagem…', attachment: 'Anexo', emptyTitle: 'Sua equipe, a uma mensagem de distância', emptyHint: 'Escolha uma conversa ou inicie uma para compartilhar novidades, fotos e arquivos.',
};
const ko: Copy = {
  preparingFile: '파일 준비 중…', openReady: '파일이 준비되었습니다. 눌러서 여세요.', downloadError: '파일을 열지 못했습니다. 다시 눌러 시도하세요.', attach: '첨부', photos: '사진', files: '파일', remove: '첨부 삭제', open: '파일 열기', help: '최대 5개 · 각 8MB · JPG, PNG, WebP, PDF, Word, Excel', queued: '전송 준비됨', uploading: '업로드 중…', ready: '업로드됨', failed: '업로드 실패',
  count: '메시지당 파일을 최대 5개 첨부하세요.', empty: '“{name}”이 비어 있습니다. 다른 파일을 선택하세요.', size: '“{name}”은 8MB를 초과합니다. 더 작은 파일을 선택하세요.', format: '“{name}”: JPG, PNG, WebP, PDF, Word, Excel을 선택하세요. HEIC는 JPG로 내보내세요.', upload: '“{name}” 업로드 실패. 연결을 확인하고 보내기를 눌러 다시 시도하세요. 초안은 유지됩니다.', verification: '파일을 확인하지 못했습니다. 유효한 사본을 다시 첨부하세요.', storage: '저장소를 사용할 수 없습니다. 잠시 후 다시 시도하세요. 초안은 유지됩니다.', actions: '대화 작업', placeholder: '메시지를 입력하세요…', attachment: '첨부', emptyTitle: '메시지로 팀과 연결하세요', emptyHint: '대화를 선택하거나 새로 시작해 소식, 사진, 파일을 공유하세요.',
};
const zh: Copy = {
  preparingFile: '正在准备文件…', openReady: '文件已就绪，点击卡片打开。', downloadError: '无法打开文件，请再次点击重试。', attach: '附加', photos: '照片', files: '文件', remove: '移除附件', open: '打开文件', help: '最多5个文件 · 每个8MB · JPG、PNG、WebP、PDF、Word、Excel', queued: '待发送', uploading: '上传中…', ready: '已上传', failed: '上传失败',
  count: '每条消息最多附加5个文件。', empty: '“{name}”为空，请选择其他文件。', size: '“{name}”超过8MB，请选择更小的文件。', format: '“{name}”：请选择JPG、PNG、WebP、PDF、Word或Excel。HEIC请导出为JPG。', upload: '无法上传“{name}”。请检查连接并按发送重试，草稿已保留。', verification: '无法验证文件，请移除后附加有效副本。', storage: '存储暂不可用，请稍后重试，草稿已保留。', actions: '对话操作', placeholder: '输入消息…', attachment: '附件', emptyTitle: '与团队仅一条消息之遥', emptyHint: '选择或新建对话，分享动态、照片和文件。',
};
export function attachmentCopy(locale: string): Copy { return locale.startsWith('es') ? es : locale.startsWith('fr') ? fr : locale.startsWith('pt') ? pt : locale.startsWith('ko') ? ko : locale.startsWith('zh') ? zh : en; }
export function attachmentErrorText(error: unknown, locale: string) {
  const c = attachmentCopy(locale);
  if (error instanceof AttachmentError) return c[error.issue].replace('{name}', error.fileName);
  return null;
}
