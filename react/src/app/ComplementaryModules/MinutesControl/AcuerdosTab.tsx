import { useState, useMemo } from 'react';
import { mockAgreements } from './mocks/meetings.mock';
import type { Agreement, AgreementStatus, AgreementPriority } from './types/meetings.types';
import { Calendar, Users, Filter } from 'lucide-react';

export default function AcuerdosTab() {
  const [agreements] = useState<Agreement[]>(mockAgreements);
  const [statusFilter, setStatusFilter] = useState<AgreementStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<AgreementPriority | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const filteredAgreements = useMemo(() => {
    return agreements.filter((agreement) => {
      if (statusFilter !== 'all' && agreement.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && agreement.priority !== priorityFilter) return false;
      if (areaFilter !== 'all' && agreement.area !== areaFilter) return false;
      return true;
    });
  }, [agreements, statusFilter, priorityFilter, areaFilter]);

  const areas = useMemo(() => {
    const uniqueAreas = new Set(agreements.map((a) => a.area).filter(Boolean));
    return Array.from(uniqueAreas) as string[];
  }, [agreements]);

  const stats = useMemo(() => {
    return {
      pending: agreements.filter((a) => a.status === 'pending').length,
      inProgress: agreements.filter((a) => a.status === 'in_progress').length,
      completed: agreements.filter((a) => a.status === 'completed').length,
      overdue: agreements.filter((a) => a.status === 'overdue').length,
    };
  }, [agreements]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: AgreementStatus) => {
    const badges: Record<AgreementStatus, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600' },
      in_progress: { label: 'En Progreso', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700' },
      completed: { label: 'Completado', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700' },
      overdue: { label: 'Vencido', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700' },
      blocked: { label: 'Bloqueado', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700' },
    };
    return badges[status];
  };

  const getPriorityBadge = (priority: AgreementPriority) => {
    const badges: Record<AgreementPriority, { label: string; className: string }> = {
      low: { label: 'Baja', className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
      medium: { label: 'Media', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      high: { label: 'Alta', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
      critical: { label: 'Crítica', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[priority];
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">En Progreso</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.inProgress}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Completados</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.completed}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AgreementStatus | 'all')}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="overdue">Vencido</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prioridad
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as AgreementPriority | 'all')}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todas</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Área
            </label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agreements List */}
      <div className="space-y-3">
        {filteredAgreements.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron acuerdos con los filtros seleccionados
            </p>
          </div>
        ) : (
          filteredAgreements.map((agreement) => {
            const statusBadge = getStatusBadge(agreement.status);
            const priorityBadge = getPriorityBadge(agreement.priority);
            return (
              <div
                key={agreement.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex-1">
                        {agreement.description}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.className}`}>
                        {priorityBadge.label}
                      </span>
                    </div>
                    {agreement.meetingTitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        De: {agreement.meetingTitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {agreement.responsibleName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(agreement.dueDate)}
                  </span>
                  {agreement.area && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {agreement.area}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full border ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        agreement.progress === 100
                          ? 'bg-green-500'
                          : agreement.progress >= 50
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${agreement.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium min-w-[3ch]">
                    {agreement.progress}%
                  </span>
                </div>

                {/* Tags */}
                {agreement.tags && agreement.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {agreement.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
