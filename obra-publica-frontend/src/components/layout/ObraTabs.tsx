import React from 'react';

export interface ObraTabItem {
  id: string;
  label: string;
}

const OBRA_TABS: readonly ObraTabItem[] = [
  { id: 'inicio', label: 'Resumen' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'programa', label: 'Programa' },
  { id: 'bitacora', label: 'Bitácora' },
  { id: 'estimaciones', label: 'Estimaciones' },
  { id: 'cierre', label: 'Documentos y Cierre' },
];

interface ObraTabsProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const ObraTabs: React.FC<ObraTabsProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
      <div className="flex items-center gap-6 min-w-max">
        {OBRA_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
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
  );
};