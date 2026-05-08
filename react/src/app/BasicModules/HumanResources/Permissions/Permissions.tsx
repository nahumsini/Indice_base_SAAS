import { useMemo, useState } from 'react';
import { CreatePermissionModal, type PermissionFormData } from './components/CreatePermissionModal';
import { PermissionColumnsModal, type PermissionColumn } from './components/PermissionColumnsModal';
import { PermissionDetailModal } from './components/PermissionDetailModal';
import { PermissionFilters } from './components/PermissionFilters';
import { PermissionHeaderBar } from './components/PermissionHeaderBar';
import { PermissionKpiStrip } from './components/PermissionKpiStrip';
import { PermissionsTable, type PermissionColumnId } from './components/PermissionsTable';
import { mockPermissions } from './data/permissions.mock';
import type { PermissionItem, PermissionFilterState } from './types/permissions.types';

const defaultVisiblePermissionColumns: PermissionColumnId[] = [
  'folio',
  'employee',
  'type',
  'startDate',
  'endDate',
  'days',
  'status',
  'actions',
];

const permissionColumns: PermissionColumn[] = [
  { id: 'folio', label: 'Folio', locked: true },
  { id: 'employee', label: 'Employee', locked: true },
  { id: 'type', label: 'Type' },
  { id: 'startDate', label: 'Start date' },
  { id: 'endDate', label: 'End date' },
  { id: 'days', label: 'Days' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', locked: true },
];

export default function Permissions() {
  const [permissions, setPermissions] = useState<PermissionItem[]>(mockPermissions);
  const [filters, setFilters] = useState<PermissionFilterState>({
    search: '',
    status: 'all',
    type: 'all',
    employee: 'all',
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [visiblePermissionColumns, setVisiblePermissionColumns] = useState<PermissionColumnId[]>(
    defaultVisiblePermissionColumns,
  );
  const [selectedPermission, setSelectedPermission] = useState<PermissionItem | null>(null);

  const isManager = true;

  const filteredPermissions = useMemo(() => {
    return permissions.filter((permission) => {
      const searchLower = filters.search.toLowerCase().trim();
      if (searchLower) {
        const matchesSearch = permission.employee.name.toLowerCase().includes(searchLower)
          || permission.folio.toLowerCase().includes(searchLower);
        if (!matchesSearch) {
          return false;
        }
      }

      if (filters.status !== 'all' && permission.status !== filters.status) {
        return false;
      }

      if (filters.type !== 'all' && permission.type !== filters.type) {
        return false;
      }

      if (filters.employee !== 'all' && permission.employee.name !== filters.employee) {
        return false;
      }

      return true;
    });
  }, [filters, permissions]);

  const stats = useMemo(() => {
    return {
      total: permissions.length,
      pending: permissions.filter((permission) => permission.status === 'pending').length,
      approved: permissions.filter((permission) => permission.status === 'approved').length,
      rejected: permissions.filter((permission) => permission.status === 'rejected').length,
    };
  }, [permissions]);

  const handleCreatePermission = (data: PermissionFormData) => {
    const nextId = `${permissions.length + 1}`;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const newPermission: PermissionItem = {
      id: nextId,
      folio: `PER-2026-${String(permissions.length + 1).padStart(3, '0')}`,
      employee: {
        name: 'Current User',
        avatar: '',
        initials: 'CU',
      },
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      days: data.halfDay ? totalDays - 0.5 : totalDays,
      status: 'pending',
      reason: data.reason,
      attachmentName: data.attachment?.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPermissions((current) => [newPermission, ...current]);
    setIsCreateModalOpen(false);
  };

  const handleApprove = (id: string) => {
    setPermissions((current) => current.map((permission) => (
      permission.id === id
        ? { ...permission, status: 'approved', updatedAt: new Date().toISOString() }
        : permission
    )));
  };

  const handleReject = (id: string) => {
    setPermissions((current) => current.map((permission) => (
      permission.id === id
        ? { ...permission, status: 'rejected', updatedAt: new Date().toISOString() }
        : permission
    )));
  };

  const handleToggleColumn = (columnId: string) => {
    const column = permissionColumns.find((item) => item.id === columnId);
    if (column?.locked) {
      return;
    }

    setVisiblePermissionColumns((current) =>
      current.includes(columnId as PermissionColumnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId as PermissionColumnId],
    );
  };

  return (
    <div className="space-y-6">
      <PermissionHeaderBar
        onColumns={() => setIsColumnsModalOpen(true)}
        onCreate={() => setIsCreateModalOpen(true)}
      />

      <PermissionFilters filters={filters} onFiltersChange={setFilters} isManager={isManager} permissions={permissions} />

      <PermissionKpiStrip
        approved={stats.approved}
        pending={stats.pending}
        rejected={stats.rejected}
        total={stats.total}
        visible={filteredPermissions.length}
      />

      <PermissionsTable
        permissions={filteredPermissions}
        visibleColumns={visiblePermissionColumns}
        onView={(permission) => {
          setSelectedPermission(permission);
          setIsDetailModalOpen(true);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        isManager={isManager}
      />

      <PermissionColumnsModal
        columns={permissionColumns}
        isOpen={isColumnsModalOpen}
        visibleColumns={visiblePermissionColumns}
        onClose={() => setIsColumnsModalOpen(false)}
        onToggleColumn={handleToggleColumn}
      />

      <CreatePermissionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePermission}
      />

      <PermissionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        permission={selectedPermission}
        onApprove={handleApprove}
        onReject={handleReject}
        isManager={isManager}
      />
    </div>
  );
}
