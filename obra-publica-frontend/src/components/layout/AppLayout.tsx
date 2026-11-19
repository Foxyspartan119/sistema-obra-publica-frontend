import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ObraTabs } from './ObraTabs';

interface AppLayoutProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  children: React.ReactNode;
}

const OBRA_SECTIONS = new Set([
  'inicio',
  'catalogo',
  'programa',
  'bitacora',
  'estimaciones',
  'cierre',
]);

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeSection,
  onNavigate,
  children,
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const showObraTabs = user.rol !== 'ADMINISTRADOR' && OBRA_SECTIONS.has(activeSection);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar activeSection={activeSection} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onNavigate={onNavigate} />

        <main className="flex-1 p-6 overflow-y-auto">
          {showObraTabs && <ObraTabs activeTab={activeSection} onSelectTab={onNavigate} />}
          {children}
        </main>
      </div>
    </div>
  );
};