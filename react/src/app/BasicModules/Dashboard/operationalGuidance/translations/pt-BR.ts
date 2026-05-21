export const ptBR = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guia de configuração empresarial',
  subtitle: 'Use este espaço para configurar a base operacional que mantém o restante do Índice alinhado.',
  controlLabel: 'Controle da empresa',
  functionsLabel: 'Funções da aba',
  tabsLabel: 'Áreas de configuração',
  previousStepLabel: 'Recomendação anterior',
  nextStepLabel: 'Próxima recomendação',
  stepIndicatorLabel: 'Mostrar recomendação',
  tabs: {
    profile: {
      label: 'Perfil',
      title: 'Mantenha clara a identidade do negócio',
      summary: 'Complete seu perfil pessoal e operacional para que o workspace parta de dados confiáveis.',
      value: 'Um perfil claro reduz confusão quando a equipe compartilha responsabilidades, notificações e decisões.',
      steps: [
        {
          title: 'Dados pessoais e preferências',
          description: 'Gerencie nome, telefone, idioma, foto e preferências para manter o responsável identificável.',
        },
        {
          title: 'Segurança da conta',
          description: 'Atualize credenciais e dados de acesso para manter um workspace confiável.',
        },
      ],
    },
    'business-structure': {
      label: 'Estrutura empresarial',
      title: 'Mapeie como a empresa realmente opera',
      summary: 'Defina unidades, negócios, locais e sede principal para que todos os módulos leiam o mesmo mapa operacional.',
      value: 'Quando a estrutura está clara, presença, despesas, usuários e KPIs se conectam à parte correta da operação.',
      steps: [
        {
          title: 'Unidades, negócios e sede',
          description: 'Organize áreas de operação e mantenha Hedwig Edher como referência principal da estrutura.',
        },
        {
          title: 'Localização operacional',
          description: 'Defina endereços e coordenadas para que presença, quiosques e relatórios usem os locais corretos.',
        },
      ],
    },
    'business-profile': {
      label: 'Maturidade empresarial',
      title: 'Diagnostique a maturidade operacional',
      summary: 'Use o perfil empresarial para entender onde a empresa está forte e onde precisa de foco operacional.',
      value: 'A avaliação ajuda o Índice a recomendar melhores prioridades antes de adicionar mais ferramentas, pessoas ou processos.',
      steps: [
        {
          title: 'Diagnóstico por pilares',
          description: 'Avalie pessoas, processos, produtos e finanças para entender a maturidade real da empresa.',
        },
        {
          title: 'Relatório de maturidade',
          description: 'Consulte sinais, riscos e recomendações para priorizar a próxima melhoria operacional.',
        },
      ],
    },
    'personal-performance': {
      label: 'Desempenho pessoal',
      title: 'Fortaleça hábitos de execução',
      summary: 'Revise hábitos operacionais pessoais que influenciam acompanhamento, disciplina e qualidade de decisão.',
      value: 'Melhores hábitos de liderança ajudam a sustentar rotinas, fechar lacunas e manter o trabalho visível.',
      steps: [
        {
          title: 'Avaliação de hábitos',
          description: 'Revise liderança, disciplina, comunicação e acompanhamento para entender seu estilo de execução.',
        },
        {
          title: 'Leitura de desempenho',
          description: 'Transforme resultados pessoais em sinais para melhorar decisões, foco e controle diário.',
        },
      ],
    },
    users: {
      label: 'Usuários',
      title: 'Controle acessos antes de escalar',
      summary: 'Convide usuários, atribua módulos e mantenha permissões alinhadas à responsabilidade de cada pessoa.',
      value: 'Um bom controle de acesso protege informações e ajuda cada colaborador a focar nas ferramentas certas.',
      steps: [
        {
          title: 'Convites e funções',
          description: 'Adicione usuários, defina funções e conecte cada pessoa à sua responsabilidade operacional.',
        },
        {
          title: 'Permissões por módulo',
          description: 'Selecione as ferramentas que cada usuário pode acessar para manter controle e rastreabilidade.',
        },
      ],
    },
  },
} as const;
