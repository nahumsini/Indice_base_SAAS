import { useState } from 'react';
import { Plus, TrendingUp, Target, Wallet } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { NuevoIncentivoModal } from '../../../components/NuevoIncentivoModal';
import { RHIncentivo, rhColaboradores, rhIncentivosSeed } from '../mockData';

const getStatusClasses = (estado: RHIncentivo['estado']) => {
  const styles = {
    Activo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Programado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Pausado: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return styles[estado];
};

export default function Incentives() {
  const [incentivos, setIncentivos] = useState<RHIncentivo[]>(rhIncentivosSeed);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeCount = incentivos.filter((incentivo) => incentivo.estado === 'Activo').length;
  const automaticCount = incentivos.filter((incentivo) => incentivo.tipo === 'Automatizado').length;
  const manualCount = incentivos.filter((incentivo) => incentivo.tipo === 'Manual').length;

  return (
    <>
      <div className="bg-[#143675]/5 dark:bg-[#143675]/10 rounded-lg p-6 mb-6 border border-[#143675]/20 dark:border-[#143675]/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              Incentivos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestiona bonos manuales y automatizados usando el mismo lenguaje visual del modulo RH.
            </p>
          </div>
          <Button className="bg-[#143675] hover:bg-[#0f2855] text-white gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo incentivo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Activos</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Reglas o bonos corriendo</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Automatizados</p>
          <p className="text-3xl font-bold text-[#143675] dark:text-[#4a7bc8]">{automaticCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Basados en KPI o condicion</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Manuales</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{manualCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Asignados por criterio RH</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cobertura</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{rhColaboradores.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Colaboradores elegibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Desempeno</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reglas orientadas a resultados</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Criterios claros</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Metas y condiciones trazables</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Aplicacion ordenada</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Siguiente nomina o fecha definida</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Incentivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alcance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aplicacion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {incentivos.map((incentivo) => (
                <tr key={incentivo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">{incentivo.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{incentivo.id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{incentivo.tipo}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{incentivo.alcance}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{incentivo.monto}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{incentivo.aplicacion}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClasses(incentivo.estado)}`}>
                      {incentivo.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NuevoIncentivoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          const nextId = `INC-${210 + incentivos.length + 1}`;
          setIncentivos((prev) => [
            {
              id: nextId,
              nombre: data.nombre,
              tipo: data.tipo === 'manual' ? 'Manual' : 'Automatizado',
              alcance:
                data.tipo === 'manual'
                  ? `${data.colaboradoresSeleccionados.length} colaboradores`
                  : 'Regla automatica',
              monto:
                data.tipo === 'manual'
                  ? `$${data.montoManual || '0'} fijo`
                  : `${data.montoAutomatizado || '0'} ${data.tipoMontoAuto === 'porcentaje' ? '%' : 'fijo'}`,
              aplicacion: data.aplicacion === 'especifica' ? data.fechaEspecifica || 'Pendiente' : 'Siguiente nomina',
              estado: data.activo ? 'Activo' : 'Pausado',
            },
            ...prev,
          ]);
          setIsModalOpen(false);
        }}
        colaboradores={rhColaboradores.map(({ id, nombre, puesto, unidad }) => ({
          id,
          nombre,
          puesto,
          unidad,
        }))}
      />
    </>
  );
}
