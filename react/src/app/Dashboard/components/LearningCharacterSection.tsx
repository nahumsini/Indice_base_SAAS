import { useEffect, useState } from "react";
import { ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  learningCharacters,
  type LearningCharacterDefinition,
  type LearningCharacterId,
} from "../learningCharacters";
import type { MainDashboardTranslations } from "../translations";

const masterSheetPath =
  "/images/learning-mode/indice-character-master-sheets-v1.jpeg";

interface CharacterPortraitProps {
  character: LearningCharacterDefinition;
  className?: string;
}

function CharacterPortrait({
  character,
  className = "",
}: CharacterPortraitProps) {
  if (character.imagePath) {
    return (
      <div
        className={`relative h-48 w-32 shrink-0 overflow-hidden rounded-xl ${className}`}
      >
        <img
          src={character.imagePath}
          alt=""
          className="h-full w-full object-contain object-bottom"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-white ${className}`}
      aria-hidden="true"
    >
      <img
        src={masterSheetPath}
        alt=""
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: 768,
          height: 512,
          left: character.imageOffset.left,
          top: character.imageOffset.top,
        }}
      />
    </div>
  );
}

interface LearningCharacterSectionProps {
  copy: MainDashboardTranslations["operationalJourney"]["characters"];
  selectedCharacterId: LearningCharacterId | null;
  onCharacterSelect: (characterId: LearningCharacterId) => void;
}

export function LearningCharacterSection({
  copy,
  selectedCharacterId,
  onCharacterSelect,
}: LearningCharacterSectionProps) {
  const [isChoosing, setIsChoosing] = useState(selectedCharacterId === null);

  useEffect(() => {
    if (selectedCharacterId === null) {
      setIsChoosing(true);
    }
  }, [selectedCharacterId]);

  const selectedCharacter = learningCharacters.find(
    (character) => character.id === selectedCharacterId,
  );

  const handleSelect = (characterId: LearningCharacterId) => {
    onCharacterSelect(characterId);
    setIsChoosing(false);
  };

  if (selectedCharacter && !isChoosing) {
    const characterCopy = copy.items[selectedCharacter.id];

    return (
      <section aria-labelledby="learning-character-title">
        <Card className="overflow-hidden rounded-xl border border-[#2563EB]/20 bg-white/95 shadow-[0_16px_46px_rgba(15,23,42,0.07)] dark:border-[#2563EB]/25 dark:bg-slate-950/85">
          <div className="grid items-center gap-5 p-5 md:grid-cols-[auto_1fr_auto] lg:p-6">
            <div
              className={`rounded-2xl bg-gradient-to-br p-1 ${selectedCharacter.accentClass}`}
            >
              <CharacterPortrait character={selectedCharacter} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2563EB]/10 px-3 py-1 text-xs font-semibold text-[#2563EB] dark:text-[#93C5FD]">
                <Sparkles className="h-3.5 w-3.5" />
                {copy.learningWith}
              </div>
              <h2
                id="learning-character-title"
                className="mt-3 text-xl font-semibold text-slate-950 dark:text-white"
              >
                {characterCopy.name} · {characterCopy.business}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {characterCopy.description}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                {characterCopy.challenge}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsChoosing(true)}
              className="w-full gap-2 rounded-full md:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              {copy.changeAction}
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="learning-character-title">
      <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_46px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-950/85 lg:p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] dark:text-[#93C5FD]">
              {copy.eyebrow}
            </p>
            <h2
              id="learning-character-title"
              className="mt-1 text-xl font-semibold text-slate-950 dark:text-white"
            >
              {copy.title}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {copy.subtitle}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {learningCharacters.map((character) => {
            const characterCopy = copy.items[character.id];
            const isSelected = character.id === selectedCharacterId;

            return (
              <button
                key={character.id}
                type="button"
                onClick={() => handleSelect(character.id)}
                aria-pressed={isSelected}
                className={`group relative flex min-h-[188px] overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:bg-slate-900 ${
                  isSelected
                    ? "border-[#2563EB] ring-2 ring-[#2563EB]/15 dark:border-[#60A5FA]"
                    : "border-slate-200 hover:border-[#2563EB]/45 dark:border-slate-700"
                }`}
              >
                <div
                  className={`flex w-32 shrink-0 items-end justify-center overflow-hidden bg-gradient-to-br ${character.accentClass}`}
                >
                  <CharacterPortrait character={character} />
                </div>
                <span className="flex min-w-0 flex-1 flex-col p-4">
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-base font-semibold text-slate-950 dark:text-white">
                        {characterCopy.name}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {characterCopy.business}
                      </span>
                    </span>
                    {isSelected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </span>
                  <span className="mt-3 line-clamp-4 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {characterCopy.description}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-[#2563EB] dark:text-[#93C5FD]">
                    {copy.selectAction}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
