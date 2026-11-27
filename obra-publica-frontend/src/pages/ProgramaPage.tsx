import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Lock,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import {
  PARTIDAS_CONSTRUCTIVAS,
  calcularAvanceProgramadoAFecha,
  calcularAvanceProgramadoConcepto,
} from '../mocks/catalogoParametrico.mock';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

interface ProgramaActividad {
  id: string;
  claveConcepto: string;
  nombre: string;
  frente: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  cantidadProgramada: number;
  cantidadAprobada: number;
  unidad: string;
}

const FECHA_CORTE_SIMULADA = '2024-10-14';

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const ProgramaPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedObra, selectedConceptos, updateObraStatus } = useObra();

  const initialActivities = useMemo<ProgramaActividad[]>(() => {
    return selectedConceptos.map((c) => {
      const partidaName =
        PARTIDAS_CONSTRUCTIVAS.find((p) => p.id === c.partidaId)?.nombre ?? c.partidaId;
      return {
        id: `prog-${c.clave}`,
        claveConcepto: c.clave,
        nombre: c.descripcion,
        frente: partidaName,
        fechaInicio: c.fecha_inicio_programada,
        fechaFin: c.fecha_fin_programada,
        cantidadProgramada: c.cantidadPresupuestada + c.cantidadAdicionalAutorizada,
        cantidadAprobada: c.cantidadEjecutada,
        unidad: c.unidad,
      };
    });
  }, [selectedConceptos]);

  const [actividades, setActividades] = useState<ProgramaActividad[]>(initialActivities);
  const [contratoFin, setContratoFin] = useState(selectedObra.fechaFinIso ?? '2024-12-20');
  const [suspendida, setSuspendida] = useState(selectedObra.estado === 'SUSPENDIDA');
  const [diasSuspension, setDiasSuspension] = useState(7);
  const [modalAction, setModalAction] = useState<'SUSPENDER' | 'REANUDAR' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setActividades(initialActivities);
    setContratoFin(selectedObra.fechaFinIso ?? '2024-12-20');
    setSuspendida(selectedObra.estado === 'SUSPENDIDA');
  }, [initialActivities, selectedObra.fechaFinIso, selectedObra.estado]);

  const isResidente = user?.rol === 'RESIDENTE';
  const contratoInicio = selectedObra.fechaInicio ?? '2024-05-06';

  const overdueCount = actividades.filter((a) => {
    const pct = a.cantidadProgramada > 0 ? (a.cantidadAprobada / a.cantidadProgramada) * 100 : 0;
    return !suspendida && a.fechaFin < FECHA_CORTE_SIMULADA && pct < 100;
  }).length;

  const avanceProgramadoGlobal = useMemo(() => {
    const fromCatalog = calcularAvanceProgramadoAFecha(
      selectedConceptos,
      FECHA_CORTE_SIMULADA
    );
    return fromCatalog > 0 ? fromCatalog : selectedObra.avanceProgramado;
  }, [selectedConceptos, selectedObra.avanceProgramado]);

  const desviacionGlobal = Number(
    (selectedObra.avanceFisico - avanceProgramadoGlobal).toFixed(1)
  );

  const handleConfirmSuspensionFlow = () => {
    if (modalAction === 'SUSPENDER') {
      setSuspendida(true);
      updateObraStatus(selectedObra.id, 'SUSPENDIDA');
      setFeedback(
        'Obra marcada como SUSPENDIDA (RN-RES-02.2): reloj de atrasos en ruta crítica pausado y captura de nuevos generadores bloqueada.'
      );
    } else if (modalAction === 'REANUDAR') {
      const delta = Math.max(1, diasSuspension);
      setSuspendida(false);
      updateObraStatus(selectedObra.id, 'EN_EJECUCION');
      setContratoFin((prev) => addDays(prev, delta));
      setActividades((prev) =>
        prev.map((act) => {
          const pct =
            act.cantidadProgramada > 0
              ? (act.cantidadAprobada / act.cantidadProgramada) * 100
              : 0;
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            {selectedObra.id} · Plazo contractual: {contratoInicio} al {contratoFin} · Corte:{' '}
            {FECHA_CORTE_SIMULADA}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="text-2xl font-normal text-fg tracking-tight">
              Programa de ejecución y ruta crítica
            </h1>
            <StatusBadge status={suspendida ? 'SUSPENDIDA' : selectedObra.estado} />
          </div>
        </div>

        {isResidente && (
          <div className="flex flex-wrap items-center gap-2">
            {suspendida ? (
              <>
                <label className="inline-flex items-center gap-1.5 text-xs text-fg-soft">
                  <span>Δ días:</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={diasSuspension}
                    onChange={(e) => setDiasSuspension(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-line-strong bg-surface text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setModalAction('REANUDAR')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-ok-solid hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Registrar reanudación</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setModalAction('SUSPENDER')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-warn-solid hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Emitir suspensión temporal</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPIs de porcentajes globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Avance Programado</p>
          <p className="text-2xl font-bold text-fg mt-1">{avanceProgramadoGlobal}%</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Avance Físico Real</p>
          <p className="text-2xl font-bold text-accent mt-1">{selectedObra.avanceFisico}%</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Avance Financiero</p>
          <p className="text-2xl font-bold text-ok-fg mt-1">{selectedObra.avanceFinanciero}%</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Desviación (Real vs. Prog.)</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              desviacionGlobal < 0 ? 'text-warn-fg' : 'text-ok-fg'
            }`}
          >
            {desviacionGlobal >= 0 ? '+' : ''}
            {desviacionGlobal} pp
          </p>
        </div>
      </div>

      {/* GRÁFICA: Programa vs. Real por Concepto / Partida */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Gráfica de Cumplimiento: Programado vs. Real por Concepto
              </h2>
              <p className="text-[11px] text-fg-muted">
                Porcentaje programado calculado al {FECHA_CORTE_SIMULADA} frente al porcentaje real
                ejecutado en cada partida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              <span className="w-3 h-2 rounded-sm bg-fg-muted/70" />
              Programado (%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-accent font-medium">
              <span className="w-3 h-2 rounded-sm bg-brand" />
              Real ejecutado (%)
            </span>
          </div>
        </div>

        <div className="space-y-3.5 text-xs">
          {actividades.map((act) => {
            const pctReal =
              act.cantidadProgramada > 0
                ? Math.min(100, Number(((act.cantidadAprobada / act.cantidadProgramada) * 100).toFixed(1)))
                : 0;
            const pctProg = calcularAvanceProgramadoConcepto(
              act.fechaInicio,
              act.fechaFin,
              FECHA_CORTE_SIMULADA
            );
            const delta = Number((pctReal - pctProg).toFixed(1));
            const isBehind = delta < -5;

            return (
              <div key={`chart-${act.id}`} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-accent mr-2">{act.claveConcepto}</span>
                    <span className="font-medium text-fg">{act.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                    <span className="text-fg-muted">Prog: {pctProg}%</span>
                    <span className="font-bold text-accent">Real: {pctReal}%</span>
                    <span
                      className={`font-semibold ${
                        isBehind ? 'text-danger-fg' : delta < 0 ? 'text-warn-fg' : 'text-ok-fg'
                      }`}
                    >
                      ({delta >= 0 ? '+' : ''}
                      {delta} pp)
                    </span>
                  </div>
                </div>

                {/* Barras comparativas dobles */}
                <div className="space-y-1">
                  <div className="h-2 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fg-muted/70 rounded-full transition-all"
                      style={{ width: `${pctProg}%` }}
                    />
                  </div>
                  <div className="h-2 bg-info-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isBehind ? 'bg-danger-solid' : pctReal >= 100 ? 'bg-ok-solid' : 'bg-brand'
                      }`}
                      style={{ width: `${pctReal}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banners normativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-line text-xs text-fg-soft">
          <Lock className="w-4 h-4 text-fg-muted shrink-0" />
          <span>
            Fechas programadas sincronizadas desde el Catálogo de Conceptos (RN-SUPT-02.3).
          </span>
        </div>

        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs ${
            overdueCount > 0
              ? 'bg-danger-bg border-danger-line text-danger-fg'
              : 'bg-ok-bg border-ok-line text-ok-fg'
          }`}
        >
          {overdueCount > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{overdueCount} actividad(es) con desfase en ruta crítica</strong> (fecha
                fin vencida sin alcanzar el 100 % · RN-SUP-04.1).
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
        <div className="p-3 rounded-lg bg-info-bg border border-info-line text-info-fg text-xs flex items-center justify-between gap-2">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tabla detallada de actividades */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-fg">
              Partidas programadas y cumplimiento ({actividades.length})
            </h2>
          </div>
          <span className="text-[11px] text-fg-muted">
            Volúmenes consistentes con catálogo (RN-SUPT-02.2)
          </span>
        </div>

        <div className="divide-y divide-line">
          {actividades.map((act) => {
            const pctReal =
              act.cantidadProgramada > 0
                ? Math.round((act.cantidadAprobada / act.cantidadProgramada) * 100)
                : 0;
            const pctProg = calcularAvanceProgramadoConcepto(
              act.fechaInicio,
              act.fechaFin,
              FECHA_CORTE_SIMULADA
            );
            const isOverdue =
              !suspendida && act.fechaFin < FECHA_CORTE_SIMULADA && pctReal < 100;
            const isDone = pctReal >= 100;

            return (
              <div
                key={act.id}
                className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isOverdue ? 'bg-danger-bg/40' : ''
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-accent">
                      {act.claveConcepto}
                    </span>
                    <span className="text-xs font-semibold text-fg">{act.nombre}</span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded bg-danger-bg text-danger-fg text-[10px] font-semibold">
                        Atraso crítico
                      </span>
                    )}
                    {isDone && (
                      <span className="px-2 py-0.5 rounded bg-ok-bg text-ok-fg text-[10px] font-semibold">
                        Concluida
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-muted">
                    {act.frente} · Inicio: <strong>{act.fechaInicio}</strong> · Fin programado:{' '}
                    <strong className={isOverdue ? 'text-danger-fg' : ''}>{act.fechaFin}</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  <div className="text-[11px] text-fg-muted sm:text-right">
                    <p>
                      Aprobado: <strong>{act.cantidadAprobada}</strong> / {act.cantidadProgramada}{' '}
                      {act.unidad}
                    </p>
                    <p className="text-[10px]">Programado a la fecha: {pctProg}%</p>
                  </div>
                  <div className="w-40 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-fg-muted">Real</span>
                      <span
                        className={`font-semibold ${
                          isOverdue ? 'text-danger-fg' : isDone ? 'text-ok-fg' : 'text-accent'
                        }`}
                      >
                        {pctReal}%
                      </span>
                    </div>
                    <div className="h-2 bg-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOverdue ? 'bg-danger-solid' : isDone ? 'bg-ok-solid' : 'bg-brand'
                        }`}
                        style={{ width: `${Math.min(100, pctReal)}%` }}
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
