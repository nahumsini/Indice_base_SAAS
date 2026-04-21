import { Button } from '../../../components/ui/button';
import { useLanguage } from '../../../shared/context';

export default function Plan() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6 border border-purple-200 dark:border-purple-700/30 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t.panelInicial.plan.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t.panelInicial.plan.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:scale-105 hover:border-green-400 dark:hover:border-green-500">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="text-3xl">🟢</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t.panelInicial.plan.plans.inicio.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t.panelInicial.plan.plans.inicio.description}
            </p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-green-600 dark:text-green-400">$65</span>
              <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-400 mt-0.5">❌</span>
              <span className="text-gray-500 dark:text-gray-500">{t.panelInicial.plan.features.products}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-400 mt-0.5">❌</span>
              <span className="text-gray-500 dark:text-gray-500">{t.panelInicial.plan.features.finance}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">📈</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisBasic}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">👤</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users5}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-400 mt-0.5">❌</span>
              <span className="text-gray-500 dark:text-gray-500">{t.panelInicial.plan.features.complementaryModules}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">📞</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions1}</span>
            </div>
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
            {t.panelInicial.plan.plans.inicio.button}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:scale-105 hover:border-blue-400 dark:hover:border-blue-500">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-3xl">🔵</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t.panelInicial.plan.plans.controla.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t.panelInicial.plan.plans.controla.description}
            </p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">$129</span>
              <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.products}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.finance}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">📈</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisComplete}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">👤</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users10}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">🧩</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.modules2}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">📞</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions2}</span>
            </div>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {t.panelInicial.plan.plans.controla.button}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 border-cyan-400 dark:border-cyan-500 p-6 transition-all hover:shadow-2xl hover:scale-105 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
              {t.panelInicial.plan.mostPopular}
            </span>
          </div>
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t.panelInicial.plan.plans.escala.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t.panelInicial.plan.plans.escala.description}
            </p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">$229</span>
              <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.products}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.finance}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">📈</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisAdvanced}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">👤</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users20}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">🧩</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.modules4}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">🤖</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.aiAnalytics}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cyan-600 mt-0.5">📞</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions2}</span>
            </div>
          </div>

          <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
            {t.panelInicial.plan.plans.escala.button}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:scale-105 hover:border-orange-400 dark:hover:border-orange-500">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <span className="text-3xl">🏢</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t.panelInicial.plan.plans.corporativiza.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t.panelInicial.plan.plans.corporativiza.description}
            </p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">$395</span>
              <span className="text-gray-600 dark:text-gray-400"> USD/mes</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.humanResources}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.processes}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.products}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">✅</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.finance}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">📈</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.kpisCorporate}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">👤</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.users25}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">🧩</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.allModules}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">🤖</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.aiAnalytics}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">🔗</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.integrations}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">📞</span>
              <span className="text-gray-700 dark:text-gray-300">{t.panelInicial.plan.features.sessions4}</span>
            </div>
          </div>

          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
            {t.panelInicial.plan.plans.corporativiza.button}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            ℹ️ {t.panelInicial.plan.additionalInfo.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                {t.panelInicial.plan.additionalInfo.extraUser}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {t.panelInicial.plan.additionalInfo.extraUserPrice}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                {t.panelInicial.plan.additionalInfo.learningMode}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {t.panelInicial.plan.additionalInfo.learningModeDesc}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                {t.panelInicial.plan.additionalInfo.updates}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {t.panelInicial.plan.additionalInfo.updatesDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
