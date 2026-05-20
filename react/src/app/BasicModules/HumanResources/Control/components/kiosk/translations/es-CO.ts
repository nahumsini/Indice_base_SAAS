import { esMX } from './es-MX';
import type { KioskTranslations } from './types';

export const esCO = {
  ...esMX,
  identifyDescription: 'Ingresa el PIN asignado por Talento Humano.',
  waitingForPin: 'Esperando PIN del personal',
  identifiedTitle: 'Persona identificada',
  identifiedHint: 'Completa foto de verificacion y ubicacion GPS antes de registrar asistencia.',
  terminalSubtitle: 'Ingresa tu PIN para comenzar. Este punto valida foto, ubicacion GPS y asistencia.',
  messages: {
    ...esMX.messages,
    default: [
      {
        title: 'Bienvenido de nuevo.',
        body: 'Registra tu asistencia para mantener la operacion al dia.',
        note: 'Tu aporte suma.',
      },
      {
        title: 'Seguimos avanzando.',
        body: 'Gracias por cumplir tu jornada y apoyar al equipo.',
        note: 'Cada dia cuenta.',
      },
    ],
  },
} satisfies KioskTranslations;
