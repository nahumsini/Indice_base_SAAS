import type { BusinessProfileTranslations } from "./types";
import { esMX } from './es-MX';

export const esCO = {
  title: "Diagnóstico empresarial",
  description:
    "Ayúdanos a conocer mejor tu empresa y la etapa de gestión para personalizar Índice.",
  centerTitle: "Centro de diagnóstico empresarial",
  centerDescription:
    "Descubre el estado de gestión de tu empresa a través de 4 pilares: Personas, Procesos, Productos y Finanzas. Con las respuestas utilizaremos los índices de Madurez Empresarial (IME), que nos ayudará a personalizar recomendaciones, módulos y mejores compañeros detrás de Índice.",
  questionCount: "10 preguntas cada uno",
  questionCountLabel: "El diagnóstico contiene",
  progress: "Progreso del diagnóstico empresarial",
  progressOf: "completado",
  onboarding: {
    answeredProgress: "Has respondido {answered} de {total} preguntas",
    encouragementMid: "Vas muy bien",
    encouragementNear: "Ya casi terminas",
    sections: {
      people: {
        title: "Paso 1 — Tu equipo",
        intro: "Entendamos cómo trabaja tu equipo",
        done: "Listo — entendemos mejor a tu equipo",
      },
      processes: {
        title: "Paso 2 — Cómo operas",
        intro: "Entendamos cómo funciona tu operación diaria",
        done: "Listo — entendemos cómo operas",
      },
      products: {
        title: "Paso 3 — Lo que vendes",
        intro: "Entendamos tu oferta y cómo llega al mercado",
        done: "Listo — entendemos lo que vendes",
      },
      finance: {
        title: "Paso 4 — Tus finanzas",
        intro: "Entendamos cómo controlas tus números",
        done: "Listo — entendemos tus finanzas",
      },
    },
  },
  printDiagnosis: "Descargar PDF",
  start: "Comenzar",
  continue: "Continuar",
  doAgain: "Hacer de nuevo",
  reviewAnswers: "Revisar respuestas",
  close: "Cerrar",
  question: "Pregunta",
  of: "de",
  completed: "completadas",
  previous: "Anterior",
  next: "Siguiente",
  finish: "Finalizar",
  restart: "Reiniciar diagnóstico",
  restartDialog: {
    cancel: "Cancelar",
    confirm: "Reiniciar prueba",
    description: "Conservaremos tu resultado anterior y comenzaremos una nueva versión.",
    title: "¿Reiniciar diagnóstico?",
  },
  result: esMX.result,
  actions: {
    save: "Guardar",
    saving: "Guardando...",
    discard: "Descartar",
  },
  scoreSummary: {
    title: "Puntuación del diagnóstico",
    bmi: "IME",
    level: "Nivel",
    answered: "Respondidas",
    score: "Puntaje",
  },
  messages: {
    loading: "Cargando diagnóstico empresarial...",
    loadError: "No pudimos cargar el diagnóstico empresarial.",
    saveSuccess: "Se guardó el diagnóstico empresarial.",
    saveError: "No pudimos guardar el diagnóstico empresarial.",
    unsavedChanges: "Tienes cambios sin guardar en el diagnóstico empresarial.",
  },
  pillars: {
    people: {
      title: "Personas",
      description: "Analiza talentos, estructura de equipo y comunicación.",
    },
    processes: {
      title: "Procesos",
      description: "Evalúa flujos, tareas, escalabilidad y eficiencia.",
    },
    products: {
      title: "Productos",
      description: "Analiza oferta, mercado, comercial y propuesta de valor.",
    },
    finance: {
      title: "Finanzas",
      description: "Evalúa control financiero, gestión y toma de decisiones.",
    },
  },
  questions: {
    people: [
      {
        question: "¿Cuál es tu rol principal?",
        options: ["Fundador/CEO", "Operaciones", "Finanzas", "Comercial/Otro"],
      },
      {
        question: "¿Cuántas personas trabajan?",
        options: ["Solo yo", "2 a 5", "6 a 20", "21 o más"],
      },
      {
        question: "¿Cómo está organizado tu equipo?",
        options: [
          "Sin estructura",
          "Roles básicos",
          "Áreas definidas",
          "Organigrama formal",
        ],
      },
      {
        question: "¿Cómo asignan tareas?",
        options: [
          "Improvisado",
          "Listas",
          "Asignación estructurada",
          "Sistema de gestión",
        ],
      },
      {
        question: "¿Revisión de desempeño?",
        options: ["Nunca", "Por problemas", "Semanal", "Con KPIs"],
      },
      {
        question: "¿Delegación?",
        options: [
          "Hago todo",
          "Delego y superviso",
          "Delego con control",
          "Equipo autónomo",
        ],
      },
      {
        question: "¿Comunicación interna?",
        options: ["Informal", "Chat", "Reuniones", "Herramientas formales"],
      },
      {
        question: "¿Frecuencia de reuniones?",
        options: ["Nunca", "Esporádico", "Semanal", "Frecuente"],
      },
      {
        question: "¿Claridad de responsabilidades?",
        options: [
          "Nada clara",
          "Algo clara",
          "Bastante clara",
          "Totalmente clara",
        ],
      },
      {
        question: "¿Facilidad de integración?",
        options: ["Muy difícil", "Difícil", "Moderado", "Fácil"],
      },
    ],
    processes: [
      {
        question: "¿Procesos documentados?",
        options: ["Nada", "Algunos", "Mayoría", "Totalmente"],
      },
      {
        question: "¿Gestión de tareas?",
        options: ["Improvisado", "Listas", "Herramientas", "Sistema formal"],
      },
      {
        question: "¿Monitoreo de avance?",
        options: ["No se monitorea", "Ocasional", "Reportes", "KPIs"],
      },
      {
        question: "¿Automatización?",
        options: [
          "Manual",
          "Herramientas aisladas",
          "Automatización parcial",
          "Alta automatización",
        ],
      },
      {
        question: "¿Replicabilidad?",
        options: ["Muy difícil", "Con esfuerzo", "Posible", "Fácil"],
      },
      {
        question: "¿Dónde se pierde tiempo?",
        options: ["Manual", "Coordinación", "Información", "Seguimiento"],
      },
      {
        question: "¿Dependencia de personas?",
        options: ["Total", "Bastante", "Algo", "Poco"],
      },
      {
        question: "¿Claridad de procesos?",
        options: [
          "Nada claros",
          "Algo claros",
          "Bastante claros",
          "Totalmente claros",
        ],
      },
      {
        question: "¿Gestión de errores?",
        options: ["Reacción", "Informal", "Revisión", "Mejora continua"],
      },
      {
        question: "¿Escalabilidad?",
        options: ["Nula", "Baja", "Media", "Alta"],
      },
    ],
    products: [
      {
        question: "¿Qué vendes?",
        options: ["Servicios", "Productos", "Digital", "Mixto"],
      },
      {
        question: "¿Tipo de cliente?",
        options: ["B2C", "B2B", "Gobierno", "Mixto"],
      },
      {
        question: "¿Ingresos principales?",
        options: ["Venta directa", "Servicios", "Suscripción", "Contratos"],
      },
      {
        question: "¿Diversificación?",
        options: ["Uno", "Algunos", "Varias líneas", "Amplio"],
      },
      {
        question: "¿Definición de precios?",
        options: ["Intuición", "Competencia", "Costos", "Estrategia"],
      },
      {
        question: "¿Seguimiento desempeño?",
        options: [
          "No se mide",
          "Solo ventas",
          "Ventas+rentabilidad",
          "Indicadores",
        ],
      },
      {
        question: "¿Propuesta de valor?",
        options: ["No clara", "Algo clara", "Bastante clara", "Muy clara"],
      },
      {
        question: "¿Feedback cliente?",
        options: ["No hay", "Informal", "Encuestas", "Análisis"],
      },
      {
        question: "¿Evolución producto?",
        options: [
          "Sobre la marcha",
          "Cambios ocasionales",
          "Planes",
          "Roadmap",
        ],
      },
      {
        question: "¿Prioridad comercial?",
        options: ["Clientes", "Ventas actuales", "Rentabilidad", "Escalar"],
      },
    ],
    finance: [
      {
        question: "¿Control financiero?",
        options: ["No estructurado", "Excel", "Software", "Sistema integrado"],
      },
      {
        question: "¿Revisión de números?",
        options: ["Nunca", "Mensual", "Semanal", "Diario"],
      },
      {
        question: "¿Flujo de efectivo?",
        options: ["No controlado", "Reacción", "Revisión", "Proyección"],
      },
      {
        question: "¿Costos claros?",
        options: [
          "No claros",
          "Aproximados",
          "Bastante claros",
          "Control total",
        ],
      },
      {
        question: "¿Margen?",
        options: ["No sé", "Estimado", "Claro", "Totalmente medido"],
      },
      {
        question: "¿Decisiones financieras?",
        options: ["Intuición", "Experiencia", "Datos", "Modelos"],
      },
      {
        question: "¿Ingresos predecibles?",
        options: ["Muy variables", "Variables", "Estables", "Muy estables"],
      },
      {
        question: "¿Gestión de deuda?",
        options: ["Sin control", "Básico", "Estrategia", "Optimizado"],
      },
      {
        question: "¿Preparación ante crisis?",
        options: ["Nula", "Baja", "Media", "Alta"],
      },
      {
        question: "¿Cumplimiento fiscal?",
        options: ["Sin control", "Retrasos", "Al día", "Estrategia fiscal"],
      },
    ],
  },
} as const satisfies BusinessProfileTranslations;
