export const enCA = {
  eyebrow: 'Learning mode',
  title: 'Sales operating guide',
  subtitle: 'Connect opportunities, quotes, commercial closure, inventory readiness, finance validation, and after-sales execution.',
  controlLabel: 'Commercial control',
  functionsLabel: 'Recommended workflow',
  guideProgressLabel: 'Guide progress',
  guideProgressCompleteLabel: 'reviewed',
  previousStepLabel: 'Previous recommendation',
  nextStepLabel: 'Next recommendation',
  stepIndicatorLabel: 'Show recommendation',
  collapseLabel: 'Collapse guide',
  expandLabel: 'Expand guide',
  tabs: {
    leads: {
      label: 'Leads',
      ctaLabel: 'Review opportunities',
      title: 'Build a disciplined opportunity pipeline',
      summary: 'Use Leads to capture demand, qualify interest, assign ownership, and define the next commercial action.',
      value: 'A clean pipeline keeps follow-up visible and prevents revenue from depending on memory.',
      steps: [
        {
          title: 'Qualify before quoting',
          description: 'Confirm need, budget, timing, and decision context before moving work into a quote.',
        },
        {
          title: 'Assign a responsible seller',
          description: 'Every active opportunity should have one owner and one next action with a due date.',
        },
        {
          title: 'Keep stages honest',
          description: 'Move opportunities only when the customer has actually advanced in the buying process.',
        },
      ],
    },
    contacts: {
      label: 'Contacts',
      ctaLabel: 'Review contacts',
      title: 'Turn relationships into commercial control',
      summary: 'Use Contacts as the relationship base for customers, prospects, owners, and follow-up context.',
      value: 'Reliable contact data makes quotes, sales handoff, and customer follow-up easier for the whole team.',
      steps: [
        {
          title: 'Complete the relationship profile',
          description: 'Keep company, contact role, phone, email, fiscal context, and owner visible.',
        },
        {
          title: 'Separate people from opportunities',
          description: 'Create the contact first, then connect opportunities and quotes to the right relationship.',
        },
        {
          title: 'Avoid blank ownership',
          description: 'Unassigned contacts create missed follow-ups and unclear responsibility.',
        },
      ],
    },
    quotes: {
      label: 'Quotes',
      ctaLabel: 'Review quotes',
      title: 'Quote with margin and readiness',
      summary: 'Use Quotes to prepare the commercial document, validate products, protect margin, and control validity.',
      value: 'A quote should be ready to send, financially understandable, and easy to convert when the customer accepts.',
      steps: [
        {
          title: 'Check readiness before sending',
          description: 'Review customer, items, taxes, validity, product data, and margin before sharing the quote.',
        },
        {
          title: 'Watch margin risk',
          description: 'Low margin or missing cost should be resolved before the quote becomes a sale.',
        },
        {
          title: 'Keep expiration visible',
          description: 'Expired and soon-to-expire quotes need follow-up before the pipeline becomes stale.',
        },
      ],
    },
    sales: {
      label: 'Sales',
      ctaLabel: 'Review closed sales',
      title: 'Convert accepted quotes into execution',
      summary: 'Use Sales to register won business and prepare the handoff to finance, inventory, commissions, and after-sales.',
      value: 'A won quote is not the end. The sale record tells the company what must be validated and executed next.',
      steps: [
        {
          title: 'Start from an accepted quote',
          description: 'Sales should normally inherit customer, seller, products, totals, and context from the accepted quote.',
        },
        {
          title: 'Validate payment evidence',
          description: 'Finance can move faster when payment method, reference, and evidence status are clear.',
        },
        {
          title: 'Prepare the inventory handoff',
          description: 'Sales tracks readiness, while inventory remains responsible for stock execution and movement approval.',
        },
      ],
    },
    products: {
      label: 'Products',
      ctaLabel: 'Review products',
      title: 'Keep the sellable catalogue clean',
      summary: 'Use Products to maintain commercial availability, pricing context, category, media, and readiness.',
      value: 'Product clarity protects quotes, prevents wrong promises, and supports inventory and POS alignment later.',
      steps: [
        {
          title: 'Keep visibility explicit',
          description: 'Mark whether a product is internal, commercial, POS ready, or quote only.',
        },
        {
          title: 'Review cost before quoting',
          description: 'Missing or outdated cost makes margin and sale decisions less reliable.',
        },
        {
          title: 'Use consistent categories',
          description: 'Clean categories make catalog filtering and commercial reporting easier.',
        },
      ],
    },
    inventory: {
      label: 'Inventory',
      ctaLabel: 'Review inventory',
      title: 'Protect stock execution',
      summary: 'Use Inventory to track stock, warehouses, movements, transfers, adjustments, and operational traceability.',
      value: 'Inventory owns stock. Sales only prepares the commercial handoff and reads movement readiness.',
      steps: [
        {
          title: 'Separate sale from stock movement',
          description: 'A closed sale prepares the need; inventory validates availability and executes stock changes.',
        },
        {
          title: 'Use movement status deliberately',
          description: 'Draft, in transit, received, completed, and cancelled states should explain what happened operationally.',
        },
        {
          title: 'Keep warehouse context visible',
          description: 'Warehouse and location clarity prevents confusion when teams fulfil customer commitments.',
        },
      ],
    },
    contracts: {
      label: 'Contracts',
      ctaLabel: 'Review contracts',
      title: 'Formalize commercial commitments',
      summary: 'Use Contracts to control signed commitments, renewal dates, terms, responsibility, and execution context.',
      value: 'Contracts turn commercial promises into a traceable operating agreement.',
      steps: [
        {
          title: 'Connect contract to the sale',
          description: 'Keep quote, customer, seller, dates, and scope connected so delivery has context.',
        },
        {
          title: 'Track renewal and expiry',
          description: 'Visible dates help the team act before revenue or service continuity is at risk.',
        },
      ],
    },
    'after-sales': {
      label: 'After-sales',
      ctaLabel: 'Review after-sales',
      title: 'Close the customer loop',
      summary: 'Use After-sales to follow delivery, issues, satisfaction, service actions, and post-sale commitments.',
      value: 'Good post-sale control turns delivery into retention instead of loose follow-up.',
      steps: [
        {
          title: 'Confirm what must happen after closing',
          description: 'Capture delivery, onboarding, service, and customer follow-up responsibilities.',
        },
        {
          title: 'Keep issues traceable',
          description: 'Operational problems should have owner, status, and next action until resolved.',
        },
      ],
    },
    kpis: {
      label: 'KPIs',
      ctaLabel: 'Review KPIs',
      title: 'Turn commercial activity into decisions',
      summary: 'Use KPIs to read pipeline health, quotes, sales, margin, inventory handoff, and follow-up discipline.',
      value: 'Metrics help leaders decide where attention is needed before sales problems become cash or delivery problems.',
      steps: [
        {
          title: 'Read conversion and margin together',
          description: 'High sales volume without margin can create operational pressure without healthy growth.',
        },
        {
          title: 'Watch pending validations',
          description: 'Finance, inventory, and commission bottlenecks show where execution is slowing down.',
        },
      ],
    },
  },
} as const;
