import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface NuevaActaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  colaboradores: Array<{ id: number; nombre: string; puesto: string }>;
}

export function NuevaActaModal({ isOpen, onClose, onSave, colaboradores }: NuevaActaModalProps) {
  const [formData, setFormData] = useState({
    colaboradorId: '',
    fechaEvento: '',
    tipoEvento: '',
    gravedad: '',
    titulo: '',
    descripcion: '',
    accionesTomadas: '',
    evidencias: null as File | null,
    testigos: '',
    reportadoPor: '',
    estado: 'Pendiente',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, evidencias: file }));
  };

  const handleSubmit = () => {
    if (formData.colaboradorId && formData.fechaEvento && formData.tipoEvento && formData.titulo && formData.descripcion) {
      onSave(formData);
      handleCancel();
    }
  };

  const handleCancel = () => {
    setFormData({
      colaboradorId: '',
      fechaEvento: '',
      tipoEvento: '',
      gravedad: '',
      titulo: '',
      descripcion: '',
      accionesTomadas: '',
      evidencias: null,
      testigos: '',
      reportadoPor: '',
      estado: 'Pendiente',
    });
    onClose();
  };

  if (!isOpen) return null;

  const isFormValid = formData.colaboradorId && formData.fechaEvento && formData.tipoEvento && formData.titulo && formData.descripcion;

  const tiposEvento = [
    { value: 'amonestacion', label: '⚠️ Amonestación', color: 'orange' },
    { value: 'reconocimiento', label: '🌟 Reconocimiento', color: 'green' },
    { value: 'incidente', label: '🚨 Incidente', color: 'red' },
    { value: 'observacion', label: '👁️ Observación', color: 'blue' },
    { value: 'capacitacion', label: '📚 Capacitación', color: 'purple' },
    { value: 'sancion', label: '🔴 Sanción', color: 'red' },
    { value: 'mejora', label: '📈 Mejora continua', color: 'cyan' },
    { value: 'otro', label: '📝 Otro', color: 'gray' },
  ];

  const nivelesGravedad = [
    { value: 'baja', label: 'Baja', color: 'green' },
    { value: 'media', label: 'Media', color: 'yellow' },
    { value: 'alta', label: 'Alta', color: 'orange' },
    { value: 'critica', label: 'Crítica', color: 'red' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#143675] dark:bg-[#0f2855] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Nueva acta
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Registra eventos importantes del historial del colaborador
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {/* Info banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                    Registro permanente
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Las actas quedan registradas en el historial del colaborador y pueden ser consultadas en cualquier momento.
                    Asegúrate de incluir toda la información relevante.
                  </p>
                </div>
              </div>
            </div>

            {/* Colaborador y Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Colaborador <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.colaboradorId}
                  onChange={(e) => handleInputChange('colaboradorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecciona un colaborador...</option>
                  {colaboradores.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.nombre} - {col.puesto}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Fecha del evento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaEvento}
                  onChange={(e) => handleInputChange('fechaEvento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Tipo de evento y Gravedad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Tipo de evento <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipoEvento}
                  onChange={(e) => handleInputChange('tipoEvento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {tiposEvento.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Nivel de gravedad
                </label>
                <select
                  value={formData.gravedad}
                  onChange={(e) => handleInputChange('gravedad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {nivelesGravedad.map((nivel) => (
                    <option key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Opcional: Aplica solo para incidentes, amonestaciones o sanciones
                </p>
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Título del evento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Retardo injustificado"
                value={formData.titulo}
                onChange={(e) => handleInputChange('titulo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Descripción del evento <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Describe detalladamente lo sucedido, incluyendo fecha, hora, lugar y circunstancias
              </p>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                placeholder="Escribe aquí los detalles del evento..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {formData.descripcion.length} caracteres
              </p>
            </div>

            {/* Acciones tomadas */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Acciones tomadas
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Describe las medidas, sanciones o reconocimientos aplicados
              </p>
              <textarea
                value={formData.accionesTomadas}
                onChange={(e) => handleInputChange('accionesTomadas', e.target.value)}
                placeholder="Ej. Se aplicó descuento de 10% del salario semanal..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            {/* Testigos */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Testigos o personas involucradas
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez, María González"
                value={formData.testigos}
                onChange={(e) => handleInputChange('testigos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Reportado por */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Reportado por
              </label>
              <input
                type="text"
                placeholder="Ej. Supervisor de área"
                value={formData.reportadoPor}
                onChange={(e) => handleInputChange('reportadoPor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Evidencias */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Evidencias (documento o imagen)
              </label>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.evidencias ? formData.evidencias.name : 'Ningún archivo seleccionado'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Formatos: JPG, PNG, PDF, DOC, DOCX. Máximo 10MB.
              </p>
            </div>

            {/* Estado */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Estado del acta
              </label>
              <select
                value={formData.estado}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Revisado">Revisado</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Archivado">Archivado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`text-sm ${
              isFormValid
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Guardar acta
          </Button>
        </div>
      </div>
    </div>
  );
}