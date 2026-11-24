import React, { useState } from 'react';
import { Plus, MailCheck, Layers } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface CatalogEntry {
  id: string;
  grupo: 'Dominio / Correo Autorizado' | 'Unidad de Medida' | 'Tipo de Documento';
  valor: string;
  alcance: string;
  enUso: boolean;
  activo: boolean;
}

const INITIAL_ENTRIES: CatalogEntry[] = [
  {
    id: 'cat-1',
    grupo: 'Dominio / Correo Autorizado',
    valor: '@obra.gob.mx',
    alcance: 'Roles internos (Admin, Directivo, Residente, Supervisor)',
    enUso: true,
    activo: true,
  },
  {
    id: 'cat-2',
    grupo: 'Dominio / Correo Autorizado',
    valor: '@constructoradelnorte.mx',
    alcance: 'Superintendente · Contrato vigente SOP-LP-024/2024',
    enUso: true,
    activo: true,
  },
  {
    id: 'cat-3',
    grupo: 'Unidad de Medida',
    valor: 'm³',
    alcance: 'Volumetría y conceptos de obra',
    enUso: true,
    activo: true,
  },
  {
    id: 'cat-4',
    grupo: 'Tipo de Documento',
    valor: 'Dictamen Técnico APU',
    alcance: 'Inyección de conceptos extraordinarios',
    enUso: false,
    activo: true,
  },
];

export const AdminCatalogosTab: React.FC = () => {
  const [entries, setEntries] = useState<CatalogEntry[]>(INITIAL_ENTRIES);
  const [valor, setValor] = useState('');
  const [grupo, setGrupo] = useState<CatalogEntry['grupo']>('Dominio / Correo Autorizado');
  const [alcance, setAlcance] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor.trim()) return;
    setEntries((prev) => [
      {
        id: `cat-${Date.now()}`,
        grupo,
        valor: valor.trim(),
        alcance: alcance.trim() || 'Catálogo institucional',
        enUso: false,
        activo: true,
      },
      ...prev,
    ]);
    setValor('');
    setAlcance('');
  };

  // RN-ADM-05.1: Solo inactivación lógica (nunca borrado físico)
  const toggleActivo = (id: string) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, activo: !item.activo } : item))
    );
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAdd}
        className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 space-y-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <MailCheck className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Catálogos maestros y diccionario de correos autorizados (RF-ADM-01.8 / RF-ADM-05)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={grupo}
            onChange={(e) => setGrupo(e.target.value as CatalogEntry['grupo'])}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
          >
            <option value="Dominio / Correo Autorizado">Dominio / Correo Autorizado</option>
            <option value="Unidad de Medida">Unidad de Medida</option>
            <option value="Tipo de Documento">Tipo de Documento</option>
          </select>
          <input
            type="text"
            placeholder="Valor (ej. @contratista.mx o kg)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <input
            type="text"
            placeholder="Alcance o contrato vinculado"
            value={alcance}
            onChange={(e) => setAlcance(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar en catálogo</span>
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {entries.map((item) => (
          <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Layers className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{item.valor}</span>
                  <span className="text-[10px] text-slate-400">· {item.grupo}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.alcance}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={item.activo ? 'ACTIVO' : 'SUSPENDIDO'} />
              <button
                type="button"
                onClick={() => toggleActivo(item.id)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand text-[11px] font-medium cursor-pointer"
              >
                {item.activo ? 'Marcar inactivo' : 'Reactivar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};