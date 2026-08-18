import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Layers3,
  LockKeyhole,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  billingSignupApi,
  type BillingSignupConfig,
  type BillingSignupRequest,
} from '../api/billingSignup';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { languages, useLanguage } from '../shared/context';
import { isValidAccountPassword } from '../shared/validation/password';
import { IndiceBrandLogo } from './components/IndiceBrandLogo';

const SIGNUP_DRAFT_STORAGE_KEY = 'indice.auth.signupDraft.v1';
const SIGNUP_BUILDER_MIGRATION_KEY = 'indice.auth.signupBuilder.v2';
const BILLING_SIGNUP_REFERENCE_STORAGE_KEY = 'indice:billing-signup-reference';

const emptyForm: BillingSignupRequest = {
  fullName: '',
  email: '',
  confirmEmail: '',
  password: '',
  companyName: '',
  countryCode: 'MX',
  phone: '',
  industry: '',
  companySize: '',
  billingInterval: 'MONTH',
  extraSeats: 0,
  selectedProductCodes: [],
  courtesyCode: '',
  emailVerificationReference: '',
};

const brandInputClasses = 'h-12 rounded-xl border-slate-200 bg-white text-base font-normal shadow-sm focus-visible:border-[var(--indice-brand-aqua)] focus-visible:ring-[var(--indice-brand-aqua)]/25';
const brandSelectClasses = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-normal shadow-sm outline-none focus:border-[var(--indice-brand-aqua)] focus:ring-2 focus:ring-[var(--indice-brand-aqua)]/25';

type SignupCopy = {
  locale: string;
  back: string;
  accountDetailsBack: string;
  login: string;
  languageLabel: string;
  loadPlansError: string;
  accountIncompleteError: string;
  paymentAccountIncompleteError: string;
  emailVerificationRequiredError: string;
  emailVerificationCodeRequired: string;
  checkoutIncompleteError: string;
  checkoutError: string;
  premiumBadge: string;
  heroTitle: string;
  heroDescription: string;
  ownerBullet: string;
  usersBullet: string;
  stripeBullet: string;
  afterTrial: string;
  annualSavings: string;
  monthSuffix: string;
  yearSuffix: string;
  accountBadge: string;
  accountTitle: string;
  accountSubtitle: string;
  billingBadge: string;
  billingTitle: string;
  billingSubtitle: string;
  loadingOffer: string;
  unnamedCompany: string;
  pendingOwner: string;
  pendingEmail: string;
  chooseProductsTitle: string;
  trialAccess: string;
  invalidSelection: string;
  pendingCompletePrice: string;
  frequencyTitle: string;
  monthly: string;
  annual: string;
  extraUsersLabel: string;
  platformNotReady: string;
  accountDetailsButton: string;
  preparingStripe: string;
  continuePayment: string;
  legalText: string;
  accountFieldsetTitle: string;
  companyLabel: string;
  companyPlaceholder: string;
  ownerLabel: string;
  ownerPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  confirmEmailLabel: string;
  confirmEmailPlaceholder: string;
  emailMismatchError: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  countryLabel: string;
  phoneLabel: string;
  optional: string;
  phonePlaceholder: string;
  industryLabel: string;
  industryPlaceholder: string;
  companySizeLabel: string;
  companySizePlaceholder: string;
  continueToBilling: string;
  emailVerificationTitle: string;
  emailVerificationBody: string;
  sendVerificationCode: string;
  sendingVerificationCode: string;
  verificationCodeLabel: string;
  verificationCodePlaceholder: string;
  verifyEmailCode: string;
  verifyingEmailCode: string;
  resendCode: string;
  emailVerifiedMessage: string;
  emailVerificationSent: (maskedEmail: string) => string;
  resendAvailableIn: (seconds: number) => string;
  draftNote: string;
  countryLabels: Record<string, string>;
  industryLabels: Record<string, string>;
  productLabels: Record<string, string>;
};

type SignupExperienceCopy = {
  logoAlt: string;
  stepAccount: string;
  stepConfiguration: string;
  stepActivation: string;
  trialBadge: string;
  valueTitle: string;
  valueBody: string;
  allModulesBenefit: string;
  includedSeatsBenefit: (includedSeats: number) => string;
  consultationBenefit: string;
  accountEyebrow: string;
  accountTitle: string;
  accountBody: string;
  optionalTitle: string;
  optionalBody: string;
  showPassword: string;
  hidePassword: string;
  requiredField: string;
  validEmail: string;
  passwordRequirement: string;
  continueLabel: string;
  noCharge: string;
  billingValueTitle: string;
  billingValueBody: string;
  configurationEyebrow: string;
  configurationTitle: string;
  configurationBody: string;
  builderTitle: string;
  builderBody: string;
  priceGuide: string;
  selectAll: string;
  clearSelection: string;
  countsAsOne: string;
  chooseAtLeastOne: string;
  selectedProducts: (count: number) => string;
};

const esSignupExperience: SignupExperienceCopy = {
  logoAlt: 'Índice',
  stepAccount: 'Cuenta',
  stepConfiguration: 'Configuración',
  stepActivation: 'Activación',
  trialBadge: '30 días sin costo',
  valueTitle: 'Empieza con todo Índice. Decide después.',
  valueBody: 'Usa todos los módulos Basic durante 30 días y define tu configuración antes del primer cobro.',
  allModulesBenefit: 'Todos los módulos Basic durante la prueba',
  includedSeatsBenefit: (includedSeats) => `${includedSeats} usuarios incluidos`,
  consultationBenefit: 'Primera consultoría de orientación sin costo',
  accountEyebrow: 'Configura tu acceso',
  accountTitle: 'Crea tu cuenta',
  accountBody: 'Comienza con los datos esenciales. Elegirás tus módulos en el siguiente paso.',
  optionalTitle: 'Cuéntanos más de tu empresa',
  optionalBody: 'Estos datos son opcionales y nos ayudan a ofrecerte una mejor orientación.',
  showPassword: 'Mostrar contraseña',
  hidePassword: 'Ocultar contraseña',
  requiredField: 'Este campo es obligatorio.',
  validEmail: 'Escribe un correo electrónico válido.',
  passwordRequirement: 'Usa entre 10 caracteres y 72 bytes.',
  continueLabel: 'Continuar y elegir módulos',
  noCharge: 'No se realizará ningún cobro en este paso.',
  billingValueTitle: 'Configura hoy. Decide con experiencia.',
  billingValueBody: 'Tendrás acceso completo durante la prueba. Tu selección define lo que conservarás después de los 30 días.',
  configurationEyebrow: 'Configura tu prueba',
  configurationTitle: 'Arma el plan de tu empresa',
  configurationBody: 'Elige tus módulos y ve cómo cambia tu paquete antes de continuar al pago seguro.',
  builderTitle: 'Elige los módulos de tu paquete',
  builderBody: 'Cada tarjeta cuenta como un módulo del plan, aunque incluya dos herramientas conectadas.',
  priceGuide: 'Precio según tu selección',
  selectAll: 'Elegir todos',
  clearSelection: 'Limpiar',
  countsAsOne: 'Cuenta como 1',
  chooseAtLeastOne: 'Selecciona al menos un módulo para continuar.',
  selectedProducts: (count) => `${count} ${count === 1 ? 'módulo seleccionado' : 'módulos seleccionados'}`,
};

const enSignupExperience: SignupExperienceCopy = {
  logoAlt: 'Indice',
  stepAccount: 'Account',
  stepConfiguration: 'Configuration',
  stepActivation: 'Activation',
  trialBadge: '30 days at no cost',
  valueTitle: 'Start with all of Indice. Decide later.',
  valueBody: 'Use every Basic module for 30 days and define your configuration before the first charge.',
  allModulesBenefit: 'Every Basic module during your trial',
  includedSeatsBenefit: (includedSeats) => `${includedSeats} users included`,
  consultationBenefit: 'First guidance consultation at no cost',
  accountEyebrow: 'Set up your access',
  accountTitle: 'Create your account',
  accountBody: 'Start with the essentials. You will choose your modules in the next step.',
  optionalTitle: 'Tell us more about your company',
  optionalBody: 'These details are optional and help us provide better guidance.',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  requiredField: 'This field is required.',
  validEmail: 'Enter a valid email address.',
  passwordRequirement: 'Use at least 10 characters and no more than 72 bytes.',
  continueLabel: 'Continue and choose modules',
  noCharge: 'No charge will be made in this step.',
  billingValueTitle: 'Configure today. Decide with experience.',
  billingValueBody: 'You have full access during the trial. Your selection defines what you keep after 30 days.',
  configurationEyebrow: 'Configure your trial',
  configurationTitle: 'Build your company plan',
  configurationBody: 'Choose your modules and watch your package update before continuing to secure checkout.',
  builderTitle: 'Choose the modules in your package',
  builderBody: 'Each card counts as one plan module, even when it includes two connected tools.',
  priceGuide: 'Price based on your selection',
  selectAll: 'Select all',
  clearSelection: 'Clear',
  countsAsOne: 'Counts as 1',
  chooseAtLeastOne: 'Select at least one module to continue.',
  selectedProducts: (count) => `${count} ${count === 1 ? 'module selected' : 'modules selected'}`,
};

const signupExperienceCopies: Record<string, SignupExperienceCopy> = {
  'es-MX': esSignupExperience,
  'es-CO': esSignupExperience,
  'en-US': enSignupExperience,
  'en-CA': enSignupExperience,
  'fr-CA': {
    ...enSignupExperience,
    logoAlt: 'Indice',
    stepAccount: 'Compte',
    stepConfiguration: 'Configuration',
    stepActivation: 'Activation',
    trialBadge: '30 jours sans frais',
    valueTitle: 'Commencez avec tout Indice. Décidez ensuite.',
    valueBody: 'Utilisez tous les modules Basic pendant 30 jours et définissez votre configuration avant le premier prélèvement.',
    allModulesBenefit: 'Tous les modules Basic pendant l’essai',
    includedSeatsBenefit: (includedSeats) => `${includedSeats} utilisateurs inclus`,
    consultationBenefit: 'Première consultation d’orientation sans frais',
    accountEyebrow: 'Configurez votre accès',
    accountTitle: 'Créez votre compte',
    accountBody: 'Commencez par l’essentiel. Vous choisirez vos modules à l’étape suivante.',
    optionalTitle: 'Parlez-nous de votre entreprise',
    optionalBody: 'Ces informations sont facultatives et nous aident à mieux vous orienter.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    requiredField: 'Ce champ est obligatoire.',
    validEmail: 'Saisissez une adresse courriel valide.',
    passwordRequirement: 'Utilisez au moins 10 caractères et au plus 72 octets.',
    continueLabel: 'Continuer et choisir les modules',
    noCharge: 'Aucun prélèvement ne sera effectué à cette étape.',
    billingValueTitle: 'Configurez aujourd’hui. Décidez avec expérience.',
    billingValueBody: 'Vous disposez d’un accès complet pendant l’essai. Votre sélection définit ce que vous conserverez après 30 jours.',
    configurationEyebrow: 'Configurez votre essai',
    selectedProducts: (count) => `${count} ${count === 1 ? 'module sélectionné' : 'modules sélectionnés'}`,
  },
  'pt-BR': {
    ...enSignupExperience,
    stepAccount: 'Conta',
    stepConfiguration: 'Configuração',
    stepActivation: 'Ativação',
    trialBadge: '30 dias sem custo',
    valueTitle: 'Comece com todo o Índice. Decida depois.',
    valueBody: 'Use todos os módulos Basic por 30 dias e defina sua configuração antes da primeira cobrança.',
    allModulesBenefit: 'Todos os módulos Basic durante o teste',
    includedSeatsBenefit: (includedSeats) => `${includedSeats} usuários incluídos`,
    consultationBenefit: 'Primeira consultoria de orientação sem custo',
    accountEyebrow: 'Configure seu acesso',
    accountTitle: 'Crie sua conta',
    accountBody: 'Comece com os dados essenciais. Você escolherá os módulos na próxima etapa.',
    optionalTitle: 'Conte mais sobre sua empresa',
    optionalBody: 'Estes dados são opcionais e nos ajudam a orientar melhor você.',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    requiredField: 'Este campo é obrigatório.',
    validEmail: 'Digite um e-mail válido.',
    passwordRequirement: 'Use pelo menos 10 caracteres e no máximo 72 bytes.',
    continueLabel: 'Continuar e escolher módulos',
    noCharge: 'Nenhuma cobrança será feita nesta etapa.',
    billingValueTitle: 'Configure hoje. Decida com experiência.',
    billingValueBody: 'Você terá acesso completo durante o teste. Sua seleção define o que será mantido após 30 dias.',
    configurationEyebrow: 'Configure seu teste',
    selectedProducts: (count) => `${count} ${count === 1 ? 'módulo selecionado' : 'módulos selecionados'}`,
  },
  'ko-CA': {
    ...enSignupExperience,
    stepAccount: '계정',
    stepConfiguration: '구성',
    stepActivation: '활성화',
    trialBadge: '30일 무료',
    valueTitle: 'Indice 전체로 시작하고 나중에 결정하세요.',
    valueBody: '30일 동안 모든 Basic 모듈을 사용하고 첫 결제 전에 구성을 정하세요.',
    allModulesBenefit: '체험 기간 모든 Basic 모듈 이용',
    includedSeatsBenefit: (includedSeats) => `사용자 ${includedSeats}명 포함`,
    consultationBenefit: '첫 안내 상담 무료',
    accountEyebrow: '접근 설정',
    accountTitle: '계정 만들기',
    accountBody: '필수 정보부터 시작하세요. 다음 단계에서 모듈을 선택합니다.',
    optionalTitle: '회사에 대해 더 알려주세요',
    optionalBody: '선택 정보이며 더 나은 안내를 제공하는 데 도움이 됩니다.',
    showPassword: '비밀번호 표시',
    hidePassword: '비밀번호 숨기기',
    requiredField: '필수 입력 항목입니다.',
    validEmail: '유효한 이메일 주소를 입력하세요.',
    passwordRequirement: '10자 이상, 72바이트 이하로 입력하세요.',
    continueLabel: '계속해서 모듈 선택',
    noCharge: '이 단계에서는 결제되지 않습니다.',
    billingValueTitle: '오늘 구성하고 경험을 바탕으로 결정하세요.',
    billingValueBody: '체험 기간 동안 전체 기능을 이용합니다. 선택한 구성은 30일 이후 유지할 항목을 정합니다.',
    configurationEyebrow: '체험 구성',
    selectedProducts: (count) => `${count}개 모듈 선택됨`,
  },
  'zh-CA': {
    ...enSignupExperience,
    stepAccount: '账户',
    stepConfiguration: '配置',
    stepActivation: '激活',
    trialBadge: '30 天免费',
    valueTitle: '从完整的 Indice 开始，之后再决定。',
    valueBody: '免费使用全部 Basic 模块 30 天，并在首次扣款前确定配置。',
    allModulesBenefit: '试用期间使用全部 Basic 模块',
    includedSeatsBenefit: (includedSeats) => `包含 ${includedSeats} 位用户`,
    consultationBenefit: '首次指导咨询免费',
    accountEyebrow: '设置访问权限',
    accountTitle: '创建账户',
    accountBody: '先填写必要信息。下一步再选择模块。',
    optionalTitle: '进一步介绍您的企业',
    optionalBody: '这些信息为可选项，可帮助我们提供更合适的指导。',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    requiredField: '此字段为必填项。',
    validEmail: '请输入有效的电子邮件地址。',
    passwordRequirement: '请输入至少 10 个字符，且不超过 72 字节。',
    continueLabel: '继续并选择模块',
    noCharge: '此步骤不会产生任何费用。',
    billingValueTitle: '今天完成配置，体验后再决定。',
    billingValueBody: '试用期间可完整使用全部功能。您的选择将决定 30 天后保留的模块。',
    configurationEyebrow: '配置试用',
    selectedProducts: (count) => `已选择 ${count} 个模块`,
  },
};

const industryValues = [
  'restaurant_hospitality',
  'retail_ecommerce',
  'professional_services',
  'construction_real_estate',
  'manufacturing',
  'logistics_transportation',
  'healthcare_wellness',
  'education_training',
  'finance_accounting',
  'technology_software',
  'agriculture_food',
  'nonprofit',
  'other',
] as const;

const esSignupCopy: SignupCopy = {
  locale: 'es-MX',
  back: 'Volver',
  accountDetailsBack: 'Datos de cuenta',
  login: 'Ya tengo una cuenta',
  languageLabel: 'Idioma',
  loadPlansError: 'No pudimos cargar los planes disponibles.',
  accountIncompleteError: 'Completa nombre, empresa, correo y contraseña antes de continuar.',
  paymentAccountIncompleteError: 'Regresa y completa los datos de la cuenta antes del pago.',
  emailVerificationRequiredError: 'Verifica tu correo antes de continuar al pago.',
  emailVerificationCodeRequired: 'Ingresa el código de verificación enviado a tu correo.',
  checkoutIncompleteError: 'Completa tus datos y elige al menos un producto disponible.',
  checkoutError: 'No pudimos iniciar el pago seguro. Intenta nuevamente.',
  premiumBadge: 'Prueba premium',
  heroTitle: 'Crea tu cuenta sin perder tus datos.',
  heroDescription: 'Primero capturamos la cuenta propietaria. Después eliges paquete y pago; si regresas, tus datos se conservan.',
  ownerBullet: 'La cuenta se crea para el propietario/super admin.',
  usersBullet: '5 usuarios incluidos; puedes agregar usuarios extra en el paso de pago.',
  stripeBullet: 'Stripe procesa la tarjeta después de confirmar el paquete.',
  afterTrial: 'Después de la prueba',
  annualSavings: '20% de ahorro anual incluido.',
  monthSuffix: 'mes',
  yearSuffix: 'año',
  accountBadge: 'Crea tu cuenta corporativa',
  accountTitle: 'Datos de cuenta',
  accountSubtitle: 'Agrega los datos principales del propietario y la empresa.',
  billingBadge: 'Paquete y pago',
  billingTitle: 'Confirma el plan de tu empresa',
  billingSubtitle: 'Tus datos ya están guardados para este registro.',
  loadingOffer: 'Cargando oferta vigente...',
  unnamedCompany: 'Empresa sin nombre',
  pendingOwner: 'Propietario pendiente',
  pendingEmail: 'Correo pendiente',
  chooseProductsTitle: '1. Elige los productos que conservarás',
  trialAccess: 'Durante la prueba tendrás acceso a todos, sin importar tu selección.',
  invalidSelection: 'Elige al menos un producto disponible.',
  pendingCompletePrice: 'El precio del paquete completo aún está pendiente de publicación.',
  frequencyTitle: '2. Frecuencia y equipo',
  monthly: 'Mensual',
  annual: 'Anual -20%',
  extraUsersLabel: 'Usuarios adicionales a los 5 incluidos',
  platformNotReady: 'El registro premium está visible, pero el cobro y aprovisionamiento todavía no están habilitados en este ambiente.',
  accountDetailsButton: 'Datos de cuenta',
  preparingStripe: 'Preparando Stripe...',
  continuePayment: 'Continuar al pago seguro',
  legalText: 'Al continuar aceptas iniciar una suscripción con 30 días de prueba. Stripe solicitará una tarjeta y cobrará automáticamente al finalizar.',
  accountFieldsetTitle: 'Datos de la cuenta y la empresa',
  companyLabel: 'Empresa o espacio',
  companyPlaceholder: 'Nombre de tu empresa',
  ownerLabel: 'Nombre del propietario',
  ownerPlaceholder: 'Nombre completo',
  emailLabel: 'Correo principal',
  emailPlaceholder: 'tu@empresa.com',
  confirmEmailLabel: 'Confirmar correo',
  confirmEmailPlaceholder: 'Repite tu correo',
  emailMismatchError: 'Los correos deben coincidir.',
  passwordLabel: 'Contraseña',
  passwordPlaceholder: 'Mínimo 10 caracteres',
  countryLabel: 'País de operación',
  phoneLabel: 'Teléfono',
  optional: 'opcional',
  phonePlaceholder: 'Solo números',
  industryLabel: 'Industria',
  industryPlaceholder: 'Restaurante, retail, servicios...',
  companySizeLabel: 'Tamaño de empresa',
  companySizePlaceholder: '1-10, 11-50, 51-200...',
  continueToBilling: 'Continuar y elegir módulos',
  emailVerificationTitle: 'Verifica tu correo',
  emailVerificationBody: 'Enviaremos un código a tu correo antes de elegir módulos y pago.',
  sendVerificationCode: 'Enviar código de verificación',
  sendingVerificationCode: 'Enviando código...',
  verificationCodeLabel: 'Código de verificación',
  verificationCodePlaceholder: '000000',
  verifyEmailCode: 'Verificar correo',
  verifyingEmailCode: 'Verificando...',
  resendCode: 'Reenviar código',
  emailVerifiedMessage: 'Correo verificado. Ya puedes continuar.',
  emailVerificationSent: (maskedEmail) => `Código enviado a ${maskedEmail}.`,
  resendAvailableIn: (seconds) => `Puedes reenviar en ${seconds}s.`,
  draftNote: 'Tus datos se guardan en este navegador mientras terminas el registro.',
  countryLabels: {
    MX: 'México',
    CA: 'Canadá',
    US: 'Estados Unidos',
    CO: 'Colombia',
    BR: 'Brasil',
  },
  industryLabels: {
    restaurant_hospitality: 'Restaurantes y hospitalidad',
    retail_ecommerce: 'Retail y comercio electrónico',
    professional_services: 'Servicios profesionales',
    construction_real_estate: 'Construcción e inmobiliaria',
    manufacturing: 'Manufactura',
    logistics_transportation: 'Logística y transporte',
    healthcare_wellness: 'Salud y bienestar',
    education_training: 'Educación y capacitación',
    finance_accounting: 'Finanzas y contabilidad',
    technology_software: 'Tecnología y software',
    agriculture_food: 'Agricultura y alimentos',
    nonprofit: 'Organización sin fines de lucro',
    other: 'Otra industria',
  },
  productLabels: {
    core_platform: 'Núcleo Índice',
    basic_hr: 'Recursos Humanos',
    basic_process_tasks: 'Tareas y Procesos',
    basic_expenses: 'Gastos + Caja Chica',
    basic_pos_inventory: 'Punto de Venta + Inventarios',
    basic_sales_inventory: 'Ventas + Inventarios',
    basic_receivables: 'Cartera',
  },
};

const enSignupCopy: SignupCopy = {
  locale: 'en-US',
  back: 'Back',
  accountDetailsBack: 'Account details',
  login: 'I already have an account',
  languageLabel: 'Language',
  loadPlansError: 'We could not load the available plans.',
  accountIncompleteError: 'Complete name, company, email, and password before continuing.',
  paymentAccountIncompleteError: 'Go back and complete the account details before payment.',
  emailVerificationRequiredError: 'Verify your email before continuing to payment.',
  emailVerificationCodeRequired: 'Enter the verification code sent to your email.',
  checkoutIncompleteError: 'Complete your details and choose at least one available product.',
  checkoutError: 'We could not start secure payment. Try again.',
  premiumBadge: 'Premium trial',
  heroTitle: 'Create your account without losing your details.',
  heroDescription: 'First we capture the owner account. Then you choose package and payment; if you go back, your details stay saved.',
  ownerBullet: 'The account is created for the owner/super admin.',
  usersBullet: '5 users included; you can add extra users during payment.',
  stripeBullet: 'Stripe processes the card after you confirm the package.',
  afterTrial: 'After the trial',
  annualSavings: '20% annual savings included.',
  monthSuffix: 'month',
  yearSuffix: 'year',
  accountBadge: 'Create your company account',
  accountTitle: 'Account details',
  accountSubtitle: 'Add the main owner and company details.',
  billingBadge: 'Package and payment',
  billingTitle: 'Confirm your company plan',
  billingSubtitle: 'Your details are already saved for this signup.',
  loadingOffer: 'Loading current offer...',
  unnamedCompany: 'Unnamed company',
  pendingOwner: 'Owner pending',
  pendingEmail: 'Email pending',
  chooseProductsTitle: '1. Choose the products you will keep',
  trialAccess: 'During the trial you get access to everything, regardless of this selection.',
  invalidSelection: 'Choose at least one available product.',
  pendingCompletePrice: 'The full package price is still pending publication.',
  frequencyTitle: '2. Billing frequency and team',
  monthly: 'Monthly',
  annual: 'Annual -20%',
  extraUsersLabel: 'Additional users beyond the 5 included',
  platformNotReady: 'Premium signup is visible, but payment and provisioning are not enabled in this environment yet.',
  accountDetailsButton: 'Account details',
  preparingStripe: 'Preparing Stripe...',
  continuePayment: 'Continue to secure payment',
  legalText: 'By continuing, you agree to start a subscription with a 30-day trial. Stripe will request a card and bill automatically when the trial ends.',
  accountFieldsetTitle: 'Account and company details',
  companyLabel: 'Company or workspace',
  companyPlaceholder: 'Your company name',
  ownerLabel: 'Owner name',
  ownerPlaceholder: 'Full name',
  emailLabel: 'Primary email',
  emailPlaceholder: 'you@company.com',
  confirmEmailLabel: 'Confirm email',
  confirmEmailPlaceholder: 'Repeat your email',
  emailMismatchError: 'Email and confirm email must match.',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Minimum 10 characters',
  countryLabel: 'Operating country',
  phoneLabel: 'Phone',
  optional: 'optional',
  phonePlaceholder: 'Numbers only',
  industryLabel: 'Industry',
  industryPlaceholder: 'Restaurant, retail, services...',
  companySizeLabel: 'Company size',
  companySizePlaceholder: '1-10, 11-50, 51-200...',
  continueToBilling: 'Continue and choose modules',
  emailVerificationTitle: 'Verify your email',
  emailVerificationBody: 'We will send a code to your email before module selection and payment.',
  sendVerificationCode: 'Send verification code',
  sendingVerificationCode: 'Sending code...',
  verificationCodeLabel: 'Verification code',
  verificationCodePlaceholder: '000000',
  verifyEmailCode: 'Verify email',
  verifyingEmailCode: 'Verifying...',
  resendCode: 'Resend code',
  emailVerifiedMessage: 'Email verified. You can continue.',
  emailVerificationSent: (maskedEmail) => `Code sent to ${maskedEmail}.`,
  resendAvailableIn: (seconds) => `You can resend in ${seconds}s.`,
  draftNote: 'Your details are saved in this browser while you finish signup.',
  countryLabels: {
    MX: 'Mexico',
    CA: 'Canada',
    US: 'United States',
    CO: 'Colombia',
    BR: 'Brazil',
  },
  industryLabels: {
    restaurant_hospitality: 'Restaurants and hospitality',
    retail_ecommerce: 'Retail and e-commerce',
    professional_services: 'Professional services',
    construction_real_estate: 'Construction and real estate',
    manufacturing: 'Manufacturing',
    logistics_transportation: 'Logistics and transportation',
    healthcare_wellness: 'Healthcare and wellness',
    education_training: 'Education and training',
    finance_accounting: 'Finance and accounting',
    technology_software: 'Technology and software',
    agriculture_food: 'Agriculture and food',
    nonprofit: 'Nonprofit',
    other: 'Other industry',
  },
  productLabels: {
    core_platform: 'Indice Core',
    basic_hr: 'Human Resources',
    basic_process_tasks: 'Tasks and Processes',
    basic_expenses: 'Expenses + Petty Cash',
    basic_pos_inventory: 'Point of Sale + Inventory',
    basic_sales_inventory: 'Sales + Inventory',
    basic_receivables: 'Receivables',
  },
};

const signupCopies: Record<string, SignupCopy> = {
  'es-MX': esSignupCopy,
  'es-CO': esSignupCopy,
  'en-US': enSignupCopy,
  'en-CA': {
    ...enSignupCopy,
    locale: 'en-CA',
  },
  'fr-CA': {
    ...enSignupCopy,
    locale: 'fr-CA',
    back: 'Retour',
    accountDetailsBack: 'Détails du compte',
    login: "J'ai déjà un compte",
    languageLabel: 'Langue',
    loadPlansError: "Impossible de charger les forfaits disponibles.",
    accountIncompleteError: "Complétez le nom, l'entreprise, le courriel et le mot de passe avant de continuer.",
    paymentAccountIncompleteError: 'Retournez compléter les détails du compte avant le paiement.',
    checkoutIncompleteError: 'Complétez vos informations et choisissez au moins un produit disponible.',
    checkoutError: "Impossible de lancer le paiement sécurisé. Réessayez.",
    premiumBadge: 'Essai premium',
    heroTitle: 'Créez votre compte sans perdre vos informations.',
    heroDescription: "Nous enregistrons d'abord le compte propriétaire. Ensuite vous choisissez le forfait et le paiement; si vous revenez, vos informations restent sauvegardées.",
    ownerBullet: 'Le compte est créé pour le propriétaire/super administrateur.',
    usersBullet: '5 utilisateurs inclus; vous pouvez ajouter des utilisateurs au paiement.',
    stripeBullet: 'Stripe traite la carte après la confirmation du forfait.',
    afterTrial: "Après l'essai",
    annualSavings: 'Économie annuelle de 20% incluse.',
    monthSuffix: 'mois',
    yearSuffix: 'an',
    accountBadge: "Créez votre compte d'entreprise",
    accountTitle: 'Détails du compte',
    accountSubtitle: "Ajoutez les informations principales du propriétaire et de l'entreprise.",
    billingBadge: 'Forfait et paiement',
    billingTitle: "Confirmez le forfait de votre entreprise",
    billingSubtitle: 'Vos informations sont déjà sauvegardées pour cette inscription.',
    loadingOffer: "Chargement de l'offre actuelle...",
    unnamedCompany: 'Entreprise sans nom',
    pendingOwner: 'Propriétaire en attente',
    pendingEmail: 'Courriel en attente',
    chooseProductsTitle: '1. Choisissez les produits à conserver',
    trialAccess: "Pendant l'essai, vous avez accès à tout, peu importe votre sélection.",
    invalidSelection: 'Choisissez au moins un produit disponible.',
    pendingCompletePrice: "Le prix du forfait complet n'est pas encore publié.",
    frequencyTitle: '2. Fréquence de facturation et équipe',
    monthly: 'Mensuel',
    annual: 'Annuel -20%',
    extraUsersLabel: 'Utilisateurs additionnels après les 5 inclus',
    platformNotReady: "L'inscription premium est visible, mais le paiement et l'approvisionnement ne sont pas encore activés dans cet environnement.",
    accountDetailsButton: 'Détails du compte',
    preparingStripe: 'Préparation de Stripe...',
    continuePayment: 'Continuer au paiement sécurisé',
    legalText: "En continuant, vous acceptez de commencer un abonnement avec 30 jours d'essai. Stripe demandera une carte et facturera automatiquement à la fin.",
    accountFieldsetTitle: "Informations du compte et de l'entreprise",
    companyLabel: 'Entreprise ou espace',
    companyPlaceholder: 'Nom de votre entreprise',
    ownerLabel: 'Nom du propriétaire',
    ownerPlaceholder: 'Nom complet',
    emailLabel: 'Courriel principal',
    emailPlaceholder: 'vous@entreprise.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Minimum 10 caractères',
    countryLabel: "Pays d'exploitation",
    phoneLabel: 'Téléphone',
    optional: 'optionnel',
    phonePlaceholder: 'Chiffres seulement',
    industryLabel: 'Industrie',
    industryPlaceholder: 'Restaurant, détail, services...',
    companySizeLabel: "Taille de l'entreprise",
    continueToBilling: 'Continuer et choisir les modules',
    draftNote: 'Vos informations sont sauvegardées dans ce navigateur pendant que vous terminez l’inscription.',
    countryLabels: {
      MX: 'Mexique',
      CA: 'Canada',
      US: 'États-Unis',
      CO: 'Colombie',
      BR: 'Brésil',
    },
    industryLabels: {
      restaurant_hospitality: 'Restaurants et hôtellerie',
      retail_ecommerce: 'Commerce de détail et commerce électronique',
      professional_services: 'Services professionnels',
      construction_real_estate: 'Construction et immobilier',
      manufacturing: 'Fabrication',
      logistics_transportation: 'Logistique et transport',
      healthcare_wellness: 'Santé et bien-être',
      education_training: 'Éducation et formation',
      finance_accounting: 'Finance et comptabilité',
      technology_software: 'Technologie et logiciels',
      agriculture_food: 'Agriculture et alimentation',
      nonprofit: 'Organisme sans but lucratif',
      other: 'Autre industrie',
    },
    productLabels: {
      core_platform: 'Noyau Indice',
      basic_hr: 'Ressources humaines',
      basic_process_tasks: 'Tâches et processus',
      basic_expenses: 'Dépenses + petite caisse',
      basic_pos_inventory: 'Point de vente + inventaire',
      basic_sales_inventory: 'Ventes + inventaire',
      basic_receivables: 'Comptes clients',
    },
  },
  'pt-BR': {
    ...enSignupCopy,
    locale: 'pt-BR',
    back: 'Voltar',
    accountDetailsBack: 'Dados da conta',
    login: 'Já tenho uma conta',
    languageLabel: 'Idioma',
    loadPlansError: 'Não foi possível carregar os planos disponíveis.',
    accountIncompleteError: 'Complete nome, empresa, e-mail e senha antes de continuar.',
    paymentAccountIncompleteError: 'Volte e complete os dados da conta antes do pagamento.',
    checkoutIncompleteError: 'Complete seus dados e escolha pelo menos um produto disponível.',
    checkoutError: 'Não foi possível iniciar o pagamento seguro. Tente novamente.',
    premiumBadge: 'Teste premium',
    heroTitle: 'Crie sua conta sem perder seus dados.',
    heroDescription: 'Primeiro capturamos a conta proprietária. Depois você escolhe pacote e pagamento; se voltar, seus dados continuam salvos.',
    ownerBullet: 'A conta é criada para o proprietário/super admin.',
    usersBullet: '5 usuários incluídos; você pode adicionar usuários extras no pagamento.',
    stripeBullet: 'A Stripe processa o cartão depois que você confirma o pacote.',
    afterTrial: 'Depois do teste',
    annualSavings: '20% de economia anual incluída.',
    monthSuffix: 'mês',
    yearSuffix: 'ano',
    accountBadge: 'Crie sua conta corporativa',
    accountTitle: 'Dados da conta',
    accountSubtitle: 'Adicione os principais dados do proprietário e da empresa.',
    billingBadge: 'Pacote e pagamento',
    billingTitle: 'Confirme o plano da sua empresa',
    billingSubtitle: 'Seus dados já estão salvos para este cadastro.',
    loadingOffer: 'Carregando oferta atual...',
    unnamedCompany: 'Empresa sem nome',
    pendingOwner: 'Proprietário pendente',
    pendingEmail: 'E-mail pendente',
    chooseProductsTitle: '1. Escolha os produtos que você manterá',
    trialAccess: 'Durante o teste você terá acesso a tudo, independentemente da seleção.',
    invalidSelection: 'Escolha pelo menos um produto disponível.',
    pendingCompletePrice: 'O preço do pacote completo ainda está pendente de publicação.',
    frequencyTitle: '2. Frequência de cobrança e equipe',
    monthly: 'Mensal',
    annual: 'Anual -20%',
    extraUsersLabel: 'Usuários adicionais além dos 5 incluídos',
    platformNotReady: 'O cadastro premium está visível, mas pagamento e provisionamento ainda não estão habilitados neste ambiente.',
    accountDetailsButton: 'Dados da conta',
    preparingStripe: 'Preparando Stripe...',
    continuePayment: 'Continuar para pagamento seguro',
    legalText: 'Ao continuar, você aceita iniciar uma assinatura com 30 dias de teste. A Stripe solicitará um cartão e cobrará automaticamente ao final.',
    accountFieldsetTitle: 'Dados da conta e da empresa',
    companyLabel: 'Empresa ou espaço',
    companyPlaceholder: 'Nome da sua empresa',
    ownerLabel: 'Nome do proprietário',
    ownerPlaceholder: 'Nome completo',
    emailLabel: 'E-mail principal',
    emailPlaceholder: 'voce@empresa.com',
    passwordLabel: 'Senha',
    passwordPlaceholder: 'Mínimo de 10 caracteres',
    countryLabel: 'País de operação',
    phoneLabel: 'Telefone',
    optional: 'opcional',
    phonePlaceholder: 'Somente números',
    industryLabel: 'Setor',
    industryPlaceholder: 'Restaurante, varejo, serviços...',
    companySizeLabel: 'Tamanho da empresa',
    continueToBilling: 'Continuar e escolher módulos',
    draftNote: 'Seus dados são salvos neste navegador enquanto você termina o cadastro.',
    countryLabels: {
      MX: 'México',
      CA: 'Canadá',
      US: 'Estados Unidos',
      CO: 'Colômbia',
      BR: 'Brasil',
    },
    industryLabels: {
      restaurant_hospitality: 'Restaurantes e hospitalidade',
      retail_ecommerce: 'Varejo e comércio eletrônico',
      professional_services: 'Serviços profissionais',
      construction_real_estate: 'Construção e imóveis',
      manufacturing: 'Manufatura',
      logistics_transportation: 'Logística e transporte',
      healthcare_wellness: 'Saúde e bem-estar',
      education_training: 'Educação e treinamento',
      finance_accounting: 'Finanças e contabilidade',
      technology_software: 'Tecnologia e software',
      agriculture_food: 'Agricultura e alimentos',
      nonprofit: 'Organização sem fins lucrativos',
      other: 'Outro setor',
    },
    productLabels: {
      core_platform: 'Núcleo Indice',
      basic_hr: 'Recursos humanos',
      basic_process_tasks: 'Tarefas e processos',
      basic_expenses: 'Despesas + caixa pequeno',
      basic_pos_inventory: 'Ponto de venda + estoque',
      basic_sales_inventory: 'Vendas + estoque',
      basic_receivables: 'Contas a receber',
    },
  },
  'ko-CA': {
    ...enSignupCopy,
    locale: 'ko-CA',
    back: '뒤로',
    accountDetailsBack: '계정 정보',
    login: '이미 계정이 있습니다',
    languageLabel: '언어',
    loadPlansError: '사용 가능한 요금제를 불러오지 못했습니다.',
    accountIncompleteError: '계속하기 전에 이름, 회사, 이메일, 비밀번호를 입력하세요.',
    paymentAccountIncompleteError: '결제 전에 계정 정보를 완료하세요.',
    checkoutIncompleteError: '정보를 입력하고 1개, 2개, 3개 또는 모든 제품을 선택하세요.',
    checkoutError: '보안 결제를 시작하지 못했습니다. 다시 시도하세요.',
    premiumBadge: '프리미엄 체험',
    heroTitle: '입력한 정보를 잃지 않고 계정을 만드세요.',
    heroDescription: '먼저 소유자 계정을 입력합니다. 다음 단계에서 패키지와 결제를 선택하며, 돌아와도 정보가 저장됩니다.',
    ownerBullet: '계정은 소유자/슈퍼 관리자로 생성됩니다.',
    usersBullet: '사용자 5명이 포함되며 결제 단계에서 추가 사용자를 더할 수 있습니다.',
    stripeBullet: '패키지를 확인한 뒤 Stripe가 카드를 처리합니다.',
    afterTrial: '체험 후',
    annualSavings: '연간 20% 할인이 포함됩니다.',
    monthSuffix: '월',
    yearSuffix: '년',
    accountBadge: '회사 계정 만들기',
    accountTitle: '계정 정보',
    accountSubtitle: '소유자와 회사의 기본 정보를 입력하세요.',
    billingBadge: '패키지 및 결제',
    billingTitle: '회사 요금제 확인',
    billingSubtitle: '이 가입을 위한 정보가 이미 저장되었습니다.',
    loadingOffer: '현재 상품을 불러오는 중...',
    unnamedCompany: '이름 없는 회사',
    pendingOwner: '소유자 미입력',
    pendingEmail: '이메일 미입력',
    chooseProductsTitle: '1. 유지할 제품 선택',
    trialAccess: '체험 기간에는 선택과 관계없이 모든 제품을 사용할 수 있습니다.',
    invalidSelection: '사용 가능한 제품을 하나 이상 선택하세요.',
    pendingCompletePrice: '전체 패키지 가격이 아직 게시되지 않았습니다.',
    frequencyTitle: '2. 결제 주기 및 팀',
    monthly: '월간',
    annual: '연간 -20%',
    extraUsersLabel: '포함된 5명 외 추가 사용자',
    platformNotReady: '프리미엄 가입은 표시되지만 이 환경에서는 결제와 프로비저닝이 아직 활성화되지 않았습니다.',
    accountDetailsButton: '계정 정보',
    preparingStripe: 'Stripe 준비 중...',
    continuePayment: '보안 결제로 계속',
    legalText: '계속하면 30일 체험 구독 시작에 동의합니다. Stripe가 카드를 요청하고 체험 종료 후 자동 결제합니다.',
    accountFieldsetTitle: '계정 및 회사 정보',
    companyLabel: '회사 또는 작업 공간',
    companyPlaceholder: '회사 이름',
    ownerLabel: '소유자 이름',
    ownerPlaceholder: '전체 이름',
    emailLabel: '기본 이메일',
    emailPlaceholder: 'you@company.com',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '최소 10자',
    countryLabel: '운영 국가',
    phoneLabel: '전화번호',
    optional: '선택 사항',
    phonePlaceholder: '숫자만',
    industryLabel: '업종',
    industryPlaceholder: '레스토랑, 리테일, 서비스...',
    companySizeLabel: '회사 규모',
    continueToBilling: '계속해서 모듈 선택',
    draftNote: '가입을 완료하는 동안 이 브라우저에 정보가 저장됩니다.',
    countryLabels: {
      MX: '멕시코',
      CA: '캐나다',
      US: '미국',
      CO: '콜롬비아',
      BR: '브라질',
    },
    industryLabels: {
      restaurant_hospitality: '레스토랑 및 접객',
      retail_ecommerce: '리테일 및 전자상거래',
      professional_services: '전문 서비스',
      construction_real_estate: '건설 및 부동산',
      manufacturing: '제조',
      logistics_transportation: '물류 및 운송',
      healthcare_wellness: '헬스케어 및 웰니스',
      education_training: '교육 및 훈련',
      finance_accounting: '금융 및 회계',
      technology_software: '기술 및 소프트웨어',
      agriculture_food: '농업 및 식품',
      nonprofit: '비영리 단체',
      other: '기타 업종',
    },
    productLabels: {
      core_platform: 'Indice 코어',
      basic_hr: '인사 관리',
      basic_process_tasks: '작업 및 프로세스',
      basic_expenses: '비용 + 소액 현금',
      basic_pos_inventory: '판매 시점 + 재고',
      basic_sales_inventory: '영업 + 재고',
      basic_receivables: '미수금',
    },
  },
  'zh-CA': {
    ...enSignupCopy,
    locale: 'zh-CA',
    back: '返回',
    accountDetailsBack: '账户信息',
    login: '我已有账户',
    languageLabel: '语言',
    loadPlansError: '无法加载可用套餐。',
    accountIncompleteError: '继续前请填写姓名、公司、邮箱和密码。',
    paymentAccountIncompleteError: '付款前请返回并完成账户信息。',
    checkoutIncompleteError: '请填写信息，并至少选择一个可用产品。',
    checkoutError: '无法启动安全付款。请重试。',
    premiumBadge: '高级试用',
    heroTitle: '创建账户，同时保留你的信息。',
    heroDescription: '我们先保存所有者账户。然后你选择套餐和付款；返回时信息仍会保留。',
    ownerBullet: '账户会创建为所有者/超级管理员。',
    usersBullet: '包含 5 位用户；可在付款步骤添加额外用户。',
    stripeBullet: '确认套餐后由 Stripe 处理银行卡。',
    afterTrial: '试用结束后',
    annualSavings: '已包含年度 20% 优惠。',
    monthSuffix: '月',
    yearSuffix: '年',
    accountBadge: '创建企业账户',
    accountTitle: '账户信息',
    accountSubtitle: '添加所有者和公司的主要信息。',
    billingBadge: '套餐和付款',
    billingTitle: '确认你的企业套餐',
    billingSubtitle: '此注册的信息已保存。',
    loadingOffer: '正在加载当前优惠...',
    unnamedCompany: '未命名公司',
    pendingOwner: '所有者待填写',
    pendingEmail: '邮箱待填写',
    chooseProductsTitle: '1. 选择要保留的产品',
    trialAccess: '试用期间无论如何选择，都可以访问全部产品。',
    invalidSelection: '请至少选择一个可用产品。',
    pendingCompletePrice: '完整套餐价格尚未发布。',
    frequencyTitle: '2. 账单周期和团队',
    monthly: '按月',
    annual: '按年 -20%',
    extraUsersLabel: '超过已含 5 位的额外用户',
    platformNotReady: '高级注册页面已显示，但此环境尚未启用付款和开通。',
    accountDetailsButton: '账户信息',
    preparingStripe: '正在准备 Stripe...',
    continuePayment: '继续安全付款',
    legalText: '继续即表示你同意开始包含 30 天试用的订阅。Stripe 会要求提供银行卡，并在试用结束后自动扣费。',
    accountFieldsetTitle: '账户和企业信息',
    companyLabel: '企业或工作空间',
    companyPlaceholder: '你的公司名称',
    ownerLabel: '所有者姓名',
    ownerPlaceholder: '全名',
    emailLabel: '主要邮箱',
    emailPlaceholder: 'you@company.com',
    passwordLabel: '密码',
    passwordPlaceholder: '至少 10 个字符',
    countryLabel: '运营国家',
    phoneLabel: '电话',
    optional: '可选',
    phonePlaceholder: '仅限数字',
    industryLabel: '行业',
    industryPlaceholder: '餐饮、零售、服务...',
    companySizeLabel: '公司规模',
    continueToBilling: '继续并选择模块',
    draftNote: '注册完成前，你的信息会保存在此浏览器中。',
    countryLabels: {
      MX: '墨西哥',
      CA: '加拿大',
      US: '美国',
      CO: '哥伦比亚',
      BR: '巴西',
    },
    industryLabels: {
      restaurant_hospitality: '餐饮与酒店',
      retail_ecommerce: '零售与电子商务',
      professional_services: '专业服务',
      construction_real_estate: '建筑与房地产',
      manufacturing: '制造业',
      logistics_transportation: '物流与运输',
      healthcare_wellness: '医疗与健康',
      education_training: '教育与培训',
      finance_accounting: '金融与会计',
      technology_software: '技术与软件',
      agriculture_food: '农业与食品',
      nonprofit: '非营利组织',
      other: '其他行业',
    },
    productLabels: {
      core_platform: 'Indice 核心',
      basic_hr: '人力资源',
      basic_process_tasks: '任务与流程',
      basic_expenses: '费用 + 备用金',
      basic_pos_inventory: '销售点 + 库存',
      basic_sales_inventory: '销售 + 库存',
      basic_receivables: '应收账款',
    },
  },
};

type SignupPlanTier = 'basic_1' | 'basic_2' | 'basic_3' | 'basic_all';

type ModulePlanCopy = {
  trialTitle: string;
  trialBody: (includedSeats: number, extraSeatPrice: string) => string;
  oneTitle: string;
  oneDescription: (includedSeats: number) => string;
  twoTitle: string;
  twoDescription: (includedSeats: number) => string;
  threeTitle: string;
  threeDescription: (includedSeats: number) => string;
  allTitle: string;
  allDescription: (includedSeats: number) => string;
  launchOffer: string;
  moduleSelectionTitle: string;
  moduleInstruction: (targetCount: number, allSelected: boolean) => string;
};

const enModulePlanCopy: ModulePlanCopy = {
  trialTitle: '30-day free trial before billing',
  trialBody: (includedSeats, extraSeatPrice) => (
    `Every plan includes ${includedSeats} users. Extra users are ${extraSeatPrice} each. The first 30 days include all Basic modules, no matter which paid plan you choose. Prices exclude taxes.`
  ),
  oneTitle: 'One module',
  oneDescription: (includedSeats) => `Start with one selected module after checkout. Includes ${includedSeats} users.`,
  twoTitle: 'Two modules',
  twoDescription: (includedSeats) => `Two selected modules with the same trial rules. Includes ${includedSeats} users.`,
  threeTitle: 'Three modules',
  threeDescription: (includedSeats) => `Three selected modules with the same trial rules. Includes ${includedSeats} users.`,
  allTitle: 'Four or more modules',
  allDescription: (includedSeats) => `Choose four, five, or all six Basic products for the same launch rate. Includes ${includedSeats} users.`,
  launchOffer: 'Launch offer',
  moduleSelectionTitle: 'Module selection',
  moduleInstruction: (targetCount, allSelected) => {
    if (allSelected) return 'Choose any four or more paid products. Config Center is included automatically.';
    if (targetCount === 1) return 'Choose one paid module. Config Center is included automatically.';
    return `Choose ${targetCount} paid modules. Config Center is included automatically.`;
  },
};

const esModulePlanCopy: ModulePlanCopy = {
  trialTitle: '30 días de prueba antes del cobro',
  trialBody: (includedSeats, extraSeatPrice) => (
    `Cada plan incluye ${includedSeats} usuarios. Los usuarios extra cuestan ${extraSeatPrice} cada uno. Los primeros 30 días incluyen todos los módulos Basic, sin importar el plan pagado que elijas. Precios sin impuestos.`
  ),
  oneTitle: 'Un módulo',
  oneDescription: (includedSeats) => `Comienza con un módulo seleccionado después del pago. Incluye ${includedSeats} usuarios.`,
  twoTitle: 'Dos módulos',
  twoDescription: (includedSeats) => `Dos módulos seleccionados con las mismas reglas de prueba. Incluye ${includedSeats} usuarios.`,
  threeTitle: 'Tres módulos',
  threeDescription: (includedSeats) => `Tres módulos seleccionados con las mismas reglas de prueba. Incluye ${includedSeats} usuarios.`,
  allTitle: 'Cuatro o más módulos',
  allDescription: (includedSeats) => `Elige cuatro, cinco o los seis productos Basic por la misma tarifa de lanzamiento. Incluye ${includedSeats} usuarios.`,
  launchOffer: 'Oferta de lanzamiento',
  moduleSelectionTitle: 'Selección de módulos',
  moduleInstruction: (targetCount, allSelected) => {
    if (allSelected) return 'Elige cuatro o más productos pagados. Config Center se incluye automáticamente.';
    if (targetCount === 1) return 'Elige un módulo pagado. Config Center se incluye automáticamente.';
    return `Elige ${targetCount} módulos pagados. Config Center se incluye automáticamente.`;
  },
};

const frModulePlanCopy: ModulePlanCopy = {
  trialTitle: 'Essai gratuit de 30 jours avant facturation',
  trialBody: (includedSeats, extraSeatPrice) => (
    `Chaque forfait inclut ${includedSeats} utilisateurs. Les utilisateurs supplémentaires coûtent ${extraSeatPrice} chacun. Les 30 premiers jours incluent tous les modules Basic, peu importe le forfait choisi. Taxes exclues.`
  ),
  oneTitle: 'Un module',
  oneDescription: (includedSeats) => `Commencez avec un module sélectionné après le paiement. Inclut ${includedSeats} utilisateurs.`,
  twoTitle: 'Deux modules',
  twoDescription: (includedSeats) => `Deux modules sélectionnés avec les mêmes règles d'essai. Inclut ${includedSeats} utilisateurs.`,
  threeTitle: 'Trois modules',
  threeDescription: (includedSeats) => `Trois modules sélectionnés avec les mêmes règles d'essai. Inclut ${includedSeats} utilisateurs.`,
  allTitle: 'Quatre modules ou plus',
  allDescription: (includedSeats) => `Choisissez quatre, cinq ou les six produits Basic au même tarif de lancement. Inclut ${includedSeats} utilisateurs.`,
  launchOffer: 'Offre de lancement',
  moduleSelectionTitle: 'Sélection des modules',
  moduleInstruction: (targetCount, allSelected) => {
    if (allSelected) return 'Choisissez au moins quatre produits payants. Config Center est inclus automatiquement.';
    if (targetCount === 1) return 'Choisissez un module payant. Config Center est inclus automatiquement.';
    return `Choisissez ${targetCount} modules payants. Config Center est inclus automatiquement.`;
  },
};

const ptModulePlanCopy: ModulePlanCopy = {
  trialTitle: 'Teste grátis de 30 dias antes da cobrança',
  trialBody: (includedSeats, extraSeatPrice) => (
    `Cada plano inclui ${includedSeats} usuários. Usuários extras custam ${extraSeatPrice} cada. Os primeiros 30 dias incluem todos os módulos Basic, independentemente do plano pago escolhido. Preços sem impostos.`
  ),
  oneTitle: 'Um módulo',
  oneDescription: (includedSeats) => `Comece com um módulo selecionado após o pagamento. Inclui ${includedSeats} usuários.`,
  twoTitle: 'Dois módulos',
  twoDescription: (includedSeats) => `Dois módulos selecionados com as mesmas regras de teste. Inclui ${includedSeats} usuários.`,
  threeTitle: 'Três módulos',
  threeDescription: (includedSeats) => `Três módulos selecionados com as mesmas regras de teste. Inclui ${includedSeats} usuários.`,
  allTitle: 'Quatro ou mais módulos',
  allDescription: (includedSeats) => `Escolha quatro, cinco ou os seis produtos Basic pela mesma tarifa de lançamento. Inclui ${includedSeats} usuários.`,
  launchOffer: 'Oferta de lançamento',
  moduleSelectionTitle: 'Seleção de módulos',
  moduleInstruction: (targetCount, allSelected) => {
    if (allSelected) return 'Escolha quatro ou mais produtos pagos. Config Center é incluído automaticamente.';
    if (targetCount === 1) return 'Escolha um módulo pago. Config Center é incluído automaticamente.';
    return `Escolha ${targetCount} módulos pagos. Config Center é incluído automaticamente.`;
  },
};

const koModulePlanCopy: ModulePlanCopy = {
  trialTitle: '결제 전 30일 무료 체험',
  trialBody: (includedSeats, extraSeatPrice) => (
    `모든 플랜에는 사용자 ${includedSeats}명이 포함됩니다. 추가 사용자는 각각 ${extraSeatPrice}입니다. 첫 30일 동안은 선택한 유료 플랜과 관계없이 모든 Basic 모듈을 사용할 수 있습니다. 세금은 별도입니다.`
  ),
  oneTitle: '모듈 1개',
  oneDescription: (includedSeats) => `결제 후 선택한 모듈 1개로 시작합니다. 사용자 ${includedSeats}명이 포함됩니다.`,
  twoTitle: '모듈 2개',
  twoDescription: (includedSeats) => `같은 체험 규칙으로 모듈 2개를 선택합니다. 사용자 ${includedSeats}명이 포함됩니다.`,
  threeTitle: '모듈 3개',
  threeDescription: (includedSeats) => `같은 체험 규칙으로 모듈 3개를 선택합니다. 사용자 ${includedSeats}명이 포함됩니다.`,
  allTitle: '모듈 4개 이상',
  allDescription: (includedSeats) => `Basic 제품 4개, 5개 또는 6개를 같은 출시 요금으로 선택합니다. 사용자 ${includedSeats}명이 포함됩니다.`,
  launchOffer: '출시 혜택',
  moduleSelectionTitle: '모듈 선택',
  moduleInstruction: (targetCount, allSelected) => {
    if (allSelected) return '유료 제품을 4개 이상 선택하세요. Config Center는 자동으로 포함됩니다.';
    if (targetCount === 1) return '유료 모듈 1개를 선택하세요. Config Center는 자동으로 포함됩니다.';
    return `유료 모듈 ${targetCount}개를 선택하세요. Config Center는 자동으로 포함됩니다.`;
  },
};

const zhModulePlanCopy: ModulePlanCopy = {
  trialTitle: '计费前 30 天免费试用',
  trialBody: (includedSeats, extraSeatPrice) => (
    `每个套餐包含 ${includedSeats} 位用户。额外用户每位 ${extraSeatPrice}。前 30 天包含所有 Basic 模块，无论你选择哪个付费套餐。价格不含税。`
  ),
  oneTitle: '一个模块',
  oneDescription: (includedSeats) => `结账后从一个已选模块开始。包含 ${includedSeats} 位用户。`,
  twoTitle: '两个模块',
  twoDescription: (includedSeats) => `选择两个模块，试用规则相同。包含 ${includedSeats} 位用户。`,
  threeTitle: '三个模块',
  threeDescription: (includedSeats) => `选择三个模块，试用规则相同。包含 ${includedSeats} 位用户。`,
  allTitle: '四个或更多模块',
  allDescription: (includedSeats) => `以相同发布优惠价选择四个、五个或全部六个 Basic 产品。包含 ${includedSeats} 位用户。`,
  launchOffer: '发布优惠',
  moduleSelectionTitle: '模块选择',
  moduleInstruction: (targetCount, allSelected) => {
    if (allSelected) return '请选择四个或更多付费产品。Config Center 会自动包含。';
    if (targetCount === 1) return '选择一个付费模块。Config Center 会自动包含。';
    return `选择 ${targetCount} 个付费模块。Config Center 会自动包含。`;
  },
};

const modulePlanCopies: Record<string, ModulePlanCopy> = {
  'es-MX': esModulePlanCopy,
  'es-CO': esModulePlanCopy,
  'en-US': enModulePlanCopy,
  'en-CA': enModulePlanCopy,
  'fr-CA': frModulePlanCopy,
  'pt-BR': ptModulePlanCopy,
  'ko-CA': koModulePlanCopy,
  'zh-CA': zhModulePlanCopy,
};

const newIdempotencyKey = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `signup-${crypto.randomUUID()}`
    : `signup-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const phoneDigitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 20);

const currency = (amountCents: number, interval: 'MONTH' | 'YEAR', copy: SignupCopy) => {
  const value = new Intl.NumberFormat(copy.locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
  return `${value} USD/${interval === 'YEAR' ? copy.yearSuffix : copy.monthSuffix}`;
};

const moneyOnly = (amountCents: number, copy: SignupCopy) => (
  new Intl.NumberFormat(copy.locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100)
);

const signupMonthlyPrice = (amountCents: number, copy: SignupCopy) => `${moneyOnly(amountCents, copy)}/mo`;

const signupBaseAmount = (tier: SignupPlanTier) => {
  if (tier === 'basic_1') return 6900;
  if (tier === 'basic_2') return 10900;
  if (tier === 'basic_all') return 19900;
  return 14900;
};

const signupEstimatedAmount = (
  tier: SignupPlanTier,
  extraSeats: number,
  interval: 'MONTH' | 'YEAR',
) => {
  const packageAmount = signupBaseAmount(tier);
  const seatAmount = Math.max(0, extraSeats) * 1200;
  return interval === 'YEAR'
    ? Math.round(packageAmount * 12 * 0.8) + seatAmount * 12
    : packageAmount + seatAmount;
};

const tierForSelection = (selectedCount: number, availableCount: number): SignupPlanTier => {
  if (availableCount > 0 && selectedCount >= 4 && selectedCount <= availableCount) return 'basic_all';
  if (selectedCount === 3) return 'basic_3';
  if (selectedCount === 2) return 'basic_2';
  return 'basic_1';
};

const normalizeDraft = (value: unknown): BillingSignupRequest | null => {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Partial<BillingSignupRequest>;
  return {
    ...emptyForm,
    fullName: typeof draft.fullName === 'string' ? draft.fullName : emptyForm.fullName,
    email: typeof draft.email === 'string' ? draft.email : emptyForm.email,
    confirmEmail: typeof draft.confirmEmail === 'string' ? draft.confirmEmail : emptyForm.confirmEmail,
    password: typeof draft.password === 'string' ? draft.password : emptyForm.password,
    companyName: typeof draft.companyName === 'string' ? draft.companyName : emptyForm.companyName,
    countryCode: typeof draft.countryCode === 'string' ? draft.countryCode : emptyForm.countryCode,
    phone: typeof draft.phone === 'string' ? phoneDigitsOnly(draft.phone) : emptyForm.phone,
    industry: typeof draft.industry === 'string' ? draft.industry : emptyForm.industry,
    companySize: typeof draft.companySize === 'string' ? draft.companySize : emptyForm.companySize,
    billingInterval: draft.billingInterval === 'YEAR' ? 'YEAR' : 'MONTH',
    extraSeats: Math.max(0, Number(draft.extraSeats) || 0),
    selectedProductCodes: Array.isArray(draft.selectedProductCodes)
      ? draft.selectedProductCodes.filter((code): code is string => typeof code === 'string')
      : [],
    courtesyCode: typeof draft.courtesyCode === 'string' ? draft.courtesyCode : '',
    emailVerificationReference: typeof draft.emailVerificationReference === 'string'
      ? draft.emailVerificationReference
      : '',
  };
};

const readDraft = (storage: Storage | undefined) => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    return raw ? normalizeDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const loadStoredSignupDraft = () => {
  if (typeof window === 'undefined') return emptyForm;
  return {
    ...emptyForm,
    ...(readDraft(window.localStorage) ?? {}),
    ...(readDraft(window.sessionStorage) ?? {}),
  };
};

const saveSignupDraft = (form: BillingSignupRequest) => {
  if (typeof window === 'undefined') return;
  const sanitizedForm = {
    ...form,
    phone: phoneDigitsOnly(form.phone),
  };
  window.sessionStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(sanitizedForm));
  window.localStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify({
    ...sanitizedForm,
    password: '',
    courtesyCode: '',
    emailVerificationReference: '',
  }));
};

const productLabel = (code: string, fallback: string, copy: SignupCopy) => {
  return copy.productLabels[code] ?? fallback;
};

const productVisual = (code: string) => {
  if (code === 'basic_hr') return { accent: '#59C3A5', emoji: ['👥'] };
  if (code === 'basic_process_tasks') return { accent: '#F4C84A', emoji: ['✅'] };
  if (code === 'basic_expenses') return { accent: '#147514', emoji: ['💸', '💰'] };
  if (code === 'basic_pos_inventory') return { accent: '#FF6B5E', emoji: ['🛒', '📦'] };
  if (code === 'basic_sales_inventory') return { accent: '#FF6B5E', emoji: ['💼', '📦'] };
  if (code === 'basic_receivables') return { accent: '#147514', emoji: ['📙'] };
  return { accent: '#2563EB', emoji: ['▦'] };
};

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const copy = signupCopies[currentLanguage.code] ?? esSignupCopy;
  const experienceCopy = signupExperienceCopies[currentLanguage.code] ?? enSignupExperience;
  const modulePlanCopy = modulePlanCopies[currentLanguage.code] ?? enModulePlanCopy;
  const billingStep = location.pathname.endsWith('/billing');
  const [config, setConfig] = useState<BillingSignupConfig | null>(null);
  const [form, setForm] = useState<BillingSignupRequest>(() => loadStoredSignupDraft());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [accountAttempted, setAccountAttempted] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerification, setEmailVerification] = useState({
    maskedEmail: '',
    verifiedEmail: form.emailVerificationReference ? form.email.trim().toLowerCase() : '',
    resendAvailableInSeconds: 0,
  });
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    let active = true;
    billingSignupApi.config()
      .then((value) => {
        if (!active) return;
        setConfig(value);
        setForm((current) => {
          const availableCodes = new Set(value.products.map((product) => product.code));
          const legacyFullSelection = typeof window !== 'undefined'
            && !window.sessionStorage.getItem(SIGNUP_BUILDER_MIGRATION_KEY)
            && value.products.length > 0
            && current.selectedProductCodes.length === value.products.length
            && current.selectedProductCodes.every((code) => availableCodes.has(code));
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(SIGNUP_BUILDER_MIGRATION_KEY, 'ready');
          }
          const selectedProductCodes = legacyFullSelection
            ? []
            : current.selectedProductCodes.filter((code) => availableCodes.has(code));
          if (
            selectedProductCodes.length === current.selectedProductCodes.length
            && selectedProductCodes.every((code, index) => code === current.selectedProductCodes[index])
          ) return current;
          const next = {
            ...current,
            selectedProductCodes,
          };
          saveSignupDraft(next);
          return next;
        });
        setLoading(false);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : copy.loadPlansError);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveSignupDraft(form);
  }, [form]);

  useEffect(() => {
    if (emailVerification.resendAvailableInSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setEmailVerification((current) => ({
        ...current,
        resendAvailableInSeconds: Math.max(0, current.resendAvailableInSeconds - 1),
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailVerification.resendAvailableInSeconds]);

  const selectedCount = form.selectedProductCodes.length;
  const basicProducts = config?.products.filter((product) => product.productType === 'BASIC') ?? [];
  const selectedBasicCount = basicProducts.filter((product) => form.selectedProductCodes.includes(product.code)).length;
  const selectedComplementaryProducts = config?.products.filter(
    (product) => product.productType === 'ADDON' && form.selectedProductCodes.includes(product.code),
  ) ?? [];
  const offerCode = config && selectedBasicCount >= 4 && selectedBasicCount <= basicProducts.length
    ? 'basic_all'
    : `basic_${selectedBasicCount}`;
  const basePrice = config?.prices.find((price) => (
    price.billableCode === offerCode
    && price.priceType === 'BASE'
    && price.billingInterval === form.billingInterval
  ));
  const seatPrice = config?.prices.find((price) => (
    price.billableCode === 'extra_seat'
    && price.priceType === 'ADDON'
    && price.billingInterval === form.billingInterval
  ));
  const complementaryPrices = selectedComplementaryProducts.map((product) => config?.prices.find((price) => (
    price.billableCode === product.code
    && price.priceType === 'ADDON'
    && price.billingInterval === form.billingInterval
  ))?.unitAmountCents ?? null);
  const complementaryPricesReady = complementaryPrices.every((amount) => amount != null);
  const complementaryAmount = complementaryPricesReady
    ? complementaryPrices.reduce((total, amount) => total + (amount ?? 0), 0)
    : null;
  const estimatedAmount = basePrice?.unitAmountCents == null
    || seatPrice?.unitAmountCents == null
    || complementaryAmount == null
    ? null
    : basePrice.unitAmountCents + complementaryAmount + seatPrice.unitAmountCents * form.extraSeats;
  const validSelection = selectedBasicCount >= 1
    && selectedBasicCount <= basicProducts.length;
  const courtesyRequested = form.courtesyCode.trim().length > 0;
  const platformReady = Boolean(
    config?.provisioningEnabled
    && (config.checkoutEnabled || (config.courtesyEnabled && courtesyRequested)),
  );
  const normalizedEmail = form.email.trim().toLowerCase();
  const normalizedConfirmEmail = form.confirmEmail.trim().toLowerCase();
  const emailsMatch = normalizedEmail.length > 0 && normalizedEmail === normalizedConfirmEmail;
  const emailVerificationRequired = config?.emailVerificationRequired !== false;
  const emailVerified = Boolean(
    !emailVerificationRequired
    || (form.emailVerificationReference
      && emailVerification.verifiedEmail
      && emailVerification.verifiedEmail === normalizedEmail),
  );
  const accountDetailsComplete = useMemo(() => (
    form.fullName.trim().length >= 2
    && form.companyName.trim().length >= 2
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
    && form.email.trim().toLowerCase() === form.confirmEmail.trim().toLowerCase()
    && isValidAccountPassword(form.password)
  ), [form.companyName, form.confirmEmail, form.email, form.fullName, form.password]);
  const canSubmit = platformReady
    && accountDetailsComplete
    && emailVerified
    && validSelection
    && estimatedAmount !== null
    && !submitting;
  const knownIndustry = !form.industry
    || industryValues.includes(form.industry as (typeof industryValues)[number]);
  const availableProductCodes = useMemo(() => config?.products.map((product) => product.code) ?? [], [config]);
  const selectedTier = tierForSelection(selectedBasicCount, basicProducts.length);
  const includedSeats = config?.includedSeats ?? 5;
  const visibleSignupEstimate = signupEstimatedAmount(selectedTier, form.extraSeats, form.billingInterval);

  const update = <K extends keyof BillingSignupRequest>(key: K, value: BillingSignupRequest[K]) => {
    const resetVerification = key === 'email' || key === 'confirmEmail' || key === 'fullName' || key === 'companyName';
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (resetVerification) {
        next.emailVerificationReference = '';
      }
      return next;
    });
    if (resetVerification) {
      setVerificationCode('');
      setEmailVerification({ maskedEmail: '', verifiedEmail: '', resendAvailableInSeconds: 0 });
    }
    setError('');
  };

  const toggleProduct = (code: string) => {
    if (!availableProductCodes.includes(code)) return;
    const currentSelection = form.selectedProductCodes.filter((productCode) => availableProductCodes.includes(productCode));
    if (currentSelection.includes(code)) {
      const product = config?.products.find((item) => item.code === code);
      if (product?.productType === 'BASIC' && selectedBasicCount === 1) return;
      update('selectedProductCodes', currentSelection.filter((current) => current !== code));
      return;
    }
    update('selectedProductCodes', [...currentSelection, code]);
  };

  const selectAllProducts = () => update('selectedProductCodes', availableProductCodes);
  const clearProducts = () => update('selectedProductCodes', basicProducts.slice(0, 1).map((product) => product.code));

  const startEmailVerification = async () => {
    const response = await billingSignupApi.startEmailVerification({
      fullName: form.fullName.trim(),
      email: normalizedEmail,
      confirmEmail: normalizedConfirmEmail,
      companyName: form.companyName.trim(),
    });
    setForm((current) => ({
      ...current,
      email: normalizedEmail,
      confirmEmail: normalizedConfirmEmail,
      emailVerificationReference: response.verificationReference,
    }));
    setEmailVerification({
      maskedEmail: response.maskedEmail,
      verifiedEmail: '',
      resendAvailableInSeconds: response.resendAvailableInSeconds,
    });
    setVerificationCode('');
  };

  const verifyEmailCode = async () => {
    const cleanedCode = verificationCode.replace(/\D/g, '');
    if (!form.emailVerificationReference || cleanedCode.length !== 6) {
      setError(copy.emailVerificationCodeRequired);
      return false;
    }
    const response = await billingSignupApi.verifyEmail(form.emailVerificationReference, cleanedCode);
    if (!response.verified) {
      setError(response.message || copy.emailVerificationCodeRequired);
      return false;
    }
    setEmailVerification({
      maskedEmail: response.maskedEmail || emailVerification.maskedEmail,
      verifiedEmail: normalizedEmail,
      resendAvailableInSeconds: 0,
    });
    setError('');
    return true;
  };

  const resendEmailVerification = async () => {
    if (!form.emailVerificationReference || submitting) return;
    try {
      setSubmitting(true);
      setError('');
      const response = await billingSignupApi.resendEmailVerification(form.emailVerificationReference);
      setEmailVerification((current) => ({
        ...current,
        maskedEmail: response.maskedEmail || current.maskedEmail,
        resendAvailableInSeconds: response.resendAvailableInSeconds,
      }));
      if (response.message) {
        setError(response.message);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.checkoutError);
    } finally {
      setSubmitting(false);
    }
  };

  const continueToBilling = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountAttempted(true);
    if (!accountDetailsComplete) {
      setError(copy.accountIncompleteError);
      return;
    }
    if (emailVerificationRequired && !emailVerified) {
      try {
        setSubmitting(true);
        setError('');
        if (!form.emailVerificationReference) {
          await startEmailVerification();
          return;
        }
        if (await verifyEmailCode()) {
          saveSignupDraft({ ...form, emailVerificationReference: form.emailVerificationReference });
          navigate('/signup/billing');
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : copy.checkoutError);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    saveSignupDraft(form);
    navigate('/signup/billing');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountDetailsComplete) {
      setError(copy.accountIncompleteError);
      return;
    }
    if (emailVerificationRequired && !emailVerified) {
      setError(copy.emailVerificationRequiredError);
      return;
    }
    if (!canSubmit) {
      setError(copy.checkoutIncompleteError);
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const checkout = await billingSignupApi.checkout({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        confirmEmail: form.confirmEmail.trim().toLowerCase(),
        companyName: form.companyName.trim(),
        phone: phoneDigitsOnly(form.phone),
        industry: form.industry.trim(),
        companySize: form.companySize.trim(),
        emailVerificationReference: form.emailVerificationReference,
      }, idempotencyKey.current);
      sessionStorage.setItem(BILLING_SIGNUP_REFERENCE_STORAGE_KEY, checkout.signupReference);
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
      } else {
        navigate(`/signup/complete?reference=${encodeURIComponent(checkout.signupReference)}`);
      }
    } catch (reason) {
      idempotencyKey.current = newIdempotencyKey();
      setError(reason instanceof Error ? reason.message : copy.checkoutError);
      setSubmitting(false);
    }
  };

  const configuredMonthlyAmount = (billableCode: string, fallbackAmount: number) => (
    config?.prices.find((price) => (
      price.billableCode === billableCode
      && price.billingInterval === 'MONTH'
      && price.unitAmountCents != null
    ))?.unitAmountCents ?? fallbackAmount
  );
  const oneModulePriceLabel = signupMonthlyPrice(configuredMonthlyAmount('basic_1', 6900), copy);
  const twoModulePriceLabel = signupMonthlyPrice(configuredMonthlyAmount('basic_2', 10900), copy);
  const threeModulePriceLabel = signupMonthlyPrice(configuredMonthlyAmount('basic_3', 14900), copy);
  const allModulesPriceLabel = signupMonthlyPrice(configuredMonthlyAmount('basic_all', 19900), copy);
  const extraSeatPriceLabel = signupMonthlyPrice(configuredMonthlyAmount('extra_seat', 1200), copy);
  const pricingGuide = [
    {
      tier: 'basic_1' as const,
      title: modulePlanCopy.oneTitle,
      price: oneModulePriceLabel,
    },
    {
      tier: 'basic_2' as const,
      title: modulePlanCopy.twoTitle,
      price: twoModulePriceLabel,
    },
    {
      tier: 'basic_3' as const,
      title: modulePlanCopy.threeTitle,
      price: threeModulePriceLabel,
    },
    {
      tier: 'basic_all' as const,
      title: modulePlanCopy.allTitle,
      price: allModulesPriceLabel,
    },
  ];
  const activeStep = billingStep ? 2 : 1;
  const signupSteps = [
    experienceCopy.stepAccount,
    experienceCopy.stepConfiguration,
    experienceCopy.stepActivation,
  ];
  const selectedPrice = selectedCount === 0 ? 0 : (estimatedAmount ?? visibleSignupEstimate);
  const companyInvalid = accountAttempted && form.companyName.trim().length < 2;
  const ownerInvalid = accountAttempted && form.fullName.trim().length < 2;
  const emailInvalid = accountAttempted && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
  const confirmEmailInvalid = accountAttempted && !emailsMatch;
  const passwordInvalid = accountAttempted && !isValidAccountPassword(form.password);
  const accountSubmitLabel = submitting
    ? form.emailVerificationReference && !emailVerified
      ? copy.verifyingEmailCode
      : copy.sendingVerificationCode
    : emailVerified || !emailVerificationRequired
      ? experienceCopy.continueLabel
      : form.emailVerificationReference
        ? copy.verifyEmailCode
        : copy.sendVerificationCode;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(89,195,165,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.08),_transparent_30%),linear-gradient(135deg,_#F8FAFC_0%,_#EEF3F8_55%,_#F8FAFC_100%)] px-4 py-4 font-sans text-[#222831] sm:px-6 sm:py-5 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1280px]">
        <nav className="flex min-h-12 items-center justify-between gap-4" aria-label="Registro Índice">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link to="/login" aria-label={experienceCopy.logoAlt}>
              <IndiceBrandLogo alt={experienceCopy.logoAlt} className="h-11 w-36 sm:w-44" imageClassName="w-44 sm:w-[202px]" />
            </Link>
            <Button asChild variant="ghost" className="hidden h-10 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-white/80 hover:text-[var(--indice-structural-blue)] sm:inline-flex">
              <Link to={billingStep ? '/signup' : '/login'}>
                <ArrowLeft className="h-4 w-4" />
                {billingStep ? copy.accountDetailsBack : copy.back}
              </Link>
            </Button>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label={copy.languageLabel} variant="outline" className="h-10 gap-2 rounded-full border-slate-200 bg-white/90 px-3 font-medium text-[var(--indice-brand-action)] shadow-sm sm:px-4">
                  <Globe className="hidden h-4 w-4 sm:block" />
                  <span className="text-base">{currentLanguage.flag}</span>
                  <span className="hidden max-w-36 truncate md:inline">{currentLanguage.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setCurrentLanguage(language)}
                    className={currentLanguage.code === language.code ? 'bg-gray-100' : ''}
                  >
                    <span className="mr-2 text-xl">{language.flag}</span>
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant="outline" className="h-10 rounded-full border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm hover:border-[var(--indice-brand-aqua)] hover:bg-white hover:text-[var(--indice-brand-action)] sm:px-4">
              <Link to="/login"><span className="sm:hidden">{currentLanguage.code.startsWith('es') ? 'Entrar' : 'Log in'}</span><span className="hidden sm:inline">{copy.login}</span></Link>
            </Button>
          </div>
        </nav>

        <ol className="mx-auto my-5 grid max-w-2xl grid-cols-3 sm:my-6" aria-label="Progreso del registro">
          {signupSteps.map((step, index) => {
            const stepNumber = index + 1;
            const current = activeStep === stepNumber;
            const complete = activeStep > stepNumber;
            return (
              <li key={step} className="relative flex flex-col items-center gap-1.5 text-center">
                {index > 0 ? <span className={`absolute right-1/2 top-4 h-px w-full ${complete || current ? 'bg-[var(--indice-brand-aqua)]' : 'bg-slate-200'}`} aria-hidden="true" /> : null}
                <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium ${current ? 'border-[var(--indice-brand-action)] bg-[var(--indice-brand-action)] text-white' : complete ? 'border-[var(--indice-brand-aqua)] bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)]' : 'border-slate-200 bg-white text-slate-400'}`} aria-current={current ? 'step' : undefined}>
                  {complete ? <Check className="h-4 w-4" /> : stepNumber}
                </span>
                <span className={`text-xs font-medium sm:text-sm ${current || complete ? 'text-slate-800' : 'text-slate-400'}`}>{step}</span>
              </li>
            );
          })}
        </ol>

        <div className="grid items-start gap-5 lg:grid-cols-[0.76fr_1.24fr] xl:gap-6">
          <aside className="order-2 overflow-hidden rounded-[28px] border border-[var(--indice-brand-border)] bg-white/88 shadow-[0_28px_80px_-52px_rgba(23,125,102,0.42)] backdrop-blur lg:sticky lg:top-7 lg:order-1">
            <div className="h-1.5 bg-[linear-gradient(90deg,#59C3A5_0_25%,#F4C84A_25%_50%,#FF6B5E_50%_75%,#2563EB_75%)]" aria-hidden="true" />
            <div className="p-6 sm:p-7 xl:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1.5 text-sm font-medium text-[var(--indice-brand-action)]">
                <Sparkles className="h-4 w-4" /> {experienceCopy.trialBadge}
              </div>
              <h1 className="mt-5 text-[2rem] font-medium leading-[1.12] tracking-tight text-[#222831] sm:text-[2.25rem]">
                {billingStep ? experienceCopy.billingValueTitle : experienceCopy.valueTitle}
              </h1>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">
                {billingStep ? experienceCopy.billingValueBody : experienceCopy.valueBody}
              </p>
              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-700"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)]"><Layers3 className="h-4 w-4" /></span>{experienceCopy.allModulesBenefit}</div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-700"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Users className="h-4 w-4" /></span>{experienceCopy.includedSeatsBenefit(includedSeats)}</div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-700"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--indice-structural-blue)]"><ShieldCheck className="h-4 w-4" /></span>{experienceCopy.consultationBenefit}</div>
              </div>
              {billingStep ? (
                <div className="mt-7 rounded-2xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] p-5">
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span>{experienceCopy.selectedProducts(selectedCount)}</span>
                    <span>{form.billingInterval === 'YEAR' ? copy.annual : copy.monthly}</span>
                  </div>
                  {selectedCount > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.selectedProductCodes.map((code) => {
                        const product = config?.products.find((item) => item.code === code);
                        if (!product) return null;
                        const visual = productVisual(code);
                        return (
                          <span key={code} className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 text-xs font-medium text-slate-700" style={{ borderColor: `${visual.accent}66` }}>
                            <span className="shrink-0 text-base leading-none" aria-hidden="true">{visual.emoji.join('')}</span>
                            <span className="max-w-36 truncate">{productLabel(code, product.displayName, copy)}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500">{experienceCopy.chooseAtLeastOne}</p>
                  )}
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-[#222831]">{currency(selectedPrice, form.billingInterval, copy)}</p>
                  {form.billingInterval === 'YEAR' ? <p className="mt-1 text-sm text-[var(--indice-brand-action)]">{copy.annualSavings}</p> : null}
                </div>
              ) : null}
            </div>
          </aside>

          <section className="order-1 rounded-[28px] border border-white/90 bg-white/95 p-5 shadow-[0_28px_80px_-50px_rgba(34,40,49,0.45)] backdrop-blur sm:p-7 lg:order-2 xl:p-8">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)]"><Building2 className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-medium text-[var(--indice-brand-action)]">{billingStep ? experienceCopy.configurationEyebrow : experienceCopy.accountEyebrow}</p>
                <h2 className="mt-1 text-[1.75rem] font-medium leading-tight tracking-tight">{billingStep ? experienceCopy.configurationTitle : experienceCopy.accountTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {billingStep ? experienceCopy.configurationBody : experienceCopy.accountBody}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-medium text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> {copy.loadingOffer}</div>
            ) : billingStep ? (
              accountDetailsComplete ? (
                <form className="mt-6 space-y-7" onSubmit={submit}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">{form.companyName || copy.unnamedCompany}</p>
                    <p>{form.fullName || copy.pendingOwner} · {form.email || copy.pendingEmail}{form.phone ? ` · ${form.phone}` : ''}</p>
                  </div>

                  <div className="rounded-2xl border border-[var(--indice-brand-aqua)] bg-[var(--indice-brand-soft)] px-4 py-4 text-slate-700 sm:px-5">
                    <div className="flex gap-4">
                      <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--indice-brand-action)]" />
                      <div>
                        <h3 className="text-lg font-medium tracking-tight text-slate-900">{modulePlanCopy.trialTitle}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {modulePlanCopy.trialBody(includedSeats, extraSeatPriceLabel)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-4">
                        <Layers3 className="mt-1 h-6 w-6 shrink-0 text-[var(--indice-brand-action)]" />
                        <div>
                          <legend className="text-xl font-medium tracking-tight text-slate-900">{experienceCopy.builderTitle}</legend>
                          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{experienceCopy.builderBody}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 pl-10 text-sm font-medium sm:pl-0">
                        <button type="button" onClick={selectAllProducts} disabled={!availableProductCodes.length || selectedCount === availableProductCodes.length} className="text-blue-600 transition hover:text-blue-700 disabled:cursor-default disabled:text-slate-300">
                          {experienceCopy.selectAll}
                        </button>
                        <button type="button" onClick={clearProducts} disabled={selectedCount === 0} className="text-blue-600 transition hover:text-blue-700 disabled:cursor-default disabled:text-slate-300">
                          {experienceCopy.clearSelection}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
                      <p className="px-4 pt-3 text-xs font-medium text-slate-500">{experienceCopy.priceGuide}</p>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4">
                        {pricingGuide.map((item, index) => {
                          const active = selectedCount > 0 && selectedTier === item.tier;
                          const accents = ['#59C3A5', '#F4C84A', '#FF6B5E', '#2563EB'];
                          return (
                            <div key={item.tier} className={`relative border-t border-slate-200 px-3 py-3 text-center sm:border-l sm:first:border-l-0 ${active ? 'bg-white shadow-[inset_0_-3px_0_var(--tier-accent)]' : ''}`} style={{ '--tier-accent': accents[index] } as CSSProperties}>
                              <span className={`block text-xs ${active ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{item.title}</span>
                              <span className={`mt-1 block text-base ${active ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>{item.price}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {config?.products.map((product) => {
                        const selected = form.selectedProductCodes.includes(product.code);
                        const visual = productVisual(product.code);
                        return (
                          <button
                            key={product.code}
                            type="button"
                            onClick={() => toggleProduct(product.code)}
                            aria-pressed={selected}
                            className={`relative flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 bg-white px-5 py-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${selected ? 'shadow-sm' : 'hover:-translate-y-0.5 hover:shadow-sm'}`}
                            style={{
                              borderColor: visual.accent,
                              backgroundColor: selected ? `${visual.accent}10` : '#FFFFFF',
                              '--tw-ring-color': visual.accent,
                            } as CSSProperties}
                          >
                            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: visual.accent, color: visual.accent }} aria-hidden="true">
                              {selected ? <Check className="h-4 w-4" /> : null}
                            </span>
                            <span className="flex min-h-12 items-center justify-center gap-1 text-4xl leading-none" aria-hidden="true">
                              {visual.emoji.map((emoji, index) => <span key={`${product.code}-${index}`}>{emoji}</span>)}
                            </span>
                            <span className="mt-3 text-base font-medium leading-5 text-slate-900">{productLabel(product.code, product.displayName, copy)}</span>
                          <span className="mt-2 text-sm font-medium" style={{ color: visual.accent }}>
                            {product.productType === 'ADDON'
                              ? currency(
                                  config?.prices.find((price) => price.billableCode === product.code
                                    && price.priceType === 'ADDON'
                                    && price.billingInterval === form.billingInterval)?.unitAmountCents ?? 0,
                                  form.billingInterval,
                                  copy,
                                )
                              : experienceCopy.countsAsOne}
                          </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedBasicCount === 0 ? <p className="mt-4 text-sm font-medium text-amber-700">{experienceCopy.chooseAtLeastOne}</p> : null}
                    {!validSelection && selectedCount > 0 ? <p className="mt-3 text-sm font-medium text-amber-700">{copy.invalidSelection}</p> : null}
                    {basePrice?.status === 'PENDING_PRICE' ? <p className="mt-3 text-sm font-semibold text-amber-700">{copy.pendingCompletePrice}</p> : null}
                  </fieldset>

                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    {currentLanguage.code.startsWith('es') ? 'Código de cortesía' : 'Courtesy code'}
                    <Input
                      value={form.courtesyCode}
                      onChange={(event) => update('courtesyCode', event.target.value.toUpperCase())}
                      maxLength={40}
                      className={brandInputClasses}
                      placeholder="IND-XXXX-XXXX-XXXX-XXXX"
                      autoComplete="off"
                    />
                    <span className="block text-xs font-normal leading-5 text-slate-500">
                      {currentLanguage.code.startsWith('es')
                        ? 'Sólo úsalo si el equipo de Índice te otorgó una cortesía. Permite crear la cuenta sin registrar tarjeta.'
                        : 'Use this only when the Indice team granted a courtesy. It creates the account without collecting a card.'}
                    </span>
                  </label>

                  <fieldset>
                    <legend className="text-sm font-medium text-slate-800">{copy.frequencyTitle}</legend>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                        {(['MONTH', 'YEAR'] as const).map((interval) => (
                          <button key={interval} type="button" onClick={() => update('billingInterval', interval)} className={`h-11 rounded-xl text-sm font-medium transition ${form.billingInterval === interval ? 'bg-white text-[var(--indice-brand-action)] shadow-sm' : 'text-slate-500'}`}>
                            {interval === 'MONTH' ? copy.monthly : copy.annual}
                          </button>
                        ))}
                      </div>
                      <label className="space-y-2 text-sm font-medium text-slate-700">{copy.extraUsersLabel}
                        <Input type="number" min={0} max={500} value={form.extraSeats} onChange={(event) => update('extraSeats', Math.max(0, Number(event.target.value) || 0))} className={brandInputClasses} />
                      </label>
                    </div>
                  </fieldset>

                  <div className="rounded-2xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] p-4 lg:hidden">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                      <span>{experienceCopy.selectedProducts(selectedCount)}</span>
                      <span>{form.billingInterval === 'YEAR' ? copy.annual : copy.monthly}</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-[#222831]">{currency(selectedPrice, form.billingInterval, copy)}</p>
                  </div>

                  {!platformReady ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      {copy.platformNotReady}
                    </div>
                  ) : null}
                  {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

                  <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <Button type="button" variant="outline" onClick={() => navigate('/signup')} className="h-13 rounded-xl border-slate-200 bg-white text-base font-medium text-slate-700">
                      <ArrowLeft className="h-5 w-5" /> {copy.accountDetailsButton}
                    </Button>
                    <Button type="submit" disabled={!canSubmit} className="h-13 rounded-xl bg-[var(--indice-brand-action)] text-base font-medium text-white hover:bg-[var(--indice-brand-action-hover)]">
                      {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> {copy.preparingStripe}</> : <>{copy.continuePayment} <ArrowRight className="h-5 w-5" /></>}
                    </Button>
                  </div>
                  <p className="text-center text-xs leading-5 text-slate-500">{copy.legalText}</p>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {copy.paymentAccountIncompleteError}
                  </div>
                  <Button type="button" onClick={() => navigate('/signup')} className="h-13 w-full rounded-xl bg-[var(--indice-brand-action)] text-base font-medium text-white hover:bg-[var(--indice-brand-action-hover)]">
                    <ArrowLeft className="h-5 w-5" /> {copy.accountDetailsButton}
                  </Button>
                </div>
              )
            ) : (
              <form className="mt-6 space-y-5" onSubmit={continueToBilling} noValidate>
                <fieldset className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <legend className="sr-only">{copy.accountFieldsetTitle}</legend>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    {copy.companyLabel}
                    <span className="relative block">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input value={form.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength={120} className={`${brandInputClasses} pl-10`} placeholder={copy.companyPlaceholder} autoComplete="organization" aria-invalid={companyInvalid} required />
                    </span>
                    {companyInvalid ? <span className="block text-xs font-normal text-red-600">{experienceCopy.requiredField}</span> : null}
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    {copy.ownerLabel}
                    <span className="relative block">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} maxLength={100} className={`${brandInputClasses} pl-10`} placeholder={copy.ownerPlaceholder} autoComplete="name" aria-invalid={ownerInvalid} required />
                    </span>
                    {ownerInvalid ? <span className="block text-xs font-normal text-red-600">{experienceCopy.requiredField}</span> : null}
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    {copy.emailLabel}
                    <span className="relative block">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} maxLength={190} className={`${brandInputClasses} pl-10`} placeholder={copy.emailPlaceholder} autoComplete="email" aria-invalid={emailInvalid} required />
                    </span>
                    {emailInvalid ? <span className="block text-xs font-normal text-red-600">{experienceCopy.validEmail}</span> : null}
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    {copy.confirmEmailLabel}
                    <span className="relative block">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type="email" value={form.confirmEmail} onChange={(event) => update('confirmEmail', event.target.value)} maxLength={190} className={`${brandInputClasses} pl-10`} placeholder={copy.confirmEmailPlaceholder} autoComplete="email" aria-invalid={confirmEmailInvalid} required />
                    </span>
                    {confirmEmailInvalid ? <span className="block text-xs font-normal text-red-600">{copy.emailMismatchError}</span> : null}
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    {copy.passwordLabel}
                    <span className="relative block">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} className={`${brandInputClasses} pl-10 pr-11`} placeholder={copy.passwordPlaceholder} autoComplete="new-password" aria-invalid={passwordInvalid} required minLength={10} maxLength={72} />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label={showPassword ? experienceCopy.hidePassword : experienceCopy.showPassword}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                    <span className={`block text-xs font-normal ${passwordInvalid ? 'text-red-600' : 'text-slate-500'}`}>{experienceCopy.passwordRequirement}</span>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    {copy.countryLabel}
                    <span className="relative block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select value={form.countryCode} onChange={(event) => update('countryCode', event.target.value)} className={`${brandSelectClasses} pl-10`}>
                        {(config?.launchCountries.length ? config.launchCountries : ['MX', 'CA']).map((countryCode) => (
                          <option key={countryCode} value={countryCode}>{copy.countryLabels[countryCode] ?? countryCode}</option>
                        ))}
                      </select>
                    </span>
                  </label>
                </fieldset>

                {accountDetailsComplete && emailVerificationRequired ? (
                  <section className={`rounded-2xl border px-4 py-4 ${emailVerified ? 'border-emerald-200 bg-emerald-50' : 'border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)]'}`}>
                    <div className="flex gap-3">
                      <ShieldCheck className={`mt-1 h-5 w-5 shrink-0 ${emailVerified ? 'text-emerald-700' : 'text-[var(--indice-brand-action)]'}`} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">{copy.emailVerificationTitle}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {emailVerified
                            ? copy.emailVerifiedMessage
                            : form.emailVerificationReference
                              ? copy.emailVerificationSent(emailVerification.maskedEmail || normalizedEmail)
                              : copy.emailVerificationBody}
                        </p>
                        {form.emailVerificationReference && !emailVerified ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                            <label className="space-y-2 text-sm font-medium text-slate-700">
                              {copy.verificationCodeLabel}
                              <Input
                                value={verificationCode}
                                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                className={brandInputClasses}
                                placeholder={copy.verificationCodePlaceholder}
                                autoComplete="one-time-code"
                              />
                            </label>
                            <Button type="submit" disabled={submitting} className="h-12 rounded-xl bg-[var(--indice-brand-action)] px-5 text-sm font-medium text-white hover:bg-[var(--indice-brand-action-hover)]">
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              {submitting ? copy.verifyingEmailCode : copy.verifyEmailCode}
                            </Button>
                            <Button type="button" variant="outline" disabled={submitting || emailVerification.resendAvailableInSeconds > 0} onClick={resendEmailVerification} className="h-12 rounded-xl border-slate-200 bg-white px-5 text-sm font-medium text-slate-700">
                              {copy.resendCode}
                            </Button>
                          </div>
                        ) : null}
                        {!emailVerified && emailVerification.resendAvailableInSeconds > 0 ? (
                          <p className="mt-2 text-xs font-medium text-slate-500">{copy.resendAvailableIn(emailVerification.resendAvailableInSeconds)}</p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70">
                  <button type="button" onClick={() => setShowOptionalDetails((visible) => !visible)} className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left" aria-expanded={showOptionalDetails}>
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{experienceCopy.optionalTitle} <span className="font-normal text-slate-400">({copy.optional})</span></span>
                      <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{experienceCopy.optionalBody}</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${showOptionalDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showOptionalDetails ? (
                    <div className="grid gap-4 border-t border-slate-200 px-4 py-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        {copy.phoneLabel}
                        <span className="relative block">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input type="tel" inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(event) => update('phone', phoneDigitsOnly(event.target.value))} maxLength={20} className={`${brandInputClasses} pl-10`} placeholder={copy.phonePlaceholder} autoComplete="tel" />
                        </span>
                      </label>
                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        {copy.industryLabel}
                        <select value={form.industry} onChange={(event) => update('industry', event.target.value)} className={brandSelectClasses}>
                          <option value="">{copy.industryPlaceholder}</option>
                          {!knownIndustry ? <option value={form.industry}>{form.industry}</option> : null}
                          {industryValues.map((industry) => <option key={industry} value={industry}>{copy.industryLabels[industry]}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                        {copy.companySizeLabel}
                        <Input value={form.companySize} onChange={(event) => update('companySize', event.target.value)} maxLength={80} className={brandInputClasses} placeholder={copy.companySizePlaceholder} />
                      </label>
                    </div>
                  ) : null}
                </div>

                {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

                <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-base font-medium text-white shadow-sm shadow-emerald-950/15 hover:bg-[var(--indice-brand-action-hover)]">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {accountSubmitLabel} {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                </Button>
                <div className="flex flex-col items-center justify-center gap-1 text-center text-xs leading-5 text-slate-500 sm:flex-row sm:gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[var(--indice-brand-action)]"><CreditCard className="h-3.5 w-3.5" />{experienceCopy.noCharge}</span>
                  <span className="hidden sm:inline" aria-hidden="true">·</span>
                  <span>{copy.draftNote}</span>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
