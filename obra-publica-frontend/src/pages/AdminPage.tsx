import React, { useMemo, useState } from 'react';
import {
  Search,
  Info,
  Plus,
  RefreshCw,
  MapPin,
  Lock,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/obra.types';
import { puedeCambiarEstatusUsuario } from '../utils/businessRules';
import {
  INITIAL_ADMIN_USERS,
  INITIAL_AUDIT_PREVIEW,
  type AdminUserRecord,
  type AuditLogPreviewItem,
} from '../mocks/admin.mock';
import { AdminVinculacionTab } from '../components/admin/AdminVinculacionTab';
import { AdminCatalogosTab } from '../components/admin/AdminCatalogosTab';
import { AdminLogsTab } from '../components/admin/AdminLogsTab';
import { CreateUserModal } from '../components/admin/CreateUserModal';

type AdminTabId = 'cuentas' | 'vinculacion' | 'catalogos' | 'logs';

interface AdminPageProps {
  activeSubSection?: string;
}

const OPERATIONAL_ROLES: readonly UserRole[] = [
  'RESIDENTE',
  'SUPERVISOR',
  'SUPERINTENDENTE',
  'DIRECTIVO',
];

function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMINISTRADOR':
      return 'Administrador';
    case 'SUPERINTENDENTE':
      return 'Superintendente';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'RESIDENTE':
      return 'Residente';
    case 'DIRECTIVO':
      return 'Directivo';
  }
}

function mapSectionToTab(section?: string): AdminTabId {
  switch (section) {
    case 'admin-obras':
      return 'vinculacion';
    case 'admin-catalogos':
      return 'catalogos';
    case 'admin-logs':
      return 'logs';
    default:
      return 'cuentas';
  }
}

export const AdminPage: React.FC<AdminPageProps> = ({ activeSubSection }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabId>(() =>
    mapSectionToTab(activeSubSection)
  );
  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
  const [logs, setLogs] = useState<AuditLogPreviewItem[]>(INITIAL_AUDIT_PREVIEW);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  const pageSize = 10;

  React.useEffect(() => {
    setActiveTab(mapSectionToTab(activeSubSection));
  }, [activeSubSection]);

  const totalRegistrados = 32 + (users.length - INITIAL_ADMIN_USERS.length);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q) ||
        u.obrasAsignadas.some((obra) => obra.toLowerCase().includes(q))
    );
  }, [users, searchTerm]);

  const appendAuditLog = (
    accion: AuditLogPreviewItem['accion'],
    detalle: string
  ) => {
    const now = new Date();
    const hora = now.toTimeString().slice(0, 8);
    const newItem: AuditLogPreviewItem = {
      id: `log-${Date.now()}`,
      fechaHora: `14 oct 2024 · ${hora}`,
      actor: user?.nombre ?? 'Ana Solís',
      accion,
      detalle,
    };
    setLogs((prev) => [newItem, ...prev.slice(0, 3)]);
  };

  const handleToggleStatus = (targetUser: AdminUserRecord) => {
    setFeedbackError(null);
    setOpenMenuUserId(null);
    if (!user) return;

    if (!puedeCambiarEstatusUsuario(user, targetUser.id)) {
      setFeedbackError(
        'Acción bloqueada: Un Administrador autenticado no puede suspender su propia cuenta.'
      );
      return;
    }

    const nextStatus = targetUser.estado === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';

    if (targetUser.rol === 'ADMINISTRADOR' && nextStatus === 'SUSPENDIDO') {
      const activeAdmins = users.filter(
        (u) => u.rol === 'ADMINISTRADOR' && u.estado === 'ACTIVO'
      ).length;
      if (activeAdmins <= 1) {
        setFeedbackError(
          'Acción bloqueada: El sistema debe mantener al menos 1 Administrador activo.'
        );
        return;
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, estado: nextStatus } : u))
    );
    appendAuditLog(
      nextStatus === 'SUSPENDIDO' ? 'Suspender' : 'Autorizar',
      `${
        nextStatus === 'SUSPENDIDO' ? 'Suspensión lógica' : 'Reactivación'
      } de cuenta para ${targetUser.nombre}`
    );
  };

  const handleRoleChange = (targetUser: AdminUserRecord, newRole: UserRole) => {
    setFeedbackError(null);
    if (!user || targetUser.rol === newRole) return;

    if (user.id === targetUser.id) {
      setFeedbackError(
        'Acción bloqueada: Un Administrador autenticado no puede cambiar su propio rol.'
      );
      return;
    }

    if (targetUser.obrasAsignadas.length > 0 || targetUser.tieneHistorialOperativo) {
      setFeedbackError(
        `Cambio de rol bloqueado: ${targetUser.nombre} cuenta con asignaciones o historial previo. Debe suspenderse la cuenta anterior y crear una nueva.`
      );
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, rol: newRole } : u))
    );
    appendAuditLog(
      'Autorizar',
      `Asignación de rol ${formatRoleLabel(newRole)} a ${targetUser.nombre}`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-fg-muted ">
          <span className="uppercase tracking-wider">Administración del sistema</span>
          <span className="inline-flex items-center gap-1.5 font-normal">
            <RefreshCw className="w-3 h-3" />
            Actualizado hoy, 08:45 h
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2.5">
            <h1 className="text-2xl font-normal text-fg tracking-tight">
              Administración de usuarios y accesos
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted ">
              <span className="px-2.5 py-1 rounded-md bg-info-bg text-accent font-semibold">
                {totalRegistrados} usuarios registrados
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Dirección de Obras
              </span>
              <span>Última auditoría: 14 oct 2024</span>
            </div>
          </div>

          {activeTab === 'cuentas' && (
            <button
              type="button"
              onClick={() => {
                setFeedbackError(null);
                setCreateUserModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              Crear nuevo usuario
              </button>
          )}
        </div>
      </div>

      {feedbackError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-danger-fg" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="text-danger-fg hover:underline font-medium shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {activeTab === 'cuentas' && (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar usuario, correo o proyecto"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-line text-fg placeholder:text-fg-muted focus:border-brand"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-line text-xs text-fg-muted ">
              <Info className="w-3.5 h-3.5 shrink-0 text-fg-muted" />
              <span>
                Roles disponibles: Residente, Supervisor, Superintendente, Directivo
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-line ">
              <h2 className="text-sm font-semibold text-fg ">
                Listado de usuarios
              </h2>
              <span className="text-xs text-fg-muted">
                {totalRegistrados} usuarios registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas/80 text-[10px] font-medium text-fg-muted uppercase tracking-wider border-b border-line ">
                    <th className="py-2.5 px-5">Usuario</th>
                    <th className="py-2.5 px-4">Correo</th>
                    <th className="py-2.5 px-4">Rol Único</th>
                    <th className="py-2.5 px-4">Obras Asignadas</th>
                    <th className="py-2.5 px-4">Estatus</th>
                    <th className="py-2.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {filteredUsers.map((row) => {
                    const isCurrentAdmin = user?.id === row.id;
                    const roleLocked =
                      row.rol === 'ADMINISTRADOR' ||
                      row.obrasAsignadas.length > 0 ||
                      row.tieneHistorialOperativo;
                    const isActive = row.estado === 'ACTIVO';
                    const isMenuOpen = openMenuUserId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-subtle/60 transition-colors"
                      >
                        <td className="py-2.5 px-5">
                          <div className="font-medium text-fg ">
                            {row.nombre}
                          </div>
                          <div className="text-[10px] text-fg-muted">{row.area}</div>
                        </td>

                        <td className="py-2.5 px-4 text-fg-muted ">
                          {row.correo}
                        </td>

                        <td className="py-2.5 px-4">
                          {row.rol === 'ADMINISTRADOR' ? (
                            <span className="font-semibold text-fg ">
                              Administrador
                            </span>
                          ) : (
                            <div className="relative inline-flex items-center w-40">
                              <select
                                aria-label={`Rol único de ${row.nombre}`}
                                value={row.rol}
                                disabled={roleLocked}
                                onChange={(e) =>
                                  handleRoleChange(row, e.target.value as UserRole)
                                }
                                className={`w-full appearance-none rounded-md border px-2.5 py-1.5 pr-7 text-xs font-medium transition-colors ${
                                  roleLocked
                                    ? 'bg-subtle border-line-strong text-fg-muted cursor-not-allowed'
                                    : 'bg-canvas border-line-strong text-fg cursor-pointer hover:border-line-strong'
                                }`}
                              >
                                {OPERATIONAL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {formatRoleLabel(r)}
                                  </option>
                                ))}
                              </select>
                              {roleLocked ? (
                                <Lock className="w-3 h-3 text-fg-muted pointer-events-none absolute right-2" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-fg-muted pointer-events-none absolute right-2" />
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {row.obrasAsignadas.length === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-info-bg text-accent text-[11px] font-medium">
                              -
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {row.obrasAsignadas.map((obra) => (
                                <span
                                  key={obra}
                                  className="inline-flex items-center px-2 py-0.5 rounded bg-info-bg text-accent text-[11px] font-medium"
                                >
                                  {obra}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {row.rol === 'ADMINISTRADOR' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-ok-bg text-ok-fg text-[11px] font-semibold">
                              Activo
                            </span>
                          ) : (
                            <div
                              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                isActive
                                  ? 'bg-ok-bg text-ok-fg '
                                  : 'bg-danger-bg text-danger-fg '
                              }`}
                            >
                              <span>{isActive ? 'Activo' : 'Suspendido'}</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                aria-label={`Cambiar estatus de ${row.nombre}`}
                                disabled={isCurrentAdmin}
                                onClick={() => handleToggleStatus(row)}
                                className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                                  isActive
                                    ? 'bg-ok-solid justify-end'
                                    : 'bg-rose-300 justify-start'
                                } ${
                                  isCurrentAdmin
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                              >
                                <span className="w-3 h-3 rounded-full bg-surface block" />
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-5 text-right relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuUserId((prev) =>
                                prev === row.id ? null : row.id
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line-strong bg-surface hover:bg-subtle text-[11px] font-medium text-fg-soft cursor-pointer"
                          >
                            <span>Acciones</span>
                            <ChevronDown
                              className={`w-3 h-3 text-fg-muted transition-transform ${
                                isMenuOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-5 mt-1 w-48 bg-surface border border-line-strong rounded-lg shadow-lg py-1 z-30 text-left text-xs">
                              {row.rol !== 'ADMINISTRADOR' && !isCurrentAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(row)}
                                  className={`w-full text-left px-3 py-1.5 hover:bg-subtle  cursor-pointer font-medium ${
                                    isActive
                                      ? 'text-danger-fg '
                                      : 'text-ok-fg '
                                  }`}
                                >
                                  {isActive
                                    ? 'Suspender cuenta (lógica)'
                                    : 'Reactivar cuenta'}
                                </button>
                              ) : (
                                <span className="block px-3 py-1.5 text-[11px] text-fg-muted">
                                  Cuenta protegida
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  setActiveTab('vinculacion');
                                }}
                                className="w-full text-left px-3 py-1.5 text-fg-soft hover:bg-subtle cursor-pointer"
                              >
                                Gestionar obras asignadas
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 border-t border-line flex items-center justify-between text-xs text-fg-muted ">
              <span>
                Mostrando 1–{Math.min(pageSize, filteredUsers.length)} de{' '}
                {totalRegistrados} usuarios
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-md border border-line-strong text-fg-muted disabled:opacity-50 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-md border border-line-strong text-fg-soft hover:bg-subtle cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg ">
                Vista previa de trazabilidad / logs
              </h3>
              <span className="px-2.5 py-1 rounded-md bg-info-bg text-accent text-[11px] font-semibold">
                Inmutable
              </span>
            </div>

            <div className="divide-y divide-line text-xs">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <span className="w-44 text-[11px] text-fg-muted shrink-0">
                    {entry.fechaHora}
                  </span>
                  <span className="w-44 font-medium text-fg shrink-0">
                    {entry.actor}
                  </span>
                  <span className="w-28 font-medium text-fg-soft shrink-0">
                    {entry.accion}
                  </span>
                  <span className="flex-1 text-fg-muted ">
                    {entry.detalle}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Esta vista muestra registros inmutables de la trazabilidad del sistema.
              </span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'vinculacion' && <AdminVinculacionTab />}
      {activeTab === 'catalogos' && <AdminCatalogosTab />}
      {activeTab === 'logs' && <AdminLogsTab />}

      <CreateUserModal
        open={createUserModalOpen}
        existingEmails={users.map((u) => u.correo)}
        onClose={() => setCreateUserModalOpen(false)}
        onCreateUser={(newUserData) => {
          const created: AdminUserRecord = {
            ...newUserData,
            id: Date.now(),
          };
          setUsers((prev) => [created, ...prev]);
          appendAuditLog(
            'Crear',
            `Cuenta de usuario para ${created.nombre} (${created.rol})`
          );
          }}
          />
    </div>
  );
};

