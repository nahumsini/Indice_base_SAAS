import { useState } from 'react';
import { X, Upload, AlertCircle, Calendar } from 'lucide-react';
import { Button } from './ui/button';

interface SolicitarPermisoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  colaboradores: Array<{ id: number; nombre: string; puesto: string }>;
}

export function SolicitarPermisoModal({ isOpen, onClose, onSave, colaboradores }: SolicitarPermisoModalProps) {
  const [formData, setFormData] = useState({
    colaboradorId: '',
    tipoPermiso: '',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
    descripcion: '',
    documentoSoporte: null as File | null,
    conGocesSueldo: 'si',
    diasSolicitados: 0,
    observaciones: '',
    estado: 'Pendiente',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Calcular días solicitados cuando se cambien las fechas
      if ((field === 'fechaInicio' || field === 'fechaFin') && updated.fechaInicio && updated.fechaFin) {
        const inicio = new Date(updated.fechaInicio);
        const fin = new Date(updated.fechaFin);
        const diffTime = Math.abs(fin.getTime() - inicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updated.diasSolicitados = diffDays;
      }

      // Determinar automáticamente si es con goce de sueldo según el tipo de permiso
      if (field === 'tipoPermiso') {
        const permisosSinGoce = ['sin-goce-sueldo', 'personal'];
        const permisosConGoce = ['vacaciones', 'enfermedad', 'maternidad', 'paternidad', 'capacitacion'];
        
        if (permisosSinGoce.includes(value)) {
          updated.conGocesSueldo = 'no';
        } else if (permisosConGoce.includes(value)) {
          updated.conGocesSueldo = 'si';
        }
      }

      return updated;
    });
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, documentoSoporte: file }));
  };

  const handleSubmit = () => {
    if (formData.colaboradorId && formData.tipoPermiso && formData.fechaInicio && formData.fechaFin && formData.motivo) {
      onSave(formData);
      handleCancel();
    }
  };

  const handleCancel = () => {
    setFormData({
      colaboradorId: '',
      tipoPermiso: '',
      fechaInicio: '',
      fechaFin: '',
      motivo: '',
      descripcion: '',
      documentoSoporte: null,
      conGocesSueldo: 'si',
      diasSolicitados: 0,
      observaciones: '',
      estado: 'Pendiente',
    });
    onClose();
  };

  if (!isOpen) return null;

  const isFormValid = formData.colaboradorId && formData.tipoPermiso && formData.fechaInicio && formData.fechaFin && formData.motivo;

  const tiposPermiso = [
    { value: 'vacaciones', label: '🏖️ Vacaciones', requireDoc: false, conGoce: true },
    { value: 'enfermedad', label: '🏥 Enfermedad', requireDoc: true, conGoce: true },
    { value: 'sin-goce-sueldo', label: '💼 Sin goce de sueldo', requireDoc: false, conGoce: false },
    { value: 'personal', label: '👤 Personal', requireDoc: false, conGoce: false },
    { value: 'maternidad', label: '👶 Maternidad', requireDoc: true, conGoce: true },
    { value: 'paternidad', label: '👨‍👶 Paternidad', requireDoc: true, conGoce: true },
    { value: 'capacitacion', label: '📚 Capacitación', requireDoc: false, conGoce: true },
    { value: 'defuncion', label: '⚰️ Defunción familiar', requireDoc: true, conGoce: true },
    { value: 'matrimonio', label: '💍 Matrimonio', requireDoc: true, conGoce: true },
    { value: 'otro', label: '📝 Otro', requireDoc: false, conGoce: false },
  ];

  const tipoPermisoSeleccionado = tiposPermiso.find(t => t.value === formData.tipoPermiso);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#143675] dark:bg-[#0f2855] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Solicitar permiso o ausencia
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Registra una solicitud de permiso para vacaciones, enfermedad u otras ausencias
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
                    Solicitud sujeta a aprobación
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    La solicitud será revisada por tu supervisor o el área de Recursos Humanos. 
                    Recibirás una notificación cuando sea aprobada o rechazada.
                  </p>
                </div>
              </div>
            </div>

            {/* Colaborador y Tipo de permiso */}
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
                  Tipo de permiso <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipoPermiso}
                  onChange={(e) => handleInputChange('tipoPermiso', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {tiposPermiso.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Fecha de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => handleInputChange('fechaFin', e.target.value)}
                  min={formData.fechaInicio}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Días solicitados
                </label>
                <div className="flex items-center h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formData.diasSolicitados} {formData.diasSolicitados === 1 ? 'día' : 'días'}
                  </span>
                </div>
              </div>
            </div>

            {/* Con goce de sueldo */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Con goce de sueldo
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conGocesSueldo"
                    value="si"
                    checked={formData.conGocesSueldo === 'si'}
                    onChange={(e) => handleInputChange('conGocesSueldo', e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sí</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conGocesSueldo"
                    value="no"
                    checked={formData.conGocesSueldo === 'no'}
                    onChange={(e) => handleInputChange('conGocesSueldo', e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
              {tipoPermisoSeleccionado && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tipoPermisoSeleccionado.conGoce 
                    ? '✅ Este tipo de permiso normalmente es con goce de sueldo' 
                    : '⚠️ Este tipo de permiso normalmente es sin goce de sueldo'}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Motivo del permiso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Vacaciones anuales programadas"
                value={formData.motivo}
                onChange={(e) => handleInputChange('motivo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Descripción detallada
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Proporciona detalles adicionales sobre el motivo de tu ausencia
              </p>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                placeholder="Escribe aquí cualquier información adicional relevante..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            {/* Documento de soporte */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Documento de soporte
                {tipoPermisoSeleccionado?.requireDoc && <span className="text-red-500"> *</span>}
              </label>
              {tipoPermisoSeleccionado?.requireDoc && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                  ⚠️ Este tipo de permiso requiere documento de soporte (certificado médico, acta de nacimiento, etc.)
                </p>
              )}
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
                  {formData.documentoSoporte ? formData.documentoSoporte.name : 'Ningún archivo seleccionado'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Formatos: JPG, PNG, PDF, DOC, DOCX. Máximo 10MB.
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Observaciones adicionales
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
                placeholder="Cualquier información adicional que desees agregar..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
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
            Enviar solicitud
          </Button>
        </div>
      </div>
    </div>
  );
}