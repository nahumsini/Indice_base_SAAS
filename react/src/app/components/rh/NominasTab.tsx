import { useState } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Filter,
  ChevronDown,
  FileText,
  Edit,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Settings,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PreferenciasNominaModal } from '../PreferenciasNominaModal';
import { EditarNominaModal } from '../EditarNominaModal';
import { useHRLanguage } from '../../BasicModules/HumanResources/HRLanguage';

interface Nomina {
  id: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual';
  colaboradores: number;
  montoTotal: number;
  estado: 'Pendiente' | 'Procesada' | 'Pagada' | 'Cancelada';
  unidad?: number;
  negocio?: string;
}

interface ConceptoDetalle {
  id: string;
  concepto: string;
  monto: number;
  tipo?: string;
}

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

interface NominasTabProps {
  colaboradores: any[];
}

export function NominasTab({ colaboradores }: NominasTabProps) {
  const t = useHRLanguage().payroll;
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState('Todos los registros');
  const [unidadFilter, setUnidadFilter] = useState('Todas');
  const [negocioFilter, setNegocioFilter] = useState('Todos');
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);
  const [isNuevaNominaModalOpen, setIsNuevaNominaModalOpen] = useState(false);
  const [isPreferenciasModalOpen, setIsPreferenciasModalOpen] = useState(false);
  const [selectedNomina, setSelectedNomina] = useState<Nomina | null>(null);
  const [colaboradoresNomina, setColaboradoresNomina] = useState<ColaboradorNomina[]>([]);
  const [agrupacionNominas, setAgrupacionNominas] = useState('nomina-unica');

  // Datos de ejemplo de nóminas
  const nominas: Nomina[] = [
    {
      id: 1,
      periodo: 'Semana 11 - 2026',
      fechaInicio: '10 Mar',
      fechaFin: '16 Mar',
      frecuencia: 'Semanal',
      colaboradores: 18,
      montoTotal: 44850.00,
      estado: 'Pagada',
      unidad: 7,
      negocio: 'Negocio A',
    },
    {
      id: 2,
      periodo: '1ra Quincena Mar - 2026',
      fechaInicio: '01 Mar',
      fechaFin: '15 Mar',
      frecuencia: 'Quincenal',
      colaboradores: 4,
      montoTotal: 11050.00,
      estado: 'Procesada',
      unidad: 8,
      negocio: 'Negocio B',
    },
    {
      id: 3,
      periodo: 'Semana 10 - 2026',
      fechaInicio: '03 Mar',
      fechaFin: '09 Mar',
      frecuencia: 'Semanal',
      colaboradores: 18,
      montoTotal: 44850.00,
      estado: 'Pendiente',
      unidad: 7,
      negocio: 'Negocio A',
    },
    {
      id: 4,
      periodo: 'Febrero - 2026',
      fechaInicio: '01 Feb',
      fechaFin: '28 Feb',
      frecuencia: 'Mensual',
      colaboradores: 22,
      montoTotal: 95600.00,
      estado: 'Pagada',
      unidad: 10,
      negocio: 'Negocio C',
    },
    {
      id: 5,
      periodo: '2da Quincena Feb - 2026',
      fechaInicio: '16 Feb',
      fechaFin: '28 Feb',
      frecuencia: 'Quincenal',
      colaboradores: 4,
      montoTotal: 11050.00,
      estado: 'Pagada',
      unidad: 8,
      negocio: 'Negocio B',
    },
  ];

  // Filtrar nóminas
  const filteredNominas = nominas.filter((nomina) => {
    const matchesPeriodo = periodoFilter === 'Todos los registros' || nomina.frecuencia === periodoFilter;
    const matchesUnidad = unidadFilter === 'Todas' || nomina.unidad?.toString() === unidadFilter;
    const matchesNegocio = negocioFilter === 'Todos' || nomina.negocio === negocioFilter;
    const matchesSearch = nomina.periodo.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesPeriodo && matchesUnidad && matchesNegocio && matchesSearch;
  });

  // Calcular totales
  const totalColaboradores = filteredNominas.reduce((acc, n) => acc + n.colaboradores, 0);
  const totalMonto = filteredNominas.reduce((acc, n) => acc + n.montoTotal, 0);
  const nominasPendientes = filteredNominas.filter(n => n.estado === 'Pendiente').length;
  const nominasPagadas = filteredNominas.filter(n => n.estado === 'Pagada').length;

  const toggleRow = (id: number) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedRows.length === filteredNominas.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredNominas.map(n => n.id));
    }
  };

  const getEstadoBadge = (estado: Nomina['estado']) => {
    const badges = {
      'Pagada': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Procesada': 'bg-[#143675]/10 text-[#143675] dark:bg-[#143675]/20 dark:text-[#4a7bc8]',
      'Pendiente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badges[estado];
  };

  const getEstadoIcon = (estado: Nomina['estado']) => {
    const icons = {
      'Pagada': <CheckCircle className="h-3 w-3" />,
      'Procesada': <Clock className="h-3 w-3" />,
      'Pendiente': <AlertCircle className="h-3 w-3" />,
      'Cancelada': <X className="h-3 w-3" />,
    };
    return icons[estado];
  };

  const handleExportarSeleccionadas = () => {
    const nominasSeleccionadas = filteredNominas.filter(n => selectedRows.includes(n.id));
    console.log('Exportando nóminas:', nominasSeleccionadas);
    // Aquí iría la lógica de exportación
    alert(`Exportando ${nominasSeleccionadas.length} nómina(s) seleccionada(s)`);
  };

  const handleVerDetalle = (nomina: Nomina) => {
    setSelectedNomina(nomina);
    setIsDetalleModalOpen(true);
  };

  const handleEditarNomina = (nomina: Nomina) => {
    setSelectedNomina(nomina);
    // Generar datos de colaboradores para esta nómina
    const colaboradoresData: ColaboradorNomina[] = generateColaboradoresData(nomina);
    setColaboradoresNomina(colaboradoresData);
    setIsEditarModalOpen(true);
  };

  const generateColaboradoresData = (nomina: Nomina): ColaboradorNomina[] => {
    const nombres = ['Ana García', 'Carlos López', 'María Fernández', 'Juan Martínez', 'Pedro Sánchez', 'Laura Rodríguez'];
    const data: ColaboradorNomina[] = []
    
    for (let i = 0; i < nomina.colaboradores && i < 10; i++) {
      const sueldo = 2000 + Math.random() * 3000;
      
      // Generar percepciones detalladas
      const sueldoBase = sueldo * 0.7;
      const horasExtra = Math.random() > 0.5 ? sueldo * 0.1 : 0;
      const bonos = Math.random() > 0.6 ? sueldo * 0.08 : 0;
      const comisiones = Math.random() > 0.7 ? sueldo * 0.05 : 0;
      const incentivos = Math.random() > 0.5 ? sueldo * 0.07 : 0;
      
      const percepcionesDetalle: ConceptoDetalle[] = [
        { id: 'p1', concepto: 'Sueldo base', monto: sueldoBase, tipo: 'Base' },
      ];
      
      if (horasExtra > 0) percepcionesDetalle.push({ id: 'p2', concepto: 'Horas extra', monto: horasExtra, tipo: 'Variable' });
      if (bonos > 0) percepcionesDetalle.push({ id: 'p3', concepto: 'Bonos', monto: bonos, tipo: 'Variable' });
      if (comisiones > 0) percepcionesDetalle.push({ id: 'p4', concepto: 'Comisiones', monto: comisiones, tipo: 'Variable' });
      if (incentivos > 0) percepcionesDetalle.push({ id: 'p5', concepto: 'Incentivos', monto: incentivos, tipo: 'Variable' });
      
      const percepciones = percepcionesDetalle.reduce((sum, p) => sum + p.monto, 0);
      
      // Generar deducciones detalladas
      const isr = percepciones * 0.10;
      const imss = percepciones * 0.04;
      const infonavit = Math.random() > 0.6 ? percepciones * 0.03 : 0;
      const prestamos = Math.random() > 0.8 ? 500 : 0;
      
      const deduccionesDetalle: ConceptoDetalle[] = [
        { id: 'd1', concepto: 'ISR', monto: isr, tipo: 'Fiscal' },
        { id: 'd2', concepto: 'IMSS', monto: imss, tipo: 'Seguridad Social' },
      ];
      
      if (infonavit > 0) deduccionesDetalle.push({ id: 'd3', concepto: 'Infonavit', monto: infonavit, tipo: 'Seguridad Social' });
      if (prestamos > 0) deduccionesDetalle.push({ id: 'd4', concepto: 'Préstamos', monto: prestamos, tipo: 'Otros' });
      
      const deducciones = deduccionesDetalle.reduce((sum, d) => sum + d.monto, 0);
      
      // Generar aportaciones patronales
      const aportacionesPatronales: ConceptoDetalle[] = [
        { id: 'ap1', concepto: 'IMSS Patronal', monto: percepciones * 0.07, tipo: 'Seguridad Social' },
        { id: 'ap2', concepto: 'Infonavit Patronal', monto: percepciones * 0.05, tipo: 'Seguridad Social' },
        { id: 'ap3', concepto: 'SAR', monto: percepciones * 0.02, tipo: 'Seguridad Social' },
      ];
      
      const neto = percepciones - deducciones;
      
      data.push({
        id: i + 1,
        unidad: nomina.unidad || 7,
        negocio: nomina.negocio || 'Negocio A',
        colaborador: nombres[i % nombres.length] + ` ${i + 1}`,
        diasTrabajados: 7 - Math.floor(Math.random() * 2),
        incidencias: {
          descansos: Math.floor(Math.random() * 2),
          retardos: Math.floor(Math.random() * 3),
          faltas: Math.floor(Math.random() * 2),
        },
        sueldo,
        percepciones,
        percepcionesDetalle,
        deducciones,
        deduccionesDetalle,
        neto,
        nominaFiscal: Math.random() > 0.3,
        aportacionesPatronales,
      });
    }
    
    return data;
  };

  const handleDescargarPDF = (nomina: Nomina) => {
    const doc = new jsPDF();
    const colaboradoresData = generateColaboradoresData(nomina);
    
    // Título
    doc.setFontSize(18);
    doc.text('Nómina - ' + nomina.periodo, 14, 20);
    
    // Información de la nómina
    doc.setFontSize(11);
    doc.text(`Fechas: ${nomina.fechaInicio} - ${nomina.fechaFin}`, 14, 30);
    doc.text(`Frecuencia: ${nomina.frecuencia}`, 14, 36);
    doc.text(`Unidad: ${nomina.unidad}`, 14, 42);
    doc.text(`Negocio: ${nomina.negocio}`, 14, 48);
    doc.text(`Estado: ${nomina.estado}`, 14, 54);
    
    // Tabla de colaboradores
    const tableData = colaboradoresData.map(col => [
      col.unidad,
      col.negocio,
      col.colaborador,
      col.diasTrabajados,
      col.incidencias.descansos,
      col.incidencias.retardos,
      col.incidencias.faltas,
      `$${col.sueldo.toFixed(2)}`,
      `$${col.percepciones.toFixed(2)}`,
      `$${col.deducciones.toFixed(2)}`,
      `$${col.neto.toFixed(2)}`,
      col.nominaFiscal ? 'Sí' : 'No',
    ]);
    
    autoTable(doc, {
      startY: 60,
      head: [['Unidad', 'Negocio', 'Colaborador', 'Días', 'Descanso', 'Retardos', 'Faltas', 'Sueldo', 'Percepciones', 'Deducciones', 'Neto', 'Fiscal']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 54, 117] },
    });
    
    // Descargar
    doc.save(`nomina-${nomina.periodo}.pdf`);
  };

  const handleProcesarNomina = () => {
    if (selectedNomina) {
      console.log('Procesando nómina:', selectedNomina);
      alert(`Procesando nómina: ${selectedNomina.periodo}`);
    }
  };

  const handlePagarNomina = () => {
    if (selectedNomina) {
      console.log('Pagando nómina:', selectedNomina);
      alert(`Registrando pago de nómina: ${selectedNomina.periodo}`);
    }
  };

  const toggleNominaFiscal = (id: number) => {
    setColaboradoresNomina(prev => 
      prev.map(col => 
        col.id === id ? { ...col, nominaFiscal: !col.nominaFiscal } : col
      )
    );
  };

  const clearFilters = () => {
    setPeriodoFilter('Todos los registros');
    setUnidadFilter('Todas');
    setNegocioFilter('Todos');
    setSearchQuery('');
  };

  const hasActiveFilters = periodoFilter !== 'Todos los registros' || unidadFilter !== 'Todas' || negocioFilter !== 'Todos' || searchQuery !== '';
  const periodoFilterLabel =
    periodoFilter === 'Todos los registros'
      ? t.filters.allRecords
      : periodoFilter === 'Este mes'
        ? t.filters.thisMonth
        : periodoFilter === 'Este año'
          ? t.filters.thisYear
          : periodoFilter;
  const unidadFilterLabel = unidadFilter === 'Todas' ? t.filters.allUnits : unidadFilter;
  const negocioFilterLabel = negocioFilter === 'Todos' ? t.filters.allBusinesses : negocioFilter;

  return (
    <>
      {/* Header de la sección con título */}
      <div className="bg-[#143675]/5 dark:bg-[#143675]/10 rounded-lg p-6 mb-6 border border-[#143675]/20 dark:border-[#143675]/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-2xl">💰</span>
              {t.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.subtitle}
            </p>
          </div>
          <Button
            onClick={() => setIsPreferenciasModalOpen(true)}
            variant="outline"
            className="gap-2 border-[#143675] text-[#143675] hover:bg-[#143675] hover:text-white"
          >
            <Settings className="h-4 w-4" />
            {t.preferences}
          </Button>
        </div>
      </div>

      {/* Sección de filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t.filtersTitle}
            </h3>
            {hasActiveFilters && (
              <span className="text-xs bg-[#143675]/10 text-[#143675] dark:bg-[#143675]/20 dark:text-[#4a7bc8] px-2 py-0.5 rounded-full">
                {t.activeFilters}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              {t.clearFilters}
            </Button>
          )}
        </div>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Período */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t.filters.period}
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {periodoFilterLabel}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                <DropdownMenuItem onClick={() => setPeriodoFilter('Todos los registros')}>{t.filters.allRecords}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriodoFilter('Este mes')}>{t.filters.thisMonth}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriodoFilter('Este año')}>{t.filters.thisYear}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Unidad */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t.filters.unit}
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {unidadFilterLabel}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                <DropdownMenuItem onClick={() => setUnidadFilter('Todas')}>{t.filters.allUnits}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUnidadFilter('7')}>7</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUnidadFilter('8')}>8</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUnidadFilter('9')}>9</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUnidadFilter('10')}>10</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Negocio */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t.filters.business}
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {negocioFilterLabel}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                <DropdownMenuItem onClick={() => setNegocioFilter('Todos')}>{t.filters.allBusinesses}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNegocioFilter('Negocio A')}>Negocio A</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNegocioFilter('Negocio B')}>Negocio B</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNegocioFilter('Negocio C')}>Negocio C</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabla de nóminas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.period}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.dates}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.frequency}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.employees}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.totalAmount}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.status}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.unit}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.business}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNominas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm font-medium">{t.table.noResults}</p>
                      <p className="text-xs mt-1">{t.table.adjustFilters}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNominas.map((nomina) => (
                  <tr 
                    key={nomina.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {nomina.periodo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {nomina.fechaInicio} - {nomina.fechaFin}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {nomina.frecuencia}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {nomina.colaboradores} colaboradores
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                      ${nomina.montoTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(nomina.estado)}`}>
                        {getEstadoIcon(nomina.estado)}
                        {nomina.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {nomina.unidad}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {nomina.negocio}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditarNomina(nomina)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          onClick={() => handleDescargarPDF(nomina)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con resumen */}
        {filteredNominas.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{filteredNominas.length}</span> {t.table.payrollCount}
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{totalColaboradores}</span> {t.table.employeeCount}
                </span>
              </div>
              <span className="text-gray-900 dark:text-white font-medium">
                {t.table.total}: ${totalMonto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Editar Nómina */}
      <EditarNominaModal 
        isOpen={isEditarModalOpen}
        onClose={() => setIsEditarModalOpen(false)}
        nomina={selectedNomina}
        colaboradores={colaboradoresNomina}
        onProcesar={handleProcesarNomina}
        onPagar={handlePagarNomina}
        onToggleNominaFiscal={toggleNominaFiscal}
      />

      {/* Modal de Preferencias de Nómina */}
      <PreferenciasNominaModal 
        isOpen={isPreferenciasModalOpen}
        onClose={() => setIsPreferenciasModalOpen(false)}
        agrupacionActual={agrupacionNominas}
        onGuardar={(agrupacion) => {
          setAgrupacionNominas(agrupacion);
          console.log('Nueva agrupación de nóminas:', agrupacion);
        }}
      />
    </>
  );
}
