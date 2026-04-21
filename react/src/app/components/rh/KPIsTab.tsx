import { Button } from '../ui/button';
import { useHRLanguage } from '../../BasicModules/HumanResources/HRLanguage';
import { 
  Filter, 
  Download, 
  Users, 
  Clock, 
  Calendar, 
  AlertCircle, 
  FileText, 
  CalendarX, 
  DollarSign, 
  Calculator, 
  Laptop, 
  Wrench, 
  AlertTriangle, 
  Heart 
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function KPIsTab() {
  const t = useHRLanguage().kpis;

  return (
    <>
      {/* Header de la sección con título y botones de acción */}
      <div className="bg-[#143675]/5 dark:bg-[#143675]/10 rounded-lg p-6 mb-6 border border-[#143675]/20 dark:border-[#143675]/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              {t.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {t.filterPeriod}
            </Button>
            <Button size="sm" className="bg-[#143675] hover:bg-[#0f2855] text-white gap-2">
              <Download className="h-4 w-4" />
              {t.exportReport}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="px-3 py-2 border border-[#143675]/20 dark:border-[#143675]/30 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#143675]">
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
          </select>
          <select className="px-3 py-2 border border-[#143675]/20 dark:border-[#143675]/30 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#143675]">
            <option>{t.filters.march}</option>
            <option>{t.filters.february}</option>
            <option>{t.filters.january}</option>
          </select>
          <select className="px-3 py-2 border border-[#143675]/20 dark:border-[#143675]/30 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#143675]">
            <option>{t.filters.allUnits}</option>
            <option>Unidad 10</option>
            <option>Unidad 8</option>
            <option>Unidad 9</option>
          </select>
          <select className="px-3 py-2 border border-[#143675]/20 dark:border-[#143675]/30 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#143675]">
            <option>{t.filters.allDepartments}</option>
            <option>Operaciones</option>
            <option>Ventas</option>
            <option>Administración</option>
          </select>
        </div>
      </div>

      {/* Primera fila de KPIs - Equipo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">👥 {t.sections.team}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.activeEmployees}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">42</p>
            <p className="text-xs text-green-600 dark:text-green-400">+3 vs mes anterior</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.punctuality}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">94%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entradas a tiempo</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.absenteeism}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">3.1%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Días perdidos</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.tardiness}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">18</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Este mes</p>
          </div>
        </div>
      </div>

      {/* Segunda fila de KPIs - Gestión del personal */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 {t.sections.workforceManagement}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.permissionsRequested}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">22</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Este mes</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <CalendarX className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.absenceDays}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">41</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Impacto operativo</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.payrollCost}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">$358,250</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total mensual</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                <Calculator className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.avgCostPerEmployee}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">$8,530</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Costo laboral medio</p>
          </div>
        </div>
      </div>

      {/* Tercera fila de KPIs - Operación */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚙️ {t.sections.operation}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <Laptop className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.assignedAssets}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">39</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Equipos entregados</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.assetsInMaintenance}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">3</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Equipos fuera de servicio</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.workIncidents}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">5</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Actas registradas</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-sm border-2 border-green-200 dark:border-green-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.cards.teamHealth}</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">87<span className="text-2xl text-gray-500 dark:text-gray-400">/100</span></p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Índice general del clima laboral</p>
          </div>
        </div>
      </div>

      {/* Sección de gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfica de asistencia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 {t.sections.teamAttendance}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              id="asistencia-chart"
              data={[
                { mes: 'Ene', asistencia: 92 },
                { mes: 'Feb', asistencia: 94 },
                { mes: 'Mar', asistencia: 91 },
                { mes: 'Abr', asistencia: 95 },
                { mes: 'May', asistencia: 93 },
                { mes: 'Jun', asistencia: 96 },
              ]}
            >
              <CartesianGrid key="grid-asistencia" strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis key="xaxis-asistencia" dataKey="mes" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis key="yaxis-asistencia" stroke="#6b7280" style={{ fontSize: '12px' }} domain={[85, 100]} />
              <Tooltip 
                key="tooltip-asistencia"
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Legend key="legend-asistencia" wrapperStyle={{ fontSize: '12px' }} />
              <Line key="line-asistencia" type="monotone" dataKey="asistencia" stroke="#3b82f6" strokeWidth={2} name={`% ${t.cards.punctuality}`} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica de distribución de permisos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🥧 {t.sections.permissionDistribution}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart id="permisos-chart">
              <Pie
                key="pie-permisos"
                data={[
                  { name: 'Vacaciones', value: 35 },
                  { name: 'Enfermedad', value: 25 },
                  { name: 'Personal', value: 20 },
                  { name: 'Capacitación', value: 15 },
                  { name: 'Otros', value: 5 },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell key="cell-0" fill="#8b5cf6" />
                <Cell key="cell-1" fill="#3b82f6" />
                <Cell key="cell-2" fill="#14b8a6" />
                <Cell key="cell-3" fill="#f59e0b" />
                <Cell key="cell-4" fill="#6b7280" />
              </Pie>
              <Tooltip key="tooltip-permisos" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla resumen por unidad */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📊 {t.sections.unitSummary}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.table.unit}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.table.employees}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.table.attendance}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.table.absenteeism}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.table.payroll}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.table.incidents}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Unidad 10</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">30</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">95%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">2.8%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">$288,000</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">5</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Unidad 7</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">2</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">97%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">1.5%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">$250</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">0</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Unidad 8</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">10</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">92%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">3.0%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">$70,000</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">0</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{t.table.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">42</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">94%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">3.1%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">$358,250</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">5</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
