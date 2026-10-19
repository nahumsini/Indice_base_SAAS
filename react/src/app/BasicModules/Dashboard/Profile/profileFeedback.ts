const en = {
  retry: 'Retry', nameRequired: 'Enter at least one name.', nameTooLong: 'Your full name can contain up to 100 characters.',
  passwordTooLong: 'This password is too long. Use a shorter one.', duplicatePhone: 'This phone number is already in your profile.',
  phoneLimit: 'You can save up to 10 phone numbers.', photoType: 'Choose a JPG, PNG, WebP, HEIC or AVIF photo.',
  photoError: 'The photo could not be uploaded. Try again or choose another image. Your previous photo is unchanged.',
  photoQuota: 'There is no storage space available for this photo. Ask your company administrator for help.',
  photoReady: 'Photo uploaded. Save changes to use it in your profile.',
  sessionChanged: 'Your account changed. Reload your profile before saving.',
  permission: 'You cannot save right now. Check your session and try again.',
  emailReadOnly: 'This is your sign-in email. It cannot be edited here.',
};
type Copy = typeof en;
const es: Copy = {
  retry: 'Reintentar', nameRequired: 'Escribe al menos un nombre.', nameTooLong: 'Tu nombre completo puede tener hasta 100 caracteres.',
  passwordTooLong: 'La contraseña es demasiado larga. Usa una más corta.', duplicatePhone: 'Este teléfono ya está en tu perfil.',
  phoneLimit: 'Puedes guardar hasta 10 teléfonos.', photoType: 'Elige una foto JPG, PNG, WebP, HEIC o AVIF.',
  photoError: 'No se pudo subir la foto. Inténtalo de nuevo o elige otra imagen. Tu foto anterior se conserva.',
  photoQuota: 'No hay espacio disponible para esta foto. Pide ayuda al administrador de tu empresa.',
  photoReady: 'Foto subida. Guarda los cambios para usarla en tu perfil.',
  sessionChanged: 'Cambió tu cuenta. Vuelve a cargar tu perfil antes de guardar.',
  permission: 'No puedes guardar en este momento. Revisa tu sesión e inténtalo de nuevo.',
  emailReadOnly: 'Este es tu correo de acceso. Aquí no se modifica.',
};
const fr: Copy = {
  retry: 'Réessayer', nameRequired: 'Saisissez au moins un nom.', nameTooLong: 'Votre nom complet peut contenir 100 caractères au maximum.',
  passwordTooLong: 'Ce mot de passe est trop long. Utilisez-en un plus court.', duplicatePhone: 'Ce numéro figure déjà dans votre profil.',
  phoneLimit: 'Vous pouvez enregistrer jusqu’à 10 numéros.', photoType: 'Choisissez une photo JPG, PNG, WebP, HEIC ou AVIF.',
  photoError: 'La photo n’a pas pu être téléversée. Réessayez ou choisissez une autre image. Votre photo précédente est conservée.',
  photoQuota: 'Il n’y a plus d’espace pour cette photo. Demandez de l’aide à l’administrateur de votre entreprise.',
  photoReady: 'Photo téléversée. Enregistrez les modifications pour l’utiliser.',
  sessionChanged: 'Votre compte a changé. Rechargez votre profil avant d’enregistrer.',
  permission: 'Enregistrement impossible pour le moment. Vérifiez votre session et réessayez.',
  emailReadOnly: 'Il s’agit de votre courriel de connexion. Il ne peut pas être modifié ici.',
};
const pt: Copy = {
  retry: 'Tentar novamente', nameRequired: 'Digite pelo menos um nome.', nameTooLong: 'Seu nome completo pode ter até 100 caracteres.',
  passwordTooLong: 'A senha é muito longa. Use uma mais curta.', duplicatePhone: 'Este telefone já está no seu perfil.',
  phoneLimit: 'Você pode salvar até 10 telefones.', photoType: 'Escolha uma foto JPG, PNG, WebP, HEIC ou AVIF.',
  photoError: 'Não foi possível enviar a foto. Tente novamente ou escolha outra imagem. Sua foto anterior foi mantida.',
  photoQuota: 'Não há espaço disponível para esta foto. Peça ajuda ao administrador da empresa.',
  photoReady: 'Foto enviada. Salve as alterações para usá-la no perfil.',
  sessionChanged: 'Sua conta mudou. Recarregue seu perfil antes de salvar.',
  permission: 'Não é possível salvar agora. Verifique sua sessão e tente novamente.',
  emailReadOnly: 'Este é seu e-mail de acesso. Ele não pode ser alterado aqui.',
};
const ko: Copy = {
  retry: '다시 시도', nameRequired: '이름을 하나 이상 입력하세요.', nameTooLong: '전체 이름은 100자 이하여야 합니다.',
  passwordTooLong: '비밀번호가 너무 깁니다. 더 짧게 입력하세요.', duplicatePhone: '프로필에 이미 있는 전화번호입니다.',
  phoneLimit: '전화번호는 최대 10개까지 저장할 수 있습니다.', photoType: 'JPG, PNG, WebP, HEIC 또는 AVIF 사진을 선택하세요.',
  photoError: '사진을 업로드하지 못했습니다. 다시 시도하거나 다른 이미지를 선택하세요. 이전 사진은 유지됩니다.',
  photoQuota: '사진을 저장할 공간이 없습니다. 회사 관리자에게 문의하세요.',
  photoReady: '사진이 업로드되었습니다. 변경 사항을 저장하면 프로필에 적용됩니다.',
  sessionChanged: '계정이 변경되었습니다. 저장하기 전에 프로필을 다시 불러오세요.',
  permission: '지금은 저장할 수 없습니다. 로그인 상태를 확인하고 다시 시도하세요.',
  emailReadOnly: '로그인 이메일입니다. 여기서는 변경할 수 없습니다.',
};
const zh: Copy = {
  retry: '重试', nameRequired: '请至少填写一个姓名字段。', nameTooLong: '完整姓名最多可包含100个字符。',
  passwordTooLong: '密码太长，请使用更短的密码。', duplicatePhone: '此电话号码已在您的个人资料中。',
  phoneLimit: '最多可保存10个电话号码。', photoType: '请选择JPG、PNG、WebP、HEIC或AVIF照片。',
  photoError: '照片上传失败。请重试或选择其他图片。原照片已保留。',
  photoQuota: '没有足够的空间保存此照片。请联系公司管理员。',
  photoReady: '照片已上传。保存更改后即可使用。',
  sessionChanged: '账号已更改。请重新加载个人资料后再保存。',
  permission: '目前无法保存。请检查登录状态并重试。',
  emailReadOnly: '这是您的登录邮箱，无法在此修改。',
};
export function getProfileFeedback(locale: string): Copy {
  return locale.startsWith('es') ? es : locale.startsWith('fr') ? fr : locale.startsWith('pt') ? pt : locale.startsWith('ko') ? ko : locale.startsWith('zh') ? zh : en;
}
