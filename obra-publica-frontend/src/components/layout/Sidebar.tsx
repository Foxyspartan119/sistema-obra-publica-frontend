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
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AccessibilityTheme } from '../../types/obra.types';

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const THEME_OPTIONS: readonly { id: AccessibilityTheme; name: string; tag: string }[] = [
  { id: 'claro', name: 'Claro', tag: 'Por defecto' },
  { id: 'alto-contraste', name: 'Alto contraste', tag: 'Exteriores' },
  { id: 'oscuro', name: 'Oscuro', tag: 'Poca luz' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onNavigate }) => {
  const { user, theme, setTheme, logout } = useAuth();
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
    <aside className="w-64 bg-sidebar text-slate-300 flex flex-col shrink-0 select-none">
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
              type="button"
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

        <div className="pt-3">
          <button
            type="button"
            onClick={() => setAccOpen((prev) => !prev)}
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
  );
};