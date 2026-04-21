import { useMemo, useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { CreatePermissionModal, type PermissionFormData } from './components/CreatePermissionModal';
import { PermissionDetailModal } from './components/PermissionDetailModal';
import { PermissionFilters } from './components/PermissionFilters';
import { PermissionsTable } from './components/PermissionsTable';
import { mockPermissions } from './data/permissions.mock';
import type { PermissionItem, PermissionFilterState } from './types/permissions.types';

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

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gray-100 px-6 py-8 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-white">
              <Calendar className="h-8 w-8" />
              Permissions & Absences
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Manage employee requests, vacations, and absences
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          📋 <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span> total requests
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="flex items-center gap-1.5">
          ⏳ <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.pending}</span> pending
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="flex items-center gap-1.5">
          ✓ <span className="font-medium text-green-600 dark:text-green-400">{stats.approved}</span> approved
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="flex items-center gap-1.5">
          ✕ <span className="font-medium text-red-600 dark:text-red-400">{stats.rejected}</span> rejected
        </span>
      </div>

      <PermissionFilters filters={filters} onFiltersChange={setFilters} isManager={isManager} permissions={permissions} />

      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredPermissions.length} of {permissions.length} requests
      </div>

      <PermissionsTable
        permissions={filteredPermissions}
        onView={(permission) => {
          setSelectedPermission(permission);
          setIsDetailModalOpen(true);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        isManager={isManager}
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
