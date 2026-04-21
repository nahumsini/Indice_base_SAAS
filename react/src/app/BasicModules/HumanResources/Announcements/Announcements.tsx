import { useMemo, useState } from 'react';
import { Calendar, Clock, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { NuevoComunicadoModal } from '../../../components/NuevoComunicadoModal';
import { Button } from '../../../components/ui/button';
import { useHRLanguage } from '../HRLanguage';
import { RHComunicado, rhColaboradores, rhComunicadosSeed } from '../mockData';

const announcementPreviewById: Record<string, string> = {
  'COM-301': 'El próximo sábado habrá cambios en los horarios operativos de las unidades involucradas.',
  'COM-302': 'Favor de completar las evaluaciones pendientes antes del cierre de semana.',
  'COM-303': 'Este mes celebramos los cumpleaños de 3 colaboradores del equipo.',
};

const readStatsById: Record<string, { read: number; total: number }> = {
  'COM-301': { read: 18, total: 22 },
  'COM-302': { read: 7, total: 8 },
  'COM-303': { read: 0, total: 22 },
};

const audienceFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'operations', label: 'Operaciones' },
  { value: 'leaders', label: 'Líderes' },
  { value: 'everyone', label: 'Todo el personal' },
] as const;

const typeFilterOptions = ['Todos', 'General', 'Urgente', 'Recordatorio', 'Celebracion'] as const;
const statusFilterOptions = ['Todos', 'Publicado', 'Programado', 'Borrador'] as const;

const getAudienceGroup = (destinatarios: string) => {
  if (destinatarios.toLowerCase().includes('operaciones')) {
    return 'operations';
  }

  if (destinatarios.toLowerCase().includes('lider')) {
    return 'leaders';
  }

  if (destinatarios.toLowerCase().includes('todo el personal')) {
    return 'everyone';
  }

  return 'all';
};

const getTypeClasses = (tipo: RHComunicado['tipo']) => {
  const styles: Record<RHComunicado['tipo'], string> = {
    General: 'border border-[#5c7cff]/25 bg-[#5c7cff]/10 text-[#6f8fff]',
    Urgente: 'border border-red-500/25 bg-red-500/12 text-red-400',
    Recordatorio: 'border border-amber-500/25 bg-amber-500/12 text-amber-400',
    Celebracion: 'border border-fuchsia-500/25 bg-fuchsia-500/12 text-fuchsia-400',
  };

  return styles[tipo];
};

const getStatusClasses = (estado: RHComunicado['estado']) => {
  const styles: Record<RHComunicado['estado'], string> = {
    Publicado: 'bg-emerald-500/15 text-emerald-400',
    Programado: 'bg-[#4f5dff]/15 text-[#8fa0ff]',
    Borrador: 'bg-slate-500/20 text-slate-300',
  };

  return styles[estado];
};

export default function Announcements() {
  const t = useHRLanguage();
  const [announcements, setAnnouncements] = useState<RHComunicado[]>(rhComunicadosSeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<(typeof typeFilterOptions)[number]>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<(typeof statusFilterOptions)[number]>('Todos');
  const [selectedAudience, setSelectedAudience] = useState<(typeof audienceFilterOptions)[number]['value']>('all');
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<RHComunicado | null>(null);

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const preview = announcementPreviewById[announcement.id] ?? '';
        const matchesSearch = `${announcement.titulo} ${announcement.destinatarios} ${announcement.autor} ${preview}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'Todos' || announcement.tipo === selectedType;
        const matchesStatus = selectedStatus === 'Todos' || announcement.estado === selectedStatus;
        const matchesAudience =
          selectedAudience === 'all' || getAudienceGroup(announcement.destinatarios) === selectedAudience;

        return matchesSearch && matchesType && matchesStatus && matchesAudience;
      }),
    [announcements, searchQuery, selectedAudience, selectedStatus, selectedType],
  );

  const allVisibleSelected =
    filteredAnnouncements.length > 0 &&
    filteredAnnouncements.every((announcement) => selectedAnnouncementIds.includes(announcement.id));

  const handleToggleAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedAnnouncementIds((current) =>
        Array.from(new Set([...current, ...filteredAnnouncements.map((announcement) => announcement.id)])),
      );
      return;
    }

    setSelectedAnnouncementIds((current) =>
      current.filter((id) => !filteredAnnouncements.some((announcement) => announcement.id === id)),
    );
  };

  const handleToggleRow = (announcementId: string) => {
    setSelectedAnnouncementIds((current) =>
      current.includes(announcementId)
        ? current.filter((id) => id !== announcementId)
        : [...current, announcementId],
    );
  };

  const handleDeleteAnnouncement = () => {
    if (!announcementToDelete) {
      return;
    }

    setAnnouncements((current) =>
      current.filter((announcement) => announcement.id !== announcementToDelete.id),
    );
    setSelectedAnnouncementIds((current) =>
      current.filter((id) => id !== announcementToDelete.id),
    );
    setAnnouncementToDelete(null);
  };

  const handleExport = () => {
    const header = [
      t.announcements.table.title,
      t.announcements.table.type,
      t.announcements.table.recipients,
      t.announcements.table.publicationDate,
      t.announcements.table.reads,
      t.announcements.table.status,
      'Autor',
    ];
    const rows = filteredAnnouncements.map((announcement) => {
      const readStats = readStatsById[announcement.id] ?? { read: 0, total: 0 };
      const readPercentage = readStats.total > 0 ? Math.round((readStats.read / readStats.total) * 100) : 0;

      return [
        announcement.titulo,
        announcement.tipo,
        announcement.destinatarios,
        announcement.fecha,
        `${readStats.read}/${readStats.total} (${readPercentage}%)`,
        announcement.estado,
        announcement.autor,
      ];
    });

    const csvContent = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hr-announcements.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 dark:border-[#143675]/30 dark:bg-[#143675]/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">📢</span>
              {t.announcements.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.announcements.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 border-[#143675]/30 bg-white/70 text-[#143675] hover:bg-[#143675] hover:text-white dark:border-[#4a7bc8]/30 dark:bg-gray-800/50 dark:text-white dark:hover:bg-[#143675]"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              {t.announcements.export}
            </Button>
            <Button className="gap-2 bg-[#3121a8] text-white hover:bg-[#261882]" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.announcements.newAnnouncement}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-gray-200 bg-white/95 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/95">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {t.announcements.searchLabel}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.announcements.searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#4f5dff] focus:ring-2 focus:ring-[#4f5dff]/20 dark:border-gray-700 dark:bg-gray-700/50 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {t.announcements.type}
            </label>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as (typeof typeFilterOptions)[number])}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#4f5dff] focus:ring-2 focus:ring-[#4f5dff]/20 dark:border-gray-700 dark:bg-gray-700/50 dark:text-white"
            >
              {typeFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'Todos' ? t.announcements.all : t.announcements.types[option]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {t.announcements.status}
            </label>
            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as (typeof statusFilterOptions)[number])
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#4f5dff] focus:ring-2 focus:ring-[#4f5dff]/20 dark:border-gray-700 dark:bg-gray-700/50 dark:text-white"
            >
              {statusFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'Todos' ? t.announcements.all : t.announcements.statuses[option]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {t.announcements.audience}
            </label>
            <select
              value={selectedAudience}
              onChange={(event) =>
                setSelectedAudience(event.target.value as (typeof audienceFilterOptions)[number]['value'])
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#4f5dff] focus:ring-2 focus:ring-[#4f5dff]/20 dark:border-gray-700 dark:bg-gray-700/50 dark:text-white"
            >
              {audienceFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t.announcements.audiences[option.value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-sm dark:border-gray-700 dark:bg-gray-800/95">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-700/60">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => handleToggleAllVisible(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 bg-transparent text-[#4f5dff] focus:ring-[#4f5dff]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.title}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.type}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.recipients}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.publicationDate}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.reads}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.status}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {t.announcements.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAnnouncements.map((announcement) => {
                const [scheduledDate, scheduledTime] = announcement.fecha.split(' · ');
                const readStats = readStatsById[announcement.id] ?? { read: 0, total: 0 };
                const readPercentage = readStats.total > 0 ? Math.round((readStats.read / readStats.total) * 100) : 0;

                return (
                  <tr
                    key={announcement.id}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedAnnouncementIds.includes(announcement.id)}
                        onChange={() => handleToggleRow(announcement.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 bg-transparent text-[#4f5dff] focus:ring-[#4f5dff]"
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {announcement.titulo}
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                        {announcementPreviewById[announcement.id] ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTypeClasses(
                          announcement.tipo,
                        )}`}
                      >
                        {t.announcements.types[announcement.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                      {announcement.destinatarios}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {scheduledDate}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {scheduledTime ?? '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                      {readStats.read}/{readStats.total} ({readPercentage}%)
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                          announcement.estado,
                        )}`}
                      >
                        {t.announcements.statuses[announcement.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-3 text-sm">
                        <button
                          type="button"
                          className="text-[#6f8fff] transition hover:text-[#90a5ff]"
                          title="Editar"
                          onClick={() => setIsModalOpen(true)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="text-red-500 transition hover:text-red-400"
                          title="Eliminar"
                          onClick={() => setAnnouncementToDelete(announcement)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NuevoComunicadoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          const nextId = `COM-${300 + announcements.length + 1}`;
          const estadoMap: Record<'draft' | 'scheduled' | 'published', RHComunicado['estado']> = {
            draft: 'Borrador',
            scheduled: 'Programado',
            published: 'Publicado',
          };
          const tipoMap: Record<'general' | 'urgent' | 'reminder' | 'celebration', RHComunicado['tipo']> = {
            general: 'General',
            urgent: 'Urgente',
            reminder: 'Recordatorio',
            celebration: 'Celebracion',
          };

          setAnnouncements((current) => [
            {
              id: nextId,
              titulo: data.titulo,
              tipo: tipoMap[data.tipo] ?? 'General',
              destinatarios:
                data.destinatarios === 'all'
                  ? 'Todo el personal'
                  : data.destinatarios === 'departments'
                    ? 'Departamentos seleccionados'
                    : data.destinatarios === 'units'
                      ? 'Unidades seleccionadas'
                      : 'Destinatarios específicos',
              estado: estadoMap[data.estado] ?? 'Borrador',
              fecha: `${data.fechaProgramada || new Date().toLocaleDateString('es-MX')} · ${data.horaProgramada || '09:00'}`,
              autor: 'RH Central',
            },
            ...current,
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

      <ConfirmDeleteDialog
        isVisible={announcementToDelete !== null}
        title="Eliminar comunicado"
        itemName={announcementToDelete?.titulo}
        description="Este comunicado se eliminará de la lista."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteAnnouncement}
        onCancel={() => setAnnouncementToDelete(null)}
      />
    </>
  );
}
