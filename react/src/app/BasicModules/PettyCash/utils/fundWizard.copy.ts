export type FundWizardStep = 'type' | 'details' | 'identity' | 'operation' | 'review';

type FundWizardCopy = {
  steps: Record<FundWizardStep, { label: string; description: string }>;
  progress: (step: number, total: number) => string;
  back: string;
  next: string;
  saving: string;
  loading: string;
  required: (label: string) => string;
  invalidAmount: string;
  invalidDay: string;
  invalidEmail: string;
  initialBalance: string;
  creationNote: string;
  pending: string;
  discardWarning: string;
  keepEditing: string;
  discard: string;
  typeChangeTitle: string;
  typeChangeNote: string;
  effectiveDate: string;
  reason: string;
  reasonPlaceholder: string;
  reasonError: string;
  scheduled: (type: string, date: string) => string;
  cancelChange: string;
};

const es: FundWizardCopy = {
  steps: {
    type: { label: 'Tipo de fondo', description: 'Define de quién es el dinero para configurar su tratamiento contable.' },
    details: { label: 'Configuración', description: 'Define el límite, la moneda y quién será responsable de operar el fondo.' },
    identity: { label: 'Propietario', description: 'Identifica al dueño del dinero y al destinatario de su estado de cuenta.' },
    operation: { label: 'Operación', description: 'Elige dónde se guarda el dinero, de dónde llega y cómo se puede usar.' },
    review: { label: 'Revisión', description: 'Revisa la configuración completa antes de crear el fondo.' },
  },
  progress: (step, total) => `Paso ${step} de ${total}`,
  back: 'Atrás', next: 'Continuar', saving: 'Guardando…', loading: 'Cargando responsables y catálogos…',
  required: label => `Completa o selecciona: ${label.replace(/\s*\*$/, '')}.`,
  invalidAmount: 'Ingresa un límite válido mayor que cero.',
  invalidDay: 'El día de corte debe ser un número entero entre 1 y 31.',
  invalidEmail: 'Ingresa un correo válido para el destinatario del estado de cuenta.',
  initialBalance: 'Saldo inicial',
  creationNote: 'El fondo se crea con saldo cero. Después podrás agregar saldo; elegir las cuentas aquí no transfiere dinero.',
  pending: 'Sin asignar', discardWarning: 'Tienes cambios sin guardar. ¿Quieres descartarlos y cerrar?',
  keepEditing: 'Seguir editando', discard: 'Descartar y cerrar',
  typeChangeTitle: 'Cambio de tipo', typeChangeNote: 'El saldo continúa. Las operaciones anteriores conservan su tratamiento y las nuevas usan el tipo elegido.',
  effectiveDate: 'Fecha efectiva', reason: 'Motivo del cambio', reasonPlaceholder: 'Explica por qué cambia el tratamiento del fondo',
  reasonError: 'Escribe un motivo de al menos 8 caracteres.', scheduled: (type, date) => `Cambio programado a ${type} para el ${date}.`, cancelChange: 'Cancelar cambio programado',
};

const en: FundWizardCopy = {
  steps: {
    type: { label: 'Fund type', description: 'Identify who owns the money to determine its accounting treatment.' },
    details: { label: 'Configuration', description: 'Set the limit, currency and person responsible for operating the fund.' },
    identity: { label: 'Owner', description: 'Identify the owner of the money and the statement recipient.' },
    operation: { label: 'Operation', description: 'Choose where the money is held, its source and how it can be used.' },
    review: { label: 'Review', description: 'Review the complete configuration before creating the fund.' },
  },
  progress: (step, total) => `Step ${step} of ${total}`,
  back: 'Back', next: 'Continue', saving: 'Saving…', loading: 'Loading responsible people and reference data…',
  required: label => `Complete or select: ${label.replace(/\s*\*$/, '')}.`,
  invalidAmount: 'Enter a valid limit greater than zero.', invalidDay: 'The cutoff day must be a whole number from 1 to 31.',
  invalidEmail: 'Enter a valid email address for the statement recipient.', initialBalance: 'Opening balance',
  creationNote: 'The fund starts with a zero balance. You can add funds afterwards; choosing accounts here does not transfer money.',
  pending: 'Unassigned', discardWarning: 'You have unsaved changes. Discard them and close?',
  keepEditing: 'Keep editing', discard: 'Discard and close',
  typeChangeTitle: 'Fund type change', typeChangeNote: 'The balance continues. Earlier activity keeps its treatment and new activity uses the selected type.',
  effectiveDate: 'Effective date', reason: 'Reason for change', reasonPlaceholder: 'Explain why the fund treatment is changing',
  reasonError: 'Enter a reason of at least 8 characters.', scheduled: (type, date) => `Change to ${type} scheduled for ${date}.`, cancelChange: 'Cancel scheduled change',
};

const fr: FundWizardCopy = {
  steps: {
    type: { label: 'Type de fonds', description: 'Définissez à qui appartient l’argent pour déterminer son traitement comptable.' },
    details: { label: 'Configuration', description: 'Définissez la limite, la devise et la personne responsable du fonds.' },
    identity: { label: 'Propriétaire', description: 'Identifiez le propriétaire de l’argent et le destinataire du relevé.' },
    operation: { label: 'Fonctionnement', description: 'Choisissez où l’argent est conservé, sa provenance et ses usages autorisés.' },
    review: { label: 'Vérification', description: 'Vérifiez toute la configuration avant de créer le fonds.' },
  },
  progress: (step, total) => `Étape ${step} sur ${total}`,
  back: 'Retour', next: 'Continuer', saving: 'Enregistrement…', loading: 'Chargement des responsables et des références…',
  required: label => `Complétez ou sélectionnez : ${label.replace(/\s*\*$/, '')}.`,
  invalidAmount: 'Saisissez une limite valide supérieure à zéro.', invalidDay: 'Le jour de clôture doit être un entier de 1 à 31.',
  invalidEmail: 'Saisissez une adresse courriel valide pour le destinataire du relevé.', initialBalance: 'Solde initial',
  creationNote: 'Le fonds est créé avec un solde nul. Vous pourrez ensuite l’alimenter ; choisir les comptes ici ne transfère pas d’argent.',
  pending: 'Non attribué', discardWarning: 'Des modifications ne sont pas enregistrées. Les abandonner et fermer ?',
  keepEditing: 'Continuer la saisie', discard: 'Abandonner et fermer',
  typeChangeTitle: 'Changement de type', typeChangeNote: 'Le solde continue. Les opérations antérieures gardent leur traitement et les nouvelles utilisent le type choisi.',
  effectiveDate: 'Date d’effet', reason: 'Motif du changement', reasonPlaceholder: 'Expliquez pourquoi le traitement du fonds change',
  reasonError: 'Saisissez un motif d’au moins 8 caractères.', scheduled: (type, date) => `Changement vers ${type} prévu le ${date}.`, cancelChange: 'Annuler le changement prévu',
};

const pt: FundWizardCopy = {
  steps: {
    type: { label: 'Tipo de fundo', description: 'Defina a quem pertence o dinheiro para determinar seu tratamento contábil.' },
    details: { label: 'Configuração', description: 'Defina o limite, a moeda e o responsável pela operação do fundo.' },
    identity: { label: 'Proprietário', description: 'Identifique o proprietário do dinheiro e o destinatário do extrato.' },
    operation: { label: 'Operação', description: 'Escolha onde o dinheiro fica, de onde vem e como pode ser usado.' },
    review: { label: 'Revisão', description: 'Revise toda a configuração antes de criar o fundo.' },
  },
  progress: (step, total) => `Etapa ${step} de ${total}`,
  back: 'Voltar', next: 'Continuar', saving: 'Salvando…', loading: 'Carregando responsáveis e cadastros…',
  required: label => `Preencha ou selecione: ${label.replace(/\s*\*$/, '')}.`,
  invalidAmount: 'Informe um limite válido maior que zero.', invalidDay: 'O dia de fechamento deve ser um número inteiro entre 1 e 31.',
  invalidEmail: 'Informe um e-mail válido para o destinatário do extrato.', initialBalance: 'Saldo inicial',
  creationNote: 'O fundo é criado com saldo zero. Você poderá adicionar saldo depois; escolher as contas aqui não transfere dinheiro.',
  pending: 'Não atribuído', discardWarning: 'Há alterações não salvas. Deseja descartá-las e fechar?',
  keepEditing: 'Continuar editando', discard: 'Descartar e fechar',
  typeChangeTitle: 'Mudança de tipo', typeChangeNote: 'O saldo continua. As operações anteriores mantêm seu tratamento e as novas usam o tipo escolhido.',
  effectiveDate: 'Data efetiva', reason: 'Motivo da mudança', reasonPlaceholder: 'Explique por que o tratamento do fundo está mudando',
  reasonError: 'Informe um motivo com pelo menos 8 caracteres.', scheduled: (type, date) => `Mudança para ${type} agendada para ${date}.`, cancelChange: 'Cancelar mudança agendada',
};

const ko: FundWizardCopy = {
  steps: {
    type: { label: '자금 유형', description: '자금 소유자를 선택하여 회계 처리 방식을 정하세요.' },
    details: { label: '설정', description: '한도, 통화 및 자금 운영 담당자를 지정하세요.' },
    identity: { label: '소유자', description: '자금 소유자와 명세서 수신자를 지정하세요.' },
    operation: { label: '운영', description: '보관 계좌, 자금 출처 및 사용 방법을 선택하세요.' },
    review: { label: '검토', description: '자금을 만들기 전에 전체 설정을 확인하세요.' },
  },
  progress: (step, total) => `${total}단계 중 ${step}단계`,
  back: '이전', next: '계속', saving: '저장 중…', loading: '담당자 및 참조 데이터를 불러오는 중…',
  required: label => `입력하거나 선택하세요: ${label.replace(/\s*\*$/, '')}.`,
  invalidAmount: '0보다 큰 유효한 한도를 입력하세요.', invalidDay: '마감일은 1~31 사이의 정수여야 합니다.',
  invalidEmail: '명세서 수신자의 유효한 이메일 주소를 입력하세요.', initialBalance: '초기 잔액',
  creationNote: '자금은 잔액 0으로 생성됩니다. 나중에 잔액을 추가할 수 있으며, 여기서 계좌를 선택해도 돈이 이체되지 않습니다.',
  pending: '미지정', discardWarning: '저장하지 않은 변경 사항이 있습니다. 삭제하고 닫을까요?',
  keepEditing: '계속 편집', discard: '변경 사항 삭제 후 닫기',
  typeChangeTitle: '자금 유형 변경', typeChangeNote: '잔액은 이어집니다. 이전 거래는 기존 처리를 유지하고 새 거래는 선택한 유형을 사용합니다.',
  effectiveDate: '적용일', reason: '변경 사유', reasonPlaceholder: '자금 처리 방식이 변경되는 이유를 입력하세요',
  reasonError: '8자 이상의 사유를 입력하세요.', scheduled: (type, date) => `${date}에 ${type}(으)로 변경됩니다.`, cancelChange: '예약 변경 취소',
};

const zh: FundWizardCopy = {
  steps: {
    type: { label: '资金类型', description: '确定资金归属，以设置会计处理方式。' },
    details: { label: '设置', description: '设置额度、币种及资金运营负责人。' },
    identity: { label: '所有者', description: '确认资金所有者及对账单接收人。' },
    operation: { label: '运营', description: '选择资金存放账户、来源及允许的使用方式。' },
    review: { label: '核对', description: '创建资金前，请核对完整设置。' },
  },
  progress: (step, total) => `第 ${step} 步，共 ${total} 步`,
  back: '上一步', next: '继续', saving: '正在保存…', loading: '正在加载负责人及参考资料…',
  required: label => `请填写或选择：${label.replace(/\s*\*$/, '')}。`,
  invalidAmount: '请输入大于零的有效额度。', invalidDay: '结算日必须是 1 至 31 之间的整数。',
  invalidEmail: '请输入有效的对账单接收邮箱。', initialBalance: '初始余额',
  creationNote: '资金创建时余额为零。您可以稍后补充余额；在此选择账户不会进行转账。',
  pending: '未分配', discardWarning: '有尚未保存的更改。是否放弃并关闭？',
  keepEditing: '继续编辑', discard: '放弃并关闭',
  typeChangeTitle: '资金类型变更', typeChangeNote: '余额将延续。此前交易保留原处理方式，新交易采用所选类型。',
  effectiveDate: '生效日期', reason: '变更原因', reasonPlaceholder: '说明资金处理方式变更的原因',
  reasonError: '请输入至少 8 个字符的原因。', scheduled: (type, date) => `已安排在 ${date} 变更为${type}。`, cancelChange: '取消已安排的变更',
};

export function getFundWizardCopy(locale: string): FundWizardCopy {
  return ({ es, en, fr, pt, ko, zh } as Record<string, FundWizardCopy>)[locale.split('-')[0]] ?? en;
}
