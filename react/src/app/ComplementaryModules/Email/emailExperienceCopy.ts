import { useLanguage } from '../../shared/context';

const en = {
  openMailbox: 'Open mailbox',
  connectionGuide: 'Save your account, check both connections, then open your mailbox.',
  checkHint: 'Tests verify the connection without sending a message. Allow 30 seconds between tests.',
  mailingOn: 'Enabled for Sales Mailing', mailingOff: 'Not enabled for Sales Mailing',
  passwordHint: 'Use this mailbox’s password or the app password provided by your email service.',
  requiredHint: '* Required fields. Saved passwords can be left blank.',
  readingHint: 'Choose an email to read it, reply or continue a draft.',
  pageMessages: 'Messages on this page', attachment: 'Attachments',
};
type Copy = typeof en;
const es: Copy = {
  openMailbox: 'Abrir buzón',
  connectionGuide: 'Guarda tu cuenta, verifica las dos conexiones y abre tu buzón.',
  checkHint: 'Las pruebas verifican la conexión sin enviar mensajes. Deja 30 segundos entre pruebas.',
  mailingOn: 'Habilitada para Mailing de Ventas', mailingOff: 'Sin habilitar para Mailing de Ventas',
  passwordHint: 'Usa la contraseña de este buzón o la contraseña de aplicación de tu proveedor.',
  requiredHint: '* Campos obligatorios. Puedes dejar en blanco las contraseñas ya guardadas.',
  readingHint: 'Elige un correo para leerlo, responder o continuar un borrador.',
  pageMessages: 'Mensajes en esta página', attachment: 'Archivos adjuntos',
};
const fr: Copy = {
  openMailbox: 'Ouvrir la boîte',
  connectionGuide: 'Enregistrez le compte, vérifiez les deux connexions, puis ouvrez la boîte.',
  checkHint: 'Les tests vérifient la connexion sans envoyer de message. Attendez 30 secondes entre les tests.',
  mailingOn: 'Activé pour Mailing des ventes', mailingOff: 'Non activé pour Mailing des ventes',
  passwordHint: 'Utilisez le mot de passe de cette boîte ou celui d’application fourni par le service.',
  requiredHint: '* Champs obligatoires. Les mots de passe enregistrés peuvent rester vides.',
  readingHint: 'Choisissez un courriel pour le lire, répondre ou reprendre un brouillon.',
  pageMessages: 'Messages sur cette page', attachment: 'Pièces jointes',
};
const pt: Copy = {
  openMailbox: 'Abrir caixa de entrada',
  connectionGuide: 'Salve sua conta, verifique as duas conexões e abra sua caixa de entrada.',
  checkHint: 'Os testes verificam a conexão sem enviar mensagens. Aguarde 30 segundos entre os testes.',
  mailingOn: 'Habilitada para Mailing de Vendas', mailingOff: 'Não habilitada para Mailing de Vendas',
  passwordHint: 'Use a senha desta caixa ou a senha de aplicativo fornecida pelo provedor.',
  requiredHint: '* Campos obrigatórios. Senhas já salvas podem ficar em branco.',
  readingHint: 'Escolha um email para ler, responder ou continuar um rascunho.',
  pageMessages: 'Mensagens nesta página', attachment: 'Anexos',
};
const ko: Copy = {
  openMailbox: '메일함 열기',
  connectionGuide: '계정을 저장하고 두 연결을 확인한 후 메일함을 여세요.',
  checkHint: '테스트는 메시지를 보내지 않고 연결만 확인합니다. 테스트 간 30초를 기다리세요.',
  mailingOn: '영업 Mailing에 사용', mailingOff: '영업 Mailing에 사용하지 않음',
  passwordHint: '이 메일함의 비밀번호 또는 제공업체의 앱 비밀번호를 사용하세요.',
  requiredHint: '* 필수 항목. 저장된 비밀번호는 비워 두어도 됩니다.',
  readingHint: '이메일을 선택해 읽거나 답장하거나 임시 보관함 작성을 계속하세요.',
  pageMessages: '이 페이지의 메시지', attachment: '첨부 파일',
};
const zh: Copy = {
  openMailbox: '打开邮箱',
  connectionGuide: '保存账户，验证两项连接，然后打开邮箱。',
  checkHint: '测试仅验证连接，不会发送邮件。每次测试请间隔30秒。',
  mailingOn: '已启用销售Mailing', mailingOff: '未启用销售Mailing',
  passwordHint: '请使用此邮箱的密码或服务商提供的应用密码。',
  requiredHint: '* 必填项。已保存的密码可以留空。',
  readingHint: '选择邮件以阅读、回复或继续编辑草稿。',
  pageMessages: '本页邮件', attachment: '附件',
};
const copies: Record<string, Copy> = { en, es, fr, pt, ko, zh };
export function useEmailExperienceCopy() {
  const { currentLanguage } = useLanguage();
  return copies[currentLanguage.code.split('-')[0]] ?? en;
}
