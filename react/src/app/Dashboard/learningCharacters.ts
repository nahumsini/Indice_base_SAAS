export const learningCharacterIds = ["emily", "juanito", "camila"] as const;

export type LearningCharacterId = (typeof learningCharacterIds)[number];

export interface LearningCharacterDefinition {
  id: LearningCharacterId;
  countryCode: "CA" | "MX" | "CO";
  accentClass: string;
  imagePath?: string;
  imageOffset: {
    left: number;
    top: number;
  };
}

export const learningCharacters: LearningCharacterDefinition[] = [
  {
    id: "emily",
    countryCode: "CA",
    accentClass: "from-[#123A68] to-[#2563EB]",
    imagePath: "/images/learning-mode/emily-dashboard.png",
    imageOffset: { left: -539, top: -68 },
  },
  {
    id: "juanito",
    countryCode: "MX",
    accentClass: "from-[#FF6B5E] to-[#E1493E]",
    imagePath: "/images/learning-mode/juanito-dashboard.png",
    imageOffset: { left: -314, top: -68 },
  },
  {
    id: "camila",
    countryCode: "CO",
    accentClass: "from-[#F4C84A] to-[#E9A91B]",
    imagePath: "/images/learning-mode/camila-dashboard.png",
    imageOffset: { left: -312, top: -300 },
  },
];

export const learningCharacterStorageKey = "indice.learningMode.character";
