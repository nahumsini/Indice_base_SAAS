export interface ProviderCenterPublicCopy {
  header: {
    portal: string;
    changeProvider: string;
  };
  access: {
    title: string;
    description: (company: string) => string;
    providerName: string;
    providerNameHelp: string;
    providerNamePlaceholder: string;
    pinDescription: string;
    pinAriaLabel: string;
    privacy: string;
    submit: string;
    invalidCredentials: string;
    requestAccess: string;
    requestAccessHelp: string;
  };
  registration: {
    back: string;
    title: string;
    description: (company: string) => string;
    requiredHelp: string;
    businessSection: string;
    contactSection: string;
    supplySection: string;
    commercialName: string;
    legalName: string;
    taxId: string;
    contactName: string;
    email: string;
    phone: string;
    supplies: string;
    suppliesPlaceholder: string;
    submit: string;
    submitting: string;
    genericError: string;
    successTitle: string;
    returnToAccess: string;
  };
}

const esMX: ProviderCenterPublicCopy = {
  header: { portal: 'Portal de proveedores', changeProvider: 'Cambiar proveedor' },
  access: {
    title: 'Entra a tu espacio de proveedor',
    description: company => `${company} te compartió un nombre registrado y un NIP. Usa ambos para consultar únicamente la información de tu empresa.`,
    providerName: 'Nombre registrado de tu empresa proveedora',
    providerNameHelp: 'Escribe el nombre que aparece junto al NIP; no uses el nombre de la empresa que te invitó ni el de la persona de contacto.',
    providerNamePlaceholder: 'Ej. Distribuidora del Norte',
    pinDescription: 'Ingresa el NIP de seis dígitos que recibiste con ese nombre.',
    pinAriaLabel: 'NIP de seis dígitos del proveedor',
    privacy: 'El nombre y el NIP se validan juntos. Este dispositivo no guarda el NIP y tu sesión solo mostrará datos autorizados para ese proveedor.',
    submit: 'Entrar al portal',
    invalidCredentials: 'No pudimos validar esos datos. Copia el nombre completo y el NIP exactamente como te los compartieron.',
    requestAccess: 'Quiero registrarme como proveedor',
    requestAccessHelp: 'Envía tus datos para que la empresa revise y apruebe tu alta.',
  },
  registration: {
    back: 'Volver al acceso',
    title: 'Solicita tu alta como proveedor',
    description: company => `${company} revisará esta información antes de crear tu acceso. La unidad, el negocio y el almacén se asignan internamente.`,
    requiredHelp: 'Los campos marcados con * son obligatorios.',
    businessSection: 'Datos del negocio',
    contactSection: 'Contacto principal',
    supplySection: 'Qué puedes suministrar',
    commercialName: 'Nombre comercial *',
    legalName: 'Razón social',
    taxId: 'RFC / ID fiscal',
    contactName: 'Persona de contacto *',
    email: 'Correo de contacto *',
    phone: 'Teléfono',
    supplies: 'Productos o servicios',
    suppliesPlaceholder: 'Describe brevemente qué productos o servicios ofreces.',
    submit: 'Enviar solicitud',
    submitting: 'Enviando solicitud',
    genericError: 'No pudimos enviar la solicitud. Revisa los datos e inténtalo nuevamente.',
    successTitle: 'Solicitud enviada',
    returnToAccess: 'Volver al acceso de proveedores',
  },
};

const enCA: ProviderCenterPublicCopy = {
  header: { portal: 'Supplier portal', changeProvider: 'Change supplier' },
  access: {
    title: 'Open your supplier workspace',
    description: company => `${company} shared a registered name and PIN with you. Use both to see only your company’s authorized information.`,
    providerName: 'Registered supplier company name',
    providerNameHelp: 'Enter the name shown beside the PIN, not the inviting company or contact person name.',
    providerNamePlaceholder: 'E.g. North Distribution',
    pinDescription: 'Enter the six-digit PIN supplied with that name.',
    pinAriaLabel: 'Six-digit supplier PIN',
    privacy: 'The name and PIN are checked together. This device does not store the PIN and the session only shows information authorized for that supplier.',
    submit: 'Open supplier portal',
    invalidCredentials: 'We could not verify those details. Copy the complete name and PIN exactly as they were shared with you.',
    requestAccess: 'Register as a supplier',
    requestAccessHelp: 'Send your details for the company to review and approve.',
  },
  registration: {
    back: 'Back to sign in', title: 'Request supplier registration',
    description: company => `${company} will review this information before creating access. Unit, business, and warehouse scope are assigned internally.`,
    requiredHelp: 'Fields marked with * are required.', businessSection: 'Business details', contactSection: 'Primary contact', supplySection: 'What you can supply',
    commercialName: 'Trading name *', legalName: 'Legal name', taxId: 'Tax ID', contactName: 'Contact person *', email: 'Contact email *', phone: 'Phone',
    supplies: 'Products or services', suppliesPlaceholder: 'Briefly describe the products or services you provide.', submit: 'Send request', submitting: 'Sending request',
    genericError: 'We could not send the request. Review the details and try again.', successTitle: 'Request sent', returnToAccess: 'Return to supplier sign in',
  },
};

const frCA: ProviderCenterPublicCopy = {
  header: { portal: 'Portail fournisseurs', changeProvider: 'Changer de fournisseur' },
  access: {
    title: 'Ouvrez votre espace fournisseur', description: company => `${company} vous a transmis un nom enregistré et un NIP. Utilisez les deux pour consulter uniquement les renseignements autorisés de votre entreprise.`,
    providerName: 'Nom enregistré de votre entreprise fournisseur', providerNameHelp: 'Saisissez le nom affiché avec le NIP, et non le nom de l’entreprise qui vous invite ni celui du contact.',
    providerNamePlaceholder: 'Ex. Distribution du Nord', pinDescription: 'Saisissez le NIP à six chiffres reçu avec ce nom.', pinAriaLabel: 'NIP fournisseur à six chiffres',
    privacy: 'Le nom et le NIP sont validés ensemble. Cet appareil ne conserve pas le NIP et la session affiche seulement les données autorisées.',
    submit: 'Ouvrir le portail', invalidCredentials: 'Ces renseignements n’ont pas pu être validés. Copiez le nom complet et le NIP exactement comme ils vous ont été transmis.',
    requestAccess: 'M’inscrire comme fournisseur', requestAccessHelp: 'Envoyez vos renseignements pour examen et approbation par l’entreprise.',
  },
  registration: {
    back: 'Retour à l’accès', title: 'Demandez votre inscription comme fournisseur', description: company => `${company} examinera ces renseignements avant de créer l’accès. L’unité, l’entreprise et l’entrepôt sont attribués à l’interne.`,
    requiredHelp: 'Les champs marqués d’un * sont obligatoires.', businessSection: 'Renseignements de l’entreprise', contactSection: 'Contact principal', supplySection: 'Ce que vous fournissez',
    commercialName: 'Nom commercial *', legalName: 'Raison sociale', taxId: 'Numéro fiscal', contactName: 'Personne-ressource *', email: 'Courriel *', phone: 'Téléphone',
    supplies: 'Produits ou services', suppliesPlaceholder: 'Décrivez brièvement les produits ou services offerts.', submit: 'Envoyer la demande', submitting: 'Envoi en cours',
    genericError: 'La demande n’a pas pu être envoyée. Vérifiez les renseignements et réessayez.', successTitle: 'Demande envoyée', returnToAccess: 'Retour à l’accès fournisseur',
  },
};

const ptBR: ProviderCenterPublicCopy = {
  header: { portal: 'Portal de fornecedores', changeProvider: 'Trocar fornecedor' },
  access: {
    title: 'Acesse seu espaço de fornecedor', description: company => `${company} compartilhou um nome cadastrado e um PIN. Use os dois para consultar somente as informações autorizadas da sua empresa.`,
    providerName: 'Nome cadastrado da empresa fornecedora', providerNameHelp: 'Digite o nome exibido junto ao PIN, não o nome da empresa que convidou nem o nome do contato.',
    providerNamePlaceholder: 'Ex. Distribuidora do Norte', pinDescription: 'Digite o PIN de seis dígitos recebido com esse nome.', pinAriaLabel: 'PIN de seis dígitos do fornecedor',
    privacy: 'O nome e o PIN são validados juntos. Este dispositivo não armazena o PIN e a sessão mostra apenas dados autorizados.',
    submit: 'Abrir portal', invalidCredentials: 'Não foi possível validar os dados. Copie o nome completo e o PIN exatamente como foram enviados.',
    requestAccess: 'Quero me cadastrar como fornecedor', requestAccessHelp: 'Envie seus dados para análise e aprovação da empresa.',
  },
  registration: {
    back: 'Voltar ao acesso', title: 'Solicite seu cadastro como fornecedor', description: company => `${company} revisará estas informações antes de criar o acesso. Unidade, negócio e armazém são definidos internamente.`,
    requiredHelp: 'Os campos marcados com * são obrigatórios.', businessSection: 'Dados da empresa', contactSection: 'Contato principal', supplySection: 'O que você fornece',
    commercialName: 'Nome comercial *', legalName: 'Razão social', taxId: 'ID fiscal', contactName: 'Pessoa de contato *', email: 'E-mail de contato *', phone: 'Telefone',
    supplies: 'Produtos ou serviços', suppliesPlaceholder: 'Descreva brevemente os produtos ou serviços oferecidos.', submit: 'Enviar solicitação', submitting: 'Enviando solicitação',
    genericError: 'Não foi possível enviar a solicitação. Revise os dados e tente novamente.', successTitle: 'Solicitação enviada', returnToAccess: 'Voltar ao acesso de fornecedores',
  },
};

const koCA: ProviderCenterPublicCopy = {
  header: { portal: '공급업체 포털', changeProvider: '공급업체 변경' },
  access: {
    title: '공급업체 작업 공간 열기', description: company => `${company}에서 등록된 이름과 PIN을 제공했습니다. 두 정보를 함께 사용하면 귀사에 허용된 정보만 볼 수 있습니다.`,
    providerName: '등록된 공급업체 회사명', providerNameHelp: '초대한 회사나 담당자 이름이 아니라 PIN과 함께 표시된 이름을 입력하세요.', providerNamePlaceholder: '예: North Distribution',
    pinDescription: '해당 이름과 함께 받은 6자리 PIN을 입력하세요.', pinAriaLabel: '공급업체 6자리 PIN', privacy: '이름과 PIN을 함께 확인합니다. 이 기기는 PIN을 저장하지 않으며 허용된 정보만 표시합니다.',
    submit: '공급업체 포털 열기', invalidCredentials: '정보를 확인할 수 없습니다. 전달받은 전체 이름과 PIN을 그대로 입력하세요.', requestAccess: '공급업체로 등록', requestAccessHelp: '회사 검토와 승인을 위해 정보를 보내세요.',
  },
  registration: {
    back: '로그인으로 돌아가기', title: '공급업체 등록 요청', description: company => `${company}에서 접근 권한을 만들기 전에 이 정보를 검토합니다. 단위, 사업 및 창고 범위는 내부에서 지정됩니다.`,
    requiredHelp: '* 표시 항목은 필수입니다.', businessSection: '사업자 정보', contactSection: '주 담당자', supplySection: '공급 가능 항목', commercialName: '상호 *', legalName: '법인명', taxId: '세금 ID',
    contactName: '담당자 *', email: '담당자 이메일 *', phone: '전화번호', supplies: '제품 또는 서비스', suppliesPlaceholder: '제공하는 제품 또는 서비스를 간단히 설명하세요.',
    submit: '요청 보내기', submitting: '요청 전송 중', genericError: '요청을 보낼 수 없습니다. 정보를 확인하고 다시 시도하세요.', successTitle: '요청을 보냈습니다', returnToAccess: '공급업체 로그인으로 돌아가기',
  },
};

const zhCA: ProviderCenterPublicCopy = {
  header: { portal: '供应商门户', changeProvider: '更换供应商' },
  access: {
    title: '进入供应商工作区', description: company => `${company} 已向您提供登记名称和 PIN。请同时使用两者，仅查看贵公司获准访问的信息。`, providerName: '已登记的供应商公司名称',
    providerNameHelp: '请输入与 PIN 一起显示的名称，而不是邀请公司的名称或联系人姓名。', providerNamePlaceholder: '例如：North Distribution', pinDescription: '请输入与该名称一起收到的六位 PIN。',
    pinAriaLabel: '供应商六位 PIN', privacy: '名称和 PIN 将一起验证。本设备不会保存 PIN，会话只显示该供应商获准访问的数据。', submit: '打开供应商门户',
    invalidCredentials: '无法验证这些信息。请完全按照收到的内容输入完整名称和 PIN。', requestAccess: '注册成为供应商', requestAccessHelp: '提交资料供公司审核和批准。',
  },
  registration: {
    back: '返回登录', title: '申请供应商注册', description: company => `${company} 将在创建访问权限之前审核这些信息。单位、业务和仓库范围由内部人员分配。`, requiredHelp: '标有 * 的字段为必填项。',
    businessSection: '企业信息', contactSection: '主要联系人', supplySection: '可供应内容', commercialName: '商业名称 *', legalName: '法定名称', taxId: '税务 ID', contactName: '联系人 *', email: '联系邮箱 *', phone: '电话',
    supplies: '产品或服务', suppliesPlaceholder: '简要说明您提供的产品或服务。', submit: '发送申请', submitting: '正在发送申请', genericError: '无法发送申请。请检查信息后重试。', successTitle: '申请已发送', returnToAccess: '返回供应商登录',
  },
};

const copies: Record<string, ProviderCenterPublicCopy> = {
  'en-CA': enCA,
  'en-US': enCA,
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': esMX,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const getProviderCenterPublicCopy = (locale?: string | null) => copies[locale ?? ''] ?? enCA;
