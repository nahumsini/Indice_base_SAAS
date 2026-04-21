import { useMemo, useState } from 'react';
import { Calendar, Search, X } from 'lucide-react';
import { Button } from './ui/button';

interface Colaborador {
  id: number;
  nombre: string;
  puesto: string;
  unidad: number;
  departamento?: string;
}

interface NuevoComunicadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    titulo: string;
    tipo: 'general' | 'urgent' | 'reminder' | 'celebration';
    destinatarios: 'all' | 'units' | 'departments' | 'employees';
    unidades: string[];
    departamentos: string[];
    colaboradoresEspecificos: number[];
    contenido: string;
    estado: 'draft' | 'scheduled' | 'published';
    fechaProgramada: string;
    horaProgramada: string;
  }) => void;
  colaboradores?: Colaborador[];
}

interface FormState {
  titulo: string;
  tipo: 'general' | 'urgent' | 'reminder' | 'celebration';
  destinatarios: 'all' | 'units' | 'departments' | 'employees';
  unidades: string[];
  departamentos: string[];
  colaboradoresEspecificos: number[];
  contenido: string;
  publicacionTipo: 'ahora' | 'programado';
  fechaProgramada: string;
  horaProgramada: string;
}

const initialState: FormState = {
  titulo: '',
  tipo: 'general',
  destinatarios: 'all',
  unidades: [] as string[],
  departamentos: [] as string[],
  colaboradoresEspecificos: [] as number[],
  contenido: '',
  publicacionTipo: 'ahora',
  fechaProgramada: '',
  horaProgramada: '',
};

export function NuevoComunicadoModal({
  isOpen,
  onClose,
  onSave,
  colaboradores = [],
}: NuevoComunicadoModalProps) {
  const [formData, setFormData] = useState(initialState);
  const [searchColaborador, setSearchColaborador] = useState('');

  const unitOptions = useMemo(
    () =>
      Array.from(new Set(colaboradores.map((colaborador) => String(colaborador.unidad)))).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      ),
    [colaboradores],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(colaboradores.map((colaborador) => colaborador.departamento).filter(Boolean) as string[]),
      ).sort((left, right) => left.localeCompare(right)),
    [colaboradores],
  );

  const filteredColaboradores = useMemo(() => {
    const normalizedSearch = searchColaborador.trim().toLowerCase();
    if (!normalizedSearch) {
      return colaboradores;
    }

    return colaboradores.filter((colaborador) =>
      `${colaborador.nombre} ${colaborador.puesto}`.toLowerCase().includes(normalizedSearch),
    );
  }, [colaboradores, searchColaborador]);

  if (!isOpen) {
    return null;
  }

  const handleInputChange = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCancel = () => {
    setFormData(initialState);
    setSearchColaborador('');
    onClose();
  };

  const handleSubmit = (status: 'draft' | 'scheduled' | 'published') => {
    onSave({
      titulo: formData.titulo.trim(),
      tipo: formData.tipo,
      destinatarios: formData.destinatarios,
      unidades: formData.unidades,
      departamentos: formData.departamentos,
      colaboradoresEspecificos: formData.colaboradoresEspecificos,
      contenido: formData.contenido.trim(),
      estado: status,
      fechaProgramada: formData.fechaProgramada,
      horaProgramada: formData.horaProgramada,
    });
    setFormData(initialState);
    setSearchColaborador('');
  };

  const toggleArrayValue = (field: 'unidades' | 'departamentos', value: string) => {
    setFormData((previous) => ({
      ...previous,
      [field]: previous[field].includes(value)
        ? previous[field].filter((item) => item !== value)
        : [...previous[field], value],
    }));
  };

  const toggleEmployee = (employeeId: number) => {
    setFormData((previous) => ({
      ...previous,
      colaboradoresEspecificos: previous.colaboradoresEspecificos.includes(employeeId)
        ? previous.colaboradoresEspecificos.filter((id) => id !== employeeId)
        : [...previous.colaboradoresEspecificos, employeeId],
    }));
  };

  const canSaveDraft = Boolean(formData.titulo.trim() && formData.contenido.trim());
  const canPublish =
    canSaveDraft &&
    (formData.destinatarios === 'all' ||
      (formData.destinatarios === 'units' && formData.unidades.length > 0) ||
      (formData.destinatarios === 'departments' && formData.departamentos.length > 0) ||
      (formData.destinatarios === 'employees' && formData.colaboradoresEspecificos.length > 0)) &&
    (formData.publicacionTipo === 'ahora' || Boolean(formData.fechaProgramada && formData.horaProgramada));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-[#143675] px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-white">📢 Nuevo comunicado</h2>
            <p className="mt-1 text-sm text-white/80">Crea y programa anuncios internos con backend real.</p>
          </div>
          <button type="button" onClick={handleCancel} className="text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/40 dark:bg-blue-950/30">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Información básica</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(event) => handleInputChange('titulo', event.target.value)}
                    placeholder="Ej. Cambio de horarios, reunión mensual..."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(event) => handleInputChange('tipo', event.target.value as typeof formData.tipo)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgente</option>
                    <option value="reminder">Recordatorio</option>
                    <option value="celebration">Celebración</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Destinatarios</label>
                  <select
                    value={formData.destinatarios}
                    onChange={(event) => handleInputChange('destinatarios', event.target.value as typeof formData.destinatarios)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">Todo el personal</option>
                    <option value="units">Por unidad</option>
                    <option value="departments">Por departamento</option>
                    <option value="employees">Colaboradores específicos</option>
                  </select>
                </div>
              </div>
            </div>

            {formData.destinatarios === 'units' ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/40">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Selecciona unidades</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {unitOptions.map((unit) => (
                    <label key={unit} className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-3 text-sm dark:border-gray-600 dark:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.unidades.includes(unit)}
                        onChange={() => toggleArrayValue('unidades', unit)}
                        className="h-4 w-4"
                      />
                      <span>Unidad {unit}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {formData.destinatarios === 'departments' ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/40">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Selecciona departamentos</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {departmentOptions.map((department) => (
                    <label key={department} className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-3 text-sm dark:border-gray-600 dark:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.departamentos.includes(department)}
                        onChange={() => toggleArrayValue('departamentos', department)}
                        className="h-4 w-4"
                      />
                      <span>{department}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {formData.destinatarios === 'employees' ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/40">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Selecciona colaboradores ({formData.colaboradoresEspecificos.length})
                </h3>

                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchColaborador}
                    onChange={(event) => setSearchColaborador(event.target.value)}
                    placeholder="Buscar por nombre o puesto"
                    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  {filteredColaboradores.map((colaborador) => (
                    <label
                      key={colaborador.id}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 dark:border-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={formData.colaboradoresEspecificos.includes(colaborador.id)}
                        onChange={() => toggleEmployee(colaborador.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{colaborador.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {colaborador.puesto} · Unidad {colaborador.unidad}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/40">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contenido</h3>
              <textarea
                value={formData.contenido}
                onChange={(event) => handleInputChange('contenido', event.target.value)}
                rows={7}
                placeholder="Escribe aquí el contenido del comunicado..."
                className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Los adjuntos se integrarán en una siguiente fase. Este primer corte publica texto y segmentación real.
              </p>
            </div>

            <div className="rounded-lg border border-purple-100 bg-purple-50 p-6 dark:border-purple-900/40 dark:bg-purple-950/30">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Programación</h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label
                  className={`rounded-lg border-2 p-4 ${
                    formData.publicacionTipo === 'ahora'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="publicacionTipo"
                    value="ahora"
                    checked={formData.publicacionTipo === 'ahora'}
                    onChange={() => handleInputChange('publicacionTipo', 'ahora')}
                    className="mr-2"
                  />
                  Publicar ahora
                </label>
                <label
                  className={`rounded-lg border-2 p-4 ${
                    formData.publicacionTipo === 'programado'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="publicacionTipo"
                    value="programado"
                    checked={formData.publicacionTipo === 'programado'}
                    onChange={() => handleInputChange('publicacionTipo', 'programado')}
                    className="mr-2"
                  />
                  Programar publicación
                </label>
              </div>

              {formData.publicacionTipo === 'programado' ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={formData.fechaProgramada}
                        onChange={(event) => handleInputChange('fechaProgramada', event.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Hora</label>
                    <input
                      type="time"
                      value={formData.horaProgramada}
                      onChange={(event) => handleInputChange('horaProgramada', event.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-8 py-6 dark:border-gray-700 dark:bg-gray-900/50">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={!canSaveDraft} onClick={() => handleSubmit('draft')}>
              Guardar borrador
            </Button>
            <Button
              disabled={!canPublish}
              onClick={() => handleSubmit(formData.publicacionTipo === 'ahora' ? 'published' : 'scheduled')}
              className="bg-[#143675] text-white hover:bg-[#0f2855]"
            >
              {formData.publicacionTipo === 'ahora' ? 'Publicar ahora' : 'Programar publicación'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
