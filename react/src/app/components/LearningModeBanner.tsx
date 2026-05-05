import { ArrowRight, GraduationCap, X } from 'lucide-react';
import { useLanguage } from '../shared/context';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LearningModeBannerProps {
  isVisible: boolean;
  onHide: () => void;
  currentStep?: number;
  totalSteps?: number;
  onPrimaryAction?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const onboardingCopy = {
  es: {
    eyebrow: 'Modo aprendiz',
    title: 'Paso 1: Configura tu negocio',
    description: 'Empieza configurando tu empresa en el Home Panel.',
    cta: 'Ir a Home Panel',
    completed: 'completado',
  },
  en: {
    eyebrow: 'Learning mode',
    title: 'Step 1: Configure your business',
    description: 'Start by setting up your company in the Home Panel.',
    cta: 'Go to Home Panel',
    completed: 'complete',
  },
  fr: {
    eyebrow: 'Mode apprentissage',
    title: 'Etape 1: Configurez votre entreprise',
    description: 'Commencez par configurer votre entreprise dans le Home Panel.',
    cta: 'Aller au Home Panel',
    completed: 'termine',
  },
  pt: {
    eyebrow: 'Modo aprendiz',
    title: 'Etapa 1: Configure seu negocio',
    description: 'Comece configurando sua empresa no Home Panel.',
    cta: 'Ir para Home Panel',
    completed: 'concluido',
  },
};

function getOnboardingCopy(languageCode: string) {
  if (languageCode.startsWith('es')) return onboardingCopy.es;
  if (languageCode.startsWith('fr')) return onboardingCopy.fr;
  if (languageCode.startsWith('pt')) return onboardingCopy.pt;

  return onboardingCopy.en;
}

export function LearningModeBanner({
  isVisible,
  onHide,
  currentStep = 0,
  totalSteps = 10,
  onPrimaryAction,
}: LearningModeBannerProps) {
  const { currentLanguage } = useLanguage();

  if (!isVisible) return null;

  const copy = getOnboardingCopy(currentLanguage.code);
  const safeTotalSteps = Math.max(totalSteps, 1);
  const safeCurrentStep = Math.min(Math.max(currentStep, 0), safeTotalSteps - 1);
  const progressPercent = Math.round(((safeCurrentStep + 1) / safeTotalSteps) * 100);

  return (
    <Card className="overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 shadow-lg shadow-blue-100/50 transition-colors dark:border-blue-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 dark:shadow-blue-900/20">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {copy.eyebrow}
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                {progressPercent}% {copy.completed}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {copy.title}
            </h3>
            <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
              {copy.description}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={onPrimaryAction}
            className="h-10 rounded-xl bg-blue-600 px-4 font-semibold text-white shadow-md hover:bg-blue-700"
          >
            {copy.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onHide}
            className="h-10 w-10 rounded-xl text-blue-700 hover:bg-blue-100 hover:text-blue-900 dark:text-blue-200 dark:hover:bg-blue-900/40"
            aria-label="Hide learning mode"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-1.5 bg-blue-100 dark:bg-blue-950">
        <div
          className="h-full rounded-r-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </Card>
  );
}
