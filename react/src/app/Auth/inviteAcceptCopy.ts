export type InviteAcceptCopy = {
  logoAlt: string;
  secureAccess: string;
  brandTitle: string;
  brandBody: (company: string) => string;
  singleUse: string;
  samePassword: string;
  userInvitation: string;
  loading: string;
  company: string;
  role: string;
  name: string;
  email: string;
  workspaceFallback: string;
  invitedUserFallback: string;
  currentPassword: string;
  createPassword: string;
  confirmCurrentPassword: string;
  confirmPassword: string;
  passwordHint: string;
  showPassword: string;
  hidePassword: string;
  connecting: string;
  creating: string;
  connectWorkspace: string;
  acceptInvitation: string;
  goToLogin: string;
  passwordMismatch: string;
  passwordLength: string;
  loadFallback: string;
  acceptFallback: string;
  scopeError: string;
  permissionError: string;
  seatError: string;
  roles: Record<string, string>;
  titles: {
    ready: string;
    existing: string;
    complete: string;
    connected: string;
    accepted: string;
    expired: string;
    invalid: string;
  };
  descriptions: {
    ready: string;
    existing: string;
    complete: string;
    connected: string;
    accepted: string;
    expired: string;
    invalid: string;
  };
};

const spanish: InviteAcceptCopy = {
  logoAlt: 'Índice',
  secureAccess: 'Acceso seguro',
  brandTitle: 'Tu espacio de trabajo ya te espera.',
  brandBody: (company) => `${company} te invitó a operar con claridad en Índice.`,
  singleUse: 'La invitación es personal, de un solo uso y vence automáticamente.',
  samePassword: 'Si ya tienes una cuenta, conservarás la misma contraseña en todas tus empresas.',
  userInvitation: 'Invitación de usuario',
  loading: 'Cargando invitación…',
  company: 'Empresa',
  role: 'Rol',
  name: 'Nombre',
  email: 'Correo electrónico',
  workspaceFallback: 'Espacio de Índice',
  invitedUserFallback: 'Usuario invitado',
  currentPassword: 'Contraseña actual',
  createPassword: 'Crea tu contraseña',
  confirmCurrentPassword: 'Confirma tu contraseña actual',
  confirmPassword: 'Confirma tu contraseña',
  passwordHint: 'Usa al menos 8 caracteres.',
  showPassword: 'Mostrar contraseña',
  hidePassword: 'Ocultar contraseña',
  connecting: 'Conectando empresa…',
  creating: 'Creando cuenta…',
  connectWorkspace: 'Conectar empresa',
  acceptInvitation: 'Aceptar invitación',
  goToLogin: 'Ir a iniciar sesión',
  passwordMismatch: 'La contraseña y su confirmación deben coincidir.',
  passwordLength: 'La contraseña debe tener al menos 8 caracteres.',
  loadFallback: 'No pudimos cargar la invitación.',
  acceptFallback: 'No pudimos aceptar la invitación.',
  scopeError: 'La invitación no tiene un alcance de acceso válido. Pide al administrador que la reenvíe.',
  permissionError: 'La invitación no tiene todos los permisos necesarios. Pide al administrador que la reenvíe.',
  seatError: 'La empresa alcanzó su límite de usuarios. Un administrador debe ampliar el plan antes de aceptar esta invitación.',
  roles: {
    admin: 'Administrador',
    user: 'Usuario',
    manager: 'Gerente',
    supervisor: 'Supervisor',
    owner: 'Propietario',
    super_admin: 'Administrador principal',
  },
  titles: {
    ready: 'Acepta tu invitación a Índice',
    existing: 'Conecta otra empresa',
    complete: 'Tu cuenta está lista',
    connected: 'Empresa conectada',
    accepted: 'Invitación ya aceptada',
    expired: 'La invitación venció',
    invalid: 'Invitación no disponible',
  },
  descriptions: {
    ready: 'Crea tu contraseña para entrar al espacio de trabajo de la empresa.',
    existing: 'Confirma tu contraseña actual para agregar esta empresa a tu cuenta de Índice.',
    complete: 'Ya puedes iniciar sesión con tu correo y la contraseña que acabas de crear.',
    connected: 'Esta empresa ya está disponible desde tu cuenta actual de Índice.',
    accepted: 'Este enlace ya fue utilizado. Inicia sesión con la cuenta vinculada a la invitación.',
    expired: 'Pide a un administrador que te envíe una nueva invitación.',
    invalid: 'El enlace no es válido o dejó de estar disponible.',
  },
};

const english: InviteAcceptCopy = {
  logoAlt: 'Indice',
  secureAccess: 'Secure access',
  brandTitle: 'Your workspace is ready for you.',
  brandBody: (company) => `${company} invited you to operate with clarity in Indice.`,
  singleUse: 'Your invitation is personal, single-use, and expires automatically.',
  samePassword: 'If you already have an account, you will keep the same password across every company.',
  userInvitation: 'User invitation',
  loading: 'Loading invitation…',
  company: 'Company',
  role: 'Role',
  name: 'Name',
  email: 'Email',
  workspaceFallback: 'Indice workspace',
  invitedUserFallback: 'Invited user',
  currentPassword: 'Current password',
  createPassword: 'Create your password',
  confirmCurrentPassword: 'Confirm current password',
  confirmPassword: 'Confirm password',
  passwordHint: 'Use at least 8 characters.',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  connecting: 'Connecting company…',
  creating: 'Creating account…',
  connectWorkspace: 'Connect company',
  acceptInvitation: 'Accept invitation',
  goToLogin: 'Go to login',
  passwordMismatch: 'Password and confirmation must match.',
  passwordLength: 'Password must be at least 8 characters long.',
  loadFallback: 'Invitation could not be loaded.',
  acceptFallback: 'Invitation could not be accepted.',
  scopeError: 'The invitation does not have a valid access scope. Ask an administrator to resend it.',
  permissionError: 'The invitation is missing required permissions. Ask an administrator to resend it.',
  seatError: 'The company has reached its user limit. An administrator must expand the plan before this invitation can be accepted.',
  roles: {
    admin: 'Administrator',
    user: 'User',
    manager: 'Manager',
    supervisor: 'Supervisor',
    owner: 'Owner',
    super_admin: 'Lead administrator',
  },
  titles: {
    ready: 'Accept your Indice invitation',
    existing: 'Connect another company',
    complete: 'Your account is ready',
    connected: 'Company connected',
    accepted: 'Invitation already accepted',
    expired: 'Invitation expired',
    invalid: 'Invitation unavailable',
  },
  descriptions: {
    ready: 'Create your password to enter the company workspace.',
    existing: 'Confirm your current password to add this company to your Indice account.',
    complete: 'You can now sign in with your email and the password you just created.',
    connected: 'This company is now available from your existing Indice account.',
    accepted: 'This link has already been used. Sign in with the account connected to the invitation.',
    expired: 'Ask an administrator to send you a new invitation.',
    invalid: 'The link is invalid or no longer available.',
  },
};

export function getInviteAcceptCopy(languageCode: string): InviteAcceptCopy {
  return languageCode.startsWith('es') ? spanish : english;
}

export function localizeInvitationError(message: string, copy: InviteAcceptCopy): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('business unit or business access')) {
    return copy.scopeError;
  }
  if (normalized.includes('module permissions') || normalized.includes('tab permissions')) {
    return copy.permissionError;
  }
  if (normalized.includes('seat limit') || normalized.includes('seat capacity')) {
    return copy.seatError;
  }
  if (normalized.includes('password and confirmation must match')) {
    return copy.passwordMismatch;
  }
  if (normalized.includes('password must be at least')) {
    return copy.passwordLength;
  }
  return message;
}
