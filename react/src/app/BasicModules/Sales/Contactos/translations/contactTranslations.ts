import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import type { OpportunitySource } from '../../salesCrmContext';
import type { ContactFiscalState, ContactRelationshipState } from '../utils/contactTableSignals';

export const enCA = {
  header: {
    title: 'Contacts',
    subtitle: 'Commercial relationship directory for customers, fiscal data, quotes, and sales opportunities.',
    columnsAction: 'Columns',
    importContacts: 'Import contacts',
    addContact: 'Add contact',
  },
  search: {
    title: 'Filters',
    label: 'Search',
    placeholder: 'Search contact, company, phone, email, owner, or fiscal data',
    visibleContacts: 'Visible contacts',
    clearFilters: 'Clear filters',
  },
  table: {
    columns: {
      contact: 'Contact',
      company: 'Company',
      phone: 'Phone',
      email: 'Email',
      source: 'Source',
      owner: 'Owner',
      relationship: 'Relationship',
      fiscal: 'Fiscal',
      notes: 'Notes',
      actions: 'Actions',
    },
    emptyTitle: 'No contacts found',
    emptyDescription: 'Try another search or add a new contact to start building the commercial directory.',
    noCompany: 'No company',
    noPhone: 'No phone',
    noEmail: 'No email',
    ownerPlaceholder: 'Owner',
    notesPlaceholder: 'Free contact notes',
  },
  actions: {
    call: (name: string) => `Call ${name}`,
    whatsapp: (name: string) => `WhatsApp ${name}`,
    email: (name: string) => `Email ${name}`,
    edit: (name: string) => `Edit ${name}`,
    delete: (name: string) => `Delete ${name}`,
    noPhone: 'No phone available',
    noEmail: 'No email available',
    deleteTitle: 'Delete contact',
    deleteConfirm: (name: string) => `Delete contact ${name}?`,
    deleteCancel: 'Cancel',
    deleteConfirmLabel: 'Delete contact',
  },
  modal: {
    createTitle: 'Add contact',
    editTitle: 'Edit contact',
    description: 'Capture the commercial and fiscal base for future opportunities, quotes, and billing workflows.',
    commercialTitle: 'Commercial information',
    commercialDescription: 'Relationship and follow-up data for this contact.',
    fiscalTitle: 'Fiscal data',
    fiscalDescription: 'Fiscal base prepared for Mexico, Canada, Colombia, United States, and Brazil.',
    fields: {
      company: 'Company / customer',
      contactPerson: 'Contact person',
      role: 'Role',
      phone: 'Phone',
      email: 'Email',
      source: 'Source',
      owner: 'Owner',
      notes: 'Commercial notes',
      fiscalCountry: 'Fiscal country',
      fiscalLegalName: 'Legal / fiscal name',
      fiscalAddressLine1: 'Fiscal address',
      fiscalAddressLine2: 'Address complement',
      fiscalCity: 'City',
      fiscalState: 'State / province',
      fiscalPostalCode: 'Postal code',
      fiscalEmail: 'Fiscal email',
      fiscalNotes: 'Fiscal notes',
    },
    placeholders: {
      company: 'Trade name or legal name',
      contactPerson: 'Person name',
      role: 'Purchasing, leadership, operations...',
      phone: '+52 81 0000 0000',
      email: 'name@company.com',
      source: 'Source',
      owner: 'Owner',
      notes: 'Context, preferences, relationship origin, or next steps.',
      fiscalCountry: 'Fiscal country',
      fiscalLegalName: 'Legal name for fiscal documents',
      fiscalTaxId: 'Primary tax identifier',
      fiscalRegistryId: 'Corporate or tax authority registry',
      fiscalAddressLine1: 'Street, number, neighbourhood, or suite',
      fiscalAddressLine2: 'Interior, floor, reference',
      fiscalCity: 'City',
      fiscalState: 'State, province, or department',
      fiscalPostalCode: 'Postal code',
      fiscalEmail: 'billing@company.com',
      fiscalRegime: 'Regime, classification, or responsibility',
      fiscalNotes: 'Fiscal conditions, billing requirements, tax use, or future integration notes.',
    },
    validation: {
      identityRequired: 'Capture at least a company, contact person, phone, email, legal name, or tax ID.',
    },
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    saveContact: 'Save contact',
  },
  importModal: {
    title: 'Import contacts',
    description: 'Bring contacts from Android, iPhone, or an exported file. Everything is processed locally in the browser.',
    fromPhone: 'From phone',
    fromPhoneDescription: 'Available when the browser can open the native contacts picker.',
    available: 'Available',
    useFile: 'Use file',
    fileTitle: '.vcf or .csv file',
    fileDescription: 'Ideal for iPhone, Android, or contacts exported from another system.',
    previewTitle: 'Preview',
    previewDescription: 'Review before creating contacts in the directory.',
    ready: (count: number) => `${count} ready`,
    noPhoneEmail: 'No phone/email',
    emptyPreview: 'Select contacts from the phone or upload a file to see the preview.',
    moreContacts: (count: number) => `+${count} more contacts`,
    cancel: 'Cancel',
    importContacts: 'Import contacts',
    selectedReady: (count: number) => `${count} contacts ready to import.`,
    noneSelected: 'No contacts were selected.',
    nativeDenied: 'The browser did not allow reading contacts. Use a .vcf or .csv file as an alternative.',
    fileDetected: (count: number, fileName: string) => `${count} contacts detected in ${fileName}.`,
    fileEmpty: 'No valid contacts were detected in the file.',
    fileReadError: 'The file could not be read. Try a .vcf or .csv exported from your phone.',
    importResult: (imported: number, skipped: number) => (
      `${imported} contacts imported${skipped > 0 ? ` · ${skipped} duplicates skipped` : ''}.`
    ),
  },
  metaImport: {
    trigger: 'Import from Meta',
    title: 'Import Meta leads',
    description: 'Download leads from every Lead Ads form connected to a Meta Page and add them to Contacts.',
    securityTitle: 'One-time secure connection',
    securityDescription: 'The Page access token is used only for this import. Indice does not store it.',
    configurationTitle: 'Meta Lead Ads connection',
    configurationDescription: 'Use a Page access token with permission to retrieve leads for the selected Page.',
    pageIdLabel: 'Meta Page ID',
    pageIdPlaceholder: '123456789012345',
    pageIdHelp: 'Numeric ID of the Facebook Page that owns the Lead Ads forms.',
    tokenLabel: 'Page access token',
    tokenPlaceholder: 'Paste the Page access token',
    tokenHelp: 'The token must be authorized for the Page and include the permissions required by Meta Lead Ads.',
    limitLabel: 'Maximum leads',
    limitOption: (count: number) => `Up to ${count} leads`,
    limitHelp: 'The import is bounded to protect performance. Run it again to continue if needed.',
    cancel: 'Cancel',
    importAction: 'Import leads',
    importing: 'Importing...',
    resultTitle: 'Import completed',
    resultDescription: (imported: number, downloaded: number) => `${imported} new contacts created from ${downloaded} leads downloaded.`,
    resultImported: 'Created',
    resultDuplicates: 'Duplicates',
    resultPrevious: 'Already imported',
    resultInvalid: 'Incomplete',
    errors: {
      INVALID_REQUEST: 'Check the Page ID, token and import limit.',
      META_ACCESS_DENIED: 'Meta denied access. Verify the Page ID, token and Lead Ads permissions.',
      META_RATE_LIMITED: 'Meta temporarily limited the request. Wait a few minutes and try again.',
      META_UNAVAILABLE: 'Meta is temporarily unavailable. Try again later.',
      META_INVALID_RESPONSE: 'Meta returned an unexpected response. Try again or renew the token.',
      generic: 'The Meta leads could not be imported. Review the connection and try again.',
    },
  },
  defaults: {
    unassignedOwner: 'Unassigned',
    importedCompany: 'Imported contact',
    importedPerson: 'Imported contact',
    commercialContact: 'Commercial contact',
    importedTag: 'Imported',
    importedNote: 'Imported from phone contacts or file.',
  },
  fiscalCountries: {
    MX: {
      label: 'Mexico',
      taxIdLabel: 'RFC',
      registryLabel: 'Fiscal certificate',
      regimeLabel: 'Fiscal regime',
    },
    CA: {
      label: 'Canada',
      taxIdLabel: 'Business Number / GST-HST',
      registryLabel: 'Corporation number',
      regimeLabel: 'Tax program account',
    },
    CO: {
      label: 'Colombia',
      taxIdLabel: 'NIT / DIAN',
      registryLabel: 'DV / commercial registry',
      regimeLabel: 'Fiscal responsibility',
    },
    US: {
      label: 'United States',
      taxIdLabel: 'EIN / tax ID',
      registryLabel: 'State registration / corp number',
      regimeLabel: 'Tax classification',
    },
    BR: {
      label: 'Brazil',
      taxIdLabel: 'CNPJ / CPF',
      registryLabel: 'State / municipal registration',
      regimeLabel: 'Tax regime',
    },
  },
  signals: {
    relationship: {
      labels: {
        customer: 'Customer',
        overdue: 'Overdue follow-up',
        activeOpportunity: 'Active opportunity',
        quoted: 'Linked quotes',
        noActivity: 'No activity yet',
      } satisfies Record<ContactRelationshipState, string>,
      details: {
        customer: (opportunities: number, quotes: number) => `${opportunities} ${opportunities === 1 ? 'opportunity' : 'opportunities'} · ${quotes} ${quotes === 1 ? 'quote' : 'quotes'}`,
        overdue: (opportunities: number) => `${opportunities} ${opportunities === 1 ? 'overdue opportunity' : 'overdue opportunities'}`,
        activeOpportunity: (opportunities: number) => `${opportunities} ${opportunities === 1 ? 'open opportunity' : 'open opportunities'}`,
        quoted: (_opportunities: number, quotes: number) => `${quotes} ${quotes === 1 ? 'quote' : 'quotes'}`,
        noActivity: (_opportunities: number, _quotes: number) => 'No linked sales records',
      },
    },
    fiscal: {
      labels: {
        ready: 'Fiscal ready',
        partial: 'Fiscal partial',
        missing: 'No fiscal data',
      } satisfies Record<ContactFiscalState, string>,
      details: {
        ready: (country?: string | null) => country ? `Country: ${country}` : 'Ready for documents',
        partial: (_country?: string | null) => 'Required fiscal fields are incomplete',
        missing: (_country?: string | null) => 'Missing billing profile',
      },
    },
  },
  sources: {
    Manual: 'Manual',
    Website: 'Website',
    Referral: 'Referral',
    Campaign: 'Campaign',
    'Social media': 'Social media',
    WhatsApp: 'WhatsApp',
    'Existing customer': 'Existing customer',
    'Post Sale Opportunity': 'Post Sale Opportunity',
    Other: 'Other',
  } satisfies Record<OpportunitySource, string>,
} as const;

type WidenLiterals<T> =
  T extends (...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : T extends string
      ? string
      : T extends number
        ? number
        : T extends boolean
          ? boolean
          : T extends readonly (infer Item)[]
            ? ReadonlyArray<WidenLiterals<Item>>
            : T extends object
              ? { readonly [Key in keyof T]: WidenLiterals<T[Key]> }
              : T;

export type ContactCopy = WidenLiterals<typeof enCA>;

export const esMX: ContactCopy = {
  ...enCA,
  header: {
    title: 'Contactos',
    subtitle: 'Directorio de relación comercial para clientes, datos fiscales, cotizaciones y oportunidades de venta.',
    columnsAction: 'Columnas',
    importContacts: 'Importar contactos',
    addContact: 'Agregar contacto',
  },
  search: {
    title: 'Filtros',
    label: 'Buscar',
    placeholder: 'Buscar contacto, empresa, teléfono, email, responsable o dato fiscal',
    visibleContacts: 'Contactos visibles',
    clearFilters: 'Limpiar filtros',
  },
  table: {
    columns: {
      contact: 'Contacto',
      company: 'Empresa',
      phone: 'Teléfono',
      email: 'Email',
      source: 'Origen',
      owner: 'Responsable',
      relationship: 'Relación',
      fiscal: 'Fiscal',
      notes: 'Notas',
      actions: 'Acciones',
    },
    emptyTitle: 'No se encontraron contactos',
    emptyDescription: 'Prueba otra búsqueda o agrega un contacto para empezar a construir el directorio comercial.',
    noCompany: 'Sin empresa',
    noPhone: 'Sin teléfono',
    noEmail: 'Sin email',
    ownerPlaceholder: 'Responsable',
    notesPlaceholder: 'Notas libres del contacto',
  },
  actions: {
    call: (name) => `Llamar a ${name}`,
    whatsapp: (name) => `WhatsApp a ${name}`,
    email: (name) => `Email a ${name}`,
    edit: (name) => `Editar ${name}`,
    delete: (name) => `Eliminar ${name}`,
    noPhone: 'Sin teléfono disponible',
    noEmail: 'Sin email disponible',
    deleteTitle: 'Eliminar contacto',
    deleteConfirm: (name) => `¿Eliminar el contacto ${name}?`,
    deleteCancel: 'Cancelar',
    deleteConfirmLabel: 'Eliminar contacto',
  },
  modal: {
    createTitle: 'Agregar contacto',
    editTitle: 'Editar contacto',
    description: 'Captura la base comercial y fiscal para futuras oportunidades, cotizaciones y procesos de facturación.',
    commercialTitle: 'Información comercial',
    commercialDescription: 'Datos de relación y seguimiento del contacto.',
    fiscalTitle: 'Datos fiscales',
    fiscalDescription: 'Base fiscal preparada para México, Canadá, Colombia, Estados Unidos y Brasil.',
    fields: {
      company: 'Empresa / cliente',
      contactPerson: 'Persona de contacto',
      role: 'Cargo / rol',
      phone: 'Teléfono',
      email: 'Email',
      source: 'Origen',
      owner: 'Responsable',
      notes: 'Notas comerciales',
      fiscalCountry: 'País fiscal',
      fiscalLegalName: 'Razón social / nombre fiscal',
      fiscalAddressLine1: 'Dirección fiscal',
      fiscalAddressLine2: 'Complemento de dirección',
      fiscalCity: 'Ciudad',
      fiscalState: 'Estado / provincia',
      fiscalPostalCode: 'Código postal',
      fiscalEmail: 'Email fiscal',
      fiscalNotes: 'Notas fiscales',
    },
    placeholders: {
      company: 'Nombre comercial o razón social',
      contactPerson: 'Nombre de la persona',
      role: 'Compras, dirección, operaciones...',
      phone: '+52 81 0000 0000',
      email: 'correo@empresa.com',
      source: 'Origen',
      owner: 'Responsable',
      notes: 'Contexto, preferencias, origen de la relación o próximos pasos.',
      fiscalCountry: 'País fiscal',
      fiscalLegalName: 'Razón social para documentos fiscales',
      fiscalTaxId: 'Identificación fiscal principal',
      fiscalRegistryId: 'Registro corporativo o autoridad fiscal',
      fiscalAddressLine1: 'Calle, número, colonia o suite',
      fiscalAddressLine2: 'Interior, piso, referencia',
      fiscalCity: 'Ciudad',
      fiscalState: 'Estado, provincia o departamento',
      fiscalPostalCode: 'Código postal',
      fiscalEmail: 'facturacion@empresa.com',
      fiscalRegime: 'Régimen, clasificación o responsabilidad',
      fiscalNotes: 'Condiciones fiscales, requisitos de facturación, uso fiscal o notas para integración futura.',
    },
    validation: {
      identityRequired: 'Captura al menos empresa, persona, telefono, email, razon social o identificacion fiscal.',
    },
    cancel: 'Cancelar',
    saveChanges: 'Guardar cambios',
    saveContact: 'Guardar contacto',
  },
  importModal: {
    title: 'Importar contactos',
    description: 'Trae contactos desde Android, iPhone o un archivo exportado. Todo se procesa localmente en el navegador.',
    fromPhone: 'Desde teléfono',
    fromPhoneDescription: 'Disponible si el navegador permite abrir el selector nativo de contactos.',
    available: 'Disponible',
    useFile: 'Usa archivo',
    fileTitle: 'Archivo .vcf o .csv',
    fileDescription: 'Ideal para iPhone, Android o contactos exportados desde otro sistema.',
    previewTitle: 'Vista previa',
    previewDescription: 'Revisa antes de crear contactos en el directorio.',
    ready: (count) => `${count} listos`,
    noPhoneEmail: 'Sin teléfono/email',
    emptyPreview: 'Selecciona contactos desde el teléfono o carga un archivo para ver la vista previa.',
    moreContacts: (count) => `+${count} contactos más`,
    cancel: 'Cancelar',
    importContacts: 'Importar contactos',
    selectedReady: (count) => `${count} contactos listos para importar.`,
    noneSelected: 'No se seleccionaron contactos.',
    nativeDenied: 'El navegador no permitió leer contactos. Usa un archivo .vcf o .csv como alternativa.',
    fileDetected: (count, fileName) => `${count} contactos detectados en ${fileName}.`,
    fileEmpty: 'No se detectaron contactos válidos en el archivo.',
    fileReadError: 'No se pudo leer el archivo. Prueba con un .vcf o .csv exportado desde tu teléfono.',
    importResult: (imported, skipped) => `${imported} contactos importados${skipped > 0 ? ` · ${skipped} duplicados omitidos` : ''}.`,
  },
  metaImport: {
    trigger: 'Importar desde Meta',
    title: 'Importar leads de Meta',
    description: 'Descarga los leads de todos los formularios Lead Ads asociados a una página de Meta y agrégalos a Contactos.',
    securityTitle: 'Conexión segura de un solo uso',
    securityDescription: 'El token de acceso de la página se utiliza únicamente durante esta importación. Índice no lo almacena.',
    configurationTitle: 'Conexión con Meta Lead Ads',
    configurationDescription: 'Utiliza un token de acceso de página con permiso para consultar los leads de la página seleccionada.',
    pageIdLabel: 'ID de la página de Meta',
    pageIdPlaceholder: '123456789012345',
    pageIdHelp: 'ID numérico de la página de Facebook propietaria de los formularios Lead Ads.',
    tokenLabel: 'Token de acceso de página',
    tokenPlaceholder: 'Pega el token de acceso de la página',
    tokenHelp: 'El token debe estar autorizado para la página y contener los permisos requeridos por Meta Lead Ads.',
    limitLabel: 'Máximo de leads',
    limitOption: (count) => `Hasta ${count} leads`,
    limitHelp: 'La importación está limitada para proteger el rendimiento. Puedes ejecutarla nuevamente para continuar.',
    cancel: 'Cancelar',
    importAction: 'Importar leads',
    importing: 'Importando...',
    resultTitle: 'Importación terminada',
    resultDescription: (imported, downloaded) => `${imported} contactos nuevos creados de ${downloaded} leads descargados.`,
    resultImported: 'Creados',
    resultDuplicates: 'Duplicados',
    resultPrevious: 'Ya importados',
    resultInvalid: 'Incompletos',
    errors: {
      INVALID_REQUEST: 'Revisa el ID de la página, el token y el límite de importación.',
      META_ACCESS_DENIED: 'Meta rechazó el acceso. Verifica el ID de la página, el token y los permisos de Lead Ads.',
      META_RATE_LIMITED: 'Meta limitó temporalmente la solicitud. Espera unos minutos e inténtalo nuevamente.',
      META_UNAVAILABLE: 'Meta no está disponible temporalmente. Inténtalo más tarde.',
      META_INVALID_RESPONSE: 'Meta devolvió una respuesta inesperada. Inténtalo otra vez o renueva el token.',
      generic: 'No se pudieron importar los leads de Meta. Revisa la conexión e inténtalo nuevamente.',
    },
  },
  defaults: {
    unassignedOwner: 'Sin responsable',
    importedCompany: 'Contacto importado',
    importedPerson: 'Contacto importado',
    commercialContact: 'Contacto comercial',
    importedTag: 'Importado',
    importedNote: 'Importado desde contactos del teléfono o archivo.',
  },
  fiscalCountries: {
    MX: { label: 'México', taxIdLabel: 'RFC', registryLabel: 'Cédula / constancia fiscal', regimeLabel: 'Régimen fiscal' },
    CA: { label: 'Canadá', taxIdLabel: 'Business Number / GST-HST', registryLabel: 'Corporation number', regimeLabel: 'Tax program account' },
    CO: { label: 'Colombia', taxIdLabel: 'NIT / DIAN', registryLabel: 'DV / matrícula mercantil', regimeLabel: 'Responsabilidad fiscal' },
    US: { label: 'Estados Unidos', taxIdLabel: 'EIN / tax ID', registryLabel: 'State registration / corp number', regimeLabel: 'Tax classification' },
    BR: { label: 'Brasil', taxIdLabel: 'CNPJ / CPF', registryLabel: 'Inscripción estatal / municipal', regimeLabel: 'Régimen tributario' },
  },
  signals: {
    relationship: {
      labels: {
        customer: 'Cliente',
        overdue: 'Seguimiento vencido',
        activeOpportunity: 'Oportunidad activa',
        quoted: 'Cotizaciones ligadas',
        noActivity: 'Sin actividad aún',
      },
      details: {
        customer: (opportunities, quotes) => `${opportunities} ${opportunities === 1 ? 'oportunidad' : 'oportunidades'} · ${quotes} ${quotes === 1 ? 'cotización' : 'cotizaciones'}`,
        overdue: (opportunities) => `${opportunities} ${opportunities === 1 ? 'oportunidad vencida' : 'oportunidades vencidas'}`,
        activeOpportunity: (opportunities) => `${opportunities} ${opportunities === 1 ? 'oportunidad abierta' : 'oportunidades abiertas'}`,
        quoted: (_opportunities, quotes) => `${quotes} ${quotes === 1 ? 'cotización' : 'cotizaciones'}`,
        noActivity: (_opportunities, _quotes) => 'Sin registros comerciales ligados',
      },
    },
    fiscal: {
      labels: {
        ready: 'Fiscal listo',
        partial: 'Fiscal parcial',
        missing: 'Sin datos fiscales',
      },
      details: {
        ready: (country) => country ? `País: ${country}` : 'Listo para documentos',
        partial: (_country) => 'Faltan campos fiscales requeridos',
        missing: (_country) => 'Falta perfil de facturación',
      },
    },
  },
  sources: {
    Manual: 'Manual',
    Website: 'Sitio web',
    Referral: 'Referido',
    Campaign: 'Campaña',
    'Social media': 'Redes sociales',
    WhatsApp: 'WhatsApp',
    'Existing customer': 'Cliente existente',
    'Post Sale Opportunity': 'Oportunidad postventa',
    Other: 'Otro',
  },
};

export const contactTranslations = {
  'en-CA': enCA,
  'en-US': {
    ...enCA,
    modal: {
      ...enCA.modal,
      description: 'Capture the commercial and tax base for future opportunities, quotes, and billing workflows.',
    },
  },
  'es-MX': esMX,
  'es-CO': {
    ...esMX,
    header: {
      ...esMX.header,
      subtitle: 'Directorio de relación comercial para clientes, datos fiscales, cotizaciones y oportunidades.',
    },
  },
  'fr-CA': {
    ...enCA,
    header: {
      title: 'Contacts',
      subtitle: 'Répertoire de relations commerciales pour clients, données fiscales, devis et occasions.',
      columnsAction: 'Colonnes',
      importContacts: 'Importer des contacts',
      addContact: 'Ajouter un contact',
    },
    search: { title: 'Filtres', label: 'Rechercher', placeholder: 'Rechercher contact, entreprise, téléphone, courriel, responsable ou fiscal', visibleContacts: 'Contacts visibles', clearFilters: 'Effacer les filtres' },
    table: { ...enCA.table, emptyTitle: 'Aucun contact trouvé', noCompany: 'Aucune entreprise', noPhone: 'Aucun téléphone', noEmail: 'Aucun courriel' },
    modal: { ...enCA.modal, createTitle: 'Ajouter un contact', editTitle: 'Modifier le contact', cancel: 'Annuler', saveChanges: 'Enregistrer', saveContact: 'Enregistrer le contact' },
    importModal: { ...enCA.importModal, title: 'Importer des contacts', cancel: 'Annuler', importContacts: 'Importer des contacts' },
  },
  'pt-BR': {
    ...esMX,
    header: {
      title: 'Contatos',
      subtitle: 'Diretório de relacionamento comercial para clientes, dados fiscais, cotações e oportunidades.',
      columnsAction: 'Colunas',
      importContacts: 'Importar contatos',
      addContact: 'Adicionar contato',
    },
    search: { title: 'Filtros', label: 'Buscar', placeholder: 'Buscar contato, empresa, telefone, email, responsável ou dado fiscal', visibleContacts: 'Contatos visíveis', clearFilters: 'Limpar filtros' },
    table: { ...esMX.table, noCompany: 'Sem empresa', noPhone: 'Sem telefone', noEmail: 'Sem email' },
    modal: { ...esMX.modal, createTitle: 'Adicionar contato', editTitle: 'Editar contato', saveContact: 'Salvar contato', saveChanges: 'Salvar alterações' },
    importModal: { ...esMX.importModal, title: 'Importar contatos', importContacts: 'Importar contatos' },
  },
  'ko-CA': {
    ...enCA,
    header: { title: '연락처', subtitle: '고객, 세무 데이터, 견적, 영업 기회를 위한 관계 디렉터리입니다.', columnsAction: '열', importContacts: '연락처 가져오기', addContact: '연락처 추가' },
    search: { title: '필터', label: '검색', placeholder: '연락처, 회사, 전화번호, 이메일, 담당자 또는 세금 정보 검색', visibleContacts: '표시된 연락처', clearFilters: '필터 지우기' },
    table: { ...enCA.table, emptyTitle: '연락처가 없습니다', noCompany: '회사 없음', noPhone: '전화 없음', noEmail: '이메일 없음' },
    modal: { ...enCA.modal, createTitle: '연락처 추가', editTitle: '연락처 편집', cancel: '취소', saveChanges: '변경 저장', saveContact: '연락처 저장' },
    importModal: { ...enCA.importModal, title: '연락처 가져오기', cancel: '취소', importContacts: '연락처 가져오기' },
  },
  'zh-CA': {
    ...enCA,
    header: { title: '联系人', subtitle: '用于客户、税务资料、报价和销售机会的商业关系目录。', columnsAction: '列', importContacts: '导入联系人', addContact: '添加联系人' },
    search: { title: '筛选', label: '搜索', placeholder: '搜索联系人、公司、电话、邮箱、负责人或税务资料', visibleContacts: '可见联系人', clearFilters: '清除筛选' },
    table: { ...enCA.table, emptyTitle: '未找到联系人', noCompany: '无公司', noPhone: '无电话', noEmail: '无邮箱' },
    modal: { ...enCA.modal, createTitle: '添加联系人', editTitle: '编辑联系人', cancel: '取消', saveChanges: '保存更改', saveContact: '保存联系人' },
    importModal: { ...enCA.importModal, title: '导入联系人', cancel: '取消', importContacts: '导入联系人' },
  },
} satisfies Record<string, ContactCopy>;

export function resolveContactLocale(locale: string | null | undefined) {
  if (!locale) {
    return 'en-CA';
  }

  if (locale in contactTranslations) {
    return locale as keyof typeof contactTranslations;
  }

  const loweredLocale = locale.toLowerCase();

  if (loweredLocale.startsWith('es-co')) return 'es-CO';
  if (loweredLocale.startsWith('es-')) return 'es-MX';
  if (loweredLocale.startsWith('fr')) return 'fr-CA';
  if (loweredLocale.startsWith('pt')) return 'pt-BR';
  if (loweredLocale.startsWith('ko')) return 'ko-CA';
  if (loweredLocale.startsWith('zh')) return 'zh-CA';
  if (loweredLocale.startsWith('en-us')) return 'en-US';

  return 'en-CA';
}

export function useContactTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => contactTranslations[resolveContactLocale(currentLanguage.code)],
    [currentLanguage.code],
  );
}
