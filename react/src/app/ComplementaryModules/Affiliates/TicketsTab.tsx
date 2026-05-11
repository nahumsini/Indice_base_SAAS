import { useState, useMemo } from 'react';
import { mockTickets } from './mocks/affiliates.mock';
import type { Ticket, TicketStatus, TicketPriority } from './types/affiliates.types';
import {
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Pause,
  MessageSquare,
  User,
  Calendar,
  TrendingDown,
  TrendingUp,
  Filter,
  Search,
  Timer,
  BarChart3,
} from 'lucide-react';

export default function TicketsTab() {
  const [tickets] = useState<Ticket[]>(mockTickets);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const matchesSearch = searchQuery === '' ||
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.affiliateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.folio.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const critical = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;

    // Calculate average response time (in hours)
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    const avgResponseTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const resolved = new Date(t.resolvedAt!).getTime();
          return sum + ((resolved - created) / (1000 * 60 * 60));
        }, 0) / resolvedTickets.length
      : 0;

    return { open, inProgress, pending, resolved, critical, avgResponseTime };
  }, [tickets]);

  const getPriorityBadge = (priority: TicketPriority) => {
    const badges: Record<TicketPriority, { label: string; emoji: string; className: string }> = {
      low: { label: 'Baja', emoji: '🟢', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
      medium: { label: 'Media', emoji: '🟡', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      high: { label: 'Alta', emoji: '⚠️', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
      critical: { label: 'Crítica', emoji: '🔥', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[priority];
  };

  const getStatusBadge = (status: TicketStatus) => {
    const badges: Record<TicketStatus, { label: string; icon: typeof AlertCircle; className: string }> = {
      open: { label: 'Abierto', icon: AlertCircle, className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
      in_progress: { label: 'En Progreso', icon: Clock, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      pending: { label: 'Pendiente', icon: Pause, className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
      resolved: { label: 'Resuelto', icon: CheckCircle2, className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      closed: { label: 'Cerrado', icon: CheckCircle2, className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    };
    return badges[status];
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Soporte Técnico': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      'Consulta': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Queja': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      'Solicitud': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeElapsed = (createdAt: Date) => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const hours = Math.floor((now - created) / (1000 * 60 * 60));

    if (hours < 1) return 'Hace menos de 1h';
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  const getSLAStatus = (ticket: Ticket) => {
    const now = new Date().getTime();
    const created = new Date(ticket.createdAt).getTime();
    const hoursElapsed = (now - created) / (1000 * 60 * 60);

    // SLA targets based on priority
    const slaTargets: Record<TicketPriority, number> = {
      critical: 4,  // 4 hours
      high: 8,      // 8 hours
      medium: 24,   // 24 hours
      low: 48,      // 48 hours
    };

    const target = slaTargets[ticket.priority];
    const percentage = Math.min(100, (hoursElapsed / target) * 100);

    return {
      percentage,
      isBreached: hoursElapsed > target && ticket.status !== 'resolved',
      hoursRemaining: Math.max(0, target - hoursElapsed),
    };
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Abiertos</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.open}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">En Progreso</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-3">
            <Pause className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Resueltos</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.resolved}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Tiempo Resp.</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {stats.avgResponseTime.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse" />
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Críticos</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.critical}</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Ticket Button */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          ¿Necesitas registrar un nuevo ticket?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Crea un ticket para dar seguimiento a solicitudes, quejas o soporte
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-bold flex items-center gap-2 mx-auto shadow-lg transition-all hover:shadow-xl">
          <Plus className="w-5 h-5" />
          Nuevo Ticket
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por folio, asunto o afiliado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En Progreso</option>
              <option value="pending">Pendiente</option>
              <option value="resolved">Resuelto</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">🔥 Crítica</option>
            </select>
          </div>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTickets.length} tickets
          </span>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => {
          const statusBadge = getStatusBadge(ticket.status);
          const StatusIcon = statusBadge.icon;
          const priorityBadge = getPriorityBadge(ticket.priority);
          const categoryColor = getCategoryColor(ticket.category);
          const slaStatus = getSLAStatus(ticket);

          return (
            <div
              key={ticket.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border ${
                ticket.priority === 'critical' && ticket.status !== 'resolved'
                  ? 'border-red-300 dark:border-red-700 shadow-lg shadow-red-100 dark:shadow-red-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              } p-5 hover:shadow-lg transition-shadow`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryColor}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {ticket.folio}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {ticket.subject}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.className}`}>
                        {priorityBadge.emoji} {priorityBadge.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
                        {ticket.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta Information */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Afiliado</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {ticket.affiliateName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Responsable</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {ticket.responsible}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Creado</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Respuestas</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {ticket.responses.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* SLA Tracking */}
              {ticket.status !== 'resolved' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Timer className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        SLA - {getTimeElapsed(ticket.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {slaStatus.isBreached ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-red-600 dark:text-red-400" />
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                            SLA excedido
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            {slaStatus.hoursRemaining.toFixed(1)}h restantes
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        slaStatus.isBreached
                          ? 'bg-red-500'
                          : slaStatus.percentage >= 75
                          ? 'bg-orange-500'
                          : slaStatus.percentage >= 50
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(slaStatus.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Responder
                </button>
                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                  Ver Detalles
                </button>
                {ticket.status !== 'resolved' && (
                  <button className="px-3 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Resolver
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No se encontraron tickets con los filtros seleccionados
          </p>
        </div>
      )}
    </div>
  );
}
