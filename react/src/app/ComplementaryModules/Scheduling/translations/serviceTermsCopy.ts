import type { ServiceChargePolicy } from '../services/schedulingApi';

const en = {
  description: 'Choose an Inventory service or create one in Scheduling, then prepare its bookings.',
  inventoryService: 'Inventory service', source: 'Service source', inventory: 'Choose from Inventory', agenda: 'Create in Scheduling', agendaService: 'Scheduling service',
  chooseHint: 'Use your catalogue or create a session directly here.',
  agendaHint: 'For consultations, demos or individual sessions. You can link Inventory later and keep your reservations.',
  linkHint: 'Linking Inventory keeps this service’s name, booking settings and previous reservations.',
  nameRequired: 'Enter a service name to continue.',
  chargePolicy: 'Charge condition', noCharge: 'No charge', toBeAgreed: 'Price to be agreed',
  chargeHint: 'This condition is shown when booking. Commercial prices and payments are managed in Sales.',
};
type ServiceTermsCopy = { [K in keyof typeof en]: string };
const es: ServiceTermsCopy = {
  description: 'Elige un servicio de Inventarios o créalo en Agenda y prepara sus reservas.',
  inventoryService: 'Servicio de Inventarios', source: 'Origen del servicio', inventory: 'Elegir de Inventarios', agenda: 'Crear en Agenda', agendaService: 'Servicio de Agenda',
  chooseHint: 'Usa tu catálogo o crea una sesión directamente aquí.',
  agendaHint: 'Para consultas, demos o sesiones individuales. Puedes vincular Inventarios después y conservar tus reservas.',
  linkHint: 'Al vincular Inventarios se conservan el nombre, la configuración y las reservas anteriores de este servicio.',
  nameRequired: 'Escribe un nombre para el servicio antes de continuar.',
  chargePolicy: 'Condición de cobro', noCharge: 'Sin cobro', toBeAgreed: 'Precio por acordar',
  chargeHint: 'Esta condición se muestra al reservar. Los precios comerciales y los cobros se gestionan en Ventas.',
};
const fr: ServiceTermsCopy = {
  description: 'Choisissez un service de l’inventaire ou créez-en un dans l’agenda, puis préparez ses réservations.',
  inventoryService: 'Service de l’inventaire', source: 'Origine du service', inventory: 'Choisir dans l’inventaire', agenda: 'Créer dans l’agenda', agendaService: 'Service de l’agenda',
  chooseHint: 'Utilisez votre catalogue ou créez une séance directement ici.',
  agendaHint: 'Pour les consultations, démonstrations ou séances individuelles. Vous pourrez lier l’inventaire plus tard en conservant vos réservations.',
  linkHint: 'Le lien avec l’inventaire conserve le nom, la configuration et les réservations existantes de ce service.',
  nameRequired: 'Saisissez un nom de service pour continuer.',
  chargePolicy: 'Condition de paiement', noCharge: 'Sans frais', toBeAgreed: 'Prix à convenir',
  chargeHint: 'Cette condition apparaît lors de la réservation. Les prix commerciaux et les paiements sont gérés dans Ventes.',
};
const pt: ServiceTermsCopy = {
  description: 'Escolha um serviço do Estoque ou crie um na Agenda e prepare suas reservas.',
  inventoryService: 'Serviço do Estoque', source: 'Origem do serviço', inventory: 'Escolher do Estoque', agenda: 'Criar na Agenda', agendaService: 'Serviço da Agenda',
  chooseHint: 'Use seu catálogo ou crie uma sessão diretamente aqui.',
  agendaHint: 'Para consultas, demonstrações ou sessões individuais. Você pode vincular o Estoque depois e manter suas reservas.',
  linkHint: 'O vínculo com o Estoque mantém o nome, a configuração e as reservas anteriores deste serviço.',
  nameRequired: 'Informe um nome para o serviço antes de continuar.',
  chargePolicy: 'Condição de cobrança', noCharge: 'Sem cobrança', toBeAgreed: 'Preço a combinar',
  chargeHint: 'Esta condição aparece na reserva. Os preços comerciais e pagamentos são gerenciados em Vendas.',
};
const ko: ServiceTermsCopy = {
  description: '재고에서 서비스를 선택하거나 일정에서 새로 만든 후 예약을 설정하세요.',
  inventoryService: '재고 서비스', source: '서비스 출처', inventory: '재고에서 선택', agenda: '일정에서 만들기', agendaService: '일정 서비스',
  chooseHint: '카탈로그를 사용하거나 여기에서 직접 세션을 만드세요.',
  agendaHint: '상담, 데모 또는 개별 세션에 사용합니다. 나중에 재고를 연결해도 기존 예약은 유지됩니다.',
  linkHint: '재고를 연결해도 서비스 이름, 예약 설정 및 기존 예약은 유지됩니다.',
  nameRequired: '계속하려면 서비스 이름을 입력하세요.',
  chargePolicy: '요금 조건', noCharge: '무료', toBeAgreed: '가격 협의',
  chargeHint: '예약 시 이 조건이 표시됩니다. 판매 가격 및 결제는 영업에서 관리합니다.',
};
const zh: ServiceTermsCopy = {
  description: '从库存选择服务或在日程中创建服务，然后设置预约。',
  inventoryService: '库存服务', source: '服务来源', inventory: '从库存选择', agenda: '在日程中创建', agendaService: '日程服务',
  chooseHint: '使用您的目录，或直接在此创建会话。',
  agendaHint: '适用于咨询、演示或单独会话。日后关联库存时可保留已有预约。',
  linkHint: '关联库存将保留此服务的名称、预约设置和已有预约。',
  nameRequired: '请输入服务名称以继续。',
  chargePolicy: '收费条件', noCharge: '免费', toBeAgreed: '价格待协商',
  chargeHint: '预约时会显示此条件。商业价格和收款在销售模块中管理。',
};
const copies: Record<string, ServiceTermsCopy> = { 'en-CA':en, 'en-US':en, 'es-MX':es, 'es-CO':es, 'fr-CA':fr, 'pt-BR':pt, 'ko-CA':ko, 'zh-CA':zh };
export const getServiceTermsCopy = (locale: string): ServiceTermsCopy => copies[locale] ?? en;
export const serviceChargeLabel = (policy: ServiceChargePolicy | undefined, locale: string) => {
  const copy = getServiceTermsCopy(locale);
  return policy === 'NO_CHARGE' ? copy.noCharge : copy.toBeAgreed;
};
