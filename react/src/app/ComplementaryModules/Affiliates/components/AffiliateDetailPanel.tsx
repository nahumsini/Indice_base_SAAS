import { useState, useMemo } from 'react';
import type { Affiliate } from '../types/affiliates.types';
import { mockActivities } from '../mocks/affiliates.mock';
import {
  X,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Calendar,
  Tag,
  TrendingUp,
  BarChart3,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AffiliateDetailPanelProps {
  affiliate: Affiliate;
  isOpen: boolean;
  onClose: () => void;
}

export function AffiliateDetailPanel({ affiliate, isOpen, onClose }: AffiliateDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');

  const activities = useMemo(() => {
    return mockActivities
      .filter((a) => a.affiliateId === affiliate.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [affiliate.id]);

  // Calculate engagement score (mock)
  const engagementScore = useMemo(() => {
    const daysSinceAffiliation = Math.floor(
      (new Date().getTime() - new Date(affiliate.affiliationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLastInteraction = affiliate.lastInteraction
      ? Math.floor(
          (new Date().getTime() - new Date(affiliate.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    let score = 50;
    if (daysSinceLastInteraction < 7) score += 30;
    else if (daysSinceLastInteraction < 30) score += 15;
    if (activities.length > 5) score += 20;

    return Math.min(100, Math.max(0, score));
  }, [affiliate, activities]);

  const getEngagementLabel = (score: number) => {
    if (score >= 80) return { label: 'Muy activo', color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' };
    if (score >= 60) return { label: 'Activo', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' };
    if (score >= 40) return { label: 'Moderado', color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' };
    if (score >= 20) return { label: 'Bajo engagement', color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' };
    return { label: 'Inactivo', color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' };
  };

  const engagement = getEngagementLabel(engagementScore);

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, typeof MessageCircle> = {
      whatsapp_sent: MessageCircle,
      email_sent: Mail,
      call: Phone,
      survey: BarChart3,
      ticket: Ticket,
      note: FileText,
      tag_added: Tag,
      campaign: Mail,
      message: MessageCircle,
      interaction: CheckCircle2,
    };
    return icons[type] || FileText;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      whatsapp_sent: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      email_sent: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      call: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
      survey: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
      ticket: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
      note: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
      tag_added: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
      campaign: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
      message: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      interaction: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    };
    return colors[type] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">
                  {affiliate.name.charAt(0)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {affiliate.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {affiliate.email}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${engagement.color}`}>
                    {engagement.label}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {affiliate.city}
                  </span>
                  {affiliate.tags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Engagement</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{engagementScore}%</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Campañas</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {activities.filter((a) => a.type === 'campaign').length}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Encuestas</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {activities.filter((a) => a.type === 'survey').length}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Tickets</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {activities.filter((a) => a.type === 'ticket').length}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Phone className="w-4 h-4" />
              Llamar
            </button>
            <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <BarChart3 className="w-4 h-4" />
              Encuesta
            </button>
            <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <FileText className="w-4 h-4" />
              Nota
            </button>
            <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              Seguimiento
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Información
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay actividad registrada</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  const colorClass = getActivityColor(activity.type);
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {activity.performedBy} • {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Teléfono
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{affiliate.phone}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  WhatsApp
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {affiliate.whatsapp || 'No disponible'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Ubicación
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {affiliate.city}, {affiliate.state}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Fecha de Afiliación
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {new Date(affiliate.affiliationDate).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {affiliate.responsible && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Responsable
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{affiliate.responsible}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Tags
                </label>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {affiliate.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
