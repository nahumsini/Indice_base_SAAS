import { useState, useMemo } from 'react';
import { mockAffiliates } from './mocks/affiliates.mock';
import type { Affiliate, AffiliateStatus, AffiliateCategory } from './types/affiliates.types';
import { Search, Phone, Mail, MessageCircle, Filter, Tag, TrendingUp, AlertCircle } from 'lucide-react';
import { ActivityFeed } from './components/ActivityFeed';
import { AffiliateDetailPanel } from './components/AffiliateDetailPanel';

export default function AfiliadosTab() {
  const [affiliates] = useState<Affiliate[]>(mockAffiliates);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AffiliateStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AffiliateCategory | 'all'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  const filteredAffiliates = useMemo(() => {
    return affiliates.filter((affiliate) => {
      const matchesSearch = affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           affiliate.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || affiliate.category === categoryFilter;
      const matchesCity = cityFilter === 'all' || affiliate.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesCity;
    });
  }, [affiliates, searchTerm, statusFilter, categoryFilter, cityFilter]);

  const cities = useMemo(() => {
    const uniqueCities = new Set(affiliates.map((a) => a.city));
    return Array.from(uniqueCities);
  }, [affiliates]);

  const getStatusBadge = (status: AffiliateStatus) => {
    const badges: Record<AffiliateStatus, { label: string; className: string }> = {
      active: { label: 'Activo', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      inactive: { label: 'Inactivo', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
      pending: { label: 'Pendiente', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
      suspended: { label: 'Suspendido', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[status];
  };

  const getCategoryLabel = (category: AffiliateCategory) => {
    const labels: Record<AffiliateCategory, string> = {
      member: 'Miembro',
      volunteer: 'Voluntario',
      partner: 'Socio',
      sponsor: 'Patrocinador',
      other: 'Otro',
    };
    return labels[category];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEngagementScore = (affiliate: Affiliate) => {
    const daysSinceLastInteraction = affiliate.lastInteraction
      ? Math.floor(
          (new Date().getTime() - new Date(affiliate.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    let score = 50;
    if (daysSinceLastInteraction < 7) score += 40;
    else if (daysSinceLastInteraction < 30) score += 20;
    else if (daysSinceLastInteraction > 60) score -= 30;

    if (affiliate.status === 'active') score += 10;

    return Math.min(100, Math.max(0, score));
  };

  const getEngagementBadge = (score: number) => {
    if (score >= 80) return { label: 'Muy activo', icon: TrendingUp, className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    if (score >= 60) return { label: 'Activo', icon: TrendingUp, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
    if (score >= 40) return { label: 'Moderado', icon: AlertCircle, className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
    if (score >= 20) return { label: 'Bajo', icon: AlertCircle, className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' };
    return { label: 'Inactivo', icon: AlertCircle, className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-4">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AffiliateStatus | 'all')}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="pending">Pendiente</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AffiliateCategory | 'all')}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todas las categorías</option>
              <option value="member">Miembro</option>
              <option value="volunteer">Voluntario</option>
              <option value="partner">Socio</option>
              <option value="sponsor">Patrocinador</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todas las ciudades</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Mostrando {filteredAffiliates.length} de {affiliates.length} afiliados
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Afiliado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ciudad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Afiliación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAffiliates.map((affiliate) => {
                const statusBadge = getStatusBadge(affiliate.status);
                const engagementScore = getEngagementScore(affiliate);
                const engagementBadge = getEngagementBadge(engagementScore);
                const EngagementIcon = engagementBadge.icon;
                return (
                  <tr
                    key={affiliate.id}
                    onClick={() => setSelectedAffiliate(affiliate)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {affiliate.name}
                        </p>
                        {affiliate.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {affiliate.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                              </span>
                            ))}
                            {affiliate.tags.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{affiliate.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {affiliate.email}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {affiliate.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {affiliate.city}
                      </p>
                      {affiliate.state && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {affiliate.state}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {getCategoryLabel(affiliate.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${engagementBadge.className}`}>
                        <EngagementIcon className="w-3 h-3" />
                        {engagementBadge.label}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {engagementScore}%
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(affiliate.affiliationDate)}
                      </p>
                      {affiliate.lastInteraction && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Última: {formatDate(affiliate.lastInteraction)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {affiliate.whatsapp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // WhatsApp action
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Email action
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Call action
                          }}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Llamar"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAffiliates.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron afiliados con los filtros seleccionados
            </p>
          </div>
        )}
      </div>

      </div>

      {/* Sidebar - Activity Feed */}
      <div className="lg:col-span-1">
        <ActivityFeed />
      </div>

      {/* Affiliate Detail Panel */}
      {selectedAffiliate && (
        <AffiliateDetailPanel
          affiliate={selectedAffiliate}
          isOpen={!!selectedAffiliate}
          onClose={() => setSelectedAffiliate(null)}
        />
      )}
    </div>
  );
}
