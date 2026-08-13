import type { AccountCreationCopy } from "./types";

export const esMXCopy: AccountCreationCopy = {
  steps: { company: "Empresa", owner: "Propietario", access: "Acceso" },
  modal: {
    eyebrow: "Alta directa Root",
    title: "Crear una cuenta de Índice",
    description: "Configura empresa, propietario y acceso en tres pasos.",
    successTitle: "Cuenta lista para entregar",
    successDescription: "Copia los datos y compártelos por un canal seguro.",
  },
  actions: {
    cancel: "Cancelar", previous: "Anterior", next: "Siguiente",
    validating: "Validando", create: "Crear y habilitar", creating: "Creando cuenta...",
    signInAgain: "Volver a iniciar sesión", finish: "Terminar",
    manageAccount: "Administrar cuenta", generate: "Generar",
    showPassword: "Mostrar contraseña", hidePassword: "Ocultar contraseña",
  },
  progress: {
    label: "Progreso del alta de cuenta",
    step: (current, total, modules) => `Paso ${current} de ${total} · ${modules} módulo(s)`,
    ready: (companyId) => `Empresa #${companyId} · acceso listo para entregar`,
  },
  company: {
    title: "Empresa", description: "Identidad comercial de la nueva cuenta.",
    name: "Nombre de la empresa", namePlaceholder: "Ej. Grupo Horizonte",
    country: "País", accountType: "Tipo de cuenta",
    superAdmin: "Super Admin · cliente", distributor: "Distribuidor",
    industry: "Industria (opcional)", employees: "Número exacto de empleados",
    employeesPlaceholder: "Ej. 18",
    employeesHint: "Incluye al propietario y a toda persona que necesitará acceso a Índice.",
    unspecified: "Sin especificar",
  },
  owner: {
    title: "Propietario y acceso", description: "Credenciales iniciales del dueño de la empresa.",
    name: "Nombre del propietario (opcional)", namePlaceholder: "Nombre y apellidos",
    email: "Correo electrónico", emailPlaceholder: "direccion@empresa.com",
    phone: "Teléfono (opcional)", phonePlaceholder: "+52 998 000 0000",
    password: "Contraseña temporal",
  },
  access: {
    title: "Plan y módulos", description: "Elige únicamente el acceso inicial necesario.",
    modules: "Módulos disponibles",
    baseGroup: "Paquete base",
    baseGroupDescription: "El total de módulos básicos define el paquete comercial.",
    addonGroup: "Módulos complementarios",
    addonGroupDescription: "Se cobran de forma individual cuando termina la prueba.",
    moduleFallback: "Acceso operativo al módulo.",
    noModules: "No hay módulos básicos activos. Revisa Catálogo y módulos.",
    accessType: "Tipo de acceso", demo: "Demo con vigencia", permanent: "Cortesía permanente",
    capacityTitle: "Paquete y capacidad calculados",
    capacityDescription: "Índice cubre los empleados indicados con el paquete y los lugares adicionales necesarios.",
    package: "Paquete base", requiredUsers: "Empleados requeridos",
    packageName: (moduleCount) => moduleCount <= 0
      ? "Sin paquete"
      : moduleCount === 1
        ? "1 módulo"
        : moduleCount === 2
          ? "2 módulos"
          : moduleCount === 3
            ? "3 módulos"
            : "4 o más módulos",
    includedUsers: "Lugares incluidos", additionalUsers: "Usuarios adicionales",
    duration: "Duración del demo",
    days: (days) => `${days} días`, noExpiration: "Sin fecha de expiración",
  },
  context: { company: "Empresa", owner: "Propietario", directAccount: "Alta directa" },
  notices: {
    restored: "Recuperamos tu avance y generamos una contraseña temporal nueva.",
    audit: "Creará una empresa real y quedará en auditoría. No genera cargos de Stripe.",
  },
  errors: {
    password: "La contraseña debe tener al menos 10 caracteres y no superar 72 bytes.",
    invalidPhone: "Escribe un teléfono válido para el país seleccionado.",
    duplicateEmail: "Ese correo ya pertenece a otra cuenta. Usa otro correo para continuar.",
    selectModule: "Selecciona al menos un módulo para crear la cuenta.",
    createFailed: "No se pudo crear la cuenta.",
    modulesNotApplied: "La cuenta se creó, pero los módulos seleccionados no quedaron confirmados. Ábrela desde Administrar cuenta para completar el acceso.",
    sessionExpired: "Tu sesión Root expiró. Conservamos el avance sin guardar la contraseña.",
  },
  success: {
    created: (companyId) => `Empresa #${companyId} · propietario creado correctamente`,
    initialAccess: "Acceso inicial", oneTimePassword: "La contraseña sólo se muestra aquí.",
    copyAll: "Copiar datos", copiedAll: "Datos copiados", copy: "Copiar", copied: "Copiado",
    loginPage: "Página de acceso", company: "Empresa", email: "Correo",
    password: "Contraseña temporal", loadedModules: "Módulos cargados",
    loadedModulesDescription: (count) => `${count} módulo(s) confirmados en la cuenta`,
    accessDataTitle: "Datos de acceso a Índice",
    securityReminder: "Por seguridad, cambia la contraseña al iniciar sesión.",
    securityShare: "Pide al usuario cambiar esta contraseña desde Panel Inicial → Perfil → Seguridad. Índice no la enviará por correo ni la guardará en la auditoría Root.",
  },
};
