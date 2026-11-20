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

type AdminTabId = 'cuentas' | 'vinculacion' | 'catalogos' | 'logs' ;

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
    const [activeTab, setActiveTab] = useState<AdminTabId>(() => mapSectionToTab(activeSubSection));
    const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
    const [logs, setLogs] = useState<AuditLogPreviewItem[]>(INITIAL_AUDIT_PREVIEW);
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
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
        if(!user) return;

        if(!puedeCambiarEstatusUsuario(user, targetUser.id)) {
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
        `${nextStatus === 'SUSPENDIDO' ? 'Suspensión lógica' : 'Reactivación'} de cuenta para ${targetUser.nombre}`
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
                'Cambio de rol bloqueado: ${targetUser.nombre} cuenta con asignaciones o historial previo. Debe suspenderse la cuenta anterior y crear una nueva.'
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

    const handleQuickCreateUser = () => {
        setFeedbackError(null);
        const nextIndex = users.length + 1;
        const nuevo: AdminUserRecord = {
            id: 100 + nextIndex,
            nombre: `Nuevo Operativo ${nextIndex}`,
            area: 'Residencia',
            correo: `operativo${nextIndex}@obra.gob.mx`,
            rol: 'RESIDENTE',
            obrasAsignadas: [],
            estado: 'ACTIVO',
            tieneHistorialOperativo: false,
        };
        setUsers((prev) => [nuevo, ...prev]);
        appendAuditLog(
            'Crear',
            `Cuenta de usuario para ${nuevo.nombre}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="uppercase tracking-wider">Administración del sistema</span>
          <span className="inline-flex items-center gap-1.5 font-normal">
            <RefreshCw className="w-3 h-3" />
            Actualizado hoy, 08:45 h
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2.5">
            <h1 className="text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
              Administración de usuarios y accesos
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-300 font-semibold">
                {totalRegistrados} usuarios registrados
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Dirección de Obras
              </span>
              <span>Última auditoría: 14 oct 2024</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickCreateUser}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Crear nuevo usuario
          </button>
        </div>
      </div>

      {/* Pestañas superiores */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max text-xs">
          {(
            [
              { id: 'cuentas', label: 'Cuentas y Roles' },
              { id: 'vinculacion', label: 'Vinculación de Proyectos' },
              {
                id: 'catalogos',
                label: 'Catálogos Institucionales (Unidades, Insumos, Documentos)',
              },
              { id: 'logs', label: 'Trazabilidad / Logs' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 font-medium border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-brand text-brand font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerta de regla de negocio cuando se intenta una acción restringida */}
      {feedbackError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="text-rose-600 hover:underline font-medium shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de búsqueda y roles disponibles */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar usuario, correo o proyecto"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>Roles disponibles: Residente, Supervisor, Superintendente, Directivo</span>
        </div>
      </div>

      {activeTab === 'cuentas' && (
        <>
          {/* Tabla Listado de usuarios */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Listado de usuarios
              </h2>
              <span className="text-xs text-slate-400">
                {totalRegistrados} usuarios registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-5">Usuario</th>
                    <th className="py-2.5 px-4">Correo</th>
                    <th className="py-2.5 px-4">Rol Único</th>
                    <th className="py-2.5 px-4">Obras Asignadas</th>
                    <th className="py-2.5 px-4">Estatus</th>
                    <th className="py-2.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredUsers.map((row) => {
                    const isCurrentAdmin = user?.id === row.id;
                    const roleLocked =
                      row.rol === 'ADMINISTRADOR' ||
                      row.obrasAsignadas.length > 0 ||
                      row.tieneHistorialOperativo;
                    const isActive = row.estado === 'ACTIVO';

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-5">
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {row.nombre}
                          </div>
                          <div className="text-[10px] text-slate-400">{row.area}</div>
                        </td>

                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                          {row.correo}
                        </td>

                        <td className="py-2.5 px-4">
                          {row.rol === 'ADMINISTRADOR' ? (
                            <span className="font-semibold text-slate-900 dark:text-white">
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
                                    ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer hover:border-slate-300'
                                }`}
                              >
                                {OPERATIONAL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {formatRoleLabel(r)}
                                  </option>
                                ))}
                              </select>
                              {roleLocked ? (
                                <Lock className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {row.obrasAsignadas.length === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-300 text-[11px] font-medium">
                              -
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {row.obrasAsignadas.map((obra) => (
                                <span
                                  key={obra}
                                  className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-300 text-[11px] font-medium"
                                >
                                  {obra}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {row.rol === 'ADMINISTRADOR' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                              Activo
                            </span>
                          ) : (
                            <div
                              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                isActive
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
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
                                    ? 'bg-emerald-600 justify-end'
                                    : 'bg-rose-300 justify-start'
                                } ${
                                  isCurrentAdmin
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                              >
                                <span className="w-3 h-3 rounded-full bg-white block" />
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(row)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <span>Acciones</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando 1–{Math.min(pageSize, filteredUsers.length)} de {totalRegistrados}{' '}
                usuarios
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 disabled:opacity-50 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          {/* Vista previa de trazabilidad / logs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Vista previa de trazabilidad / logs
              </h3>
              <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-300 text-[11px] font-semibold">
                Inmutable
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <span className="w-44 text-[11px] text-slate-400 shrink-0">
                    {entry.fechaHora}
                  </span>
                  <span className="w-44 font-medium text-slate-800 dark:text-slate-200 shrink-0">
                    {entry.actor}
                  </span>
                  <span className="w-28 font-medium text-slate-700 dark:text-slate-300 shrink-0">
                    {entry.accion}
                  </span>
                  <span className="flex-1 text-slate-500 dark:text-slate-400">
                    {entry.detalle}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Esta vista muestra registros inmutables de la trazabilidad del sistema.</span>
            </div>
          </div>
        </>
      )}

      {activeTab !== 'cuentas' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Módulo administrativo: {activeTab}
          </p>
          <p>
            Estructura preparada para integrar la vinculación de obras (RN-ADM-03), catálogos
            maestros (RF-ADM-05) y consulta completa de logs de auditoría (RNF-SEG-03).
          </p>
        </div>
      )}
    </div>
  );
};
