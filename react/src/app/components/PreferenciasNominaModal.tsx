import { useState } from 'react';
import { Button } from './ui/button';
import { X, Settings, Info, CheckCircle } from 'lucide-react';

interface PreferenciasNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  agrupacionActual: string;
  onGuardar: (agrupacion: string) => void;
}

export function PreferenciasNominaModal({ 
  isOpen, 
  onClose, 
  agrupacionActual,
  onGuardar 
}: PreferenciasNominaModalProps) {
  const [agrupacionSeleccionada, setAgrupacionSeleccionada] = useState(agrupacionActual);

  if (!isOpen) return null;

  const handleGuardar = () => {
    onGuardar(agrupacionSeleccionada);
    onClose();
  };

  const opciones = [
    {
      id: 'nomina-unica',
      titulo: 'Nómina única (predeterminado)',
      descripcion: 'Todos los colaboradores en una sola nómina. En el caso de Estados Unidos y Canadá, se separarán automáticamente por provincia/estado debido a las reglas fiscales específicas de cada región. Para los demás países, todos los colaboradores se unifican en una sola nómina.',
      badge: 'Recomendado'
    },
    {
      id: 'unidad-negocio',
      titulo: 'Por unidad de negocio',
      descripcion: 'Se creará una nómina por cada unidad de negocio',
      badge: null
    },
    {
      id: 'negocio',
      titulo: 'Por negocio',
      descripcion: 'Se creará una nómina por cada negocio registrado',
      badge: null
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#143675] bg-[#143675]">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              Preferencias de nómina
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Banner informativo */}
          <div className="bg-[#143675]/5 dark:bg-[#143675]/10 border border-[#143675]/20 dark:border-[#143675]/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-[#143675] dark:text-[#4a7bc8] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#143675] dark:text-[#4a7bc8] mb-2">
                  Información importante sobre las preferencias de nómina
                </p>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• <span className="font-medium">Configuración predeterminada:</span> Las nóminas se dividen automáticamente por país y provincia (para USA y Canadá)</li>
                  <li>• <span className="font-medium">Agrupación automática:</span> Los colaboradores se agruparán según su periodo de pago configurado (semanal, quincenal, mensual)</li>
                  <li>• <span className="font-medium">Personalización:</span> Puedes cambiar la forma en que se generan las nóminas según las necesidades de tu empresa</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Opciones de agrupación */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Selecciona cómo deseas agrupar las nóminas:
            </h3>

            {opciones.map((opcion) => (
              <button
                key={opcion.id}
                onClick={() => setAgrupacionSeleccionada(opcion.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  agrupacionSeleccionada === opcion.id
                    ? 'border-[#143675] bg-[#143675]/5 dark:bg-[#143675]/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-semibold ${
                        agrupacionSeleccionada === opcion.id
                          ? 'text-[#143675] dark:text-[#4a7bc8]'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {opcion.titulo}
                      </h4>
                      {opcion.badge && (
                        <span className="px-2 py-0.5 bg-[#143675]/10 dark:bg-[#143675]/20 text-[#143675] dark:text-[#4a7bc8] text-xs font-medium rounded-full">
                          {opcion.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${
                      agrupacionSeleccionada === opcion.id
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {opcion.descripcion}
                    </p>
                  </div>
                  {agrupacionSeleccionada === opcion.id && (
                    <CheckCircle className="h-5 w-5 text-[#143675] dark:text-[#4a7bc8] flex-shrink-0 ml-3" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Nota adicional */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">💡 Nota:</span> Independientemente de la agrupación que elijas, 
              los colaboradores siempre se organizarán automáticamente según su periodo de pago (semanal, quincenal, mensual) configurado al momento de crear su perfil.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-gray-700/50">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleGuardar}
            className="bg-[#143675] hover:bg-[#0f2855] text-white gap-2"
          >
            <Settings className="h-4 w-4" />
            Guardar preferencias
          </Button>
        </div>
      </div>
    </div>
  );
}