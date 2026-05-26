import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

export function ProspectosHeader({
  onOpenColumns,
  onCreateOpportunity,
}: {
  onOpenColumns: () => void;
  onCreateOpportunity: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <span className="text-2xl leading-none" aria-hidden="true">🎯</span>
            Oportunidades comerciales
          </h2>
          <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Gestiona ventas activas ligadas a contactos: etapa, valor, probabilidad, siguiente acción y archivos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10" onClick={onOpenColumns}>
            <Columns3 className="h-4 w-4" />
            Columnas
          </Button>
          <Button className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]" onClick={onCreateOpportunity}>
            <Plus className="h-4 w-4" />
            Crear oportunidad
          </Button>
        </div>
      </div>
    </section>
  );
}

