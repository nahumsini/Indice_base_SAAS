type KioskLocale = 'en' | 'es';

type PublicKioskMessage = {
  title: string;
  body: string;
  note: string;
};

const defaultMessages: Record<KioskLocale, PublicKioskMessage[]> = {
  en: [
    {
      title: 'Today is a good day to move forward.',
      body: 'Thank you for being part of the team.',
      note: 'Your work counts.',
    },
    {
      title: 'Welcome back.',
      body: 'Register your attendance and keep the operation moving.',
      note: 'Every day matters.',
    },
  ],
  es: [
    {
      title: 'Hoy es un buen dia para avanzar.',
      body: 'Gracias por ser parte del equipo.',
      note: 'Tu trabajo cuenta.',
    },
    {
      title: 'Que gusto verte de nuevo.',
      body: 'Registra tu asistencia y sigamos moviendo la operacion.',
      note: 'Cada dia cuenta.',
    },
  ],
};

const holidayMessages: Record<string, Record<KioskLocale, PublicKioskMessage>> = {
  '01-01': {
    en: {
      title: 'Happy New Year.',
      body: 'May this be a year of progress, focus, and growth.',
      note: 'Thank you for starting strong.',
    },
    es: {
      title: 'Feliz Ano Nuevo.',
      body: 'Que sea un ano de avance, enfoque y crecimiento.',
      note: 'Gracias por empezar con fuerza.',
    },
  },
  '02-14': {
    en: {
      title: 'Happy friendship day.',
      body: 'Thank you for being part of the team and showing up with care.',
      note: 'Teamwork makes the day better.',
    },
    es: {
      title: 'Feliz Dia del Amor y la Amistad.',
      body: 'Gracias por ser parte del equipo y sumar con buena actitud.',
      note: 'Trabajar en equipo hace mejor el dia.',
    },
  },
  '05-10': {
    en: {
      title: 'Happy Mother\'s Day.',
      body: 'To every mom on the team, thank you for your love and dedication.',
      note: 'We celebrate you today.',
    },
    es: {
      title: 'Feliz Dia de las Madres.',
      body: 'A todas las mamas del equipo, gracias por su amor y dedicacion.',
      note: 'Hoy las celebramos.',
    },
  },
};

const getLocale = (languageCode: string): KioskLocale =>
  languageCode.toLowerCase().startsWith('es') ? 'es' : 'en';

export function getPublicKioskGreeting(date: Date, languageCode: string) {
  const locale = getLocale(languageCode);
  const hour = date.getHours();

  if (locale === 'es') {
    if (hour < 12) {
      return 'Buenos dias';
    }
    if (hour < 19) {
      return 'Buenas tardes';
    }
    return 'Buenas noches';
  }

  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 19) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function getPublicKioskMessage(date: Date, languageCode: string): PublicKioskMessage {
  const locale = getLocale(languageCode);
  const key = `${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  const holidayMessage = holidayMessages[key]?.[locale];

  if (holidayMessage) {
    return holidayMessage;
  }

  const messages = defaultMessages[locale];
  return messages[date.getDate() % messages.length];
}
