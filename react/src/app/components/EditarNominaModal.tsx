import { useState } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Save, 
  PlayCircle, 
  CreditCard, 
  X, 
  Plus, 
  Settings,
  Trash2,
  ChevronDown,
  Eye,
  Edit,
  FileText,
  Receipt,
  ChevronRight,
} from 'lucide-react';

interface ColaboradorNomina {
  id: number;
  unidad: number;
  negocio: string;
  colaborador: string;
  diasTrabajados: number;
  incidencias: {
    faltas: number;
    retardos: number;
    descansos: number;
  };
  sueldo: number;
  percepciones: number;
  percepcionesDetalle: ConceptoDetalle[];
  deducciones: number;
  deduccionesDetalle: ConceptoDetalle[];
  neto: number;
  nominaFiscal: boolean;
  aportacionesPatronales?: ConceptoDetalle[];
}

interface ConceptoDetalle {
  id: string;
  concepto: string;
  monto: number;
  tipo?: string;
}

interface Nomina {
  id: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual';
}

interface EditarNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomina: Nomina | null;
  colaboradores: ColaboradorNomina[];
  onSave?: (colaboradores: ColaboradorNomina[]) => void;
  onProcesar: () => void;
  onPagar: () => void;
  onToggleNominaFiscal?: (id: number) => void;
}

export function EditarNominaModal({
  isOpen,
  onClose,
  nomina,
  colaboradores: initialColaboradores,
  onSave,
  onProcesar,
  onPagar,
}: EditarNominaModalProps) {
  // Normalizar colaboradores para asegurar que tengan todas las propiedades requeridas
  const normalizeColaboradores = (cols: ColaboradorNomina[]): ColaboradorNomina[] => {
    return cols.map(col => ({
      ...col,
      incidencias: col.incidencias || { faltas: 0, retardos: 0, descansos: 0 },
      percepcionesDetalle: col.percepcionesDetalle || [],
      deduccionesDetalle: col.deduccionesDetalle || [],
      aportacionesPatronales: col.aportacionesPatronales || [],
    }));
  };

  const [colaboradores, setColaboradores] = useState<ColaboradorNomina[]>(normalizeColaboradores(initialColaboradores));
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [percepcionesDropdown, setPercepcionesDropdown] = useState<number | null>(null);
  const [deduccionesDropdown, setDeduccionesDropdown] = useState<number | null>(null);

  const toggleNominaFiscal = (id: number) => {
    setColaboradores(prev =>
      prev.map(col => {
        if (col.id === id) {
          const newFiscal = !col.nominaFiscal;
          const percepciones = newFiscal ? col.percepciones : 0;
          const deducciones = newFiscal ? col.deducciones : 0;
          const neto = col.sueldo + percepciones - deducciones;
          return { ...col, nominaFiscal: newFiscal, neto };
        }
        return col;
      })
    );
  };

  const toggleExpandRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (!isOpen || !nomina) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[96vh] h-[96vh] overflow-hidden flex flex-col p-0">
        {/* Header con estilo azul del módulo */}
        <div className="bg-[#143675] px-8 py-6 border-b border-[#0f2855]">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-1.5">
                Editar Nómina - {nomina.periodo}
              </DialogTitle>
              <DialogDescription className="text-sm text-blue-100 font-medium">
                {nomina.fechaInicio} - {nomina.fechaFin} | {nomina.frecuencia}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-8 py-6 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#143675] border-b-2 border-[#0f2855]">
                  <tr>
                    <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider w-20">
                      Fiscal
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider w-24">
                      Unidad
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[140px]">
                      Negocio
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[200px]">
                      Colaborador
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider w-20">
                      Días
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[180px]">
                      Incidencias
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider w-32">
                      Sueldo
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider w-32">
                      Percepciones
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider w-32">
                      Deducciones
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider w-36">
                      Neto
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider w-32">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {colaboradores.map((colaborador) => (
                    <>
                      <tr 
                        key={colaborador.id} 
                        className={`hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-all duration-150 ${
                          expandedRow === colaborador.id ? 'bg-blue-50 dark:bg-gray-700/30' : ''
                        }`}
                      >
                        {/* Fiscal */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={colaborador.nominaFiscal}
                              onCheckedChange={() => toggleNominaFiscal(colaborador.id)}
                              className="border-2 border-gray-300 data-[state=checked]:bg-[#143675] data-[state=checked]:border-[#143675]"
                            />
                          </div>
                        </td>

                        {/* Unidad */}
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {colaborador.unidad}
                        </td>

                        {/* Negocio */}
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {colaborador.negocio}
                        </td>

                        {/* Colaborador */}
                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleExpandRow(colaborador.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-[#143675] dark:hover:text-[#4a7bc8] transition-colors"
                          >
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform ${
                                expandedRow === colaborador.id ? 'rotate-90' : ''
                              }`}
                            />
                            {colaborador.colaborador}
                          </button>
                        </td>

                        {/* Días */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-sm font-bold text-[#143675] dark:text-[#4a7bc8]">
                            {colaborador.diasTrabajados}
                          </span>
                        </td>

                        {/* Incidencias (badges) */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {colaborador.incidencias.faltas > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                🔴 Faltas: {colaborador.incidencias.faltas}
                              </span>
                            )}
                            {colaborador.incidencias.retardos > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                🟡 Retardos: {colaborador.incidencias.retardos}
                              </span>
                            )}
                            {colaborador.incidencias.descansos > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                ⚪ Descansos: {colaborador.incidencias.descansos}
                              </span>
                            )}
                            {colaborador.incidencias.faltas === 0 && 
                             colaborador.incidencias.retardos === 0 && 
                             colaborador.incidencias.descansos === 0 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                Sin incidencias
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sueldo */}
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${colaborador.sueldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Percepciones (clickeable) */}
                        <td className="px-4 py-4 text-right relative">
                          <button
                            onClick={() => setPercepcionesDropdown(
                              percepcionesDropdown === colaborador.id ? null : colaborador.id
                            )}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                              colaborador.nominaFiscal
                                ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : 'text-gray-300 dark:text-gray-600 line-through'
                            }`}
                          >
                            ${colaborador.nominaFiscal 
                              ? colaborador.percepciones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                              : '0.00'
                            }
                            {colaborador.nominaFiscal && (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {/* Dropdown de Percepciones */}
                          {percepcionesDropdown === colaborador.id && colaborador.nominaFiscal && (
                            <div className="absolute z-20 right-4 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
                              <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">
                                  Percepciones Detalladas
                                </h4>
                              </div>
                              <div className="space-y-1.5 max-h-60 overflow-auto">
                                {colaborador.percepcionesDetalle.map((detalle) => (
                                  <div key={detalle.id} className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-green-50 dark:hover:bg-green-900/10 rounded">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                      {detalle.concepto}
                                    </span>
                                    <span className="text-green-700 dark:text-green-400 font-bold">
                                      ${detalle.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                  Total:
                                </span>
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                  ${colaborador.percepciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Deducciones (clickeable) */}
                        <td className="px-4 py-4 text-right relative">
                          <button
                            onClick={() => setDeduccionesDropdown(
                              deduccionesDropdown === colaborador.id ? null : colaborador.id
                            )}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                              colaborador.nominaFiscal
                                ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                : 'text-gray-300 dark:text-gray-600 line-through'
                            }`}
                          >
                            {colaborador.nominaFiscal ? '-' : ''}$
                            {colaborador.nominaFiscal 
                              ? colaborador.deducciones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                              : '0.00'
                            }
                            {colaborador.nominaFiscal && (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {/* Dropdown de Deducciones */}
                          {deduccionesDropdown === colaborador.id && colaborador.nominaFiscal && (
                            <div className="absolute z-20 right-4 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
                              <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">
                                  Deducciones Detalladas
                                </h4>
                              </div>
                              <div className="space-y-1.5 max-h-60 overflow-auto">
                                {colaborador.deduccionesDetalle.map((detalle) => (
                                  <div key={detalle.id} className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                      {detalle.concepto}
                                    </span>
                                    <span className="text-red-700 dark:text-red-400 font-bold">
                                      -${detalle.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                  Total:
                                </span>
                                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                  -${colaborador.deducciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Neto (destacado) */}
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#143675] to-[#1e4a8f] rounded-lg shadow-md">
                            <span className="text-base font-bold text-white">
                              ${colaborador.neto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                              title="Ver detalle"
                              onClick={() => toggleExpandRow(colaborador.id)}
                            >
                              <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-[#143675] dark:group-hover:text-[#4a7bc8]" />
                            </button>
                            <button 
                              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-[#143675] dark:group-hover:text-[#4a7bc8]" />
                            </button>
                            <button 
                              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                              title="Ver recibo"
                            >
                              <Receipt className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-[#143675] dark:group-hover:text-[#4a7bc8]" />
                            </button>
                            <button 
                              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                              title="Ver fiscal"
                            >
                              <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-[#143675] dark:group-hover:text-[#4a7bc8]" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Fila expandible con detalle */}
                      {expandedRow === colaborador.id && (
                        <tr className="bg-blue-50/50 dark:bg-gray-700/20">
                          <td colSpan={11} className="px-8 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Percepciones detalladas */}
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-green-200 dark:border-green-800 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                                    🟢 Percepciones Detalladas
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  {colaborador.percepcionesDetalle.map((detalle) => (
                                    <div key={detalle.id} className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                      <div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                          {detalle.concepto}
                                        </span>
                                        {detalle.tipo && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {detalle.tipo}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                        ${detalle.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-green-200 dark:border-green-800">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      Total Percepciones:
                                    </span>
                                    <span className="text-base font-bold text-green-700 dark:text-green-400">
                                      ${colaborador.percepciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Deducciones detalladas */}
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-red-200 dark:border-red-800 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                                    🔴 Deducciones Detalladas
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  {colaborador.deduccionesDetalle.map((detalle) => (
                                    <div key={detalle.id} className="flex items-center justify-between py-2 px-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                      <div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                          {detalle.concepto}
                                        </span>
                                        {detalle.tipo && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {detalle.tipo}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                        -${detalle.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-red-200 dark:border-red-800">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      Total Deducciones:
                                    </span>
                                    <span className="text-base font-bold text-red-700 dark:text-red-400">
                                      -${colaborador.deducciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Aportaciones patronales */}
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                                    ⚪ Aportaciones Patronales
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  {colaborador.aportacionesPatronales && colaborador.aportacionesPatronales.length > 0 ? (
                                    colaborador.aportacionesPatronales.map((detalle) => (
                                      <div key={detalle.id} className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                        <div>
                                          <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                            {detalle.concepto}
                                          </span>
                                          {detalle.tipo && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              {detalle.tipo}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                          ${detalle.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="py-8 text-center">
                                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                        Solo informativo - No afecta el neto del colaborador
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer con totales */}
            {colaboradores.length > 0 && (
              <div className="bg-gradient-to-r from-[#143675]/5 to-[#143675]/10 dark:from-[#143675]/10 dark:to-[#143675]/20 px-8 py-5 border-t-2 border-[#143675]/30 dark:border-[#143675]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total colaboradores: <span className="text-base font-bold text-gray-900 dark:text-white ml-1">{colaboradores.length}</span>
                    </span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total Sueldos: <span className="text-base font-bold text-gray-900 dark:text-white ml-1">
                        ${colaboradores.reduce((acc, col) => acc + col.sueldo, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total Neto:
                    </span>
                    <div className="px-6 py-3 bg-gradient-to-r from-[#143675] to-[#1e4a8f] rounded-xl shadow-lg">
                      <span className="text-2xl font-bold text-white">
                        ${colaboradores.reduce((acc, col) => acc + col.neto, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-between px-8 py-5 border-t-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Button
              className="bg-[#143675] hover:bg-[#0f2855] text-white min-w-[140px] h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={onProcesar}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Procesar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={onPagar}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Pagar
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="min-w-[120px] h-11 text-base font-semibold border-2"
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#143675] hover:bg-[#0f2855] text-white min-w-[180px] h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={() => {
                onSave?.(colaboradores);
                onClose();
              }}
            >
              <Save className="h-5 w-5 mr-2" />
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}