import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/obra.types';

interface TopbarProps {
  onNavigate: (section: string) => void;
  obraTitulo?: string;
}

function getInitials(nombre: string): string {
  const cleaned = nombre.replace(/^(Ing\.|Lic\.|Arq\.|Mtro\.|Dr\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export const Topbar: React.FC<TopbarProps> = ({
  onNavigate,
  obraTitulo = 'Contrato: OP-2024-001 · Puente Vehicular',
}) => {
  const { user, loginAsRole } = useAuth();

  if (!user) return null;

  const isAdmin = user.rol === 'ADMINISTRADOR';
  const isDirectivo = user.rol === 'DIRECTIVO';

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3 text-sm min-w-0">
        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
          {isAdmin ? 'Panel de Administración del Sistema' : obraTitulo}
        </span>
        {isDirectivo && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            Solo lectura
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <select
          aria-label="Simular rol"
          value={user.rol}
          onChange={(e) => {
            const newRole = e.target.value as UserRole;
            loginAsRole(newRole);
            onNavigate(newRole === 'ADMINISTRADOR' ? 'admin-usuarios' : 'inicio');
          }}
          className="text-xs border border-amber-300 bg-amber-50 text-amber-900 rounded-md px-2.5 py-1.5 font-medium cursor-pointer"
        >
          <option value="RESIDENTE">Simular: Residente</option>
          <option value="SUPERVISOR">Simular: Supervisor</option>
          <option value="SUPERINTENDENTE">Simular: Superintendente</option>
          <option value="DIRECTIVO">Simular: Directivo</option>
          <option value="ADMINISTRADOR">Simular: Administrador</option>
        </select>

        <button
          type="button"
          aria-label="Notificaciones"
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 relative cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-brand rounded-full absolute top-1.5 right-1.5" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-brand font-bold text-xs flex items-center justify-center">
            {getInitials(user.nombre)}
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{user.rol}</p>
            <p className="text-slate-500">{user.nombre}</p>
          </div>
        </div>
      </div>
    </header>
  );
};