import type { QuickTestAccountCopy } from "./types";

export const esMXQuickTestCopy: QuickTestAccountCopy = {
  modal: {
    eyebrow: "Preparación rápida",
    title: "Crear cuenta de prueba",
    description: "Responde lo esencial y revisa el acceso antes de crearla.",
  },
  steps: { scenario: "Escenario", details: "Datos" },
  progress: {
    label: "Progreso de la cuenta de prueba",
    step: (current) => `Paso ${current} de 2 · preparación de demo`,
  },
  actions: {
    cancel: "Cancelar",
    previous: "Anterior",
    next: "Continuar",
    review: "Revisar acceso",
  },
  scenario: {
    title: "¿Qué quieres probar?",
    description: "Índice preparará módulos, capacidad y vigencia recomendados.",
    modules: (count) => `Módulos: ${count}`,
    employees: (count) => `${count} empleados`,
    days: (count) => `${count} días`,
    options: {
      people: {
        label: "Equipo y procesos",
        description: "Recursos Humanos, tareas e indicadores para una operación interna.",
      },
      commerce: {
        label: "Ventas e inventario",
        description: "Flujo comercial, inventarios, gastos y cobranza.",
      },
      complete: {
        label: "Operación completa",
        description: "Todos los módulos base disponibles para una prueba integral.",
      },
    },
  },
  details: {
    title: "Identifica la cuenta de prueba",
    description: "Puedes conservar los datos generados o reemplazarlos.",
    companyName: "Nombre de la empresa",
    ownerName: "Nombre del responsable",
    ownerEmail: "Correo de acceso",
    country: "País",
    employees: "Personas que usarán Índice",
    trial: "Duración de la prueba",
    summary: "Preparación automática",
    scenario: "Escenario",
    access: "Acceso inicial",
    capacity: "Capacidad",
    notice: "El siguiente paso permite revisar módulos, usuarios y vigencia antes de crear la cuenta.",
    companyPrefix: "Demo Índice",
    defaultOwnerName: "Usuario de prueba",
  },
  errors: {
    duplicateEmail: "Ese correo ya pertenece a otra cuenta. Usa uno diferente.",
    noModules: "No hay módulos base disponibles para este escenario.",
  },
};
