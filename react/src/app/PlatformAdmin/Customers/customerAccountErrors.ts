import { getCustomerAccountCopy, type CustomerAccountMessage } from './customerAccountTranslations';
// Exact legacy API messages are a compatibility boundary, never a translation of user-authored text.
const legacyMessages: Record<string, CustomerAccountMessage> = {
  'El nombre del usuario es obligatorio.': 'userNameRequired',
  'Ingresa un correo electrónico válido.': 'validEmailRequired',
  'La cuenta no tiene módulos activos para asignar al usuario.': 'noUserModules',
  'La invitación ya no está pendiente.': 'invitationNotPending',
  'El propietario o Super Admin de la cuenta no puede desactivarse aquí.': 'protectedOwnerError',
  'La cuenta eliminada no admite altas ni cambios de acceso.': 'deletedAccountError',
  'Ese correo ya pertenece a la cuenta o tiene una invitación pendiente.': 'emailAlreadyUsed',
};
export function customerAccountError(failure: unknown, locale: string, fallback: CustomerAccountMessage) {
  const details = failure && typeof failure === 'object' ? failure as { code?: string; message?: string } : {};
  const code = details.code || '';
  const key = ['SEAT_CAPACITY_EXCEEDED', 'COMPANY_SEAT_LIMIT_EXCEEDED', 'SEAT_LIMIT_EXCEEDED'].includes(code)
    ? 'seatCapacityExceeded' : legacyMessages[details.message || ''] || fallback;
  return getCustomerAccountCopy(locale).t(key);
}
