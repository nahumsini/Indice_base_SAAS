import type { BusinessProfileTranslations } from "./types";

export const ptBR = {
  title: "Diagnóstico empresarial",
  description:
    "Ajude-nos a conhecer melhor sua empresa e o estágio de gestão para personalizar o Índice.",
  centerTitle: "Centro de diagnóstico empresarial",
  centerDescription:
    "Descubra o estado de gestão da sua empresa através de 4 pilares: Pessoas, Processos, Produtos e Finanças. Com as respostas, usaremos o Índice de Maturidade Empresarial (IME), que nos ajudará a personalizar recomendações, módulos e melhores parceiros por trás do Índice.",
  questionCount: "10 perguntas cada",
  questionCountLabel: "O diagnóstico contém",
  progress: "Progresso do diagnóstico empresarial",
  progressOf: "concluído",
  onboarding: {
    answeredProgress: "Você respondeu {answered} de {total} perguntas",
    encouragementMid: "Você está avançando muito bem",
    encouragementNear: "Quase pronto",
    sections: {
      people: {
        title: "Passo 1 — Sua equipe",
        intro: "Vamos entender como sua equipe trabalha",
        done: "Concluído — entendemos sua equipe",
      },
      processes: {
        title: "Passo 2 — Como você opera",
        intro: "Vamos entender como funciona sua operação diária",
        done: "Concluído — entendemos como você opera",
      },
      products: {
        title: "Passo 3 — O que você vende",
        intro: "Vamos entender sua oferta e como ela chega ao mercado",
        done: "Concluído — entendemos o que você vende",
      },
      finance: {
        title: "Passo 4 — Suas finanças",
        intro: "Vamos entender como você controla seus números",
        done: "Concluído — entendemos suas finanças",
      },
    },
  },
  printDiagnosis: "Baixar PDF",
  start: "Começar",
  continue: "Continuar",
  doAgain: "Fazer novamente",
  reviewAnswers: "Revisar respostas",
  close: "Fechar",
  question: "Pergunta",
  of: "de",
  completed: "concluídas",
  previous: "Anterior",
  next: "Próximo",
  finish: "Finalizar",
  restart: "Reiniciar diagnóstico",
  restartDialog: {
    cancel: "Cancelar",
    confirm: "Reiniciar teste",
    description: "Preservaremos seu resultado anterior e iniciaremos uma nova versão.",
    title: "Reiniciar diagnóstico?",
  },
  result: {
    title: 'Resultado da sua empresa',
    subtitle: 'Uma leitura prática para decidir o que melhorar primeiro.',
    maturity: 'Maturidade',
    confidence: 'Confiança',
    priority: 'Prioridade',
    quickWin: 'Ganho rápido',
    mainRisk: 'Risco principal',
    recommendedPlan: 'Plano recomendado',
  },
  actions: {
    save: "Salvar",
    saving: "Salvando...",
    discard: "Descartar",
  },
  scoreSummary: {
    title: "Pontuação do diagnóstico",
    bmi: "IME",
    level: "Nível",
    answered: "Respondidas",
    score: "Pontuação",
  },
  messages: {
    loading: "Carregando diagnóstico empresarial...",
    loadError: "Não foi possível carregar o diagnóstico empresarial.",
    saveSuccess: "O diagnóstico empresarial foi salvo.",
    saveError: "Não foi possível salvar o diagnóstico empresarial.",
    unsavedChanges:
      "Você tem alterações não salvas no diagnóstico empresarial.",
  },
  pillars: {
    people: {
      title: "Pessoas",
      description: "Analisa talentos, estrutura de equipe e comunicação.",
    },
    processes: {
      title: "Processos",
      description: "Avalia fluxos, tarefas, escalabilidade e eficiência.",
    },
    products: {
      title: "Produtos",
      description: "Analisa oferta, mercado, comercial e proposta de valor.",
    },
    finance: {
      title: "Finanças",
      description: "Avalia controle financeiro, gestão e tomada de decisões.",
    },
  },
  questions: {
    people: [
      {
        question: "Qual é o seu papel principal?",
        options: ["Fundador/CEO", "Operações", "Finanças", "Comercial/Outro"],
      },
      {
        question: "Quantas pessoas trabalham?",
        options: ["Só eu", "2 a 5", "6 a 20", "21 ou mais"],
      },
      {
        question: "Como sua equipe está organizada?",
        options: [
          "Sem estrutura",
          "Papéis básicos",
          "Áreas definidas",
          "Organograma formal",
        ],
      },
      {
        question: "Como atribuem tarefas?",
        options: [
          "Improvisado",
          "Listas",
          "Atribuição estruturada",
          "Sistema de gestão",
        ],
      },
      {
        question: "Revisão de desempenho?",
        options: ["Nunca", "Por problemas", "Semanal", "Com KPIs"],
      },
      {
        question: "Delegação?",
        options: [
          "Faço tudo",
          "Delego e supervisiono",
          "Delego com controle",
          "Equipe autônoma",
        ],
      },
      {
        question: "Comunicação interna?",
        options: ["Informal", "Chat", "Reuniões", "Ferramentas formais"],
      },
      {
        question: "Frequência de reuniões?",
        options: ["Nunca", "Esporádico", "Semanal", "Frequente"],
      },
      {
        question: "Clareza de responsabilidades?",
        options: [
          "Nada clara",
          "Um pouco clara",
          "Bastante clara",
          "Totalmente clara",
        ],
      },
      {
        question: "Facilidade de integração?",
        options: ["Muito difícil", "Difícil", "Moderado", "Fácil"],
      },
    ],
    processes: [
      {
        question: "Processos documentados?",
        options: ["Nada", "Alguns", "Maioria", "Totalmente"],
      },
      {
        question: "Gestão de tarefas?",
        options: ["Improvisado", "Listas", "Ferramentas", "Sistema formal"],
      },
      {
        question: "Monitoramento de progresso?",
        options: ["Não monitorado", "Ocasional", "Relatórios", "KPIs"],
      },
      {
        question: "Automação?",
        options: [
          "Manual",
          "Ferramentas isoladas",
          "Automação parcial",
          "Alta automação",
        ],
      },
      {
        question: "Replicabilidade?",
        options: ["Muito difícil", "Com esforço", "Possível", "Fácil"],
      },
      {
        question: "Onde se perde tempo?",
        options: ["Manual", "Coordenação", "Informação", "Acompanhamento"],
      },
      {
        question: "Dependência de pessoas?",
        options: ["Total", "Bastante", "Alguma", "Pouca"],
      },
      {
        question: "Clareza de processos?",
        options: [
          "Nada claros",
          "Um pouco claros",
          "Bastante claros",
          "Totalmente claros",
        ],
      },
      {
        question: "Gestão de erros?",
        options: ["Reação", "Informal", "Revisão", "Melhoria contínua"],
      },
      {
        question: "Escalabilidade?",
        options: ["Nula", "Baixa", "Média", "Alta"],
      },
    ],
    products: [
      {
        question: "O que você vende?",
        options: ["Serviços", "Produtos", "Digital", "Misto"],
      },
      {
        question: "Tipo de cliente?",
        options: ["B2C", "B2B", "Governo", "Misto"],
      },
      {
        question: "Receita principal?",
        options: ["Venda direta", "Serviços", "Assinatura", "Contratos"],
      },
      {
        question: "Diversificação?",
        options: ["Um", "Alguns", "Várias linhas", "Amplo"],
      },
      {
        question: "Definição de preços?",
        options: ["Intuição", "Concorrência", "Custos", "Estratégia"],
      },
      {
        question: "Acompanhamento de desempenho?",
        options: [
          "Não medido",
          "Só vendas",
          "Vendas+rentabilidade",
          "Indicadores",
        ],
      },
      {
        question: "Proposta de valor?",
        options: [
          "Não clara",
          "Um pouco clara",
          "Bastante clara",
          "Muito clara",
        ],
      },
      {
        question: "Feedback do cliente?",
        options: ["Nenhum", "Informal", "Pesquisas", "Análise"],
      },
      {
        question: "Evolução do produto?",
        options: ["Na hora", "Mudanças ocasionais", "Planos", "Roteiro"],
      },
      {
        question: "Prioridade comercial?",
        options: ["Clientes", "Vendas atuais", "Rentabilidade", "Escalar"],
      },
    ],
    finance: [
      {
        question: "Controle financeiro?",
        options: ["Não estruturado", "Excel", "Software", "Sistema integrado"],
      },
      {
        question: "Revisão de números?",
        options: ["Nunca", "Mensal", "Semanal", "Diário"],
      },
      {
        question: "Fluxo de caixa?",
        options: ["Não controlado", "Reação", "Revisão", "Projeção"],
      },
      {
        question: "Custos claros?",
        options: [
          "Não claros",
          "Aproximados",
          "Bastante claros",
          "Controle total",
        ],
      },
      {
        question: "Margem?",
        options: ["Não sei", "Estimado", "Claro", "Totalmente medido"],
      },
      {
        question: "Decisões financeiras?",
        options: ["Intuição", "Experiência", "Dados", "Modelos"],
      },
      {
        question: "Renda previsível?",
        options: ["Muito variável", "Variável", "Estável", "Muito estável"],
      },
      {
        question: "Gestão de dívidas?",
        options: ["Sem controle", "Básico", "Estratégia", "Otimizado"],
      },
      {
        question: "Preparação para crises?",
        options: ["Nula", "Baixa", "Média", "Alta"],
      },
      {
        question: "Conformidade fiscal?",
        options: ["Sem controle", "Atrasos", "Em dia", "Estratégia fiscal"],
      },
    ],
  },
} as const satisfies BusinessProfileTranslations;
