import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AccessibilityTheme, UserRole } from '../../types/obra.types';

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

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeSection,
  onNavigate,
  children,
}) => {
  const { user, theme, setTheme, loginAsRole, logout } = useAuth();
  const [accOpen, setAccOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.rol === 'ADMINISTRADOR';
  const isDirectivo = user.rol === 'DIRECTIVO';

  const navItems = isAdmin
    ? [
        { id: 'admin-usuarios', label: 'Gestión de Usuarios', icon: Users },
        { id: 'admin-obras', label: 'Asignación de Obras', icon: HardHat },
        { id: 'admin-catalogos', label: 'Catálogos Maestros', icon: ListChecks },
        { id: 'admin-logs', label: 'Logs de Auditoría', icon: BookOpen },
      ]
    : [
        { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
        { id: 'catalogo', label: 'Catálogo de conceptos', icon: ListChecks },
        { id: 'programa', label: 'Programa de ejecución', icon: CalendarClock },
        { id: 'bitacora', label: 'Bitácora', icon: BookOpen },
        { id: 'estimaciones', label: 'Estimaciones', icon: Calculator },
        { id: 'cierre', label: 'Documentos y Cierre', icon: FolderOpen },
        ...(isDirectivo ? [{ id: 'reportes', label: 'Reportes', icon: BarChart3 }] : []),
      ];

  return (
    <div className="h-screen w-full overflow-hidden flex bg-slate-50 dark:bg-slate-950 hc:bg-white text-slate-900 dark:text-slate-100 hc:text-black">
      <div className="h-full shrink-0 overflow-y-auto">
        {/* Sidebar */}
        <aside className="h-full w-64 bg-sidebar text-slate-300 flex flex-col shrink-0 select-none overflow-y-auto">
          <div className="p-5 flex items-center gap-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold">
              OB
            </div>
            <div>
              <p className="text-white font-bold leading-tight">OBRA</p>
              <p className="text-xs text-slate-400">Gestión de obra pública</p>
            </div>
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
                onClick={() => onNavigate(item.id)}
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
              onClick={() => logout(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 shrink-0 bg-white dark:bg-slate-900 hc:bg-white border-b border-slate-200 dark:border-slate-800 hc:border-black px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isAdmin ? 'Panel de Administración' : 'Contrato: OP-2024-001 · Puente Vehicular'}
            </span>
            {isDirectivo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Modo de consulta (Solo lectura)
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <select
              aria-label="Simular rol"
              value={user.rol}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                loginAsRole(newRole);
                onNavigate(newRole === 'ADMINISTRADOR' ? 'admin-usuarios' : 'inicio');
              }}
              className="text-xs border border-amber-300 bg-amber-50 text-amber-900 rounded-md px-2 py-1 font-medium cursor-pointer"
            >
              <option value="RESIDENTE">Simular: Residente</option>
              <option value="SUPERVISOR">Simular: Supervisor</option>
              <option value="SUPERINTENDENTE">Simular: Superintendente</option>
              <option value="DIRECTIVO">Simular: Directivo</option>
              <option value="ADMINISTRADOR">Simular: Administrador</option>
            </select>

            <button className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 relative cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-brand rounded-full absolute top-1.5 right-1.5" />
            </button>

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-brand font-bold text-xs flex items-center justify-center">
                {user.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{user.rol}</p>
                <p className="text-slate-500">{user.nombre}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};