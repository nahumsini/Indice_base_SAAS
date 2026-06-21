export const loginCopy = {
  logoAlt: 'Indice logo',
  workspaceBadge: 'Operational clarity',
  accessBadge: 'Indice access',
  operatingSystemLabel: 'Business Operating System',
  frameworkLabel: 'Indice operating framework',
  title: 'Run your business with clarity.',
  subtitle:
    'Connect people, processes, products, and finance into one operational workspace designed for growing businesses.',
  pillars: [
    {
      icon: '01',
      title: 'People',
      description: 'Teams, responsibilities, and daily activity with clearer visibility.',
    },
    {
      icon: '02',
      title: 'Processes',
      description: 'Structured workflows to execute, follow up, and reduce operational noise.',
    },
    {
      icon: '03',
      title: 'Products',
      description: 'Catalogues, commercial operations, and inventory connected to the business.',
    },
    {
      icon: '04',
      title: 'Finance',
      description: 'Financial control and operating insight for better decisions.',
    },
  ],
  featureCards: [
    {
      title: 'Operational Visibility',
      description: 'Understand what is happening across your business.',
    },
    {
      title: 'Business Control',
      description: 'Centralize execution and reduce operational chaos.',
    },
    {
      title: 'Better Decisions',
      description: 'Turn daily activity into actionable insight.',
    },
  ],
  visualTitle: 'Structured growth',
  visualSubtitle:
    'Indice organizes operations into connected pillars so every team works with context and direction.',
  visualMetricValue: '4',
  visualMetricLabel: 'connected pillars',
  visualSignalLabel: 'Operating system',
  welcomeTitle: 'Access your workspace',
  welcomeText: 'Continue daily execution with visibility, control, and business context.',
  companyLabel: 'Company name',
  companyPlaceholder: 'Indice Demo',
  emailLabel: 'Email',
  emailPlaceholder: 'you@company.com',
  emailError: 'Enter a valid email address.',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  forgotPassword: 'Forgot password?',
  hidePassword: 'Hide password',
  showPassword: 'Show password',
  signIn: 'Sign in',
  signingIn: 'Signing in...',
  insideTitle: "What you'll access",
  insideItems: ['Operational visibility', 'Team activity', 'Financial control', 'Business performance'],
} as const;

export type DemoLoginCopy = typeof loginCopy;
