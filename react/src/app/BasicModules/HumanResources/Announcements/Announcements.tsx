import { useMemo, useState } from 'react';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { RHComunicado, rhColaboradores, rhComunicadosSeed } from '../mockData';
import { AnnouncementColumnsModal, type AnnouncementColumn } from './components/AnnouncementColumnsModal';
import { AnnouncementFilters } from './components/AnnouncementFilters';
import { AnnouncementHeaderBar } from './components/AnnouncementHeaderBar';
import { AnnouncementKpiStrip } from './components/AnnouncementKpiStrip';
import { AnnouncementTable } from './components/AnnouncementTable';
import { CreateAnnouncementModal } from './components/CreateAnnouncementModal';

const announcementPreviewById: Record<string, string> = {
  'COM-301': 'Next Saturday there will be changes to operating schedules for the involved units.',
  'COM-302': 'Please complete pending evaluations before the end of the week.',
  'COM-303': 'This month we celebrate three team birthdays.',
};

const readStatsById: Record<string, { read: number; total: number }> = {
  'COM-301': { read: 18, total: 22 },
  'COM-302': { read: 7, total: 8 },
  'COM-303': { read: 0, total: 22 },
};

const audienceFilterOptions = [
  { value: 'all', label: 'All audiences' },
  { value: 'operations', label: 'Operations' },
  { value: 'leaders', label: 'Leaders' },
  { value: 'everyone', label: 'All employees' },
] as const;

const typeFilterOptions = ['All', 'General', 'Urgent', 'Reminder', 'Celebration'] as const;
const statusFilterOptions = ['All', 'Published', 'Scheduled', 'Draft'] as const;
const defaultVisibleColumnIds = ['type', 'audience', 'publication', 'reads', 'status'] as const;
const announcementColumns: AnnouncementColumn[] = [
  { id: 'type', label: 'Type' },
  { id: 'audience', label: 'Audience' },
  { id: 'publication', label: 'Publication' },
  { id: 'reads', label: 'Reads' },
  { id: 'status', label: 'Status' },
  { id: 'author', label: 'Author' },
];

const typeFilterMap: Partial<Record<(typeof typeFilterOptions)[number], RHComunicado['tipo']>> = {
  Celebration: 'Celebracion',
  General: 'General',
  Reminder: 'Recordatorio',
  Urgent: 'Urgente',
};

const statusFilterMap: Partial<Record<(typeof statusFilterOptions)[number], RHComunicado['estado']>> = {
  Draft: 'Borrador',
  Published: 'Publicado',
  Scheduled: 'Programado',
};

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
    Celebracion: 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300',
    General: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
    Recordatorio: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    Urgente: 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
  };

  return styles[tipo];
};

const getStatusClasses = (estado: RHComunicado['estado']) => {
  const styles: Record<RHComunicado['estado'], string> = {
    Borrador: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    Programado: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    Publicado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return styles[estado];
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<RHComunicado[]>(rhComunicadosSeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<(typeof typeFilterOptions)[number]>('All');
  const [selectedStatus, setSelectedStatus] = useState<(typeof statusFilterOptions)[number]>('All');
  const [selectedAudience, setSelectedAudience] = useState<(typeof audienceFilterOptions)[number]['value']>('all');
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...defaultVisibleColumnIds]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<RHComunicado | null>(null);

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const preview = announcementPreviewById[announcement.id] ?? '';
        const matchesSearch = `${announcement.titulo} ${announcement.destinatarios} ${announcement.autor} ${preview}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'All' || announcement.tipo === typeFilterMap[selectedType];
        const matchesStatus = selectedStatus === 'All' || announcement.estado === statusFilterMap[selectedStatus];
        const matchesAudience =
          selectedAudience === 'all' || getAudienceGroup(announcement.destinatarios) === selectedAudience;

        return matchesSearch && matchesType && matchesStatus && matchesAudience;
      }),
    [announcements, searchQuery, selectedAudience, selectedStatus, selectedType],
  );

  const announcementSummary = useMemo(() => {
    const publishedCount = announcements.filter((announcement) => announcement.estado === 'Publicado').length;
    const scheduledCount = announcements.filter((announcement) => announcement.estado === 'Programado').length;
    const draftCount = announcements.filter((announcement) => announcement.estado === 'Borrador').length;
    const readTotals = announcements.reduce(
      (current, announcement) => {
        const readStats = readStatsById[announcement.id] ?? { read: 0, total: 0 };
        current.read += readStats.read;
        current.total += readStats.total;
        return current;
      },
      { read: 0, total: 0 },
    );

    return {
      draftCount,
      publishedCount,
      readRate: readTotals.total > 0 ? `${Math.round((readTotals.read / readTotals.total) * 100)}%` : '0%',
      scheduledCount,
      totalCount: announcements.length,
    };
  }, [announcements]);

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

  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId],
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
      'Announcement',
      'Type',
      'Audience',
      'Publication',
      'Reads',
      'Status',
      'Author',
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
      <AnnouncementHeaderBar
        onAdd={() => setIsModalOpen(true)}
        onColumns={() => setIsColumnsModalOpen(true)}
        onExport={handleExport}
      />

      <AnnouncementFilters
        audienceOptions={audienceFilterOptions}
        searchQuery={searchQuery}
        selectedAudience={selectedAudience}
        selectedStatus={selectedStatus}
        selectedType={selectedType}
        statusOptions={statusFilterOptions}
        typeOptions={typeFilterOptions}
        onAudienceChange={(value) =>
          setSelectedAudience(value as (typeof audienceFilterOptions)[number]['value'])
        }
        onSearchChange={setSearchQuery}
        onStatusChange={(value) => setSelectedStatus(value as (typeof statusFilterOptions)[number])}
        onTypeChange={(value) => setSelectedType(value as (typeof typeFilterOptions)[number])}
      />

      <AnnouncementKpiStrip
        draftCount={announcementSummary.draftCount}
        publishedCount={announcementSummary.publishedCount}
        readRate={announcementSummary.readRate}
        scheduledCount={announcementSummary.scheduledCount}
        selectedCount={selectedAnnouncementIds.length}
        totalCount={announcementSummary.totalCount}
        visibleCount={filteredAnnouncements.length}
      />

      <AnnouncementTable
        allVisibleSelected={allVisibleSelected}
        announcements={filteredAnnouncements}
        getStatusClasses={getStatusClasses}
        getTypeClasses={getTypeClasses}
        readStatsById={readStatsById}
        selectedAnnouncementIds={selectedAnnouncementIds}
        visibleColumns={visibleColumns}
        onDelete={setAnnouncementToDelete}
        onEdit={() => setIsModalOpen(true)}
        onToggleAllVisible={handleToggleAllVisible}
        onToggleRow={handleToggleRow}
      />

      <AnnouncementColumnsModal
        columns={announcementColumns}
        isOpen={isColumnsModalOpen}
        visibleColumns={visibleColumns}
        onClose={() => setIsColumnsModalOpen(false)}
        onToggleColumn={handleToggleColumn}
      />

      <CreateAnnouncementModal
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
              titulo: data.title,
              tipo: tipoMap[data.type] ?? 'General',
              destinatarios:
                data.audienceType === 'all'
                  ? 'Todo el personal'
                  : data.audienceType === 'departments'
                    ? 'Departamentos seleccionados'
                    : data.audienceType === 'units'
                      ? 'Unidades seleccionadas'
                      : 'Destinatarios específicos',
              estado: estadoMap[data.status] ?? 'Borrador',
              fecha: `${data.scheduledDate || new Date().toLocaleDateString('es-MX')} · ${data.scheduledTime || '09:00'}`,
              autor: 'RH Central',
            },
            ...current,
          ]);
          setIsModalOpen(false);
        }}
        employees={rhColaboradores.map(({ id, nombre, puesto, unidad, departamento }) => ({
          id,
          name: nombre,
          position: puesto,
          unit: unidad,
          department: departamento,
        }))}
      />

      <ConfirmDeleteDialog
        isVisible={announcementToDelete !== null}
        title="Delete announcement"
        itemName={announcementToDelete?.titulo}
        description="This announcement will be removed from the list."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAnnouncement}
        onCancel={() => setAnnouncementToDelete(null)}
      />
    </>
  );
}
