import React, { useMemo, useState } from 'react';
import {
  Plus,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileUp,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  BUSINESS_CONSTANTS,
  validarControlPresupuestal,
} from '../utils/businessRules';
import { StatusBadge, type BadgeVariant } from '../components/common/StatusBadge';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

type EstimacionTipo = 'ORDINARIO' | 'CANTIDADES_ADICIONALES' | 'EXTRAORDINARIO';
type EstimacionEstado =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'RECHAZADA'
  | 'APROBADA'
  | 'AUTORIZADA_PAGO'
  | 'LIQUIDADA';

interface HistorialRevision {
  version: number;
  fecha: string;
  actor: string;
  dictamen: 'APROBADA' | 'RECHAZADA';
  observaciones: string;
}

interface EstimacionItem {
  id: string;
  numero: number;
  tipo: EstimacionTipo;
  periodoInicio: string;
  periodoFin: string;
  montoBruto: number;
  montoAmortizacion: number;
  montoNeto: number;
  estado: EstimacionEstado;
  diasEnRevision: number;
  versionSubsanacion: number;
  uuidFiscal?: string;
  archivosFiscales?: string[];
  historial: HistorialRevision[];
}

const PRESUPUESTO_CONTRATO = 25000000;
const AVANCE_FISICO_REAL_VIGENTE = 62; // Corte oficial firmado en Reportes de Supervisión

const INITIAL_ESTIMACIONES: EstimacionItem[] = [
  {
    id: 'est-6',
    numero: 6,
    tipo: 'ORDINARIO',
    periodoInicio: '2024-10-01',
    periodoFin: '2024-10-12',
    montoBruto: 1200000,
    montoAmortizacion: 200000,
    montoNeto: 1000000,
    estado: 'EN_REVISION',
    diasEnRevision: 12, // Día 10-14 -> Alerta preventiva amarilla (RN-SUP-06.2)
    versionSubsanacion: 1,
    historial: [],
  },
  {
    id: 'est-5',
    numero: 5,
    tipo: 'CANTIDADES_ADICIONALES',
    periodoInicio: '2024-09-16',
    periodoFin: '2024-09-30',
    montoBruto: 1050000,
    montoAmortizacion: 150000,
    montoNeto: 900000,
    estado: 'APROBADA',
    diasEnRevision: 4,
    versionSubsanacion: 2,
    historial: [
      {
        version: 1,
        fecha: '02 oct 2024',
        actor: 'Ing. Lucía Ramírez (Supervisor)',
        dictamen: 'RECHAZADA',
        observaciones: 'Ajustar volumen en concepto TER-008 conforme a levantamiento topográfico.',
      },
      {
        version: 2,
        fecha: '05 oct 2024',
        actor: 'Ing. Lucía Ramírez (Supervisor)',
        dictamen: 'APROBADA',
        observaciones: 'Volumen subsanado y concordante con reporte de supervisión.',
      },
    ],
  },
  {
    id: 'est-4',
    numero: 4,
    tipo: 'ORDINARIO',
    periodoInicio: '2024-09-01',
    periodoFin: '2024-09-15',
    montoBruto: 15000000,
    montoAmortizacion: 500000,
    montoNeto: 14500000, // 58% financiero liquidado
    estado: 'LIQUIDADA',
    diasEnRevision: 0,
    versionSubsanacion: 1,
    uuidFiscal: '550E8400-E29B-41D4-A716-446655440004',
    archivosFiscales: ['CFDI_EST04.pdf', 'CFDI_EST04.xml'],
    historial: [
      {
        version: 1,
        fecha: '19 sep 2024',
        actor: 'Ing. Lucía Ramírez (Supervisor)',
        dictamen: 'APROBADA',
        observaciones: 'Validación técnica sin observaciones.',
      },
    ],
  },
];

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(n);

export const EstimacionesPage: React.FC = () => {
  const { user } = useAuth();
  const [estimaciones, setEstimaciones] = useState<EstimacionItem[]>(INITIAL_ESTIMACIONES);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal crear estimación (Superintendente)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForm, setNewForm] = useState({
    tipo: 'ORDINARIO' as EstimacionTipo,
    periodoInicio: '2024-10-13',
    periodoFin: '2024-10-25',
    montoBruto: '',
    montoAmortizacion: '0',
  });

  // Modal confirmación / firma (Supervisor o Residente)
  const [signAction, setSignAction] = useState<{
    item: EstimacionItem;
    type: 'APROBAR_SUP' | 'RECHAZAR_SUP' | 'AUTORIZAR_RES';
  } | null>(null);

  // Modal facturación PDF + XML (Superintendente - RF-SUPT-06)
  const [cfdiTarget, setCfdiTarget] = useState<EstimacionItem | null>(null);
  const [cfdiUuid, setCfdiUuid] = useState('');
  const [cfdiMonto, setCfdiMonto] = useState('');
  const [cfdiFiles, setCfdiFiles] = useState<File[]>([]);

  const isSuperintendente = user?.rol === 'SUPERINTENDENTE';
  const isSupervisor = user?.rol === 'SUPERVISOR';
  const isResidente = user?.rol === 'RESIDENTE';

  const montoLiquidadoTotal = useMemo(
    () =>
      estimaciones
        .filter((e) => e.estado === 'LIQUIDADA' || e.estado === 'AUTORIZADA_PAGO')
        .reduce((acc, e) => acc + e.montoNeto, 0),
    [estimaciones]
  );

  const avanceFinancieroActual = Number(
    ((montoLiquidadoTotal / PRESUPUESTO_CONTRATO) * 100).toFixed(2)
  );

  const handleCreateEstimacion = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const bruto = Number(newForm.montoBruto);
    const amort = Number(newForm.montoAmortizacion || 0);
    const neto = bruto - amort;

    if (!newForm.periodoInicio || !newForm.periodoFin || newForm.periodoFin < newForm.periodoInicio) {
      setErrorMsg('El rango de fechas del periodo no es válido.');
      return;
    }

    if (bruto <= 0 || amort < 0 || neto <= 0) {
      setErrorMsg('El monto bruto y el monto neto calculado deben ser mayores a $0.');
      return;
    }

    // RN-SUPT-03.4 / RN-SUPT-03.7: No traslape de periodos en estimaciones ordinarias
    if (newForm.tipo === 'ORDINARIO') {
      const overlap = estimaciones.some(
        (est) =>
          est.tipo === 'ORDINARIO' &&
          newForm.periodoInicio <= est.periodoFin &&
          newForm.periodoFin >= est.periodoInicio
      );
      if (overlap) {
        setErrorMsg(
          'Traslape de periodos detectado (RN-SUPT-03.4): el rango se cruza con una estimación ordinaria previa.'
        );
        return;
      }
    }

    // RN-SUPT-03.9 / RN-DIR-01.6: Verificar candado Físico >= Financiero
    const financieroProyectado =
      ((montoLiquidadoTotal + neto) / PRESUPUESTO_CONTRATO) * 100;
    if (!validarControlPresupuestal(financieroProyectado, AVANCE_FISICO_REAL_VIGENTE)) {
      setErrorMsg(
        `Violación de control presupuestal (RN-DIR-01.6): el avance financiero proyectado (${financieroProyectado.toFixed(
          2
        )}%) supera al avance físico real vigente (${AVANCE_FISICO_REAL_VIGENTE}%).`
      );
      return;
    }

    const nextNum =
      estimaciones.reduce((max, item) => Math.max(max, item.numero), 0) + 1;

    const nueva: EstimacionItem = {
      id: `est-${Date.now()}`,
      numero: nextNum,
      tipo: newForm.tipo,
      periodoInicio: newForm.periodoInicio,
      periodoFin: newForm.periodoFin,
      montoBruto: bruto,
      montoAmortizacion: amort,
      montoNeto: neto,
      estado: 'EN_REVISION',
      diasEnRevision: 1,
      versionSubsanacion: 1,
      historial: [],
    };

    setEstimaciones((prev) => [nueva, ...prev]);
    setShowCreateModal(false);
    setNewForm({
      tipo: 'ORDINARIO',
      periodoInicio: '2024-10-26',
      periodoFin: '2024-11-10',
      montoBruto: '',
      montoAmortizacion: '0',
    });
    setSuccessMsg(
      `Estimación N.º ${nextNum} creada y enviada a EN REVISIÓN con monto neto automático de ${formatMXN(
        neto
      )}.`
    );
  };

  const requestDecision = (
    item: EstimacionItem,
    type: 'APROBAR_SUP' | 'RECHAZAR_SUP' | 'AUTORIZAR_RES'
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (type === 'APROBAR_SUP' || type === 'AUTORIZAR_RES') {
      const financieroProyectado =
        ((montoLiquidadoTotal + item.montoNeto) / PRESUPUESTO_CONTRATO) * 100;
      if (!validarControlPresupuestal(financieroProyectado, AVANCE_FISICO_REAL_VIGENTE)) {
        setErrorMsg(
          `Bloqueo automático (RN-DIR-01.6 / RN-SUP-02.2): autorizar esta estimación llevaría el avance financiero a ${financieroProyectado.toFixed(
            2
          )}%, por encima del avance físico real (${AVANCE_FISICO_REAL_VIGENTE}%).`
        );
        return;
      }
    }

    setSignAction({ item, type });
  };

  const handleConfirmDecision = ({ motivo }: { motivo?: string }) => {
    if (!signAction || !user) return;
    const { item, type } = signAction;

    setEstimaciones((prev) =>
      prev.map((est) => {
        if (est.id !== item.id) return est;

        if (type === 'APROBAR_SUP') {
          return {
            ...est,
            estado: 'APROBADA',
            historial: [
              ...est.historial,
              {
                version: est.versionSubsanacion,
                fecha: 'Hoy',
                actor: `${user.nombre} (Supervisor)`,
                dictamen: 'APROBADA',
                observaciones: 'Dictamen técnico aprobado con firma electrónica.',
              },
            ],
          };
        }

        if (type === 'RECHAZAR_SUP') {
          return {
            ...est,
            estado: 'RECHAZADA',
            historial: [
              ...est.historial,
              {
                version: est.versionSubsanacion,
                fecha: 'Hoy',
                actor: `${user.nombre} (Supervisor)`,
                dictamen: 'RECHAZADA',
                observaciones: motivo ?? 'Observaciones técnicas registradas.',
              },
            ],
          };
        }

        return {
          ...est,
          estado: 'AUTORIZADA_PAGO',
        };
      })
    );

    setSuccessMsg(
      type === 'APROBAR_SUP'
        ? `Estimación N.º ${item.numero} aprobada por Supervisión (RF-SUP-02).`
        : type === 'RECHAZAR_SUP'
        ? `Estimación N.º ${item.numero} rechazada. Se habilitó la subsanación al Superintendente (RF-SUPT-07).`
        : `Estimación N.º ${item.numero} autorizada para pago. El Superintendente ya puede adjuntar PDF y XML (RF-RES-03).`
    );
    setSignAction(null);
  };

  // RF-SUPT-07: Subsanación conservando periodo e historial previo
  const handleSubsanar = (item: EstimacionItem) => {
    setErrorMsg(null);
    setEstimaciones((prev) =>
      prev.map((est) =>
        est.id === item.id
          ? {
              ...est,
              estado: 'EN_REVISION',
              versionSubsanacion: est.versionSubsanacion + 1,
              diasEnRevision: 1,
            }
          : est
      )
    );
    setSuccessMsg(
      `Estimación N.º ${item.numero} reenviada a revisión (v${
        item.versionSubsanacion + 1
      }), preservando el historial de rechazos anteriores (RN-SUPT-07.2).`
    );
  };

  // RF-SUPT-06: Facturación PDF + XML + UUID irrepetible + Cuadre exacto
  const handleSubmitCfdi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfdiTarget) return;
    setErrorMsg(null);

    const uuidNorm = cfdiUuid.trim().toUpperCase();
    const montoCapturado = Number(cfdiMonto);

    if (!uuidNorm || uuidNorm.length < 12) {
      setErrorMsg('Captura un folio fiscal (UUID del SAT) válido (RN-SUPT-06.1).');
      return;
    }

    if (estimaciones.some((est) => est.uuidFiscal?.toUpperCase() === uuidNorm)) {
      setErrorMsg(`El folio fiscal UUID "${uuidNorm}" ya fue registrado anteriormente (RN-SUPT-06.1).`);
      return;
    }

    const hasPdf = cfdiFiles.some((f) => f.name.toLowerCase().endsWith('.pdf'));
    const hasXml = cfdiFiles.some((f) => f.name.toLowerCase().endsWith('.xml'));
    if (!hasPdf || !hasXml) {
      setErrorMsg(
        'Par fiscal obligatorio (RN-SUPT-06.1): debes adjuntar tanto el archivo .pdf como el .xml del CFDI.'
      );
      return;
    }

    if (Math.abs(montoCapturado - cfdiTarget.montoNeto) > 0.01) {
      setErrorMsg(
        `Descuadre financiero (RN-SUPT-06.2): el monto de factura (${formatMXN(
          montoCapturado
        )}) debe coincidir exactamente con el monto autorizado neto (${formatMXN(
          cfdiTarget.montoNeto
        )}).`
      );
      return;
    }

    setEstimaciones((prev) =>
      prev.map((est) =>
        est.id === cfdiTarget.id
          ? {
              ...est,
              estado: 'LIQUIDADA',
              uuidFiscal: uuidNorm,
              archivosFiscales: cfdiFiles.map((f) => f.name),
            }
          : est
      )
    );
    setSuccessMsg(
      `CFDI (${uuidNorm}) validado y asociado a la Estimación N.º ${cfdiTarget.numero}. Estatus actualizado a LIQUIDADA.`
    );
    setCfdiTarget(null);
    setCfdiUuid('');
    setCfdiMonto('');
    setCfdiFiles([]);
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Control financiero · Candado Avance Financiero ≤ Avance Físico ({AVANCE_FISICO_REAL_VIGENTE}%)
          </p>
          <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight mt-0.5">
            Estimaciones de obra y facturación
          </h1>
        </div>

        {isSuperintendente && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva estimación</span>
          </button>
        )}
      </div>

      {/* Barra comparativa Físico vs Financiero */}
      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="text-[11px] text-slate-400">Avance físico real (tope legal)</p>
          <p className="text-xl font-semibold text-brand mt-0.5">{AVANCE_FISICO_REAL_VIGENTE}%</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Avance financiero autorizado / liquidado</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mt-0.5">
            {avanceFinancieroActual}%
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Margen disponible para estimar</p>
          <p className="text-xl font-semibold text-emerald-600 mt-0.5">
            {formatMXN(
              Math.max(
                0,
                (AVANCE_FISICO_REAL_VIGENTE / 100) * PRESUPUESTO_CONTRATO - montoLiquidadoTotal
              )
            )}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Listado de Estimaciones */}
      <div className="space-y-3">
        {estimaciones.map((est) => {
          const isAlertCritica =
            est.estado === 'EN_REVISION' &&
            est.diasEnRevision >= BUSINESS_CONSTANTS.PLAZO_REVISION_ESTIMACION_DIAS;
          const isAlertPreventiva =
            est.estado === 'EN_REVISION' &&
            est.diasEnRevision >= 10 &&
            est.diasEnRevision < BUSINESS_CONSTANTS.PLAZO_REVISION_ESTIMACION_DIAS;

          return (
            <div
              key={est.id}
              className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Estimación N.º {String(est.numero).padStart(2, '0')}
                    </span>
                    <StatusBadge status={est.estado as BadgeVariant} />
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {est.tipo} · v{est.versionSubsanacion}
                    </span>

                    {isAlertCritica && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                        <Clock className="w-3 h-3" />
                        Plazo vencido ({est.diasEnRevision} días · RF-SUP-06)
                      </span>
                    )}
                    {isAlertPreventiva && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                        <Clock className="w-3 h-3" />
                        Alerta preventiva: día {est.diasEnRevision} de 15
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Periodo: <strong>{est.periodoInicio}</strong> al{' '}
                    <strong>{est.periodoFin}</strong> · Bruto: {formatMXN(est.montoBruto)} ·
                    Amortización: {formatMXN(est.montoAmortizacion)}
                  </p>

                  {est.uuidFiscal && (
                    <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                      CFDI UUID: {est.uuidFiscal} ({est.archivosFiscales?.join(', ')})
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase">Monto neto</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {formatMXN(est.montoNeto)}
                    </p>
                  </div>

                  {/* Acciones por Rol */}
                  {isSupervisor && est.estado === 'EN_REVISION' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => requestDecision(est, 'RECHAZAR_SUP')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDecision(est, 'APROBAR_SUP')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Aprobar</span>
                      </button>
                    </div>
                  )}

                  {isSuperintendente && est.estado === 'RECHAZADA' && (
                    <button
                      type="button"
                      onClick={() => handleSubsanar(est)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Subsanar y reenviar</span>
                    </button>
                  )}

                  {isResidente && est.estado === 'APROBADA' && (
                    <button
                      type="button"
                      onClick={() => requestDecision(est, 'AUTORIZAR_RES')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Autorizar pago</span>
                    </button>
                  )}

                  {isSuperintendente && est.estado === 'AUTORIZADA_PAGO' && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setCfdiTarget(est);
                        setCfdiMonto(String(est.montoNeto));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Adjuntar CFDI (PDF + XML)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Historial inmutable de revisiones / rechazos (RN-SUPT-07.2) */}
              {est.historial.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Historial de dictámenes (inmutable)
                  </p>
                  {est.historial.map((h, i) => (
                    <div
                      key={`${est.id}-hist-${i}`}
                      className="text-[11px] flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300"
                    >
                      <span className="font-semibold">v{h.version}</span>
                      <span
                        className={
                          h.dictamen === 'APROBADA' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'
                        }
                      >
                        {h.dictamen}
                      </span>
                      <span className="text-slate-400">· {h.fecha} · {h.actor}:</span>
                      <span>{h.observaciones}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Crear estimación */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <form
            onSubmit={handleCreateEstimacion}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-3 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Nueva estimación de obra (RF-SUPT-03)
            </h3>

            <select
              value={newForm.tipo}
              onChange={(e) =>
                setNewForm({ ...newForm, tipo: e.target.value as EstimacionTipo })
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="ORDINARIO">1. Ordinario (catálogo original)</option>
              <option value="CANTIDADES_ADICIONALES">2. Cantidades Adicionales</option>
              <option value="EXTRAORDINARIO">3. Extraordinarios (APU autorizado)</option>
            </select>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400">Periodo inicio</label>
                <input
                  type="date"
                  value={newForm.periodoInicio}
                  onChange={(e) => setNewForm({ ...newForm, periodoInicio: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Periodo fin</label>
                <input
                  type="date"
                  value={newForm.periodoFin}
                  onChange={(e) => setNewForm({ ...newForm, periodoFin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <input
                type="number"
                step="0.01"
                placeholder="Monto bruto (MXN)"
                value={newForm.montoBruto}
                onChange={(e) => setNewForm({ ...newForm, montoBruto: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amortización anticipo"
                value={newForm.montoAmortizacion}
                onChange={(e) => setNewForm({ ...newForm, montoAmortizacion: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Monto neto calculado:{' '}
              <strong className="text-brand">
                {formatMXN(
                  Math.max(0, Number(newForm.montoBruto || 0) - Number(newForm.montoAmortizacion || 0))
                )}
              </strong>
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Enviar a revisión
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Cargar CFDI (PDF + XML) */}
      {cfdiTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCfdiTarget(null)}
        >
          <form
            onSubmit={handleSubmitCfdi}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-3.5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Facturación · Estimación N.º {cfdiTarget.numero} (RF-SUPT-06)
            </h3>
            <p className="text-[11px] text-slate-500">
              Adjunta el par fiscal obligatorio (PDF + XML) y captura el UUID irrepetible del SAT.
              Monto autorizado neto exacto: <strong>{formatMXN(cfdiTarget.montoNeto)}</strong>.
            </p>

            <input
              type="text"
              placeholder="Folio fiscal UUID del SAT"
              value={cfdiUuid}
              onChange={(e) => setCfdiUuid(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
            />

            <input
              type="number"
              step="0.01"
              placeholder="Monto total de factura (MXN)"
              value={cfdiMonto}
              onChange={(e) => setCfdiMonto(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />

            <FileDropzone
              files={cfdiFiles}
              onChange={setCfdiFiles}
              maxFiles={2}
              minFiles={2}
              accept=".pdf,.xml"
              helperText="Obligatorio cargar 1 archivo .PDF y 1 archivo .XML (máx. 10 MB cada uno)"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCfdiTarget(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
              >
                Validar y registrar CFDI
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de firma electrónica para dictámenes y autorizaciones */}
      <ConfirmActionModal
        open={signAction !== null}
        title={
          signAction?.type === 'APROBAR_SUP'
            ? `Aprobar Estimación N.º ${signAction.item.numero}`
            : signAction?.type === 'RECHAZAR_SUP'
            ? `Rechazar Estimación N.º ${signAction.item.numero}`
            : `Autorizar pago · Estimación N.º ${signAction?.item.numero}`
        }
        description={
          signAction?.type === 'RECHAZAR_SUP'
            ? 'El rechazo quedará registrado de forma inmutable y habilitará al Superintendente para cargar una versión corregida.'
            : `Monto neto: ${formatMXN(
                signAction?.item.montoNeto ?? 0
              )}. Se validará tu firma electrónica (RNF-SEG-04).`
        }
        confirmLabel={
          signAction?.type === 'RECHAZAR_SUP'
            ? 'Firmar rechazo'
            : signAction?.type === 'APROBAR_SUP'
            ? 'Firmar aprobación'
            : 'Firmar autorización'
        }
        tone={signAction?.type === 'RECHAZAR_SUP' ? 'danger' : 'brand'}
        requireSignature
        requireReason={signAction?.type === 'RECHAZAR_SUP'}
        reasonLabel="Motivo técnico detallado del rechazo (obligatorio)"
        onCancel={() => setSignAction(null)}
        onConfirm={handleConfirmDecision}
      />
    </div>
  );
};