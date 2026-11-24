import React, { useState } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

interface ProgramaActividad {
  id: string;
  claveConcepto: string;
  nombre: string;
  frente: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  cantidadProgramada: number;
  cantidadAprobada: number;
  unidad: string;
}

const FECHA_CORTE_SIMULADA = '2024-10-14';
const CONTRATO_INICIO = '2024-05-06';

const INITIAL_PROGRAMA: ProgramaActividad[] = [
  {
    id: 'prog-1',
    claveConcepto: 'SUP-012',
    nombre: 'Montaje de trabes prefabricadas AASHTO IV',
    frente: 'Superestructura · Frente 01',
    fechaInicio: '2024-07-01',
    fechaFin: '2024-10-10',
    cantidadProgramada: 16,
    cantidadAprobada: 16,
    unidad: 'pza',
  },
  {
    id: 'prog-2',
    claveConcepto: 'EST-001',
    nombre: 'Colado de losa en tramo central',
    frente: 'Estructura · Frente 02',
    fechaInicio: '2024-08-15',
    fechaFin: '2024-10-12', // Vencida respecto al corte 2024-10-14 con < 100% -> Roja (RN-SUP-04.1)
    cantidadProgramada: 420,
    cantidadAprobada: 315,
    unidad: 'm³',
  },
  {
    id: 'prog-3',
    claveConcepto: 'TER-008',
    nombre: 'Relleno y compactación de accesos',
    frente: 'Terracerías · Frente 03',
    fechaInicio: '2024-09-20',
    fechaFin: '2024-11-30',
    cantidadProgramada: 1850,
    cantidadAprobada: 592,
    unidad: 'm³',
  },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const ProgramaPage: React.FC = () => {
  const { user } = useAuth();
  const [actividades, setActividades] = useState<ProgramaActividad[]>(INITIAL_PROGRAMA);
  const [contratoFin, setContratoFin] = useState('2024-12-20');
  const [suspendida, setSuspendida] = useState(false);
  const [diasSuspension, setDiasSuspension] = useState(7);
  const [modalAction, setModalAction] = useState<'SUSPENDER' | 'REANUDAR' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isResidente = user?.rol === 'RESIDENTE';

  const overdueCount = actividades.filter((a) => {
    const pct = (a.cantidadAprobada / a.cantidadProgramada) * 100;
    return !suspendida && a.fechaFin < FECHA_CORTE_SIMULADA && pct < 100;
  }).length;

  const handleConfirmSuspensionFlow = () => {
    if (modalAction === 'SUSPENDER') {
      setSuspendida(true);
      setFeedback(
        'Obra marcada como SUSPENDIDA (RN-RES-02.2): reloj de atrasos en ruta crítica pausado y captura de nuevos generadores bloqueada.'
      );
    } else if (modalAction === 'REANUDAR') {
      const delta = Math.max(1, diasSuspension);
      setSuspendida(false);
      setContratoFin((prev) => addDays(prev, delta));
      setActividades((prev) =>
        prev.map((act) => {
          const pct = (act.cantidadAprobada / act.cantidadProgramada) * 100;
          if (pct >= 100) return act;
          return { ...act, fechaFin: addDays(act.fechaFin, delta) };
        })
      );
      setFeedback(
        `Obra reanudada (RF-SYS-01): se desplazaron automáticamente +${delta} días naturales las fechas fin pendientes y el término contractual.`
      );
    }
    setModalAction(null);
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Plazo contractual: {CONTRATO_INICIO} al {contratoFin} · Corte: {FECHA_CORTE_SIMULADA}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight">
              Programa de ejecución y ruta crítica
            </h1>
            <StatusBadge status={suspendida ? 'SUSPENDIDA' : 'EN_EJECUCION'} />
          </div>
        </div>

        {/* Simulación de suspensión / reanudación exclusiva del Residente (RN-RES-02.2 / RF-SYS-01) */}
        {isResidente && (
          <div className="flex flex-wrap items-center gap-2">
            {suspendida ? (
              <>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span>Δ días:</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={diasSuspension}
                    onChange={(e) => setDiasSuspension(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setModalAction('REANUDAR')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Registrar reanudación</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setModalAction('SUSPENDER')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Emitir suspensión temporal</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Banners normativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Fechas programadas bloqueadas contra edición manual tras inicio de contrato (RN-SUPT-02.3).
          </span>
        </div>

        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs ${
            overdueCount > 0
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {overdueCount > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{overdueCount} actividad(es) con desfase en ruta crítica</strong> (fecha fin vencida
                sin alcanzar el 100 % · RN-SUP-04.1).
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {suspendida
                  ? 'Reloj de ruta crítica pausado por suspensión vigente.'
                  : 'Sin actividades vencidas en ruta crítica al corte actual.'}
              </span>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center justify-between gap-2">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Tabla de actividades */}
      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
              Partidas programadas y cumplimiento
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Volúmenes consistentes con catálogo (RN-SUPT-02.2)
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {actividades.map((act) => {
            const pct = Math.round((act.cantidadAprobada / act.cantidadProgramada) * 100);
            const isOverdue = !suspendida && act.fechaFin < FECHA_CORTE_SIMULADA && pct < 100;
            const isDone = pct >= 100;

            return (
              <div
                key={act.id}
                className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isOverdue ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-brand">{act.claveConcepto}</span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {act.nombre}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                        Atraso crítico
                      </span>
                    )}
                    {isDone && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                        Concluida
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {act.frente} · Inicio: <strong>{act.fechaInicio}</strong> · Fin programado:{' '}
                    <strong className={isOverdue ? 'text-rose-600 dark:text-rose-400' : ''}>
                      {act.fechaFin}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-right">
                    <p>
                      Aprobado: <strong>{act.cantidadAprobada}</strong> / {act.cantidadProgramada}{' '}
                      {act.unidad}
                    </p>
                  </div>
                  <div className="w-40 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Cumplimiento</span>
                      <span
                        className={`font-semibold ${
                          isOverdue ? 'text-rose-600' : isDone ? 'text-emerald-600' : 'text-brand'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOverdue ? 'bg-rose-600' : isDone ? 'bg-emerald-600' : 'bg-brand'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmActionModal
        open={modalAction !== null}
        title={
          modalAction === 'SUSPENDER'
            ? 'Firmar suspensión temporal de obra'
            : 'Firmar reanudación y recalendarizar'
        }
        description={
          modalAction === 'SUSPENDER'
            ? 'Al firmar la nota de suspensión temporal, la obra pasará a estado SUSPENDIDA y se pausará el contador de atrasos.'
            : `Al confirmar la reanudación, el sistema sumará automáticamente +${diasSuspension} días naturales a las fechas fin pendientes y al término contractual (RF-SYS-01).`
        }
        confirmLabel={modalAction === 'SUSPENDER' ? 'Firmar suspensión' : 'Firmar reanudación'}
        tone={modalAction === 'SUSPENDER' ? 'warning' : 'brand'}
        requireSignature
        requireReason={modalAction === 'SUSPENDER'}
        reasonLabel="Causa justificada de la suspensión temporal"
        onCancel={() => setModalAction(null)}
        onConfirm={handleConfirmSuspensionFlow}
      />
    </div>
  );
};