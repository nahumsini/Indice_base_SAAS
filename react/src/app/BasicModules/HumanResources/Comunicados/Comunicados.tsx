import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Plus, Search, Users } from 'lucide-react';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { NuevoComunicadoModal } from '../../../components/NuevoComunicadoModal';
import { SuccessToast } from '../../../components/SuccessToast';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { humanResourcesApi, type AnnouncementListItem, type BackendEmployee } from '../../../api/humanResources';

const statusClasses: Record<AnnouncementListItem['status'], string> = {
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const typeLabels: Record<AnnouncementListItem['type'], string> = {
  general: 'General',
  urgent: 'Urgente',
  reminder: 'Recordatorio',
  celebration: 'Celebración',
};

const statusLabels: Record<AnnouncementListItem['status'], string> = {
  published: 'Publicado',
  scheduled: 'Programado',
  draft: 'Borrador',
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

export default function Comunicados() {
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [summary, setSummary] = useState({
    total_count: 0,
    published_count: 0,
    scheduled_count: 0,
    draft_count: 0,
  });
  const [employees, setEmployees] = useState<BackendEmployee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');

  const filteredAnnouncements = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return announcements;
    }

    return announcements.filter((announcement) =>
      `${announcement.title} ${announcement.author_name} ${announcement.audience_summary}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [announcements, searchQuery]);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [announcementsResponse, employeesResponse] = await Promise.all([
        humanResourcesApi.listAnnouncements(),
        humanResourcesApi.listEmployees(),
      ]);

      setAnnouncements(announcementsResponse.items);
      setSummary(announcementsResponse.summary);
      setEmployees(employeesResponse.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los comunicados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (data: {
    titulo: string;
    tipo: 'general' | 'urgent' | 'reminder' | 'celebration';
    destinatarios: 'all' | 'units' | 'departments' | 'employees';
    unidades: string[];
    departamentos: string[];
    colaboradoresEspecificos: number[];
    contenido: string;
    estado: 'draft' | 'scheduled' | 'published';
    fechaProgramada: string;
    horaProgramada: string;
  }) => {
    const scheduledFor =
      data.estado === 'scheduled' && data.fechaProgramada && data.horaProgramada
        ? `${data.fechaProgramada}T${data.horaProgramada}:00`
        : undefined;

    try {
      setIsSubmitting(true);

      await runWithMinimumDuration(
        humanResourcesApi.createAnnouncement({
          title: data.titulo,
          type: data.tipo,
          content: data.contenido,
          audience_type: data.destinatarios,
          status: data.estado,
          scheduled_for: scheduledFor,
          unit_ids: data.destinatarios === 'units' ? data.unidades : undefined,
          department_names: data.destinatarios === 'departments' ? data.departamentos : undefined,
          employee_ids: data.destinatarios === 'employees' ? data.colaboradoresEspecificos : undefined,
        }),
        850,
      );

      await loadAnnouncements();
      setIsModalOpen(false);
      setSuccessToastMessage(
        data.estado === 'draft'
          ? 'Comunicado guardado como borrador.'
          : data.estado === 'scheduled'
            ? 'Comunicado programado correctamente.'
            : 'Comunicado publicado correctamente.',
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear el comunicado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title="Guardando comunicado"
        description="Estamos registrando el anuncio y sincronizando el tablero de RH."
      />

      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />

      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void loadAnnouncements()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 dark:border-[#143675]/30 dark:bg-[#143675]/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">📢</span>
              Comunicados
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Publicaciones internas con persistencia, programación y segmentación real.
            </p>
          </div>
          <Button className="bg-[#143675] text-white hover:bg-[#0f2855]" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo comunicado
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Publicados</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.published_count}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Disponibles para el equipo</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Programados</p>
            <p className="mt-2 text-3xl font-bold text-sky-600 dark:text-sky-400">{summary.scheduled_count}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Pendientes de salir</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Borradores</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{summary.draft_count}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">En preparación</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Alcance base</p>
            <p className="mt-2 text-3xl font-bold text-[#143675] dark:text-[#8bb3ff]">{employees.length}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Colaboradores disponibles</p>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Título, autor o alcance"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Comunicado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Destinatarios</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Programación</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Autor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))
              ) : filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay comunicados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <tr key={announcement.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{announcement.title}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{typeLabels[announcement.type]}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        {announcement.audience_summary}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[announcement.status]}`}>
                        {statusLabels[announcement.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDateTime(announcement.scheduled_for || announcement.published_at || announcement.created_at)}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {announcement.status === 'published'
                            ? 'Publicado'
                            : announcement.status === 'scheduled'
                              ? 'Pendiente'
                              : 'Sin publicar'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{announcement.author_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevoComunicadoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          void handleCreateAnnouncement(data);
        }}
        colaboradores={employees.map((employee) => ({
          id: employee.id,
          nombre: employee.full_name,
          puesto: employee.position_title || employee.position || employee.department || 'Sin puesto',
          unidad: employee.unit_id ?? 0,
          departamento: employee.department,
        }))}
      />
    </>
  );
}
