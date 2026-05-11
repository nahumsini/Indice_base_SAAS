import { useState, useMemo } from 'react';
import { mockCampaigns } from './mocks/affiliates.mock';
import type { Campaign, CampaignStatus, CampaignChannel } from './types/affiliates.types';
import {
  Plus,
  MessageCircle,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  Reply,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader,
  Filter,
  TrendingUp
} from 'lucide-react';

export default function CampanasTab() {
  const [campaigns] = useState<Campaign[]>(mockCampaigns);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<CampaignChannel | 'all'>('all');

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      const matchesChannel = channelFilter === 'all' || campaign.channel === channelFilter;
      return matchesStatus && matchesChannel;
    });
  }, [campaigns, statusFilter, channelFilter]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const totalSent = campaigns.reduce((sum, c) => sum + c.metrics.sent, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.metrics.opened, 0);
    const avgEngagement = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    return { total, active, completed, totalSent, avgEngagement };
  }, [campaigns]);

  const getStatusBadge = (status: CampaignStatus) => {
    const badges: Record<CampaignStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
      draft: { label: 'Borrador', icon: AlertCircle, className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
      scheduled: { label: 'Programada', icon: Clock, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      sending: { label: 'Enviando', icon: Loader, className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
      sent: { label: 'Enviada', icon: Send, className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
      completed: { label: 'Completada', icon: CheckCircle2, className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      failed: { label: 'Fallida', icon: AlertCircle, className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[status];
  };

  const getChannelIcon = (channel: CampaignChannel) => {
    const icons: Record<CampaignChannel, typeof MessageCircle> = {
      whatsapp: MessageCircle,
      email: Mail,
      sms: MessageSquare,
      broadcast: Send,
    };
    return icons[channel];
  };

  const getChannelLabel = (channel: CampaignChannel) => {
    const labels: Record<CampaignChannel, string> = {
      whatsapp: 'WhatsApp',
      email: 'Email',
      sms: 'SMS',
      broadcast: 'Difusión',
    };
    return labels[channel];
  };

  const getChannelColor = (channel: CampaignChannel) => {
    const colors: Record<CampaignChannel, string> = {
      whatsapp: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      email: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      sms: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
      broadcast: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
    };
    return colors[channel];
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No programada';
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateEngagement = (campaign: Campaign) => {
    if (campaign.metrics.sent === 0) return 0;
    return Math.round((campaign.metrics.opened / campaign.metrics.sent) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats and New Campaign Button */}
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Total Campañas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
            <p className="text-xs text-orange-700 dark:text-orange-400 font-medium mb-1">Activas</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.active}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.completed}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Total Enviados</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.totalSent}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-1">Engagement Promedio</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.avgEngagement}%</p>
          </div>
        </div>
      </div>

      {/* New Campaign Button - Big and Prominent */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700 p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          ¿Listo para comunicarte con tu comunidad?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Crea una nueva campaña y llega a tus afiliados por WhatsApp, Email o SMS
        </p>
        <button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold text-lg flex items-center gap-3 mx-auto shadow-lg transition-all hover:shadow-xl">
          <Plus className="w-6 h-6" />
          Nueva Campaña
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex items-center gap-4 flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="scheduled">Programada</option>
              <option value="sending">Enviando</option>
              <option value="sent">Enviada</option>
              <option value="completed">Completada</option>
              <option value="failed">Fallida</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as CampaignChannel | 'all')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todos los canales</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="broadcast">Difusión</option>
            </select>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredCampaigns.length} campañas
          </span>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCampaigns.map((campaign) => {
          const statusBadge = getStatusBadge(campaign.status);
          const StatusIcon = statusBadge.icon;
          const ChannelIcon = getChannelIcon(campaign.channel);
          const channelColor = getChannelColor(campaign.channel);
          const engagement = calculateEngagement(campaign);

          return (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${channelColor}`}>
                    <ChannelIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                      {campaign.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getChannelLabel(campaign.channel)} • {campaign.segment}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusBadge.label}
                </span>
              </div>

              {/* Message Preview */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {campaign.message}
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enviados</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {campaign.metrics.sent}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Abiertos</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {campaign.metrics.opened}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <MousePointerClick className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clics</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {campaign.metrics.clicked}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Reply className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Respuestas</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {campaign.metrics.responded}
                  </p>
                </div>
              </div>

              {/* Engagement Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Engagement</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {engagement}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      engagement >= 70 ? 'bg-green-500' :
                      engagement >= 40 ? 'bg-blue-500' :
                      engagement >= 20 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${engagement}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {campaign.scheduledDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(campaign.scheduledDate)}
                    </span>
                  )}
                </div>
                <button className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors">
                  Ver detalles
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Filter className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No se encontraron campañas con los filtros seleccionados
          </p>
        </div>
      )}
    </div>
  );
}
