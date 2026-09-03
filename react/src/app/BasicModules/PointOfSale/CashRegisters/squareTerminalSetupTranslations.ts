import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import { resolvePointOfSaleLocale, type PointOfSaleLocale } from '../translations';

export type SquareTerminalSetupCopy = {
  trigger: string;
  modal: {
    close: string;
    eyebrow: string;
    providerTitle: string;
    providerSubtitle: string;
    squareTitle: string;
    squareSubtitle: string;
    cancel: string;
    back: string;
    continue: string;
    progress: string;
    stepSummary: (current: number, total: number, label: string) => string;
  };
  steps: {
    provider: string;
    connect: string;
    location: string;
    terminal: string;
  };
  providers: {
    title: string;
    description: string;
    squareName: string;
    available: string;
    configureSquare: string;
    squareDescription: string;
    mercadoPagoName: string;
    comingSoon: string;
    mercadoPagoDescription: string;
  };
  connect: {
    title: string;
    description: string;
    environment: string;
    connected: string;
    connectedHelp: string;
    unavailable: string;
    unavailableHelp: string;
    pending: string;
    pendingHelp: string;
    action: string;
    refresh: string;
  };
  location: {
    title: string;
    description: string;
    label: string;
    empty: string;
    action: string;
    linked: string;
    available: (count: number) => string;
  };
  terminal: {
    title: string;
    description: string;
    generate: string;
    pairingCode: string;
    pairBy: (date: string) => string;
    terminalLabel: string;
    terminalEmpty: string;
    registerLabel: string;
    registerEmpty: string;
    assign: string;
    refresh: string;
    unassign: string;
    disable: string;
    terminals: (count: number) => string;
    assignedTo: (registerId: number) => string;
    notAssigned: string;
    statuses: Record<'DISABLED' | 'PAIRED' | 'WAITING', string>;
    selectedSummary: (terminal: string, register: string) => string;
    confirmUnassign: string;
    confirmDisable: string;
    keep: string;
    confirm: string;
  };
  state: {
    loading: string;
    retryTitle: string;
    reviewStep: string;
  };
  feedback: {
    connectFirst: string;
    loadError: string;
    oauthError: string;
    locationLinked: string;
    locationError: string;
    pairingCreated: string;
    pairingRefreshed: string;
    pairingError: string;
    pairingRefreshError: string;
    assigned: string;
    assignError: string;
    unassigned: string;
    unassignError: string;
    disabled: string;
    disableError: string;
  };
};

const enCA: SquareTerminalSetupCopy = {
  trigger: 'Configure payment terminal',
  modal: {
    close: 'Close payment terminal setup',
    eyebrow: 'POS payment providers',
    providerTitle: 'Configure payment terminal',
    providerSubtitle: 'Choose the provider that will process in-person card payments.',
    squareTitle: 'Configure Square Terminal',
    squareSubtitle: 'Connect Square, link a location, and assign a paired device to a POS register.',
    cancel: 'Cancel',
    back: 'Back',
    continue: 'Continue',
    progress: 'Payment terminal setup progress',
    stepSummary: (current, total, label) => `Step ${current} of ${total} · ${label}`,
  },
  steps: { provider: 'Provider', connect: 'Connection', location: 'Location', terminal: 'Terminal' },
  providers: {
    title: 'Choose a payment provider',
    description: 'Each provider keeps its own secure connection and terminal configuration.',
    squareName: 'Square',
    available: 'Available',
    configureSquare: 'Configure Square',
    squareDescription: 'Use the existing Square flow to connect the merchant, link a location, pair a device, and assign it to a register.',
    mercadoPagoName: 'Mercado Pago',
    comingSoon: 'Coming soon',
    mercadoPagoDescription: 'Reserved for the future Mercado Pago terminal integration. No connection or backend action is enabled yet.',
  },
  connect: {
    title: 'Connect the Square account',
    description: 'Authorize Indice to manage Square device credentials and in-person payments for this company.',
    environment: 'Environment',
    connected: 'Square connected',
    connectedHelp: 'The merchant connection is ready and its locations can be consulted.',
    unavailable: 'Square is disabled',
    unavailableHelp: 'Enable the Square integration in the deployment configuration before connecting an account.',
    pending: 'Connection required',
    pendingHelp: 'Connect Square, then return to this setup to continue with the merchant locations.',
    action: 'Connect Square',
    refresh: 'Refresh status',
  },
  location: {
    title: 'Link a Square location',
    description: 'Choose the Square location that owns the physical terminal and link it to this Indice company.',
    label: 'Square location',
    empty: 'No Square locations are available for this merchant.',
    action: 'Link location',
    linked: 'Location linked and ready for terminal pairing.',
    available: (count) => `${count} location${count === 1 ? '' : 's'} available`,
  },
  terminal: {
    title: 'Pair and assign the terminal',
    description: 'Generate the device code, complete pairing on the Square Terminal, then assign the paired device to an active register.',
    generate: 'Generate pairing code',
    pairingCode: 'Pairing code',
    pairBy: (date) => `Complete pairing before ${date}`,
    terminalLabel: 'Square terminal',
    terminalEmpty: 'No terminals have been created yet.',
    registerLabel: 'POS register',
    registerEmpty: 'No active registers are available.',
    assign: 'Assign to register',
    refresh: 'Refresh terminals',
    unassign: 'Unassign',
    disable: 'Disable',
    terminals: (count) => `${count} terminal${count === 1 ? '' : 's'}`,
    assignedTo: (registerId) => `Assigned to register ${registerId}`,
    notAssigned: 'Not assigned',
    statuses: { DISABLED: 'Disabled', PAIRED: 'Paired', WAITING: 'Waiting for pairing' },
    selectedSummary: (terminal, register) => `${terminal} → ${register}`,
    confirmUnassign: 'This terminal will stop processing payments for the selected register. Continue?',
    confirmDisable: 'This terminal will be disabled and cannot process new payments. Continue?',
    keep: 'Keep current setup',
    confirm: 'Confirm action',
  },
  state: { loading: 'Loading Square setup…', retryTitle: 'Square setup could not be loaded', reviewStep: 'Review this step' },
  feedback: {
    connectFirst: 'Connect Square before linking a location.',
    loadError: 'Square Terminal status could not be loaded.',
    oauthError: 'Square authorization could not be started.',
    locationLinked: 'Square location linked.',
    locationError: 'Square location could not be linked.',
    pairingCreated: 'Enter this code on the Square Terminal device.',
    pairingRefreshed: 'Enter this refreshed code on the Square Terminal device.',
    pairingError: 'Square terminal pairing could not be created.',
    pairingRefreshError: 'Square terminal pairing code could not be refreshed.',
    assigned: 'Square terminal assigned to register.',
    assignError: 'Square terminal could not be assigned.',
    unassigned: 'Square terminal unassigned from register.',
    unassignError: 'Square terminal could not be unassigned.',
    disabled: 'Square terminal disabled.',
    disableError: 'Square terminal could not be disabled.',
  },
};

const esMX: SquareTerminalSetupCopy = {
  trigger: 'Configurar terminal bancaria',
  modal: {
    close: 'Cerrar configuración de terminal bancaria',
    eyebrow: 'Proveedores de pago POS',
    providerTitle: 'Configurar terminal bancaria',
    providerSubtitle: 'Elige el proveedor que procesará los pagos presenciales con tarjeta.',
    squareTitle: 'Configurar Square Terminal',
    squareSubtitle: 'Conecta Square, vincula una ubicación y asigna un dispositivo emparejado a una caja POS.',
    cancel: 'Cancelar',
    back: 'Atrás',
    continue: 'Continuar',
    progress: 'Progreso de configuración de terminal bancaria',
    stepSummary: (current, total, label) => `Paso ${current} de ${total} · ${label}`,
  },
  steps: { provider: 'Proveedor', connect: 'Conexión', location: 'Ubicación', terminal: 'Terminal' },
  providers: {
    title: 'Elige un proveedor de pago',
    description: 'Cada proveedor conserva su propia conexión segura y configuración de terminales.',
    squareName: 'Square',
    available: 'Disponible',
    configureSquare: 'Configurar Square',
    squareDescription: 'Usa el flujo actual de Square para conectar al comercio, vincular una ubicación, emparejar el dispositivo y asignarlo a una caja.',
    mercadoPagoName: 'Mercado Pago',
    comingSoon: 'Próximamente',
    mercadoPagoDescription: 'Espacio reservado para la futura integración de terminales Mercado Pago. Todavía no habilita conexión ni acciones de backend.',
  },
  connect: {
    title: 'Conecta la cuenta de Square',
    description: 'Autoriza a Indice para administrar las credenciales del dispositivo y los pagos presenciales de esta empresa.',
    environment: 'Entorno',
    connected: 'Square conectado',
    connectedHelp: 'La conexión del comercio está lista y ya se pueden consultar sus ubicaciones.',
    unavailable: 'Square está deshabilitado',
    unavailableHelp: 'Habilita la integración de Square en la configuración del despliegue antes de conectar una cuenta.',
    pending: 'Conexión requerida',
    pendingHelp: 'Conecta Square y después vuelve a esta configuración para continuar con las ubicaciones del comercio.',
    action: 'Conectar Square',
    refresh: 'Actualizar estado',
  },
  location: {
    title: 'Vincula una ubicación de Square',
    description: 'Elige la ubicación de Square que administra la terminal física y vincúlala con esta empresa en Indice.',
    label: 'Ubicación de Square',
    empty: 'Este comercio no tiene ubicaciones de Square disponibles.',
    action: 'Vincular ubicación',
    linked: 'Ubicación vinculada y lista para emparejar terminales.',
    available: (count) => `${count} ubicación${count === 1 ? '' : 'es'} disponible${count === 1 ? '' : 's'}`,
  },
  terminal: {
    title: 'Empareja y asigna la terminal',
    description: 'Genera el código, termina el emparejamiento en Square Terminal y asigna el dispositivo a una caja activa.',
    generate: 'Generar código de emparejamiento',
    pairingCode: 'Código de emparejamiento',
    pairBy: (date) => `Completa el emparejamiento antes de ${date}`,
    terminalLabel: 'Terminal Square',
    terminalEmpty: 'Todavía no se han creado terminales.',
    registerLabel: 'Caja POS',
    registerEmpty: 'No hay cajas activas disponibles.',
    assign: 'Asignar a caja',
    refresh: 'Actualizar terminales',
    unassign: 'Desvincular',
    disable: 'Deshabilitar',
    terminals: (count) => `${count} terminal${count === 1 ? '' : 'es'}`,
    assignedTo: (registerId) => `Asignada a la caja ${registerId}`,
    notAssigned: 'Sin asignar',
    statuses: { DISABLED: 'Deshabilitada', PAIRED: 'Emparejada', WAITING: 'Esperando emparejamiento' },
    selectedSummary: (terminal, register) => `${terminal} → ${register}`,
    confirmUnassign: 'La terminal dejará de procesar pagos para la caja seleccionada. ¿Deseas continuar?',
    confirmDisable: 'La terminal quedará deshabilitada y no podrá procesar pagos nuevos. ¿Deseas continuar?',
    keep: 'Conservar configuración',
    confirm: 'Confirmar acción',
  },
  state: { loading: 'Cargando configuración de Square…', retryTitle: 'No fue posible cargar la configuración de Square', reviewStep: 'Revisa este paso' },
  feedback: {
    connectFirst: 'Conecta Square antes de vincular una ubicación.',
    loadError: 'No fue posible cargar el estado de Square Terminal.',
    oauthError: 'No fue posible iniciar la autorización de Square.',
    locationLinked: 'Ubicación de Square vinculada.',
    locationError: 'No fue posible vincular la ubicación de Square.',
    pairingCreated: 'Ingresa este código en el dispositivo Square Terminal.',
    pairingRefreshed: 'Ingresa este código actualizado en el dispositivo Square Terminal.',
    pairingError: 'No fue posible crear el emparejamiento de Square Terminal.',
    pairingRefreshError: 'No fue posible actualizar el código de emparejamiento de Square Terminal.',
    assigned: 'Square Terminal asignada a la caja.',
    assignError: 'No fue posible asignar Square Terminal.',
    unassigned: 'Square Terminal desvinculada de la caja.',
    unassignError: 'No fue posible desvincular Square Terminal.',
    disabled: 'Square Terminal deshabilitada.',
    disableError: 'No fue posible deshabilitar Square Terminal.',
  },
};

const frCA: SquareTerminalSetupCopy = {
  ...enCA,
  trigger: 'Configurer le terminal de paiement',
  modal: { ...enCA.modal, close: 'Fermer la configuration du terminal', eyebrow: 'Fournisseurs de paiement PDV', providerTitle: 'Configurer le terminal de paiement', providerSubtitle: 'Choisissez le fournisseur qui traitera les paiements par carte en personne.', cancel: 'Annuler', back: 'Retour', continue: 'Continuer', progress: 'Progression de la configuration du terminal', stepSummary: (current, total, label) => `Étape ${current} sur ${total} · ${label}` },
  steps: { provider: 'Fournisseur', connect: 'Connexion', location: 'Emplacement', terminal: 'Terminal' },
  providers: { title: 'Choisissez un fournisseur de paiement', description: 'Chaque fournisseur conserve sa propre connexion sécurisée et sa configuration de terminaux.', squareName: 'Square', available: 'Disponible', configureSquare: 'Configurer Square', squareDescription: 'Utilisez le flux Square existant pour connecter le commerçant, lier un emplacement, jumeler l’appareil et l’affecter à une caisse.', mercadoPagoName: 'Mercado Pago', comingSoon: 'Bientôt disponible', mercadoPagoDescription: 'Réservé à la future intégration des terminaux Mercado Pago. Aucune connexion ni action serveur n’est encore activée.' },
  connect: { ...enCA.connect, title: 'Connectez le compte Square', description: 'Autorisez Indice à gérer les identifiants de l’appareil et les paiements en personne de cette entreprise.', environment: 'Environnement', connected: 'Square connecté', connectedHelp: 'La connexion du commerçant est prête et ses emplacements peuvent être consultés.', unavailable: 'Square est désactivé', unavailableHelp: 'Activez l’intégration Square dans la configuration du déploiement avant de connecter un compte.', pending: 'Connexion requise', pendingHelp: 'Connectez Square, puis revenez à cette configuration pour continuer.', action: 'Connecter Square', refresh: 'Actualiser l’état' },
  location: { ...enCA.location, title: 'Liez un emplacement Square', description: 'Choisissez l’emplacement Square qui possède le terminal physique et liez-le à cette entreprise.', label: 'Emplacement Square', empty: 'Aucun emplacement Square n’est disponible pour ce commerçant.', action: 'Lier l’emplacement', linked: 'Emplacement lié et prêt pour le jumelage.', available: (count) => `${count} emplacement${count === 1 ? '' : 's'} disponible${count === 1 ? '' : 's'}` },
  terminal: { ...enCA.terminal, title: 'Jumelez et affectez le terminal', description: 'Générez le code, terminez le jumelage sur le terminal Square, puis affectez l’appareil à une caisse active.', generate: 'Générer le code de jumelage', pairingCode: 'Code de jumelage', pairBy: (date) => `Terminez le jumelage avant ${date}`, terminalLabel: 'Terminal Square', terminalEmpty: 'Aucun terminal n’a encore été créé.', registerLabel: 'Caisse PDV', registerEmpty: 'Aucune caisse active n’est disponible.', assign: 'Affecter à la caisse', refresh: 'Actualiser les terminaux', unassign: 'Retirer', disable: 'Désactiver', terminals: (count) => `${count} terminal${count === 1 ? '' : 'aux'}`, assignedTo: (id) => `Affecté à la caisse ${id}`, notAssigned: 'Non affecté', statuses: { DISABLED: 'Désactivé', PAIRED: 'Jumelé', WAITING: 'En attente de jumelage' }, confirmUnassign: 'Le terminal cessera de traiter les paiements de la caisse sélectionnée. Continuer?', confirmDisable: 'Le terminal sera désactivé et ne pourra plus traiter de nouveaux paiements. Continuer?', keep: 'Conserver la configuration', confirm: 'Confirmer l’action' },
  state: { loading: 'Chargement de la configuration Square…', retryTitle: 'Impossible de charger la configuration Square', reviewStep: 'Vérifiez cette étape' },
  feedback: { ...enCA.feedback, connectFirst: 'Connectez Square avant de lier un emplacement.', loadError: 'Impossible de charger l’état de Square Terminal.', oauthError: 'Impossible de démarrer l’autorisation Square.', locationLinked: 'Emplacement Square lié.', locationError: 'Impossible de lier l’emplacement Square.', pairingCreated: 'Saisissez ce code sur le terminal Square.', pairingRefreshed: 'Saisissez ce code actualisé sur le terminal Square.', pairingError: 'Impossible de créer le jumelage du terminal Square.', pairingRefreshError: 'Impossible d’actualiser le code de jumelage.', assigned: 'Terminal Square affecté à la caisse.', assignError: 'Impossible d’affecter le terminal Square.', unassigned: 'Terminal Square retiré de la caisse.', unassignError: 'Impossible de retirer le terminal Square.', disabled: 'Terminal Square désactivé.', disableError: 'Impossible de désactiver le terminal Square.' },
};

const ptBR: SquareTerminalSetupCopy = {
  ...enCA,
  trigger: 'Configurar terminal de pagamento',
  modal: { ...enCA.modal, close: 'Fechar configuração do terminal', eyebrow: 'Provedores de pagamento PDV', providerTitle: 'Configurar terminal de pagamento', providerSubtitle: 'Escolha o provedor que processará pagamentos presenciais com cartão.', cancel: 'Cancelar', back: 'Voltar', continue: 'Continuar', progress: 'Progresso da configuração do terminal', stepSummary: (current, total, label) => `Etapa ${current} de ${total} · ${label}` },
  steps: { provider: 'Provedor', connect: 'Conexão', location: 'Local', terminal: 'Terminal' },
  providers: { title: 'Escolha um provedor de pagamento', description: 'Cada provedor mantém sua própria conexão segura e configuração de terminais.', squareName: 'Square', available: 'Disponível', configureSquare: 'Configurar Square', squareDescription: 'Use o fluxo atual do Square para conectar o comerciante, vincular um local, emparelhar o dispositivo e atribuí-lo a um caixa.', mercadoPagoName: 'Mercado Pago', comingSoon: 'Em breve', mercadoPagoDescription: 'Reservado para a futura integração de terminais Mercado Pago. Ainda não habilita conexão nem ações de backend.' },
  connect: { ...enCA.connect, title: 'Conecte a conta Square', description: 'Autorize o Indice a gerenciar as credenciais do dispositivo e os pagamentos presenciais desta empresa.', environment: 'Ambiente', connected: 'Square conectado', connectedHelp: 'A conexão do comerciante está pronta e seus locais podem ser consultados.', unavailable: 'Square está desabilitado', unavailableHelp: 'Habilite a integração do Square na configuração de implantação antes de conectar uma conta.', pending: 'Conexão necessária', pendingHelp: 'Conecte o Square e volte a esta configuração para continuar.', action: 'Conectar Square', refresh: 'Atualizar status' },
  location: { ...enCA.location, title: 'Vincule um local do Square', description: 'Escolha o local do Square responsável pelo terminal físico e vincule-o a esta empresa.', label: 'Local do Square', empty: 'Não há locais do Square disponíveis para este comerciante.', action: 'Vincular local', linked: 'Local vinculado e pronto para emparelhamento.', available: (count) => `${count} loca${count === 1 ? 'l' : 'is'} disponíve${count === 1 ? 'l' : 'is'}` },
  terminal: { ...enCA.terminal, title: 'Emparelhe e atribua o terminal', description: 'Gere o código, conclua o emparelhamento no Square Terminal e atribua o dispositivo a um caixa ativo.', generate: 'Gerar código de emparelhamento', pairingCode: 'Código de emparelhamento', pairBy: (date) => `Conclua o emparelhamento antes de ${date}`, terminalLabel: 'Terminal Square', terminalEmpty: 'Nenhum terminal foi criado ainda.', registerLabel: 'Caixa PDV', registerEmpty: 'Não há caixas ativos disponíveis.', assign: 'Atribuir ao caixa', refresh: 'Atualizar terminais', unassign: 'Desvincular', disable: 'Desabilitar', terminals: (count) => `${count} termina${count === 1 ? 'l' : 'is'}`, assignedTo: (id) => `Atribuído ao caixa ${id}`, notAssigned: 'Não atribuído', statuses: { DISABLED: 'Desabilitado', PAIRED: 'Emparelhado', WAITING: 'Aguardando emparelhamento' }, confirmUnassign: 'O terminal deixará de processar pagamentos para o caixa selecionado. Continuar?', confirmDisable: 'O terminal será desabilitado e não poderá processar novos pagamentos. Continuar?', keep: 'Manter configuração', confirm: 'Confirmar ação' },
  state: { loading: 'Carregando configuração do Square…', retryTitle: 'Não foi possível carregar a configuração do Square', reviewStep: 'Revise esta etapa' },
  feedback: { ...enCA.feedback, connectFirst: 'Conecte o Square antes de vincular um local.', loadError: 'Não foi possível carregar o status do Square Terminal.', oauthError: 'Não foi possível iniciar a autorização do Square.', locationLinked: 'Local do Square vinculado.', locationError: 'Não foi possível vincular o local do Square.', pairingCreated: 'Digite este código no dispositivo Square Terminal.', pairingRefreshed: 'Digite este código atualizado no Square Terminal.', pairingError: 'Não foi possível criar o emparelhamento.', pairingRefreshError: 'Não foi possível atualizar o código de emparelhamento.', assigned: 'Square Terminal atribuído ao caixa.', assignError: 'Não foi possível atribuir o Square Terminal.', unassigned: 'Square Terminal desvinculado do caixa.', unassignError: 'Não foi possível desvincular o Square Terminal.', disabled: 'Square Terminal desabilitado.', disableError: 'Não foi possível desabilitar o Square Terminal.' },
};

const koCA: SquareTerminalSetupCopy = {
  ...enCA,
  trigger: '결제 단말기 설정',
  modal: { ...enCA.modal, close: '결제 단말기 설정 닫기', eyebrow: 'POS 결제 제공업체', providerTitle: '결제 단말기 설정', providerSubtitle: '대면 카드 결제를 처리할 제공업체를 선택하세요.', cancel: '취소', back: '뒤로', continue: '계속', progress: '결제 단말기 설정 진행률', stepSummary: (current, total, label) => `${total}단계 중 ${current}단계 · ${label}` },
  steps: { provider: '제공업체', connect: '연결', location: '위치', terminal: '단말기' },
  providers: { title: '결제 제공업체 선택', description: '각 제공업체는 별도의 보안 연결과 단말기 설정을 유지합니다.', squareName: 'Square', available: '사용 가능', configureSquare: 'Square 설정', squareDescription: '기존 Square 흐름으로 판매자를 연결하고 위치 및 기기를 페어링한 뒤 계산대에 배정합니다.', mercadoPagoName: 'Mercado Pago', comingSoon: '출시 예정', mercadoPagoDescription: '향후 Mercado Pago 단말기 연동을 위한 자리입니다. 아직 연결 또는 백엔드 작업은 활성화되지 않았습니다.' },
  connect: { ...enCA.connect, title: 'Square 계정 연결', description: 'Indice가 이 회사의 기기 자격 증명과 대면 결제를 관리하도록 승인하세요.', environment: '환경', connected: 'Square 연결됨', connectedHelp: '판매자 연결이 준비되어 위치를 조회할 수 있습니다.', unavailable: 'Square 비활성화됨', unavailableHelp: '계정을 연결하기 전에 배포 설정에서 Square 연동을 활성화하세요.', pending: '연결 필요', pendingHelp: 'Square를 연결한 다음 이 설정으로 돌아와 계속하세요.', action: 'Square 연결', refresh: '상태 새로고침' },
  location: { ...enCA.location, title: 'Square 위치 연결', description: '실제 단말기를 소유한 Square 위치를 선택하여 이 회사에 연결하세요.', label: 'Square 위치', empty: '이 판매자에게 사용 가능한 Square 위치가 없습니다.', action: '위치 연결', linked: '위치가 연결되어 단말기 페어링 준비가 완료되었습니다.', available: (count) => `${count}개 위치 사용 가능` },
  terminal: { ...enCA.terminal, title: '단말기 페어링 및 배정', description: '기기 코드를 생성하고 Square Terminal에서 페어링을 완료한 뒤 활성 계산대에 배정하세요.', generate: '페어링 코드 생성', pairingCode: '페어링 코드', pairBy: (date) => `${date} 전에 페어링을 완료하세요`, terminalLabel: 'Square 단말기', terminalEmpty: '아직 생성된 단말기가 없습니다.', registerLabel: 'POS 계산대', registerEmpty: '사용 가능한 활성 계산대가 없습니다.', assign: '계산대에 배정', refresh: '단말기 새로고침', unassign: '배정 해제', disable: '비활성화', terminals: (count) => `단말기 ${count}개`, assignedTo: (id) => `계산대 ${id}에 배정됨`, notAssigned: '미배정', statuses: { DISABLED: '비활성화', PAIRED: '페어링됨', WAITING: '페어링 대기 중' }, confirmUnassign: '선택한 계산대에서 이 단말기로 더 이상 결제를 처리하지 않습니다. 계속할까요?', confirmDisable: '이 단말기가 비활성화되어 새 결제를 처리할 수 없습니다. 계속할까요?', keep: '현재 설정 유지', confirm: '작업 확인' },
  state: { loading: 'Square 설정을 불러오는 중…', retryTitle: 'Square 설정을 불러올 수 없습니다', reviewStep: '이 단계를 확인하세요' },
  feedback: { ...enCA.feedback, connectFirst: '위치를 연결하기 전에 Square를 연결하세요.', loadError: 'Square Terminal 상태를 불러올 수 없습니다.', oauthError: 'Square 인증을 시작할 수 없습니다.', locationLinked: 'Square 위치가 연결되었습니다.', locationError: 'Square 위치를 연결할 수 없습니다.', pairingCreated: 'Square Terminal 기기에 이 코드를 입력하세요.', pairingRefreshed: 'Square Terminal 기기에 새 코드를 입력하세요.', pairingError: 'Square Terminal 페어링을 만들 수 없습니다.', pairingRefreshError: '페어링 코드를 새로고침할 수 없습니다.', assigned: 'Square Terminal이 계산대에 배정되었습니다.', assignError: 'Square Terminal을 배정할 수 없습니다.', unassigned: 'Square Terminal 배정이 해제되었습니다.', unassignError: 'Square Terminal 배정을 해제할 수 없습니다.', disabled: 'Square Terminal이 비활성화되었습니다.', disableError: 'Square Terminal을 비활성화할 수 없습니다.' },
};

const zhCA: SquareTerminalSetupCopy = {
  ...enCA,
  trigger: '配置支付终端',
  modal: { ...enCA.modal, close: '关闭支付终端配置', eyebrow: 'POS 支付服务商', providerTitle: '配置支付终端', providerSubtitle: '选择用于处理线下银行卡付款的服务商。', cancel: '取消', back: '返回', continue: '继续', progress: '支付终端配置进度', stepSummary: (current, total, label) => `第 ${current}/${total} 步 · ${label}` },
  steps: { provider: '服务商', connect: '连接', location: '地点', terminal: '终端' },
  providers: { title: '选择支付服务商', description: '每个服务商都有独立的安全连接和终端配置。', squareName: 'Square', available: '可用', configureSquare: '配置 Square', squareDescription: '使用现有 Square 流程连接商户、绑定地点、配对设备并分配到收银台。', mercadoPagoName: 'Mercado Pago', comingSoon: '即将推出', mercadoPagoDescription: '为未来的 Mercado Pago 终端集成预留。目前尚未启用连接或后端操作。' },
  connect: { ...enCA.connect, title: '连接 Square 账户', description: '授权 Indice 管理该公司的设备凭据和线下付款。', environment: '环境', connected: 'Square 已连接', connectedHelp: '商户连接已就绪，可以查询地点。', unavailable: 'Square 已停用', unavailableHelp: '连接账户前，请先在部署配置中启用 Square 集成。', pending: '需要连接', pendingHelp: '连接 Square 后返回此配置继续操作。', action: '连接 Square', refresh: '刷新状态' },
  location: { ...enCA.location, title: '绑定 Square 地点', description: '选择拥有实体终端的 Square 地点并将其绑定到此公司。', label: 'Square 地点', empty: '此商户没有可用的 Square 地点。', action: '绑定地点', linked: '地点已绑定，可以配对终端。', available: (count) => `${count} 个地点可用` },
  terminal: { ...enCA.terminal, title: '配对并分配终端', description: '生成设备代码，在 Square Terminal 上完成配对，然后将设备分配到启用的收银台。', generate: '生成配对码', pairingCode: '配对码', pairBy: (date) => `请在 ${date} 前完成配对`, terminalLabel: 'Square 终端', terminalEmpty: '尚未创建终端。', registerLabel: 'POS 收银台', registerEmpty: '没有可用的启用收银台。', assign: '分配到收银台', refresh: '刷新终端', unassign: '取消分配', disable: '停用', terminals: (count) => `${count} 个终端`, assignedTo: (id) => `已分配到收银台 ${id}`, notAssigned: '未分配', statuses: { DISABLED: '已停用', PAIRED: '已配对', WAITING: '等待配对' }, confirmUnassign: '此终端将停止处理所选收银台的付款。是否继续？', confirmDisable: '此终端将被停用，无法处理新付款。是否继续？', keep: '保留当前配置', confirm: '确认操作' },
  state: { loading: '正在加载 Square 配置…', retryTitle: '无法加载 Square 配置', reviewStep: '请检查此步骤' },
  feedback: { ...enCA.feedback, connectFirst: '请先连接 Square，再绑定地点。', loadError: '无法加载 Square Terminal 状态。', oauthError: '无法启动 Square 授权。', locationLinked: 'Square 地点已绑定。', locationError: '无法绑定 Square 地点。', pairingCreated: '请在 Square Terminal 设备上输入此代码。', pairingRefreshed: '请在 Square Terminal 设备上输入刷新后的代码。', pairingError: '无法创建 Square Terminal 配对。', pairingRefreshError: '无法刷新 Square Terminal 配对码。', assigned: 'Square Terminal 已分配到收银台。', assignError: '无法分配 Square Terminal。', unassigned: 'Square Terminal 已取消分配。', unassignError: '无法取消分配 Square Terminal。', disabled: 'Square Terminal 已停用。', disableError: '无法停用 Square Terminal。' },
};

const copyByLocale: Record<PointOfSaleLocale, SquareTerminalSetupCopy> = {
  'en-CA': enCA,
  'en-US': enCA,
  'es-MX': esMX,
  'es-CO': esMX,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function useSquareTerminalSetupCopy() {
  const { currentLanguage } = useLanguage();
  const locale = useMemo(() => resolvePointOfSaleLocale(currentLanguage.code), [currentLanguage.code]);
  const copy = useMemo(() => copyByLocale[locale], [locale]);
  return { copy, locale };
}
