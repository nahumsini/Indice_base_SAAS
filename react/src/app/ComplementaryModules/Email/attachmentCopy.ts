import { useLanguage } from '../../shared/context';
const en = {
  fileSize: 'The file is empty or exceeds 5 MB. Choose a smaller file.',
  fileFormat: 'Choose a PDF, PNG, JPG, DOCX, XLSX, PPTX or UTF-8 TXT with a valid filename. Other formats are not supported yet.',
  fileContent: 'The content does not match the format or contains unsupported features. Export it again as an image, plain text or a PDF without forms, passwords or active content.',
  fileLimit: 'Up to 5 attachments and 10 MB total. Remove a file before adding another.',
  fileQuota: 'Your company has insufficient storage available. Ask your administrator to review it.',
  fileStorage: 'Attachment storage is unavailable. Try again shortly.',
  fileConflict: 'The message or account changed. Save your text and reopen the draft before attaching again.',
  fileAccess: 'Your session or access changed. Sign in again to continue.',
  fileTransfer: 'The file did not finish uploading. Check your connection and retry.',
  fileExpired: 'The upload expired. Select the file again.',
  fileUnknown: 'The attachment could not be completed. Retry; your message is still here.',
  removing: 'Removing attachment…', preparing: 'Preparing attachment…', uploading: 'Uploading attachment…', registering: 'Verifying attachment…',
  corrected: 'Image recognized automatically. It will be attached as', retry: 'Retry attachment',
};
type Copy = typeof en;
const es: Copy = {
  fileSize: 'El archivo está vacío o supera los 5 MB. Elige uno más pequeño.',
  fileFormat: 'Elige un PDF, PNG, JPG, DOCX, XLSX, PPTX o TXT UTF-8 con un nombre válido. Otros formatos aún no están habilitados.',
  fileContent: 'El contenido no coincide con el formato o incluye características no admitidas. Expórtalo de nuevo como imagen, texto o PDF sin formularios, contraseña ni contenido activo.',
  fileLimit: 'Puedes adjuntar hasta 5 archivos y 10 MB en total. Quita uno antes de agregar otro.',
  fileQuota: 'La empresa no tiene suficiente almacenamiento disponible. Solicita a tu administrador que lo revise.',
  fileStorage: 'El almacenamiento de adjuntos no está disponible. Inténtalo de nuevo en un momento.',
  fileConflict: 'El mensaje o la cuenta cambiaron. Guarda tu texto y vuelve a abrir el borrador antes de adjuntar.',
  fileAccess: 'Tu sesión o acceso cambió. Inicia sesión de nuevo para continuar.',
  fileTransfer: 'El archivo no terminó de subir. Revisa tu conexión y reintenta.',
  fileExpired: 'La carga caducó. Vuelve a seleccionar el archivo.',
  fileUnknown: 'No se pudo completar el adjunto. Reintenta; tu mensaje sigue aquí.',
  removing: 'Quitando adjunto…', preparing: 'Preparando adjunto…', uploading: 'Subiendo adjunto…', registering: 'Verificando adjunto…',
  corrected: 'Imagen reconocida automáticamente. Se adjuntará como', retry: 'Reintentar adjunto',
};
const fr: Copy = {
  fileSize: 'Le fichier est vide ou dépasse 5 Mo. Choisissez un fichier plus petit.', fileFormat: 'Choisissez un PDF, PNG, JPG, DOCX, XLSX, PPTX ou TXT UTF-8 avec un nom valide. Les autres formats ne sont pas encore disponibles.',
  fileContent: 'Le contenu ne correspond pas au format ou contient des éléments non autorisés. Exportez une image, du texte ou un PDF sans formulaire, mot de passe ni contenu actif.',
  fileLimit: '5 pièces jointes et 10 Mo maximum au total. Retirez un fichier avant d’en ajouter un autre.', fileQuota: 'Stockage disponible insuffisant pour votre entreprise. Contactez votre administrateur.',
  fileStorage: 'Stockage des pièces jointes indisponible. Réessayez dans un instant.', fileConflict: 'Le message ou le compte a changé. Conservez votre texte et rouvrez le brouillon.', fileAccess: 'Votre session ou accès a changé. Reconnectez-vous.',
  fileTransfer: 'Le transfert est incomplet. Vérifiez votre connexion et réessayez.', fileExpired: 'Le transfert a expiré. Sélectionnez à nouveau le fichier.', fileUnknown: 'Impossible de terminer la pièce jointe. Réessayez ; votre message est conservé.',
  removing: 'Suppression…', preparing: 'Préparation…', uploading: 'Transfert…', registering: 'Vérification…', corrected: 'Image reconnue automatiquement. Nom de la pièce jointe :', retry: 'Réessayer la pièce jointe',
};
const pt: Copy = {
  fileSize: 'O arquivo está vazio ou excede 5 MB. Escolha um menor.', fileFormat: 'Escolha PDF, PNG, JPG, DOCX, XLSX, PPTX ou TXT UTF-8 com nome válido. Outros formatos ainda não estão disponíveis.',
  fileContent: 'O conteúdo não corresponde ao formato ou inclui recursos não permitidos. Exporte como imagem, texto ou PDF sem formulários, senha ou conteúdo ativo.',
  fileLimit: 'Até 5 anexos e 10 MB no total. Remova um arquivo antes de adicionar outro.', fileQuota: 'Sua empresa não tem armazenamento suficiente. Consulte o administrador.',
  fileStorage: 'O armazenamento de anexos está indisponível. Tente novamente em instantes.', fileConflict: 'A mensagem ou conta mudou. Guarde seu texto e reabra o rascunho.', fileAccess: 'Sua sessão ou acesso mudou. Entre novamente.',
  fileTransfer: 'O envio do arquivo não terminou. Verifique sua conexão e tente novamente.', fileExpired: 'O envio expirou. Selecione o arquivo novamente.', fileUnknown: 'Não foi possível concluir o anexo. Tente novamente; sua mensagem continua aqui.',
  removing: 'Removendo anexo…', preparing: 'Preparando anexo…', uploading: 'Carregando anexo…', registering: 'Verificando anexo…', corrected: 'Imagem reconhecida automaticamente. Será anexada como', retry: 'Tentar anexo novamente',
};
const ko: Copy = {
  fileSize: '파일이 비어 있거나 5MB를 초과합니다. 더 작은 파일을 선택하세요.', fileFormat: '유효한 이름의 PDF, PNG, JPG, DOCX, XLSX, PPTX 또는 UTF-8 TXT를 선택하세요. 다른 형식은 아직 지원하지 않습니다.',
  fileContent: '내용과 형식이 다르거나 지원하지 않는 기능이 있습니다. 이미지, 텍스트 또는 양식·암호·활성 콘텐츠가 없는 PDF로 다시 내보내세요.',
  fileLimit: '최대 5개, 총 10MB까지 첨부할 수 있습니다. 기존 파일을 제거하세요.', fileQuota: '회사 저장 공간이 부족합니다. 관리자에게 문의하세요.',
  fileStorage: '첨부 저장소를 사용할 수 없습니다. 잠시 후 다시 시도하세요.', fileConflict: '메시지 또는 계정이 변경되었습니다. 텍스트를 보관하고 초안을 다시 여세요.', fileAccess: '세션 또는 접근 권한이 변경되었습니다. 다시 로그인하세요.',
  fileTransfer: '업로드가 완료되지 않았습니다. 연결을 확인하고 재시도하세요.', fileExpired: '업로드가 만료되었습니다. 파일을 다시 선택하세요.', fileUnknown: '첨부를 완료하지 못했습니다. 메시지는 유지됩니다. 다시 시도하세요.',
  removing: '첨부 제거 중…', preparing: '첨부 준비 중…', uploading: '첨부 업로드 중…', registering: '첨부 확인 중…', corrected: '이미지를 자동 인식했습니다. 첨부 이름:', retry: '첨부 재시도',
};
const zh: Copy = {
  fileSize: '文件为空或超过5MB。请选择较小的文件。', fileFormat: '请选择名称有效的PDF、PNG、JPG、DOCX、XLSX、PPTX或UTF-8 TXT。暂不支持其他格式。',
  fileContent: '内容与格式不符或包含不支持的功能。请重新导出为图片、文本或不含表单、密码及活动内容的PDF。',
  fileLimit: '最多5个附件，总计10MB。请先移除一个文件。', fileQuota: '公司存储空间不足，请联系管理员。',
  fileStorage: '附件存储暂不可用，请稍后重试。', fileConflict: '邮件或账户已更改。请保留文本并重新打开草稿。', fileAccess: '会话或访问权限已更改，请重新登录。',
  fileTransfer: '文件上传未完成，请检查连接后重试。', fileExpired: '上传已过期，请重新选择文件。', fileUnknown: '无法完成附件。邮件内容已保留，请重试。',
  removing: '正在移除附件…', preparing: '正在准备附件…', uploading: '正在上传附件…', registering: '正在验证附件…', corrected: '已自动识别图片，将以此名称附加：', retry: '重试附件',
};
export function useMailAttachmentCopy() {
  const { currentLanguage } = useLanguage();
  return ({ en, es, fr, pt, ko, zh } as Record<string, Copy>)[currentLanguage.code.split('-')[0]] ?? en;
}
