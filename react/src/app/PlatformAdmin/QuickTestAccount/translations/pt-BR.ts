import type { QuickTestAccountCopy } from "./types";

export const ptBRQuickTestCopy: QuickTestAccountCopy = {
  modal: {
    eyebrow: "Configuração rápida",
    title: "Criar conta de teste",
    description: "Preencha o essencial e revise o acesso antes de criar.",
  },
  steps: { scenario: "Cenário", details: "Detalhes" },
  progress: {
    label: "Progresso da conta de teste",
    step: (current) => `Etapa ${new Intl.NumberFormat("pt-BR").format(current)} de 2 · configuração de demonstração`,
  },
  actions: {
    cancel: "Cancelar",
    previous: "Anterior",
    next: "Continuar",
    review: "Revisar acesso",
  },
  scenario: {
    title: "O que você quer testar?",
    description: "A Indice preparará os módulos, a capacidade e a duração de teste recomendados.",
    modules: (count) => `Módulos: ${new Intl.NumberFormat("pt-BR").format(count)}`,
    employees: (count) => `Colaboradores: ${new Intl.NumberFormat("pt-BR").format(count)}`,
    days: (count) => `Duração em dias: ${new Intl.NumberFormat("pt-BR").format(count)}`,
    options: {
      people: {
        label: "Pessoas e processos",
        description: "Recursos humanos, tarefas e indicadores para a operação interna.",
      },
      commerce: {
        label: "Vendas e estoque",
        description: "Fluxo comercial, estoque, despesas e contas a receber.",
      },
      complete: {
        label: "Operação completa",
        description: "Todos os módulos básicos disponíveis para um teste completo.",
      },
    },
  },
  details: {
    title: "Identifique a conta de teste",
    description: "Mantenha os dados gerados ou substitua-os.",
    companyName: "Nome da empresa",
    ownerName: "Nome do proprietário",
    ownerEmail: "E-mail de login",
    country: "País",
    employees: "Pessoas que usarão a Indice",
    trial: "Duração do teste",
    summary: "Configuração automática",
    scenario: "Cenário",
    access: "Acesso inicial",
    capacity: "Capacidade",
    notice: "Na próxima etapa, revise módulos, usuários e duração do teste antes de criar a conta.",
    companyPrefix: "Demonstração Indice",
    defaultOwnerName: "Usuário de teste",
  },
  errors: {
    duplicateEmail: "Esse e-mail já pertence a outra conta. Use outro.",
    noModules: "Não há módulos básicos disponíveis para este cenário.",
  },
};
