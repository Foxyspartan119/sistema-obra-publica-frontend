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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useObra } from '../../context/ObraContext';
import type { AccessibilityTheme, UserRole } from '../../types/obra.types';
import { StatusBadge } from '../common/StatusBadge';


interface AppLayoutProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  children: React.ReactNode;
}

const THEME_OPTIONS: readonly { id: AccessibilityTheme; name: string; tag: string }[] = [
  { id: 'claro', name: 'Claro', tag: 'Por defecto' },
  { id: 'alto-contraste', name: 'Alto contraste', tag: 'Exteriores' },
  { id: 'oscuro', name: 'Oscuro', tag: 'Poca luz' },
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
  const { user, theme, setTheme, loginAsRole, logout } = useAuth();
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
        { id: 'obras', label: 'Mis obras', icon: HardHat },
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
    <div className="h-screen w-full overflow-hidden flex bg-slate-50 dark:bg-slate-950 hc:bg-white text-slate-900 dark:text-slate-100 hc:text-black">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:static w-64 h-full bg-sidebar text-slate-300 flex flex-col shrink-0 select-none overflow-y-auto transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        >
          <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold">
              OB
            </div>
            <div>
              <p className="text-white font-bold leading-tight">OBRA</p>
              <p className="text-xs text-slate-400">Gestión de obra pública</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {isAdmin ? 'Administración' : 'Principal'}
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-brand text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Accessibility className="w-4 h-4" />
                Accesibilidad
              </span>
              {accOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {accOpen && (
              <div className="mt-1 mx-1 p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer ${
                      theme === opt.id
                        ? 'bg-brand/20 text-blue-300 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{opt.name}</span>
                    <span className="text-[10px] opacity-75">{opt.tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="p-2.5 rounded-lg bg-slate-900/70">
            <p className="text-slate-500 text-[10px] uppercase">Espacio de trabajo</p>
            <p className="text-slate-200 font-medium">Dirección de Obras</p>
            <p className="text-[11px] text-slate-500">Administración 2024–2027</p>
          </div>
          <button
            type="button"
            onClick={() => logout(false)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
        </aside>
      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 shrink-0 bg-white dark:bg-slate-900 hc:bg-white border-b border-slate-200 dark:border-slate-800 hc:border-black px-4 sm:px-6 flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-3 text-sm min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú lateral"
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {isAdmin ? (
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                Panel de Administración
              </span>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {selectedObra.id} · {selectedObra.nombre}
                </span>
                <div className="hidden sm:block shrink-0">
                  <StatusBadge status={selectedObra.estado} />
                </div>
              </div>
            )}

            {isDirectivo && (
              <span className="hidden xl:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
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
              className="hidden sm:block text-xs border border-amber-300 bg-amber-50 text-amber-900 rounded-md px-2 py-1 font-medium cursor-pointer"
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
                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {systemAlerts.length > 0 && (
                  <span className="w-2 h-2 bg-rose-600 rounded-full absolute top-1.5 right-1.5" />
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Alertas del sistema ({systemAlerts.length})
                    </span>
                    {systemAlerts.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedAlertsIds(systemAlerts.map((a) => a.id))
                        }
                        className="text-[11px] text-brand hover:underline cursor-pointer"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  {systemAlerts.length === 0 ? (
                    <p className="py-4 text-center text-[11px] text-slate-400">
                      Sin alertas pendientes por atender.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {systemAlerts.map((alerta) => (
                        <div
                          key={alerta.id}
                          className={`p-2.5 rounded-lg border ${
                            alerta.urgent
                              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                            {alerta.urgent ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
                            )}
                            <span>{alerta.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {alerta.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-brand font-bold text-xs flex items-center justify-center">
                {getUserInitials(user.nombre)}
              </div>
              <div className="hidden md:block text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{user.rol}</p>
                <p className="text-slate-500">{user.nombre}</p>
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