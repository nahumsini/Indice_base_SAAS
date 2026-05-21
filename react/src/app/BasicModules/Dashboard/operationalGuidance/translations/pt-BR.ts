export const ptBR = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guia de configuração empresarial',
  subtitle: 'Use este espaço para configurar a base operacional que mantém o restante do Índice alinhado.',
  focusLabel: 'Foco atual',
  actionsLabel: 'Ações recomendadas',
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
          title: 'Confirme seus dados pessoais',
          description: 'Mantenha nome, telefone, idioma e foto atualizados para identificar responsáveis rapidamente.',
        },
        {
          title: 'Revise preferências de acesso',
          description: 'Um perfil organizado facilita auditoria e suporte em configurações futuras.',
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
          title: 'Confirme Hedwig Edher como sede principal',
          description: 'Use a localização principal como âncora operacional para a estrutura da empresa.',
        },
        {
          title: 'Crie unidades com intenção',
          description: 'Adicione apenas áreas que ajudem relatórios, responsabilidade ou controle diário.',
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
          title: 'Responda com realidade operacional',
          description: 'Respostas honestas geram recomendações melhores do que respostas idealizadas.',
        },
        {
          title: 'Revise sinais de melhoria',
          description: 'Use o diagnóstico para decidir o que a empresa deve profissionalizar em seguida.',
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
          title: 'Avalie rotinas de execução',
          description: 'Identifique onde acompanhamento, priorização ou comunicação podem ficar mais consistentes.',
        },
        {
          title: 'Transforme sinais em rotinas',
          description: 'Use os resultados para criar pequenos hábitos que melhorem o controle diário.',
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
          title: 'Convide os responsáveis certos',
          description: 'Comece por quem lidera configuração, RH, finanças, operação e análise.',
        },
        {
          title: 'Atribua módulos por responsabilidade',
          description: 'Evite acessos amplos quando um workspace focado gera mais controle.',
        },
      ],
    },
  },
} as const;
