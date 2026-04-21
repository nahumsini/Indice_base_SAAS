// Properties Module - Main Component
import { useLanguage } from '../../shared/context';

export default function Inmuebles() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          🏢 Inmuebles
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Módulo de Inmuebles - En desarrollo
        </p>
      </div>
    </div>
  );
}
