export function getPhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function getWhatsAppHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
