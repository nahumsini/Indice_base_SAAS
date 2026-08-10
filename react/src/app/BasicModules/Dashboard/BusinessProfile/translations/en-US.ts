import type { BusinessProfileTranslations } from "./types";
import { enCA } from './en-CA';

export const enUS = {
  title: "Business Diagnosis",
  description:
    "Help us better understand your company and management stage to personalize Indice.",
  centerTitle: "Business Diagnosis Center",
  centerDescription:
    "Discover your company's management status through 4 pillars: People, Processes, Products, and Finance. With your answers, we'll use the Business Maturity Index (BMI), which will help us personalize recommendations, modules, and best partners behind Indice.",
  questionCount: "10 questions each",
  questionCountLabel: "The diagnosis contains",
  progress: "Business diagnosis progress",
  progressOf: "completed",
  onboarding: {
    answeredProgress: "You've answered {answered} of {total} questions",
    encouragementMid: "You're making great progress",
    encouragementNear: "Almost done",
    sections: {
      people: {
        title: "Step 1 — Your team",
        intro: "Let's understand how your team works",
        done: "Done — we understand your team",
      },
      processes: {
        title: "Step 2 — How you operate",
        intro: "Let's understand how your daily operation works",
        done: "Done — we understand how you operate",
      },
      products: {
        title: "Step 3 — What you sell",
        intro: "Let's understand your offer and how it reaches the market",
        done: "Done — we understand what you sell",
      },
      finance: {
        title: "Step 4 — Your finances",
        intro: "Let's understand how you manage your numbers",
        done: "Done — we understand your finances",
      },
    },
  },
  printDiagnosis: "Download PDF",
  start: "Start",
  continue: "Continue",
  doAgain: "Do again",
  reviewAnswers: "Review answers",
  close: "Close",
  question: "Question",
  of: "of",
  completed: "completed",
  previous: "Previous",
  next: "Next",
  finish: "Finish",
  restart: "Restart diagnosis",
  restartDialog: {
    cancel: "Cancel",
    confirm: "Restart test",
    description: "We will preserve your previous result and begin a new version.",
    title: "Restart diagnosis?",
  },
  result: enCA.result,
  actions: {
    save: "Save",
    saving: "Saving...",
    discard: "Discard",
  },
  scoreSummary: {
    title: "Diagnosis score",
    bmi: "BMI",
    level: "Level",
    answered: "Answered",
    score: "Score",
  },
  messages: {
    loading: "Loading business diagnosis...",
    loadError: "We could not load the business diagnosis.",
    saveSuccess: "Business diagnosis saved.",
    saveError: "We could not save the business diagnosis.",
    unsavedChanges: "You have unsaved changes in the business diagnosis.",
  },
  pillars: {
    people: {
      title: "People",
      description: "Analyze talent, team structure, and communication.",
    },
    processes: {
      title: "Processes",
      description: "Evaluate flows, tasks, scalability, and efficiency.",
    },
    products: {
      title: "Products",
      description: "Analyze offering, market, sales, and value proposition.",
    },
    finance: {
      title: "Finance",
      description:
        "Evaluate financial control, management, and decision-making.",
    },
  },
  questions: {
    people: [
      {
        question: "What is your main role?",
        options: ["Founder/CEO", "Operations", "Finance", "Sales/Other"],
      },
      {
        question: "How many people work?",
        options: ["Just me", "2 to 5", "6 to 20", "21 or more"],
      },
      {
        question: "How is your team organized?",
        options: [
          "No structure",
          "Basic roles",
          "Defined areas",
          "Formal org chart",
        ],
      },
      {
        question: "How do you assign tasks?",
        options: [
          "Improvised",
          "Lists",
          "Structured assignment",
          "Management system",
        ],
      },
      {
        question: "Performance review?",
        options: ["Never", "For problems", "Weekly", "With KPIs"],
      },
      {
        question: "Delegation?",
        options: [
          "I do everything",
          "Delegate and supervise",
          "Delegate with control",
          "Autonomous team",
        ],
      },
      {
        question: "Internal communication?",
        options: ["Informal", "Chat", "Meetings", "Formal tools"],
      },
      {
        question: "Meeting frequency?",
        options: ["Never", "Sporadic", "Weekly", "Frequent"],
      },
      {
        question: "Clarity of responsibilities?",
        options: [
          "Not clear",
          "Somewhat clear",
          "Quite clear",
          "Totally clear",
        ],
      },
      {
        question: "Ease of integration?",
        options: ["Very difficult", "Difficult", "Moderate", "Easy"],
      },
    ],
    processes: [
      {
        question: "Documented processes?",
        options: ["Nothing", "Some", "Most", "Completely"],
      },
      {
        question: "Task management?",
        options: ["Improvised", "Lists", "Tools", "Formal system"],
      },
      {
        question: "Progress monitoring?",
        options: ["Not monitored", "Occasional", "Reports", "KPIs"],
      },
      {
        question: "Automation?",
        options: [
          "Manual",
          "Isolated tools",
          "Partial automation",
          "High automation",
        ],
      },
      {
        question: "Replicability?",
        options: ["Very difficult", "With effort", "Possible", "Easy"],
      },
      {
        question: "Where is time lost?",
        options: ["Manual work", "Coordination", "Information", "Follow-up"],
      },
      {
        question: "Dependence on people?",
        options: ["Total", "Quite a bit", "Some", "Little"],
      },
      {
        question: "Process clarity?",
        options: [
          "Not clear",
          "Somewhat clear",
          "Quite clear",
          "Totally clear",
        ],
      },
      {
        question: "Error management?",
        options: ["Reaction", "Informal", "Review", "Continuous improvement"],
      },
      { question: "Scalability?", options: ["None", "Low", "Medium", "High"] },
    ],
    products: [
      {
        question: "What do you sell?",
        options: ["Services", "Products", "Digital", "Mixed"],
      },
      {
        question: "Type of client?",
        options: ["B2C", "B2B", "Government", "Mixed"],
      },
      {
        question: "Main revenue?",
        options: ["Direct sale", "Services", "Subscription", "Contracts"],
      },
      {
        question: "Diversification?",
        options: ["One", "Some", "Several lines", "Broad"],
      },
      {
        question: "Price definition?",
        options: ["Intuition", "Competition", "Costs", "Strategy"],
      },
      {
        question: "Performance tracking?",
        options: [
          "Not measured",
          "Sales only",
          "Sales+profitability",
          "Indicators",
        ],
      },
      {
        question: "Value proposition?",
        options: ["Not clear", "Somewhat clear", "Quite clear", "Very clear"],
      },
      {
        question: "Customer feedback?",
        options: ["None", "Informal", "Surveys", "Analysis"],
      },
      {
        question: "Product evolution?",
        options: ["On the go", "Occasional changes", "Plans", "Roadmap"],
      },
      {
        question: "Commercial priority?",
        options: ["Clients", "Current sales", "Profitability", "Scale"],
      },
    ],
    finance: [
      {
        question: "Financial control?",
        options: ["Unstructured", "Excel", "Software", "Integrated system"],
      },
      {
        question: "Number review?",
        options: ["Never", "Monthly", "Weekly", "Daily"],
      },
      {
        question: "Cash flow?",
        options: ["Not controlled", "Reaction", "Review", "Projection"],
      },
      {
        question: "Clear costs?",
        options: ["Not clear", "Approximate", "Quite clear", "Total control"],
      },
      {
        question: "Margin?",
        options: ["Don't know", "Estimated", "Clear", "Fully measured"],
      },
      {
        question: "Financial decisions?",
        options: ["Intuition", "Experience", "Data", "Models"],
      },
      {
        question: "Predictable income?",
        options: ["Very variable", "Variable", "Stable", "Very stable"],
      },
      {
        question: "Debt management?",
        options: ["No control", "Basic", "Strategy", "Optimized"],
      },
      {
        question: "Crisis preparedness?",
        options: ["None", "Low", "Medium", "High"],
      },
      {
        question: "Tax compliance?",
        options: ["No control", "Delays", "Up to date", "Tax strategy"],
      },
    ],
  },
} as const satisfies BusinessProfileTranslations;
