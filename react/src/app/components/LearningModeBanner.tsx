import { useLanguage } from '../shared/context';
import { GraduationCap, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LearningModeBannerProps {
  isVisible: boolean;
  onHide: () => void;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
}

const moduleKeys = [
  'panelInicial',
  'recursosHumanos',
  'procesosTareas',
  'gastos',
  'cajaChica',
  'puntoVenta',
  'ventas',
  'kpis',
] as const;

export function LearningModeBanner({
  isVisible,
  onHide,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
}: LearningModeBannerProps) {
  const { t } = useLanguage();

  if (!isVisible) return null;

  const moduleKey = moduleKeys[currentStep];
  const moduleData = t.learningMode.modules[moduleKey];

  return (
    <Card className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-2 border-blue-200 dark:border-blue-700 shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20 transition-all duration-300 hover:shadow-xl">
      {/* Header Section */}
      <div className="flex items-start justify-between p-3 sm:p-3.5 border-b border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-1.5 shadow-md">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100">
              {t.learningMode.welcome}
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              {t.learningMode.stepOf} {currentStep + 1} de {totalSteps}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onHide}
          className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-3.5 space-y-2.5">
        {/* Module Title */}
        <div className="flex items-start gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full h-7 w-7 flex items-center justify-center text-xs font-bold shadow-md flex-shrink-0">
            {currentStep + 1}
          </div>
          <div className="flex-1">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">{moduleData.title}</h4>
            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 mt-0.5">{moduleData.subtitle}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed dark:text-gray-300">{moduleData.description}</p>

        {/* Two Column Layout for Functions and Context */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {/* Functions */}
          <div className="bg-white dark:bg-gray-700 rounded-xl p-2.5 border border-gray-200 dark:border-gray-600 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">📋</span> {t.learningMode.functions}
            </p>
            <ul className="space-y-1">
              {moduleData.functions.map((func, index) => (
                <li key={index} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{func}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Business Context */}
          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700 dark:to-gray-700 rounded-xl p-2.5 border-2 border-blue-200 dark:border-blue-700 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">💼</span> {t.learningMode.businessContext}
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{moduleData.context}</p>
          </div>
        </div>

        {/* Quote */}
        <div className="bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-blue-500 rounded-r-lg pl-3 pr-2 py-1.5">
          <p className="text-xs italic text-gray-700 dark:text-gray-300">
            <span className="text-blue-600 font-semibold">"</span>
            {moduleData.quote}
            <span className="text-blue-600 font-semibold">"</span>
          </p>
        </div>

        {/* Methodology Badge */}
        <div className="flex items-center justify-center sm:justify-start">
          <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full font-medium text-xs shadow-md flex items-center gap-1.5">
            <span>📌</span>
            <span>{t.learningMode.indiceMethodology}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md text-xs h-8 w-full sm:w-auto"
          >
            <span className="mr-1">➕</span> {t.learningMode.addModule} {moduleData.title}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 text-xs h-8 w-full sm:w-auto"
          >
            <span className="mr-1">📑</span> {t.learningMode.viewBasicModules}
          </Button>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between p-3 sm:p-3.5 border-t border-blue-100 bg-gradient-to-r from-blue-50/30 to-transparent">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={currentStep === 0}
          className="text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all text-xs h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">{t.learningMode.previous}</span>
          <span className="sm:hidden">Ant.</span>
        </Button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-blue-600' 
                  : index < currentStep 
                    ? 'w-2 bg-blue-400' 
                    : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={currentStep === totalSteps - 1}
          className="text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all text-xs h-8"
        >
          <span className="hidden sm:inline">{t.learningMode.next}</span>
          <span className="sm:hidden">Sig.</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}