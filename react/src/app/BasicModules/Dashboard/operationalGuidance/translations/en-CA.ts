export const enCA = {
  eyebrow: 'Learning mode',
  title: 'Company setup guide',
  subtitle: 'Use this space to configure the operating base that keeps the rest of Índice aligned.',
  focusLabel: 'Current focus',
  actionsLabel: 'Recommended actions',
  tabsLabel: 'Configuration areas',
  tabs: {
    profile: {
      label: 'Profile',
      title: 'Keep your business identity clear',
      summary: 'Complete your personal and company-facing profile so the workspace starts from reliable contact and identity data.',
      value: 'A clear profile reduces confusion when teams share responsibility, notifications, and operating decisions.',
      steps: [
        {
          title: 'Confirm personal data',
          description: 'Keep name, phone, language, and photo current so collaborators can identify accountable owners quickly.',
        },
        {
          title: 'Review access preferences',
          description: 'A clean profile makes every later configuration easier to audit and support.',
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
          title: 'Confirm Hedwig Edher as main headquarters',
          description: 'Use the principal location as the operational anchor for the company structure.',
        },
        {
          title: 'Keep units and businesses intentional',
          description: 'Only create operating areas that help reporting, responsibility, or daily control.',
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
          title: 'Answer with operational reality',
          description: 'Accurate answers create better recommendations than idealized answers.',
        },
        {
          title: 'Review improvement signals',
          description: 'Use the diagnosis to decide what the company should professionalize next.',
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
          title: 'Evaluate execution routines',
          description: 'Identify where follow-up, prioritization, or communication can become more consistent.',
        },
        {
          title: 'Turn insights into routines',
          description: 'Use the results to build small habits that improve daily operating control.',
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
          title: 'Invite the right owners',
          description: 'Start with the people responsible for company setup, HR, finance, operations, and analytics.',
        },
        {
          title: 'Assign modules by responsibility',
          description: 'Avoid giving broad access when a focused workspace creates better control.',
        },
      ],
    },
  },
} as const;
