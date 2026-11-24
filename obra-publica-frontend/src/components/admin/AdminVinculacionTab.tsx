import React, { useState } from 'react';
import { UserPlus, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export interface ObraAsignacionRow {
  obraId: string;
  contrato: string;
  obraNombre: string;
  estadoObra: 'EN_EJECUCION' | 'ALERTA_VACANTE_OPERATIVA' | 'EN_CONFIGURACION' | 'SUSPENDIDA' | 'FINIQUITADA';
  residente: string | null;
  supervisor: string | null;
  superintendente: string | null;
}

const INITIAL_ASIGNACIONES: ObraAsignacionRow[] = [
  {
    obraId: 'OP-2024-001',
    contrato: 'SOP-LP-024/2024',
    obraNombre: 'Construcción de Puente Vehicular OP-2024-001',
    estadoObra: 'EN_EJECUCION',
    residente: 'Ing. Marco Torres',
    supervisor: 'Ing. Lucía Ramírez',
    superintendente: 'Ing. Javier Mendoza',
  },
  {
    obraId: 'OP-2024-002',
    contrato: 'SOP-LP-031/2024',
    obraNombre: 'Rehabilitación de Colector Pluvial Zona Norte',
    estadoObra: 'ALERTA_VACANTE_OPERATIVA',
    residente: null,
    supervisor: 'Ing. Lucía Ramírez',
    superintendente: 'Ing. Javier Mendoza',
  },
];

const CANDIDATOS_POR_ROL: Record<'residente' | 'supervisor' | 'superintendente', string[]> = {
  residente: ['Ing. Marco Torres', 'Ing. Roberto Salas'],
  supervisor: ['Ing. Lucía Ramírez', 'Ing. Sofía Navarro'],
  superintendente: ['Ing. Javier Mendoza', 'Ing. Daniel Cruz'],
};

export const AdminVinculacionTab: React.FC = () => {
  const [filas, setFilas] = useState<ObraAsignacionRow[]>(INITIAL_ASIGNACIONES);
  const [selectedObraId, setSelectedObraId] = useState(INITIAL_ASIGNACIONES[1].obraId);
  const [rolSlot, setRolSlot] = useState<'residente' | 'supervisor' | 'superintendente'>('residente');
  const [usuarioElegido, setUsuarioElegido] = useState(CANDIDATOS_POR_ROL.residente[0]);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handleAsignar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    setFilas((prev) =>
      prev.map((row) => {
        if (row.obraId !== selectedObraId) return row;
        const updated: ObraAsignacionRow = {
          ...row,
          [rolSlot]: usuarioElegido,
        };
        const completo =
          Boolean(updated.residente) &&
          Boolean(updated.supervisor) &&
          Boolean(updated.superintendente);
        if (completo && row.estadoObra === 'ALERTA_VACANTE_OPERATIVA') {
          updated.estadoObra = 'EN_EJECUCION';
        }
        return updated;
      })
    );

    setMensaje(
      `Relevo / asignación registrada en ${selectedObraId} para ${rolSlot.toUpperCase()}: ${usuarioElegido} (RN-ADM-03.5 / RN-ADM-03.7).`
    );
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAsignar}
        className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 space-y-4 text-xs"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Asignación y relevo de personal operativo (RF-ADM-03)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Máximo 1 Residente, 1 Supervisor y 1 Superintendente activos por obra (RN-ADM-03.2).
            </p>
          </div>
          <RefreshCw className="w-4 h-4 text-brand" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500">Obra</label>
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
            >
              {filas.map((f) => (
                <option key={f.obraId} value={f.obraId}>
                  {f.obraId} · {f.obraNombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-500">Área / Rol operativo</label>
            <select
              value={rolSlot}
              onChange={(e) => {
                const nextSlot = e.target.value as 'residente' | 'supervisor' | 'superintendente';
                setRolSlot(nextSlot);
                setUsuarioElegido(CANDIDATOS_POR_ROL[nextSlot][0]);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
            >
              <option value="residente">RESIDENTE</option>
              <option value="supervisor">SUPERVISOR</option>
              <option value="superintendente">SUPERINTENDENTE</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-500">Usuario activo asignado</label>
            <select
              value={usuarioElegido}
              onChange={(e) => setUsuarioElegido(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
            >
              {CANDIDATOS_POR_ROL[rolSlot].map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mensaje && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensaje}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Guardar asignación / relevo</span>
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {filas.map((row) => (
            <div key={row.obraId} className="p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-brand mr-2">{row.obraId}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {row.obraNombre}
                  </span>
                </div>
                <StatusBadge status={row.estadoObra} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Residente</span>
                  <span className="font-medium">
                    {row.residente ?? (
                      <span className="inline-flex items-center gap-1 text-rose-600">
                        <AlertTriangle className="w-3.5 h-3.5" /> Vacante descubierta
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Supervisor</span>
                  <span className="font-medium">{row.supervisor ?? 'Vacante'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Superintendente</span>
                  <span className="font-medium">{row.superintendente ?? 'Vacante'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};