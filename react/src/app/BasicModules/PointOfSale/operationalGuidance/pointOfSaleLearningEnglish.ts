import type { EnglishLearningOverview } from '../../../learningMode/englishOverview';
import type { pointOfSaleLearningLabels } from './pointOfSaleLearningControls';

export const pointOfSaleLearningEnglish = {
  "sale": {
    label: "Sales terminal",
    objective: "Complete the sale with the correct items and payment.",
    instructions: "Check items, quantities and payment details before confirming the transaction.",
    whenToUse: "When a customer is ready to pay.",
    example: "The cashier checks quantities before confirming the sale.",
  },
  "cajas": {
    label: "Registers",
    objective: "Assign registers and responsible operators before trading.",
    instructions: "Review the register configuration and responsible people before opening a shift.",
    whenToUse: "Before starting a sales shift or setting up a new register.",
    example: "A separate register identifies which operator and shift handled a transaction.",
  },
  "kiosks": {
    label: "Point of sale kiosks",
    objective: "Connect each kiosk to its intended operation.",
    instructions: "Review the kiosk configuration, assigned register and access status before making it available.",
    whenToUse: "When preparing a kiosk or changing where it operates.",
    example: "A kiosk is linked to the correct register so its activity can be reviewed in the right place.",
  },
  "clientes": {
    label: "Customers",
    objective: "Keep the customer identity and contact information consistent.",
    instructions: "Search existing customers before adding a record, and verify contact and invoicing details when required.",
    whenToUse: "Before associating a sale with a customer or updating their details.",
    example: "Finding an existing customer keeps their purchase history together.",
  },
  "cortes": {
    label: "Cash closings",
    objective: "Compare expected and declared amounts for each shift.",
    instructions: "Choose the register and shift, review payments and declared amounts, then investigate differences before confirming the close.",
    whenToUse: "At shift end or when reviewing a cash discrepancy.",
    example: "A difference is checked against payment methods and transactions before it is attributed to the operator.",
  },
  "kpis": {
    label: "Point of sale KPIs",
    objective: "Use sales and closing evidence to identify operational changes.",
    instructions: "Select the period and operating scope, review the indicators and inspect supporting sales or closings.",
    whenToUse: "During a sales review or after closing shifts.",
    example: "A change in sales is compared across equivalent periods before staffing decisions are made.",
  },
} satisfies Record<keyof typeof pointOfSaleLearningLabels, EnglishLearningOverview>;
