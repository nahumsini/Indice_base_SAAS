export const enCA = {
  eyebrow: 'Learning mode',
  title: 'Company setup guide',
  subtitle: 'Use this space to configure the operating base that keeps the rest of Índice aligned.',
  controlLabel: 'Company control',
  functionsLabel: 'Tab functions',
  previousStepLabel: 'Previous recommendation',
  nextStepLabel: 'Next recommendation',
  stepIndicatorLabel: 'Show recommendation',
  tabs: {
    profile: {
      label: 'Profile',
      title: 'Keep your business identity clear',
      summary: 'Complete your personal and company-facing profile so the workspace starts from reliable contact and identity data.',
      value: 'A clear profile reduces confusion when teams share responsibility, notifications, and operating decisions.',
      steps: [
        {
          title: 'Personal data and preferences',
          description: 'Manage name, phone, language, photo, and preferences so the accountable owner stays easy to identify.',
        },
        {
          title: 'Account security',
          description: 'Update credentials and access data to keep the workspace reliable.',
        },
      ],
    },
    'business-structure': {
      label: 'Company structure',
      title: 'Map how the company really operates',
      summary: 'Define units, businesses, locations, and the main headquarters so every module reads the same operating map.',
      value: 'When the structure is clear, attendance, expenses, users, and KPIs can connect to the right part of the operation.',
      steps: [
        {
          title: 'Units, businesses, and headquarters',
          description: 'Organize operating areas and keep Hedwig Edher as the main reference for the structure.',
        },
        {
          title: 'Operating location',
          description: 'Define addresses and coordinates so attendance, kiosks, and reports use the right locations.',
        },
      ],
    },
    'business-profile': {
      label: 'Business maturity',
      title: 'Diagnose operational maturity',
      summary: 'Use the business profile to understand where the company is strong and where it needs operational focus.',
      value: 'The assessment helps Índice guide better priorities before adding more tools, people, or processes.',
      steps: [
        {
          title: 'Pillar diagnosis',
          description: 'Evaluate people, processes, products, and finance to understand the company’s real maturity.',
        },
        {
          title: 'Maturity report',
          description: 'Review signals, risks, and recommendations to prioritize the next operational improvement.',
        },
      ],
    },
    'personal-performance': {
      label: 'Personal performance',
      title: 'Strengthen leadership execution habits',
      summary: 'Review personal operating habits that influence follow-up, discipline, and decision quality.',
      value: 'Better leadership habits help the company sustain routines, close gaps, and keep work visible.',
      steps: [
        {
          title: 'Habit assessment',
          description: 'Review leadership, discipline, communication, and follow-up to understand execution style.',
        },
        {
          title: 'Performance reading',
          description: 'Turn personal results into signals that improve decisions, focus, and daily control.',
        },
      ],
    },
    users: {
      label: 'Users',
      title: 'Control access before scaling work',
      summary: 'Invite users, assign modules, and keep permissions aligned with each person’s responsibility.',
      value: 'Good access control protects information and helps every collaborator focus only on the tools they need.',
      steps: [
        {
          title: 'Invitations and roles',
          description: 'Add users, define roles, and connect each person to their operating responsibility.',
        },
        {
          title: 'Module permissions',
          description: 'Select the tools each user can access to keep work controlled and traceable.',
        },
      ],
    },
  },
} as const;
