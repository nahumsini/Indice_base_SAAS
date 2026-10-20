const en = {
  brand: 'Secure access to your Indice account.',
  safety: 'Links work once and expire after 10 minutes. Your password works across all your Indice companies.',
  badge: 'Password recovery', readyTitle: 'Create a new password',
  readyDescription: 'Choose a password with at least 8 characters and confirm it.',
  completeTitle: 'Your password is ready', completeDescription: 'Sign in again with your new password. Previous sessions have been closed.',
  invalidTitle: 'This link is unavailable', invalidDescription: 'The link expired, was replaced or has already been used. Request another one.',
  loadTitle: 'We could not check the link', loadDescription: 'Check your connection and try again.',
  uncertainTitle: 'We could not confirm the change', uncertainDescription: 'Try signing in with the new password. If it does not work, request another link.',
  loading: 'Checking link…', password: 'New password', confirmation: 'Confirm new password',
  show: 'Show password', hide: 'Hide password', save: 'Change password', saving: 'Saving password…',
  required: 'Enter a password.', short: 'Use at least 8 characters.', long: 'This password is too long. Use a shorter one.',
  mismatch: 'The passwords do not match.', saveError: 'We could not save the password. Try again.',
  reload: 'Check again', login: 'Go to sign-in', newLink: 'Request another link', preparing: 'Preparing sign-in…',
  preparationError: 'We could not open sign-in. Try again.',
};
type Copy = typeof en;
const es: Copy = {
  brand: 'Acceso seguro a tu cuenta de Índice.',
  safety: 'El enlace funciona una vez y vence en 10 minutos. Tu contraseña se usa en todas tus empresas de Índice.',
  badge: 'Recuperar contraseña', readyTitle: 'Crea una contraseña nueva',
  readyDescription: 'Elige una contraseña de al menos 8 caracteres y confírmala.',
  completeTitle: 'Tu contraseña está lista', completeDescription: 'Vuelve a entrar con tu contraseña nueva. Las sesiones anteriores se cerraron.',
  invalidTitle: 'Este enlace ya no está disponible', invalidDescription: 'El enlace venció, fue reemplazado o ya se usó. Pide uno nuevo.',
  loadTitle: 'No pudimos revisar el enlace', loadDescription: 'Revisa tu conexión y vuelve a intentar.',
  uncertainTitle: 'No pudimos confirmar el cambio', uncertainDescription: 'Intenta entrar con la contraseña nueva. Si no funciona, pide otro enlace.',
  loading: 'Revisando enlace…', password: 'Contraseña nueva', confirmation: 'Confirma la contraseña nueva',
  show: 'Mostrar contraseña', hide: 'Ocultar contraseña', save: 'Cambiar contraseña', saving: 'Guardando contraseña…',
  required: 'Escribe una contraseña.', short: 'Usa al menos 8 caracteres.', long: 'La contraseña es demasiado larga. Usa una más corta.',
  mismatch: 'Las contraseñas no coinciden.', saveError: 'No pudimos guardar la contraseña. Intenta de nuevo.',
  reload: 'Volver a revisar', login: 'Ir a iniciar sesión', newLink: 'Pedir otro enlace', preparing: 'Preparando inicio de sesión…',
  preparationError: 'No pudimos abrir el inicio de sesión. Intenta de nuevo.',
};
const localized: Record<string, Copy> = {
  en, es,
  fr: {...en, brand:'Accès sécurisé à votre compte Indice.', safety:'Le lien expire après 10 minutes et ne fonctionne qu’une fois. Votre mot de passe s’applique à toutes vos entreprises Indice.', badge:'Récupérer le mot de passe',readyTitle:'Créez un nouveau mot de passe',readyDescription:'Choisissez au moins 8 caractères et confirmez.',completeTitle:'Votre mot de passe est prêt',completeDescription:'Reconnectez-vous avec le nouveau mot de passe. Les anciennes sessions sont fermées.',invalidTitle:'Ce lien n’est plus disponible',invalidDescription:'Le lien a expiré, a été remplacé ou utilisé. Demandez-en un autre.',loadTitle:'Impossible de vérifier le lien',loadDescription:'Vérifiez votre connexion et réessayez.',uncertainTitle:'Modification non confirmée',uncertainDescription:'Essayez le nouveau mot de passe. Sinon, demandez un autre lien.',loading:'Vérification du lien…',password:'Nouveau mot de passe',confirmation:'Confirmez le mot de passe',show:'Afficher',hide:'Masquer',save:'Changer le mot de passe',saving:'Enregistrement…',required:'Entrez un mot de passe.',short:'Utilisez au moins 8 caractères.',long:'Ce mot de passe est trop long.',mismatch:'Les mots de passe ne correspondent pas.',saveError:'Enregistrement impossible. Réessayez.',reload:'Réessayer',login:'Se connecter',newLink:'Demander un autre lien',preparing:'Préparation…',preparationError:'Connexion indisponible. Réessayez.'},
  pt: {...en,brand:'Acesso seguro à sua conta Índice.',safety:'O link vale por 10 minutos e funciona uma vez. Sua senha vale para todas as suas empresas no Índice.',badge:'Recuperar senha',readyTitle:'Crie uma nova senha',readyDescription:'Escolha pelo menos 8 caracteres e confirme.',completeTitle:'Sua senha está pronta',completeDescription:'Entre com a nova senha. As sessões anteriores foram encerradas.',invalidTitle:'Este link não está disponível',invalidDescription:'O link venceu, foi substituído ou já foi usado. Peça outro.',loadTitle:'Não foi possível verificar o link',loadDescription:'Verifique sua conexão e tente novamente.',uncertainTitle:'Não confirmamos a alteração',uncertainDescription:'Tente entrar com a nova senha. Se não funcionar, peça outro link.',loading:'Verificando link…',password:'Nova senha',confirmation:'Confirme a nova senha',show:'Mostrar senha',hide:'Ocultar senha',save:'Alterar senha',saving:'Salvando…',required:'Digite uma senha.',short:'Use pelo menos 8 caracteres.',long:'A senha é muito longa. Use uma menor.',mismatch:'As senhas não coincidem.',saveError:'Não foi possível salvar. Tente novamente.',reload:'Verificar novamente',login:'Entrar',newLink:'Pedir outro link',preparing:'Preparando acesso…',preparationError:'Não foi possível abrir o acesso. Tente novamente.'},
  ko: {...en,brand:'Índice 계정에 안전하게 접속하세요.',safety:'링크는 10분 동안 한 번만 사용할 수 있습니다. 비밀번호는 모든 Índice 회사에 적용됩니다.',badge:'비밀번호 복구',readyTitle:'새 비밀번호 만들기',readyDescription:'8자 이상의 비밀번호를 입력하고 확인하세요.',completeTitle:'비밀번호가 변경되었습니다',completeDescription:'새 비밀번호로 다시 로그인하세요. 이전 세션은 종료되었습니다.',invalidTitle:'사용할 수 없는 링크',invalidDescription:'만료되었거나 이미 사용 또는 교체된 링크입니다. 새 링크를 요청하세요.',loadTitle:'링크를 확인할 수 없습니다',loadDescription:'연결을 확인하고 다시 시도하세요.',uncertainTitle:'변경 여부를 확인하지 못했습니다',uncertainDescription:'새 비밀번호로 로그인해 보세요. 안 되면 새 링크를 요청하세요.',loading:'링크 확인 중…',password:'새 비밀번호',confirmation:'새 비밀번호 확인',show:'비밀번호 표시',hide:'비밀번호 숨기기',save:'비밀번호 변경',saving:'저장 중…',required:'비밀번호를 입력하세요.',short:'8자 이상 입력하세요.',long:'비밀번호가 너무 깁니다.',mismatch:'비밀번호가 일치하지 않습니다.',saveError:'저장하지 못했습니다. 다시 시도하세요.',reload:'다시 확인',login:'로그인',newLink:'새 링크 요청',preparing:'로그인 준비 중…',preparationError:'로그인을 열지 못했습니다. 다시 시도하세요.'},
  zh: {...en,brand:'安全访问您的 Índice 账户。',safety:'链接仅可使用一次，10 分钟后过期。密码适用于您在 Índice 的所有公司。',badge:'找回密码',readyTitle:'创建新密码',readyDescription:'请输入至少 8 个字符的密码并确认。',completeTitle:'密码已更新',completeDescription:'请使用新密码登录。之前的会话已关闭。',invalidTitle:'此链接已不可用',invalidDescription:'链接已过期、被替换或已使用，请申请新链接。',loadTitle:'无法检查链接',loadDescription:'请检查网络连接并重试。',uncertainTitle:'无法确认更改',uncertainDescription:'请尝试使用新密码登录。如果无法登录，请申请新链接。',loading:'正在检查链接…',password:'新密码',confirmation:'确认新密码',show:'显示密码',hide:'隐藏密码',save:'更改密码',saving:'正在保存…',required:'请输入密码。',short:'请至少输入 8 个字符。',long:'密码过长，请缩短。',mismatch:'两次输入的密码不一致。',saveError:'无法保存密码，请重试。',reload:'重新检查',login:'前往登录',newLink:'申请新链接',preparing:'正在准备登录…',preparationError:'无法打开登录页面，请重试。'},
};
export const getPasswordRecoveryCopy = (locale: string): Copy => localized[locale.split('-')[0]] ?? en;
export function newPasswordIssue(password: string): 'required' | 'short' | 'long' | null {
  if (!password.trim()) return 'required';
  if (new TextEncoder().encode(password).length > 72) return 'long';
  if (password.length < 8) return 'short';
  return null;
}
export function recoveryError(message: string, copy: Copy): string {
  const value=message.toLowerCase();
  if(value.includes('invalid or expired')) return copy.invalidDescription;
  if(value.includes('must match')) return copy.mismatch;
  if(value.includes('at least')) return copy.short;
  if(value.includes('too long')) return copy.long;
  if(value.includes('are required')) return copy.required;
  return copy.saveError;
}
