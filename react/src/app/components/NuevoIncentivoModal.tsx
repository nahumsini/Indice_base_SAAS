import { useState } from 'react';
import { X, Search, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface Colaborador {
  id: number;
  nombre: string;
  puesto: string;
  unidad: number;
}

interface NuevoIncentivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  colaboradores?: Colaborador[];
}

export function NuevoIncentivoModal({ isOpen, onClose, onSave, colaboradores = [] }: NuevoIncentivoModalProps) {
  const [searchColaborador, setSearchColaborador] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '', // 'automatizado' o 'manual'
    // Para automatizados
    kpiAsociado: '',
    condicion: '',
    valorMeta: '',
    montoAutomatizado: '',
    tipoMontoAuto: 'fijo', // 'fijo' o 'porcentaje'
    // Para manuales
    colaboradoresSeleccionados: [] as number[],
    montoManual: '',
    concepto: '',
    // Aplicación
    aplicacion: 'siguiente', // 'siguiente' o 'especifica'
    fechaEspecifica: '',
    activo: true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
    handleCancel();
  };

  const handleCancel = () => {
    setFormData({
      nombre: '',
      tipo: '',
      kpiAsociado: '',
      condicion: '',
      valorMeta: '',
      montoAutomatizado: '',
      tipoMontoAuto: 'fijo',
      colaboradoresSeleccionados: [],
      montoManual: '',
      concepto: '',
      aplicacion: 'siguiente',
      fechaEspecifica: '',
      activo: true,
    });
    setSearchColaborador('');
    onClose();
  };

  if (!isOpen) return null;

  const isFormValid = formData.nombre && formData.tipo && 
    (formData.tipo === 'automatizado' 
      ? (formData.kpiAsociado && formData.condicion && formData.valorMeta && formData.montoAutomatizado)
      : (formData.colaboradoresSeleccionados.length > 0 && formData.montoManual && formData.concepto)
    );

  // Filtrar colaboradores según búsqueda
  const filteredColaboradores = colaboradores.filter(col =>
    col.nombre.toLowerCase().includes(searchColaborador.toLowerCase()) ||
    col.puesto.toLowerCase().includes(searchColaborador.toLowerCase())
  );

  // Seleccionar/Deseleccionar todos los colaboradores filtrados
  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredColaboradores.map(c => c.id);
      const uniqueIds = Array.from(new Set([...formData.colaboradoresSeleccionados, ...allFilteredIds]));
      handleInputChange('colaboradoresSeleccionados', uniqueIds);
    } else {
      const filteredIds = filteredColaboradores.map(c => c.id);
      handleInputChange('colaboradoresSeleccionados', 
        formData.colaboradoresSeleccionados.filter(id => !filteredIds.includes(id))
      );
    }
  };

  const allFilteredSelected = filteredColaboradores.length > 0 && 
    filteredColaboradores.every(col => formData.colaboradoresSeleccionados.includes(col.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 bg-[#143675] dark:bg-[#0f2855] flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              🎁 Nuevo Incentivo
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Configura incentivos automáticos o manuales para tus colaboradores
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            {/* Información básica */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Información Básica
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre del incentivo */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    🏷️ Nombre del incentivo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder="Ej: Bono por puntualidad, Incentivo por ventas, etc."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Tipo de incentivo */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    🎯 Tipo de incentivo *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.tipo === 'automatizado'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value="automatizado"
                        checked={formData.tipo === 'automatizado'}
                        onChange={(e) => handleInputChange('tipo', e.target.value)}
                        className="w-4 h-4 text-blue-600 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">⚙️ Automatizado</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Se aplica automáticamente cuando se cumple una condición de KPI
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.tipo === 'manual'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value="manual"
                        checked={formData.tipo === 'manual'}
                        onChange={(e) => handleInputChange('tipo', e.target.value)}
                        className="w-4 h-4 text-blue-600 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">👤 Manual</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Se asigna manualmente a colaboradores específicos por tu criterio
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración para incentivos automatizados */}
            {formData.tipo === 'automatizado' && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-100 dark:border-green-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Configuración Automatizada
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* KPI asociado */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      📊 KPI asociado *
                    </label>
                    <select
                      value={formData.kpiAsociado}
                      onChange={(e) => handleInputChange('kpiAsociado', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Selecciona un KPI...</option>
                      <optgroup label="📋 Asistencia">
                        <option value="asistencia">Tasa de asistencia</option>
                        <option value="puntualidad">Tasa de puntualidad</option>
                        <option value="dias-trabajados">Días trabajados</option>
                      </optgroup>
                      <optgroup label="⭐ Desempeño">
                        <option value="productividad">Productividad</option>
                        <option value="calidad">Calidad del trabajo</option>
                        <option value="cumplimiento">Cumplimiento de objetivos</option>
                      </optgroup>
                      <optgroup label="💰 Ventas/Resultados">
                        <option value="ventas">Ventas totales</option>
                        <option value="ocupacion">Tasa de ocupación</option>
                        <option value="satisfaccion">Satisfacción del cliente</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Condición */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      🎯 Condición *
                    </label>
                    <select
                      value={formData.condicion}
                      onChange={(e) => handleInputChange('condicion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Selecciona...</option>
                      <option value="mayor-igual">Mayor o igual a (≥)</option>
                      <option value="mayor">Mayor que (&gt;)</option>
                      <option value="igual">Igual a (=)</option>
                      <option value="menor">Menor que (&lt;)</option>
                      <option value="menor-igual">Menor o igual a (≤)</option>
                    </select>
                  </div>

                  {/* Valor meta */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      🎯 Valor meta *
                    </label>
                    <input
                      type="number"
                      value={formData.valorMeta}
                      onChange={(e) => handleInputChange('valorMeta', e.target.value)}
                      placeholder="Ej: 95, 100, 80..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Tipo de monto */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      💵 Tipo de monto *
                    </label>
                    <select
                      value={formData.tipoMontoAuto}
                      onChange={(e) => handleInputChange('tipoMontoAuto', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="fijo">💵 Monto fijo</option>
                      <option value="porcentaje">📈 Porcentaje del salario</option>
                    </select>
                  </div>

                  {/* Monto */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      💰 {formData.tipoMontoAuto === 'fijo' ? 'Monto' : 'Porcentaje'} *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                        {formData.tipoMontoAuto === 'fijo' ? '$' : '%'}
                      </span>
                      <input
                        type="number"
                        value={formData.montoAutomatizado}
                        onChange={(e) => handleInputChange('montoAutomatizado', e.target.value)}
                        placeholder={formData.tipoMontoAuto === 'fijo' ? '1000' : '10'}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Ejemplo de aplicación */}
                  {formData.kpiAsociado && formData.condicion && formData.valorMeta && (
                    <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
                        <span>
                          <strong>Ejemplo:</strong> Si un colaborador tiene una{' '}
                          <span className="font-semibold">{formData.kpiAsociado}</span>{' '}
                          {formData.condicion.replace('mayor-igual', '≥').replace('menor-igual', '≤').replace('mayor', '>').replace('menor', '<').replace('igual', '=')} {formData.valorMeta}
                          {formData.kpiAsociado.includes('tasa') || formData.kpiAsociado.includes('porcentaje') ? '%' : ''},
                          recibirá automáticamente {formData.tipoMontoAuto === 'fijo' ? `$${formData.montoAutomatizado || '___'}` : `${formData.montoAutomatizado || '__'}% de su salario`} en la próxima nómina.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configuración para incentivos manuales */}
            {formData.tipo === 'manual' && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-100 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  👤 Configuración Manual
                </h3>

                <div className="space-y-4">
                  {/* Selector de colaboradores */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      👥 Selecciona los colaboradores ({formData.colaboradoresSeleccionados.length} seleccionados) *
                    </label>

                    {/* Buscador */}
                    <div className="mb-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchColaborador}
                          onChange={(e) => setSearchColaborador(e.target.value)}
                          placeholder="Buscar por nombre o puesto..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    {/* Lista de colaboradores */}
                    <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      {/* Header con seleccionar todos */}
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Seleccionar todos ({filteredColaboradores.length})
                        </span>
                      </div>

                      {/* Lista */}
                      <div className="max-h-64 overflow-y-auto">
                        {filteredColaboradores.length > 0 ? (
                          <div className="divide-y divide-gray-200 dark:divide-gray-600">
                            {filteredColaboradores.map((colaborador) => (
                              <label
                                key={colaborador.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.colaboradoresSeleccionados.includes(colaborador.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleInputChange('colaboradoresSeleccionados', [...formData.colaboradoresSeleccionados, colaborador.id]);
                                    } else {
                                      handleInputChange('colaboradoresSeleccionados', formData.colaboradoresSeleccionados.filter(id => id !== colaborador.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {colaborador.nombre}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {colaborador.puesto} • Unidad {colaborador.unidad}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {searchColaborador ? 'No se encontraron colaboradores' : 'No hay colaboradores disponibles'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resumen de seleccionados */}
                    {formData.colaboradoresSeleccionados.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          ✓ Has seleccionado <span className="font-semibold">{formData.colaboradoresSeleccionados.length}</span> colaborador{formData.colaboradoresSeleccionados.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Concepto */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      📝 Concepto del incentivo *
                    </label>
                    <input
                      type="text"
                      value={formData.concepto}
                      onChange={(e) => handleInputChange('concepto', e.target.value)}
                      placeholder="Ej: Reconocimiento por desempeño excepcional"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Monto */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      💰 Monto por colaborador *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        value={formData.montoManual}
                        onChange={(e) => handleInputChange('montoManual', e.target.value)}
                        placeholder="1000"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    {formData.montoManual && formData.colaboradoresSeleccionados.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Monto total estimado: ${(parseFloat(formData.montoManual) * formData.colaboradoresSeleccionados.length).toLocaleString('es-MX')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Aplicación del incentivo */}
            {formData.tipo && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📅 Aplicación del Incentivo
                </h3>

                <div className="space-y-4">
                  {/* Cuándo aplicar */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      ¿Cuándo se aplicará este incentivo?
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.aplicacion === 'siguiente'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aplicacion"
                          value="siguiente"
                          checked={formData.aplicacion === 'siguiente'}
                          onChange={(e) => handleInputChange('aplicacion', e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">⚡ Siguiente nómina</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Se aplicará en el próximo pago</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.aplicacion === 'especifica'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aplicacion"
                          value="especifica"
                          checked={formData.aplicacion === 'especifica'}
                          onChange={(e) => handleInputChange('aplicacion', e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">📅 Fecha específica</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Elige una fecha de pago</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Selector de fecha específica */}
                  {formData.aplicacion === 'especifica' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        📅 Fecha de aplicación
                      </label>
                      <input
                        type="date"
                        value={formData.fechaEspecifica}
                        onChange={(e) => handleInputChange('fechaEspecifica', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}

                  {/* Estado */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => handleInputChange('activo', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ✅ Incentivo activo (se aplicará según la configuración)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
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
              🎁 Crear incentivo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}