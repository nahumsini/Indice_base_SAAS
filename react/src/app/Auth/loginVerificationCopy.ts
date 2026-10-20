const en = {
  back: 'Use another account', badge: 'Secure verification', title: 'Enter your code',
  sent: 'We sent a 6-digit code to', code: 'Verification code', verify: 'Verify and sign in', verifying: 'Verifying…',
  resend: 'Resend code', resending: 'Sending…', resendIn: 'Resend in', expires: 'Code expires in',
  hint: 'Check your inbox and spam folder. Use the most recent code you received.',
  expired: 'This code expired. Go back and sign in again to request another one.',
  invalid: 'The code is incorrect. Check the 6 digits and try again.',
  unavailable: 'This verification is no longer available. Go back and sign in again.',
  locked: 'Too many attempts. Wait before signing in again or recover your password.',
  resent: 'A new code was sent. Use the most recent one.',
  sendFailed: 'We could not send another code. Your previous code still works until it expires.',
  resendUncertain: 'We could not confirm the resend. Check your email and use the most recent code.',
  network: 'We could not confirm sign-in. Check your connection and reload to check whether you are signed in.',
  reload: 'Check sign-in', loginFailed: 'Check your company, email and password, then try again.',
  initialSendFailed: 'We could not send the code. Try signing in again in a moment.',
};
export type LoginVerificationCopy = typeof en;
const es: LoginVerificationCopy = {
  back:'Usar otra cuenta',badge:'Verificación segura',title:'Escribe tu código',
  sent:'Enviamos un código de 6 dígitos a',code:'Código de verificación',verify:'Verificar y entrar',verifying:'Verificando…',
  resend:'Reenviar código',resending:'Enviando…',resendIn:'Reenviar en',expires:'El código vence en',
  hint:'Revisa tu bandeja de entrada y correo no deseado. Usa el último código que recibiste.',
  expired:'Este código venció. Regresa e inicia sesión para pedir uno nuevo.',
  invalid:'El código no es correcto. Revisa los 6 dígitos e intenta de nuevo.',
  unavailable:'Esta verificación ya no está disponible. Regresa e inicia sesión de nuevo.',
  locked:'Se alcanzó el límite de intentos. Espera antes de volver a entrar o recupera tu contraseña.',
  resent:'Enviamos un código nuevo. Usa el más reciente.',
  sendFailed:'No pudimos enviar otro código. El anterior sigue funcionando hasta que venza.',
  resendUncertain:'No pudimos confirmar el reenvío. Revisa tu correo y usa el último código recibido.',
  network:'No pudimos confirmar el acceso. Revisa tu conexión y recarga para comprobar si ya iniciaste sesión.',
  reload:'Comprobar acceso',loginFailed:'Revisa la empresa, el correo y la contraseña e intenta de nuevo.',
  initialSendFailed:'No pudimos enviar el código. Intenta iniciar sesión de nuevo en un momento.',
};
const localized: Record<string, LoginVerificationCopy> = {
  en, es,
  fr:{back:'Utiliser un autre compte',badge:'Vérification sécurisée',title:'Entrez votre code',sent:'Un code à 6 chiffres a été envoyé à',code:'Code de vérification',verify:'Vérifier et se connecter',verifying:'Vérification…',resend:'Renvoyer le code',resending:'Envoi…',resendIn:'Renvoyer dans',expires:'Le code expire dans',hint:'Vérifiez votre boîte de réception et les indésirables. Utilisez le dernier code reçu.',expired:'Ce code a expiré. Revenez et reconnectez-vous pour en demander un autre.',invalid:'Code incorrect. Vérifiez les 6 chiffres et réessayez.',unavailable:'Cette vérification n’est plus disponible. Revenez et reconnectez-vous.',locked:'Trop de tentatives. Patientez ou récupérez votre mot de passe.',resent:'Nouveau code envoyé. Utilisez le plus récent.',sendFailed:'Envoi impossible. Le code précédent reste valable jusqu’à son expiration.',resendUncertain:'Renvoi non confirmé. Vérifiez vos courriels et utilisez le dernier code reçu.',network:'Connexion non confirmée. Vérifiez votre connexion réseau et rechargez la page.',reload:'Vérifier la connexion',loginFailed:'Vérifiez l’entreprise, le courriel et le mot de passe.',initialSendFailed:'Envoi du code impossible. Réessayez de vous connecter dans un instant.'},
  pt:{back:'Usar outra conta',badge:'Verificação segura',title:'Digite seu código',sent:'Enviamos um código de 6 dígitos para',code:'Código de verificação',verify:'Verificar e entrar',verifying:'Verificando…',resend:'Reenviar código',resending:'Enviando…',resendIn:'Reenviar em',expires:'O código vence em',hint:'Confira sua caixa de entrada e spam. Use o último código recebido.',expired:'Este código venceu. Volte e entre novamente para pedir outro.',invalid:'Código incorreto. Confira os 6 dígitos e tente novamente.',unavailable:'Esta verificação não está mais disponível. Volte e entre novamente.',locked:'Muitas tentativas. Aguarde ou recupere sua senha.',resent:'Novo código enviado. Use o mais recente.',sendFailed:'Não foi possível enviar outro código. O anterior vale até vencer.',resendUncertain:'Reenvio não confirmado. Confira seu email e use o último código recebido.',network:'Não foi possível confirmar o acesso. Confira sua conexão e recarregue a página.',reload:'Conferir acesso',loginFailed:'Confira a empresa, o email e a senha.',initialSendFailed:'Não foi possível enviar o código. Tente entrar novamente em instantes.'},
  ko:{back:'다른 계정 사용',badge:'보안 인증',title:'인증 코드 입력',sent:'6자리 코드를 보낸 주소:',code:'인증 코드',verify:'인증하고 로그인',verifying:'인증 중…',resend:'코드 다시 보내기',resending:'전송 중…',resendIn:'다시 보내기까지',expires:'코드 만료까지',hint:'받은편지함과 스팸함을 확인하세요. 가장 최근에 받은 코드를 사용하세요.',expired:'코드가 만료되었습니다. 돌아가서 다시 로그인해 새 코드를 요청하세요.',invalid:'코드가 올바르지 않습니다. 6자리를 확인하고 다시 시도하세요.',unavailable:'이 인증은 더 이상 사용할 수 없습니다. 다시 로그인하세요.',locked:'시도 횟수를 초과했습니다. 잠시 기다리거나 비밀번호를 복구하세요.',resent:'새 코드를 보냈습니다. 가장 최근 코드를 사용하세요.',sendFailed:'새 코드를 보내지 못했습니다. 이전 코드는 만료 전까지 사용할 수 있습니다.',resendUncertain:'재전송을 확인하지 못했습니다. 이메일에서 가장 최근 코드를 확인하세요.',network:'로그인을 확인하지 못했습니다. 연결 상태를 확인하고 새로고침하세요.',reload:'로그인 확인',loginFailed:'회사, 이메일, 비밀번호를 확인하세요.',initialSendFailed:'코드를 보내지 못했습니다. 잠시 후 다시 로그인하세요.'},
  zh:{back:'使用其他账户',badge:'安全验证',title:'输入验证码',sent:'6 位验证码已发送至',code:'验证码',verify:'验证并登录',verifying:'正在验证…',resend:'重新发送验证码',resending:'正在发送…',resendIn:'重新发送倒计时',expires:'验证码有效时间',hint:'请检查收件箱和垃圾邮件，使用最新收到的验证码。',expired:'验证码已过期，请返回并重新登录以获取新验证码。',invalid:'验证码错误，请检查 6 位数字并重试。',unavailable:'此验证已不可用，请返回并重新登录。',locked:'尝试次数过多，请稍后重试或找回密码。',resent:'新验证码已发送，请使用最新的验证码。',sendFailed:'无法发送新验证码，之前的验证码在到期前仍然有效。',resendUncertain:'无法确认是否重新发送，请检查邮箱并使用最新的验证码。',network:'无法确认登录，请检查网络连接并刷新页面。',reload:'检查登录',loginFailed:'请检查公司、邮箱和密码。',initialSendFailed:'无法发送验证码，请稍后重新登录。'},
};
export const getLoginVerificationCopy = (locale: string): LoginVerificationCopy => localized[locale.split('-')[0]] ?? en;
