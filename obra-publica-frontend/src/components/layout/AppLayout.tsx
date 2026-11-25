import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  HardHat,
  ListChecks,
  CalendarClock,
  BookOpen,
  Calculator,
  FolderOpen,
  BarChart3,
  Users,
  Accessibility,
  ChevronDown,
  ChevronUp,
  Bell,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth, type Appearance } from '../../context/AuthContext';
import { useObra } from '../../context/ObraContext';
import type { UserRole } from '../../types/obra.types';
import { StatusBadge } from '../common/StatusBadge';


interface AppLayoutProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  children: React.ReactNode;
}

const APPEARANCE_OPTIONS: readonly { id: Appearance; name: string; icon: typeof Sun }[] = [
  { id: 'claro', name: 'Claro', icon: Sun },
  { id: 'oscuro', name: 'Oscuro', icon: Moon },
];

function getUserInitials(fullName: string): string {
  const clean = fullName.replace(/^(ing\.|arq\.|lic\.|dr\.)\s+/i, '').trim(); // Remove common prefixes
  const parts = clean.split(/\s+/).filter(Boolean); // Split by whitespace and remove empty parts
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase(); // First two letters of the single name
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase(); // First letters of the first two names
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeSection,
  onNavigate,
  children,
}) => {
  const { user, appearance, setAppearance, highContrast, setHighContrast, loginAsRole, logout } =
    useAuth();
  const { obras, selectedObra} = useObra();
  const [accOpen, setAccOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlertsIds] = useState<string[]>([]);

  const isAdmin = user?.rol === 'ADMINISTRADOR';
  const isDirectivo = user?.rol === 'DIRECTIVO';

  const systemAlerts = useMemo(() => {
    const vacantes = obras
    .filter((o) => o.estado === 'ALERTA_VACANTE_OPERATIVA')
    .map((o) => ({
      id: `vac-${o.id}`,
      urgent: true,
      title: `Vacante operativa en obra ${o.id}`,
      detail: `Requiere suplente de ${o.vacanteRol ?? 'personal operativo'} (RN-ADM-03.4).`,
    }));

    return [
      ...vacantes,
      {
        id: 'plazo-est-06',
        urgent: true,
        title: 'Plazo de revisión · Estimación N.° 06',
        detail: 'Dia 12 de 15 naturales para dictmen de Supervisión (RF-SUP-06).',
      },
      {
        id: 'lab-ter-008',
        urgent: false,
        title: 'Control de calidad · Concepto TER-008',
        detail: 'Ensayo de compactación registrado en Supervisión (RN-SUP-03.3).',
      },
    ].filter((a) => !dismissedAlerts.includes(a.id));
  }, [obras, dismissedAlerts]);

  if (!user) return null;

  const navItems = isAdmin
    ? [
        { id: 'admin-usuarios', label: 'Gestión de Usuarios', icon: Users },
        { id: 'admin-obras', label: 'Asignación de Obras', icon: HardHat },
        { id: 'admin-catalogos', label: 'Catálogos Maestros', icon: ListChecks },
        { id: 'admin-logs', label: 'Logs de Auditoría', icon: BookOpen },
      ]
    : [
        { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
        { id: 'mis-obras', label: 'Mis obras', icon: HardHat },
        { id: 'catalogo', label: 'Catálogo de conceptos', icon: ListChecks },
        { id: 'programa', label: 'Programa de ejecución', icon: CalendarClock },
        { id: 'bitacora', label: 'Bitácora', icon: BookOpen },
        { id: 'estimaciones', label: 'Estimaciones', icon: Calculator },
        { id: 'cierre', label: 'Documentos y Cierre', icon: FolderOpen },
        ...(isDirectivo ? [{ id: 'reportes', label: 'Reportes', icon: BarChart3 }] : []),
      ];

  const handleSelectNav = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  }

  return (
    <div className="h-screen w-full overflow-hidden flex bg-canvas text-fg ">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:static w-64 h-full bg-sidebar text-sidebar-fg flex flex-col shrink-0 select-none overflow-y-auto transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        >
          <div className="p-5 flex items-center justify-between border-b border-sidebar-line">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold">
              OB
            </div>
            <div>
              <p className="text-white font-bold leading-tight">OBRA</p>
              <p className="text-xs text-sidebar-muted">Gestión de obra pública</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-sidebar-muted hover:text-white cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">
            {isAdmin ? 'Administración' : 'Principal'}
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-active-bg text-active-fg'
                    : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Acordeón de Accesibilidad */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setAccOpen(!accOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-fg hover:bg-sidebar-hover transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Accessibility className="w-4 h-4" />
                Accesibilidad
              </span>
              {accOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {accOpen && (
              <div className="mt-1 mx-1 p-3 rounded-lg bg-sidebar-panel border border-sidebar-line space-y-3 text-xs">
                <div>
                  <p
                    id="a11y-appearance"
                    className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted"
                  >
                    Apariencia
                  </p>
                  <div
                    role="group"
                    aria-labelledby="a11y-appearance"
                    className="grid grid-cols-2 gap-1 p-1 rounded-md border border-sidebar-line"
                  >
                    {APPEARANCE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = appearance === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setAppearance(opt.id)}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded font-medium cursor-pointer ${
                            selected
                              ? 'bg-active-bg text-active-fg'
                              : 'text-sidebar-fg hover:bg-sidebar-hover'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          {opt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={highContrast}
                  onClick={() => setHighContrast(!highContrast)}
                  className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-md border border-sidebar-line hover:bg-sidebar-hover text-left cursor-pointer"
                >
                  <span>
                    <span className="block font-semibold text-sidebar-fg">Alto contraste</span>
                    <span className="block text-[11px] text-sidebar-muted">
                      Exteriores · se combina con Claro u Oscuro
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${
                      highContrast ? 'bg-active-bg' : 'bg-sidebar-hover border border-sidebar-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                        highContrast ? 'left-4.5 bg-active-fg' : 'left-0.5 bg-sidebar-muted'
                      }`}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-line text-xs text-sidebar-muted space-y-2">
          <div className="p-2.5 rounded-lg bg-sidebar-panel">
            <p className="text-sidebar-muted text-[10px] uppercase">Espacio de trabajo</p>
            <p className="text-sidebar-fg font-medium">Dirección de Obras</p>
            <p className="text-[11px] text-sidebar-muted">Administración 2024–2027</p>
          </div>
          <button
            type="button"
            onClick={() => logout(false)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sidebar-muted hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
        </aside>
      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 shrink-0 bg-surface border-b border-line px-4 sm:px-6 flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-3 text-sm min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú lateral"
              className="lg:hidden p-1.5 rounded-lg border border-line-strong text-fg-soft cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {isAdmin ? (
              <span className="font-semibold text-fg-soft truncate">
                Panel de Administración
              </span>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-semibold text-fg-soft truncate">
                  {selectedObra.id} · {selectedObra.nombre}
                </span>
                <div className="hidden sm:block shrink-0">
                  <StatusBadge status={selectedObra.estado} />
                </div>
              </div>
            )}

            {isDirectivo && (
              <span className="hidden xl:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-subtle text-fg-soft border border-line-strong shrink-0">
                Modo de consulta (Solo lectura)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <select
              aria-label="Simular rol"
              value={user.rol}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                loginAsRole(newRole);
                onNavigate(newRole === 'ADMINISTRADOR' ? 'admin-usuarios' : 'inicio');
              }}
              className="hidden sm:block text-xs border border-warn-line bg-warn-bg text-warn-fg rounded-md px-2 py-1 font-medium cursor-pointer"
            >
              <option value="RESIDENTE">Simular: Residente</option>
              <option value="SUPERVISOR">Simular: Supervisor</option>
              <option value="SUPERINTENDENTE">Simular: Superintendente</option>
              <option value="DIRECTIVO">Simular: Directivo</option>
              <option value="ADMINISTRADOR">Simular: Administrador</option>
            </select>

            {/* Campana de notificaciones (RNF-USA-03) */}
            <div className="relative">
              <button
                type="button"
                aria-label="Alertas del sistema"
                onClick={() => setAlertsOpen((prev) => !prev)}
                className="p-2 text-fg-muted hover:text-fg-soft relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {systemAlerts.length > 0 && (
                  <span className="w-2 h-2 bg-danger-solid rounded-full absolute top-1.5 right-1.5" />
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface border border-line-strong rounded-xl shadow-xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-line ">
                    <span className="font-semibold text-fg ">
                      Alertas del sistema ({systemAlerts.length})
                    </span>
                    {systemAlerts.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedAlertsIds(systemAlerts.map((a) => a.id))
                        }
                        className="text-[11px] text-accent hover:underline cursor-pointer"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  {systemAlerts.length === 0 ? (
                    <p className="py-4 text-center text-[11px] text-fg-muted">
                      Sin alertas pendientes por atender.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {systemAlerts.map((alerta) => (
                        <div
                          key={alerta.id}
                          className={`p-2.5 rounded-lg border ${
                            alerta.urgent
                              ? 'bg-warn-bg/70 border-warn-line '
                              : 'bg-subtle border-line-strong '
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-fg ">
                            {alerta.urgent ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-warn-fg shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                            )}
                            <span>{alerta.title}</span>
                          </div>
                          <p className="text-[11px] text-fg-muted mt-1">
                            {alerta.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pl-3 border-l border-line-strong ">
              <div className="w-8 h-8 rounded-full bg-info-bg text-accent font-bold text-xs flex items-center justify-center">
                {getUserInitials(user.nombre)}
              </div>
              <div className="hidden md:block text-xs">
                <p className="font-semibold text-fg ">{user.rol}</p>
                <p className="text-fg-muted">{user.nombre}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};