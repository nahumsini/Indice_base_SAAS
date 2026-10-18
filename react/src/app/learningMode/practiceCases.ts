import { isLearningCharacterId, type LearningCharacterId } from './characters';

// Fixed fictional examples, not tenant records or exchange-rate conversions.
const caseFacts = {
  emily: { owner: 'Emily', company: 'Café Emily', worker: 'Ana', currency: 'CAD', expense: 20, price: 4, salesFirst: 1000, salesSecond: 1200 },
  juanito: { owner: 'Juanito', company: 'Supermercados Juanito', worker: 'Luis', currency: 'MXN', expense: 200, price: 40, salesFirst: 1000, salesSecond: 1200 },
  camila: { owner: 'Camila', company: 'Refacciones Camila', worker: 'Diego', currency: 'COP', expense: 200000, price: 40000, salesFirst: 1000000, salesSecond: 1200000 },
} as const;

const localizedFacts = {
  "es": {
    "emily": {
      "stores": "cafeterías",
      "role": "cajera",
      "purchase": "leche",
      "product": "café americano"
    },
    "juanito": {
      "stores": "supermercados",
      "role": "encargado de abarrotes",
      "purchase": "arroz",
      "product": "arroz de 1 kg"
    },
    "camila": {
      "stores": "refaccionarias",
      "role": "vendedor de refacciones",
      "purchase": "filtros de aceite",
      "product": "filtro de aceite"
    }
  },
  "en": {
    "emily": {
      "stores": "cafés",
      "role": "cashier",
      "purchase": "milk",
      "product": "Americano coffee"
    },
    "juanito": {
      "stores": "supermarkets",
      "role": "grocery manager",
      "purchase": "rice",
      "product": "1 kg rice bag"
    },
    "camila": {
      "stores": "auto parts stores",
      "role": "auto parts salesperson",
      "purchase": "oil filters",
      "product": "oil filter"
    }
  },
  "fr": {
    "emily": {
      "stores": "cafés",
      "role": "caissière",
      "purchase": "lait",
      "product": "café américain"
    },
    "juanito": {
      "stores": "supermarchés",
      "role": "responsable d’épicerie",
      "purchase": "riz",
      "product": "sac de riz de 1 kg"
    },
    "camila": {
      "stores": "magasins de pièces automobiles",
      "role": "vendeur de pièces automobiles",
      "purchase": "filtres à huile",
      "product": "filtre à huile"
    }
  },
  "pt": {
    "emily": {
      "stores": "cafeterias",
      "role": "caixa",
      "purchase": "leite",
      "product": "café americano"
    },
    "juanito": {
      "stores": "supermercados",
      "role": "encarregado de mercearia",
      "purchase": "arroz",
      "product": "arroz de 1 kg"
    },
    "camila": {
      "stores": "lojas de autopeças",
      "role": "vendedor de autopeças",
      "purchase": "filtros de óleo",
      "product": "filtro de óleo"
    }
  },
  "ko": {
    "emily": {
      "stores": "카페",
      "role": "계산원",
      "purchase": "우유",
      "product": "아메리카노"
    },
    "juanito": {
      "stores": "슈퍼마켓",
      "role": "식료품 담당자",
      "purchase": "쌀",
      "product": "쌀 1kg"
    },
    "camila": {
      "stores": "자동차 부품점",
      "role": "자동차 부품 판매원",
      "purchase": "오일 필터",
      "product": "오일 필터"
    }
  },
  "zh": {
    "emily": {
      "stores": "咖啡店",
      "role": "收银员",
      "purchase": "牛奶",
      "product": "美式咖啡"
    },
    "juanito": {
      "stores": "超市",
      "role": "食品主管",
      "purchase": "大米",
      "product": "1公斤大米"
    },
    "camila": {
      "stores": "汽车配件店",
      "role": "汽车配件销售员",
      "purchase": "机油滤清器",
      "product": "机油滤清器"
    }
  }
} as const;

export function getPracticeCaseValues(locale: string, characterId?: LearningCharacterId | null) {
  const id = isLearningCharacterId(characterId) ? characterId : 'emily';
  const facts = caseFacts[id];
  const language = locale.split('-')[0] as keyof typeof localizedFacts;
  const localized = (localizedFacts[language] ?? localizedFacts.en)[id];
  let format: Intl.NumberFormat;
  try { format = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }); }
  catch { format = new Intl.NumberFormat('en', { maximumFractionDigits: 0 }); }
  const amount = (value: number) => `${facts.currency} ${format.format(value)}`;
  return {
    owner: facts.owner, company: facts.company, worker: facts.worker, ...localized,
    fundAmount: amount(facts.expense * 5), remainingAmount: amount(facts.expense * 4),
    saleAmount: amount(facts.price * 10), paymentAmount: amount(facts.price * 4), debtAmount: amount(facts.price * 6),
    expectedAmount: amount(facts.price * 10), countedAmount: amount(facts.price * 9), cashDifference: amount(facts.price),
    expenseAmount: amount(facts.expense), unitPrice: amount(facts.price),
    salesFirst: amount(facts.salesFirst), salesSecond: amount(facts.salesSecond),
    difference: amount(facts.salesSecond - facts.salesFirst),
  };
}
