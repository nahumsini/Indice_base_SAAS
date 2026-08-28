export type CustomerTableCopy = {
  account: string;
  userType: string;
  commercialOrigin: string;
  status: string;
  access: string;
  billing: string;
  users: string;
  nextEvent: string;
  actions: string;
  columns: string;
  more: string;
  manage: string;
  editType: string;
  noAccounts: string;
  noPlan: string;
  noContract: string;
  monthly: string;
  annual: string;
  currentCharge: string;
  nextInvoiceCharge: string;
  afterTrial: string;
  estimatedCharge: string;
  stripeScheduled: string;
  pendingStripeActivation: string;
  pricePending: string;
  configureRate: string;
  activeUsers: string;
  availableUsers: string;
  manageUsers: string;
  noActivity: string;
  trialEnd: string;
  trialExpired: string;
  daysRemaining: (days: number) => string;
  extendTrial: string;
  permanentTrial: string;
  renewal: string;
  noDate: string;
  sort: string;
  directWithIndice: string;
  distributorAccount: string;
  assignedDistributor: string;
  assignDistributor: string;
  changeDistributor: string;
  deleteAccount: string;
  createdByDistributor: string;
  createdByIndice: string;
  webRegistration: string;
  originNotRegistered: string;
  traceabilityUnavailable: string;
  currentDistributor: string;
  noCurrentDistributor: string;
  currentPortfolio: string;
};

const copies: Record<"en-CA" | "es-MX", CustomerTableCopy> = {
  "en-CA": {
    account: "Account",
    userType: "Account type",
    commercialOrigin: "Origin",
    status: "Status",
    access: "Plan",
    billing: "Billing",
    users: "Users",
    nextEvent: "Next event",
    actions: "Actions",
    columns: "Columns",
    more: "More",
    manage: "Manage",
    editType: "Edit user type",
    noAccounts: "No accounts match these filters.",
    noPlan: "No plan",
    noContract: "No contract",
    monthly: "Monthly",
    annual: "Annual",
    currentCharge: "Current charge",
    nextInvoiceCharge: "Renewal amount",
    afterTrial: "After trial",
    estimatedCharge: "Estimated charge",
    stripeScheduled: "Scheduled in Stripe",
    pendingStripeActivation: "Pending Stripe activation",
    pricePending: "Price pending",
    configureRate: "Configure rate",
    activeUsers: "active users",
    availableUsers: "available",
    manageUsers: "Manage users",
    noActivity: "No activity",
    trialEnd: "Trial ends",
    trialExpired: "Trial expired",
    daysRemaining: (days) => `${days} day${days === 1 ? "" : "s"} left`,
    extendTrial: "Extend trial",
    permanentTrial: "No expiration",
    renewal: "Renewal",
    noDate: "No scheduled date",
    sort: "Sort",
    directWithIndice: "Direct with Indice",
    distributorAccount: "Distributor account",
    assignedDistributor: "Assigned distributor",
    assignDistributor: "Assign distributor",
    changeDistributor: "Change distributor",
    deleteAccount: "Delete account",
    createdByDistributor: "Created by distributor",
    createdByIndice: "Created by Indice",
    webRegistration: "Web self-registration",
    originNotRegistered: "Historical origin",
    traceabilityUnavailable: "Traceability unavailable",
    currentDistributor: "Current distributor",
    noCurrentDistributor: "No current distributor",
    currentPortfolio: "Current portfolio",
  },
  "es-MX": {
    account: "Cuenta",
    userType: "Tipo de cuenta",
    commercialOrigin: "Origen",
    status: "Estado",
    access: "Plan",
    billing: "Facturación",
    users: "Usuarios",
    nextEvent: "Próximo evento",
    actions: "Acciones",
    columns: "Columnas",
    more: "Más",
    manage: "Administrar",
    editType: "Editar tipo de usuario",
    noAccounts: "No hay cuentas que coincidan con los filtros.",
    noPlan: "Sin plan",
    noContract: "Sin contrato",
    monthly: "Mensual",
    annual: "Anual",
    currentCharge: "Cobro actual",
    nextInvoiceCharge: "Cargo de renovación",
    afterTrial: "Al terminar la prueba",
    estimatedCharge: "Cargo estimado",
    stripeScheduled: "Programado en Stripe",
    pendingStripeActivation: "Pendiente de activar Stripe",
    pricePending: "Precio pendiente",
    configureRate: "Configurar tarifa",
    activeUsers: "usuarios activos",
    availableUsers: "disponibles",
    manageUsers: "Administrar usuarios",
    noActivity: "Sin movimientos",
    trialEnd: "Fin de prueba",
    trialExpired: "Prueba vencida",
    daysRemaining: (days) => `${days} día${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`,
    extendTrial: "Extender prueba",
    permanentTrial: "Sin vencimiento",
    renewal: "Renovación",
    noDate: "Sin fecha programada",
    sort: "Ordenar",
    directWithIndice: "Directo con Índice",
    distributorAccount: "Cuenta distribuidora",
    assignedDistributor: "Distribuidor asignado",
    assignDistributor: "Asignar distribuidor",
    changeDistributor: "Cambiar distribuidor",
    deleteAccount: "Eliminar cuenta",
    createdByDistributor: "Creado por distribuidor",
    createdByIndice: "Creado por Índice",
    webRegistration: "Registro directo en web",
    originNotRegistered: "Origen histórico",
    traceabilityUnavailable: "Sin trazabilidad disponible",
    currentDistributor: "Distribuidor actual",
    noCurrentDistributor: "Sin distribuidor actual",
    currentPortfolio: "Cartera vigente",
  },
};

export function getCustomerTableCopy(english: boolean) {
  return copies[english ? "en-CA" : "es-MX"];
}
