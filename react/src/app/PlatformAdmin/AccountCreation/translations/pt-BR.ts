import type { AccountCreationCopy } from "./types";

export const ptBRCopy: AccountCreationCopy = {
  steps: { company: "Empresa", owner: "Proprietário", access: "Acessos" },
  modal: {
    eyebrow: "Criação direta pelo Root", title: "Criar uma conta Indice",
    description: "Configure empresa, proprietário e acesso em três etapas.",
    successTitle: "Conta pronta para entrega",
    successDescription: "Copie as credenciais e compartilhe por um canal seguro.",
  },
  actions: {
    cancel: "Cancelar", previous: "Voltar", next: "Próximo", validating: "Validando",
    create: "Criar e ativar", creating: "Criando conta…", signInAgain: "Entrar novamente",
    finish: "Concluir", manageAccount: "Gerenciar conta", generate: "Gerar",
    showPassword: "Mostrar senha", hidePassword: "Ocultar senha",
  },
  progress: {
    label: "Progresso da criação da conta",
    step: (current, total, modules) => `Etapa ${new Intl.NumberFormat("pt-BR").format(current)} de ${new Intl.NumberFormat("pt-BR").format(total)} · Módulos: ${new Intl.NumberFormat("pt-BR").format(modules)}`,
    ready: (companyId) => `Empresa nº ${companyId} · acesso pronto para entrega`,
  },
  company: {
    title: "Empresa", description: "Identidade comercial da nova conta.",
    name: "Nome da empresa", namePlaceholder: "Ex.: Grupo Horizonte", country: "País",
    accountType: "Tipo de conta", superAdmin: "Super Admin · cliente", distributor: "Distribuidor",
    industry: "Setor (opcional)", employees: "Número exato de colaboradores",
    employeesPlaceholder: "Ex.: 18",
    employeesHint: "Inclua o proprietário e todos que precisarão acessar a Indice.",
    unspecified: "Não especificado",
  },
  owner: {
    title: "Proprietário e acesso", description: "Credenciais iniciais do proprietário da empresa.",
    name: "Nome do proprietário (opcional)", namePlaceholder: "Nome e sobrenome",
    email: "Endereço de e-mail", emailPlaceholder: "proprietario@empresa.com", phone: "Telefone (opcional)",
    phonePlaceholder: "+55 11 99999 0000", password: "Senha temporária",
  },
  access: {
    title: "Plano e módulos", description: "Escolha apenas os acessos iniciais necessários.",
    modules: "Módulos disponíveis",
    baseGroup: "Pacote básico",
    baseGroupDescription: "O total de módulos básicos determina o pacote comercial.",
    addonGroup: "Módulos complementares",
    addonGroupDescription: "São cobrados individualmente ao fim do teste.",
    moduleFallback: "Acesso operacional ao módulo.",
    noModules: "Não há módulos básicos ativos. Revise Catálogo e módulos.", accessType: "Tipo de acesso",
    demo: "Demonstração com prazo limitado", permanent: "Cortesia permanente",
    capacityTitle: "Pacote e capacidade calculados",
    capacityDescription: "A Indice atende aos colaboradores informados com o pacote e as vagas adicionais necessárias.",
    package: "Pacote básico", requiredUsers: "Colaboradores necessários",
    packageName: (moduleCount) => moduleCount <= 0
      ? "Sem pacote"
      : moduleCount === 1
        ? "1 módulo"
        : moduleCount === 2
          ? "2 módulos"
          : moduleCount === 3
            ? "3 módulos"
            : "4 ou mais módulos",
    includedUsers: "Vagas incluídas", additionalUsers: "Usuários adicionais",
    duration: "Duração da demonstração", days: (days) => `${new Intl.NumberFormat("pt-BR").format(days)} dias`,
    noExpiration: "Sem data de vencimento",
  },
  context: { company: "Empresa", owner: "Proprietário", directAccount: "Criação direta" },
  notices: {
    restored: "Restauramos seu progresso e geramos uma nova senha temporária.",
    audit: "Isso cria uma empresa real e fica registrado na auditoria. Nenhuma cobrança Stripe é gerada.",
  },
  errors: {
    password: "A senha deve ter ao menos 10 caracteres e no máximo 72 bytes.",
    invalidPhone: "Informe um telefone válido para o país selecionado.",
    duplicateEmail: "Esse e-mail pertence a outra conta. Use outro para continuar.",
    selectModule: "Selecione ao menos um módulo para criar a conta.",
    createFailed: "Não foi possível criar a conta.",
    modulesNotApplied: "A conta foi criada, mas os módulos selecionados não foram confirmados. Abra Gerenciar conta para concluir o acesso.",
    sessionExpired: "Sua sessão Root expirou. O progresso foi mantido sem salvar a senha.",
  },
  success: {
    created: (companyId) => `Empresa nº ${companyId} · proprietário criado`,
    initialAccess: "Acesso inicial", oneTimePassword: "A senha é exibida apenas aqui.",
    copyAll: "Copiar dados", copiedAll: "Dados copiados", copy: "Copiar", copied: "Copiado",
    loginPage: "Página de login", company: "Empresa", email: "E-mail", password: "Senha temporária",
    loadedModules: "Módulos carregados", loadedModulesDescription: (count) => `Módulos confirmados na conta: ${new Intl.NumberFormat("pt-BR").format(count)}`,
    accessDataTitle: "Dados de acesso à Indice", securityReminder: "Por segurança, altere a senha após entrar.",
    securityShare: "Peça ao usuário para alterar a senha em Painel → Perfil → Segurança. A Indice não a enviará por e-mail nem a salvará na auditoria Root.",
  },
};
