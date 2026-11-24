import React, { useMemo, useState } from 'react';
import { ShieldAlert, Search } from 'lucide-react';

interface AuditLogRow {
  id: string;
  timestampUtc: string;
  usuario: string;
  rol: string;
  obra: string;
  accion: string;
  ipOrigen: string;
}

const LOGS_MOCK: AuditLogRow[] = [
  {
    id: 'log-1',
    timestampUtc: '2026-11-24 18:40:12 UTC',
    usuario: 'Ana Solís',
    rol: 'ADMINISTRADOR',
    obra: 'GLOBAL',
    accion: 'SUSPENSION_USUARIO_CASCADA',
    ipOrigen: '10.20.4.15',
  },
  {
    id: 'log-2',
    timestampUtc: '2026-11-24 16:12:05 UTC',
    usuario: 'Ing. Lucía Ramírez',
    rol: 'SUPERVISOR',
    obra: 'OP-2024-001',
    accion: 'FIRMA_REPORTE_SUPERVISION_SHA256',
    ipOrigen: '10.20.8.91',
  },
  {
    id: 'log-3',
    timestampUtc: '2026-11-24 14:05:49 UTC',
    usuario: 'Ing. Marco Torres',
    rol: 'RESIDENTE',
    obra: 'OP-2024-001',
    accion: 'AUTORIZACION_ESTIMACION_PAGO',
    ipOrigen: '10.20.4.22',
  },
];

export const AdminLogsTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20; // RNF-REN-03: tamaño de página por defecto de 20

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOGS_MOCK;
    return LOGS_MOCK.filter(
      (l) =>
        l.usuario.toLowerCase().includes(q) ||
        l.accion.toLowerCase().includes(q) ||
        l.obra.toLowerCase().includes(q) ||
        l.rol.toLowerCase().includes(q)
    );
  }, [query]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrar bitácora de auditoría por usuario, rol, obra o acción"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          />
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-brand" />
          Registros inmutables (retención ≥ 5 años · RNF-SEG-03)
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-180 text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-semibold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Marca UTC</th>
                <th className="py-3 px-3">Usuario / Rol</th>
                <th className="py-3 px-3">Obra</th>
                <th className="py-3 px-3">Acción</th>
                <th className="py-3 px-4 text-right">IP Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.timestampUtc}</td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{log.usuario}</span>{' '}
                    <span className="text-[10px] text-brand font-semibold">({log.rol})</span>
                  </td>
                  <td className="py-3 px-3 font-medium">{log.obra}</td>
                  <td className="py-3 px-3 font-mono text-[11px]">{log.accion}</td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                    {log.ipOrigen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};