import React, { useMemo, useState } from 'react';
import {
  RefreshCw,
  MapPin,
  TrendingUp,
  Wallet,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Info,
  MoreHorizontal,
  ArrowUpRight,
  FileCheck2,
  NotebookPen,
  ShieldCheck,
  FileText,
  CalendarClock,
  Shield,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import {
  OPERATIONAL_SIGNER_ROLES,
  type OperationalRole,
} from '../types/obra.types';
import { validarControlPresupuestal } from '../utils/businessRules';
import { calcularAvanceProgramadoAFecha } from '../mocks/catalogoParametrico.mock';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ATTENTION_ITEMS,
  BITACORA_ENTRIES,
  DOCUMENTOS_OBRA,
  ESTIMACIONES_LIST,
  OBRA_DETAIL_MOCK,
  PROGRESS_PERIODS,
  WEEKLY_ACTIVITIES,
  type AttentionItem,
} from '../mocks/obra.mock';

type PreviewTabId =
  | 'resumen'
  | 'catalogo'
  | 'programa'
  | 'bitacora'
  | 'estimaciones'
  | 'cierre';

interface ObraInicioPageProps {
  onNavigateSection: (section: string) => void;
}

const PREVIEW_TABS: readonly { id: PreviewTabId; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'programa', label: 'Programa' },
  { id: 'bitacora', label: 'Bitácora' },
  { id: 'estimaciones', label: 'Estimaciones' },
  { id: 'cierre', label: 'Documentos y Cierre' },
];

const FECHA_CORTE_DASHBOARD = '2024-10-14';

const formatMXN = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);

export const ObraInicioPage: React.FC<ObraInicioPageProps> = ({ onNavigateSection }) => {
  const { user } = useAuth();
  const {
    selectedObra,
    selectedObraMontoContrato,
    selectedConceptos,
    selectedContrato,
    selectedPolizas,
    pendingBitacoraByRole,
  } = useObra();

  const [previewTab, setPreviewTab] = useState<PreviewTabId>('resumen');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Actualizado hoy, 08:45 h');
  const [selectedPeriodId, setSelectedPeriodId] = useState('may-oct');
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
  const [selectedAttention, setSelectedAttention] = useState<AttentionItem | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const isDirectivo = user?.rol === 'DIRECTIVO';

  const currentPeriod =
    PROGRESS_PERIODS.find((p) => p.id === selectedPeriodId) ?? PROGRESS_PERIODS[0];

  const avanceProgramadoCalc = useMemo(() => {
    const fromCatalog = calcularAvanceProgramadoAFecha(
      selectedConceptos,
      FECHA_CORTE_DASHBOARD
    );
    return fromCatalog > 0 ? fromCatalog : selectedObra.avanceProgramado;
  }, [selectedConceptos, selectedObra.avanceProgramado]);

  const avanceFisicoReal = selectedObra.avanceFisico;
  const avanceFinancieroReal = selectedObra.avanceFinanciero;
  const desviacionFisica = Number((avanceFisicoReal - avanceProgramadoCalc).toFixed(1));
  const brechaFinanciera = Number((avanceFinancieroReal - avanceFisicoReal).toFixed(1));

  // Plazo transcurrido (%)
  const plazoStats = useMemo(() => {
    const inicioIso = selectedObra.fechaInicio ?? '2024-05-06';
    const finIso = selectedObra.fechaFinIso ?? '2024-12-20';
    const start = new Date(`${inicioIso}T00:00:00`).getTime();
    const end = new Date(`${finIso}T00:00:00`).getTime();
    const cutoff = new Date(`${FECHA_CORTE_DASHBOARD}T00:00:00`).getTime();
    const dayMs = 86400 * 1000;
    const totalDays = Math.max(1, Math.round((end - start) / dayMs));
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((cutoff - start) / dayMs)));
    const pct = Number(((elapsedDays / totalDays) * 100).toFixed(1));
    return { elapsedDays, totalDays, pct };
  }, [selectedObra.fechaInicio, selectedObra.fechaFinIso]);

  const pendingBitacoraCount =
    user && (OPERATIONAL_SIGNER_ROLES as readonly string[]).includes(user.rol)
      ? pendingBitacoraByRole[user.rol as OperationalRole] ?? 0
      : 0;

  const missingPolizasCount = 3 - new Set(selectedPolizas.map((p) => p.tipo)).size;

  const dynamicAttentionItems = useMemo<AttentionItem[]>(() => {
    const extras: AttentionItem[] = [];
    if (pendingBitacoraCount > 0) {
      extras.push({
        id: 'att-bitacora-firmas',
        title: `${pendingBitacoraCount} nota(s) de bitácora pendientes de tu firma`,
        subtitle: `Perfil ${user?.rol ?? ''} · Multifirma 3/3 requerida`,
        urgent: true,
        category: 'bitacora',
        folio: 'BIT-MULTIFIRMA',
        detail: `Tienes ${pendingBitacoraCount} nota(s) en la bitácora electrónica de ${selectedObra.id} esperando tu firma electrónica mediante correo y contraseña (servicio SAT).`,
      });
    }
    if (missingPolizasCount > 0) {
      extras.push({
        id: 'att-polizas-faltantes',
        title: `Faltan ${missingPolizasCount} póliza(s) de fianza por registrar`,
        subtitle: `${selectedPolizas.length} de 3 pólizas registradas (Anticipo, Cumplimiento, Vicios Ocultos)`,
        urgent: false,
        category: 'estimacion',
        folio: 'FNZ-COBERTURA',
        detail:
          'Completa el registro de las 3 pólizas normativas (ANTICIPO, CUMPLIMIENTO y VICIOS_OCULTOS) en el módulo Documentos y Cierre.',
      });
    }
    return [...extras, ...ATTENTION_ITEMS];
  }, [pendingBitacoraCount, missingPolizasCount, selectedPolizas.length, selectedObra.id, user?.rol]);

  const pendingAttentionCount = dynamicAttentionItems.filter(
    (item) => !resolvedIds.includes(item.id)
  ).length;

  const presupuestoEnRegla = validarControlPresupuestal(
    avanceFinancieroReal,
    avanceFisicoReal
  );

  const montoEjercidoEstimado = Math.round(
    selectedObraMontoContrato * (avanceFinancieroReal / 100)
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated('Actualizado hace un momento');
    }, 500);
  };

  const handleResolveAttention = (id: string) => {
    setResolvedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedAttention(null);
  };

  // Coordenadas Gráfica 1: Curva S (Avance físico acumulado: Real vs. Programado)
  const chartWidth = 580;
  const chartHeight = 155;
  const toCoords = (values: number[]) =>
    values.map((val, idx) => {
      const x =
        values.length === 1 ? chartWidth / 2 : (idx / (values.length - 1)) * chartWidth;
      const y = chartHeight - (Math.min(100, Math.max(0, val)) / 100) * chartHeight;
      return { x, y, val };
    });

  const progCoords = toCoords(currentPeriod.programado);
  const realCoords = toCoords(currentPeriod.real);
  const finCoords = toCoords(currentPeriod.financiero);

  const progPath = progCoords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const realPath = realCoords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const finPath = finCoords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const realAreaPath = `${realPath} L ${realCoords[realCoords.length - 1].x} ${chartHeight} L ${realCoords[0].x} ${chartHeight} Z`;

  return (
    <div className="space-y-6">
      {/* Encabezado general de la obra */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-fg-muted">
          <span className="font-semibold uppercase tracking-wider">Seguimiento de obra</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 hover:text-fg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{lastUpdated}</span>
          </button>
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl font-normal text-fg tracking-tight">
            {selectedObra.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
            <StatusBadge status={selectedObra.estado} />
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {selectedObra.ubicacion}
            </span>
            <span>Contrato: {selectedContrato?.numero_contrato ?? selectedObra.contrato}</span>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas KPI con TODOS los porcentajes visibles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Avance programado</span>
            <CalendarClock className="w-4 h-4 text-fg-muted" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-normal text-fg">{avanceProgramadoCalc}%</span>
            <span className="text-[11px] text-fg-muted">Plazo: {plazoStats.pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-fg-muted rounded-full"
              style={{ width: `${Math.min(100, avanceProgramadoCalc)}%` }}
            />
          </div>
          <p className="text-[11px] text-fg-muted">
            {plazoStats.elapsedDays} de {plazoStats.totalDays} días transcurridos ({plazoStats.pct}%)
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Avance físico real</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-normal text-accent">{avanceFisicoReal}%</span>
            <span
              className={`text-xs font-semibold ${
                desviacionFisica < 0 ? 'text-warn-fg' : 'text-ok-fg'
              }`}
            >
              {desviacionFisica >= 0 ? '+' : ''}
              {desviacionFisica} pp
            </span>
          </div>
          <div className="w-full h-1.5 bg-info-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full"
              style={{ width: `${Math.min(100, avanceFisicoReal)}%` }}
            />
          </div>
          <p className="text-[11px] text-fg-muted">
            vs. Programado ({avanceProgramadoCalc}%) ·{' '}
            {desviacionFisica < 0 ? 'Atraso moderado' : 'Conforme a programa'}
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Avance financiero real</span>
            <Wallet className="w-4 h-4 text-ok-fg" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-3xl font-normal ${
                presupuestoEnRegla ? 'text-ok-fg' : 'text-danger-fg'
              }`}
            >
              {avanceFinancieroReal}%
            </span>
            <span className="text-[11px] text-fg-muted">
              {brechaFinanciera >= 0 ? '+' : ''}
              {brechaFinanciera} pp vs Físico
            </span>
          </div>
          <div className="w-full h-1.5 bg-ok-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                presupuestoEnRegla ? 'bg-ok-solid' : 'bg-danger-solid'
              }`}
              style={{ width: `${Math.min(100, avanceFinancieroReal)}%` }}
            />
          </div>
          <p className="text-[11px] text-fg-muted">
            {formatMXN(montoEjercidoEstimado)} de {formatMXN(selectedObraMontoContrato)}
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Pendientes por ver</span>
            <ClipboardList className="w-4 h-4 text-warn-fg" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-normal text-fg">
              {String(pendingAttentionCount).padStart(2, '0')}
            </span>
            <span className="text-[11px] font-semibold text-accent">
              {selectedPolizas.length}/3 pólizas
            </span>
          </div>
          <p className="text-[11px] text-warn-fg font-medium">
            {pendingAttentionCount > 0
              ? `${pendingBitacoraCount} firma(s) en bitácora · revisar avisos`
              : 'Sin pendientes urgentes'}
          </p>
        </div>
      </div>

      {/* Pestañas horizontales de vista rápida */}
      <div
        role="tablist"
        aria-label="Vista rápida de secciones"
        className="border-b border-line flex items-center gap-6 overflow-x-auto"
      >
        {PREVIEW_TABS.map((tab) => {
          const isActive = previewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPreviewTab(tab.id)}
              className={`pb-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-brand text-accent font-semibold'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. TAB RESUMEN: Dos gráficas (Programa vs Real + Comparativo Integral con Financiero) + Ficha + Actividades + Atención */}
      {previewTab === 'resumen' && (
        <div className="space-y-5">
          {/* Fila 1: Gráfica 1 (Avance Físico: Programado vs Real) + Ficha de la obra */}
          <div className="flex flex-col xl:flex-row gap-5 items-stretch">
            <div className="flex-1 bg-surface border border-line rounded-xl p-5 flex flex-col justify-between gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-fg">
                    Gráfica 1 · Avance físico acumulado (Programa vs. Real)
                  </h2>
                  <p className="text-[11px] text-fg-muted mt-0.5">
                    Comparativo mensual con porcentajes explícitos al corte
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPeriodMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line-strong text-xs text-fg-soft hover:bg-subtle cursor-pointer"
                  >
                    <span>{currentPeriod.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-fg-muted" />
                  </button>

                  {periodMenuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-surface border border-line-strong rounded-lg shadow-lg py-1 z-20">
                      {PROGRESS_PERIODS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPeriodId(p.id);
                            setPeriodMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-subtle cursor-pointer ${
                            p.id === selectedPeriodId
                              ? 'font-semibold text-accent'
                              : 'text-fg-soft'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-[11px] text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-brand rounded" />
                  Avance físico real (<strong>{avanceFisicoReal}%</strong>)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-fg-muted rounded" />
                  Avance programado (<strong>{avanceProgramadoCalc}%</strong>)
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <div className="min-w-130 flex gap-3">
                  <div className="flex flex-col justify-between h-40 text-[10px] text-fg-muted shrink-0">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  <div className="flex-1">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-40 overflow-visible"
                    >
                      {[0, 38.75, 77.5, 116.25, 155].map((y) => (
                        <line
                          key={y}
                          x1={0}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke="currentColor"
                          className="text-line"
                          strokeWidth="1"
                        />
                      ))}

                      <path d={realAreaPath} className="fill-accent" fillOpacity="0.08" />
                      <path
                        d={progPath}
                        fill="none"
                        className="stroke-fg-muted"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <path d={realPath} fill="none" className="stroke-accent" strokeWidth="2.5" />

                      {/* Etiquetas de porcentaje en TODOS los puntos */}
                      {progCoords.map((pt, idx) => (
                        <g key={`prog-${idx}`}>
                          <circle cx={pt.x} cy={pt.y} r="3" className="fill-fg-muted" />
                          <text
                            x={pt.x}
                            y={Math.max(10, pt.y - 8)}
                            textAnchor="middle"
                            className="fill-fg-muted"
                            fontSize="9"
                            fontWeight="600"
                          >
                            {pt.val}%
                          </text>
                        </g>
                      ))}

                      {realCoords.map((pt, idx) => (
                        <g key={`real-${idx}`}>
                          <circle cx={pt.x} cy={pt.y} r="3.8" className="fill-accent" />
                          <text
                            x={pt.x}
                            y={Math.min(chartHeight - 4, pt.y + 14)}
                            textAnchor="middle"
                            className="fill-accent"
                            fontSize="9.5"
                            fontWeight="700"
                          >
                            {pt.val}%
                          </text>
                        </g>
                      ))}
                    </svg>

                    <div className="flex justify-between text-[10px] text-fg-muted mt-2">
                      {currentPeriod.months.map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{currentPeriod.note}</span>
              </div>
            </div>

            {/* Ficha de la obra con acceso rápido a Contrato y Fianzas */}
            <div className="w-full xl:w-90 shrink-0 bg-surface border border-line rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between relative">
                <h2 className="text-sm font-semibold text-fg">Información de la obra</h2>
                <button
                  type="button"
                  aria-label="Opciones de ficha"
                  onClick={() => setInfoMenuOpen((prev) => !prev)}
                  className="p-1 rounded hover:bg-subtle text-fg-muted cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {infoMenuOpen && (
                  <div className="absolute right-0 top-7 w-48 bg-surface border border-line-strong rounded-lg shadow-lg py-1 z-20 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setInfoMenuOpen(false);
                        onNavigateSection('catalogo');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-subtle cursor-pointer"
                    >
                      Ir a Catálogo completo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoMenuOpen(false);
                        onNavigateSection('estimaciones');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-subtle cursor-pointer"
                    >
                      Ir a Estimaciones
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoMenuOpen(false);
                        onNavigateSection('cierre');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-subtle cursor-pointer"
                    >
                      Contrato y Pólizas de Fianza
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[11px] text-fg-muted">Contratista</p>
                  <p className="font-medium text-fg mt-0.5">{selectedObra.contratista}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-fg-muted">Inicio de obra</p>
                    <p className="font-medium text-fg mt-0.5">
                      {selectedObra.fechaInicio ?? OBRA_DETAIL_MOCK.fechaInicio}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-fg-muted">Término contractual</p>
                    <p className="font-medium text-fg mt-0.5">{selectedObra.fechaTermino}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Monto contratado</span>
                  <span className="font-semibold text-sm text-fg">
                    {formatMXN(selectedObraMontoContrato)}{' '}
                    <span className="text-[10px] text-fg-muted">MXN</span>
                  </span>
                </div>

                {selectedContrato && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-fg-muted">Anticipo otorgado</span>
                    <span className="font-semibold text-ok-fg">
                      {formatMXN(selectedContrato.monto_anticipo)} (
                      {(
                        (selectedContrato.monto_anticipo / selectedContrato.monto_contrato) *
                        100
                      ).toFixed(0)}
                      %)
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-fg-muted">Plazo transcurrido</span>
                    <span className="font-medium text-fg-soft">
                      {plazoStats.elapsedDays} de {plazoStats.totalDays} días (
                      <strong>{plazoStats.pct}%</strong>)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fg-muted rounded-full"
                      style={{ width: `${Math.min(100, plazoStats.pct)}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateSection('cierre')}
                  className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg bg-canvas border border-line hover:border-brand text-[11px] font-semibold text-accent cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Contrato y Pólizas ({selectedPolizas.length}/3)
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Fila 2: GRÁFICA 2 — Comparativo Integral: Programado vs. Físico Real vs. Financiero Real */}
          <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent" />
                <div>
                  <h2 className="text-sm font-semibold text-fg">
                    Gráfica 2 · Comparativo Integral: Programado vs. Físico Real vs. Financiero Real
                  </h2>
                  <p className="text-[11px] text-fg-muted">
                    Seguimiento simultáneo de los 3 porcentajes acumulados y control presupuestal
                    (Financiero ≤ Físico Real)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-subtle text-fg-soft">
                  <span className="w-2.5 h-2.5 rounded-sm bg-fg-muted" />
                  Programado: <strong>{avanceProgramadoCalc}%</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-info-bg text-accent">
                  <span className="w-2.5 h-2.5 rounded-sm bg-brand" />
                  Físico Real: <strong>{avanceFisicoReal}%</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ok-bg text-ok-fg">
                  <span className="w-2.5 h-2.5 rounded-sm bg-ok-solid" />
                  Financiero Real: <strong>{avanceFinancieroReal}%</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-center">
              {/* Gráfica de columnas agrupadas por mes + curva financiera */}
              <div className="lg:col-span-3 overflow-x-auto">
                <div className="min-w-120 flex gap-3">
                  <div className="flex flex-col justify-between h-44 text-[10px] text-fg-muted shrink-0">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  <div className="flex-1">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-44 overflow-visible"
                    >
                      {[0, 38.75, 77.5, 116.25, 155].map((y) => (
                        <line
                          key={y}
                          x1={0}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke="currentColor"
                          className="text-line"
                          strokeWidth="1"
                        />
                      ))}

                      {currentPeriod.months.map((m, idx) => {
                        const groupW = chartWidth / currentPeriod.months.length;
                        const center = idx * groupW + groupW / 2;
                        const barW = Math.min(18, groupW * 0.22);
                        const pVal = currentPeriod.programado[idx] ?? 0;
                        const rVal = currentPeriod.real[idx] ?? 0;
                        const fVal = currentPeriod.financiero[idx] ?? 0;

                        const pH = (pVal / 100) * chartHeight;
                        const rH = (rVal / 100) * chartHeight;
                        const fH = (fVal / 100) * chartHeight;

                        return (
                          <g key={`bar-${m}`}>
                            <rect
                              x={center - barW * 1.6}
                              y={chartHeight - pH}
                              width={barW}
                              height={pH}
                              rx="2"
                              className="fill-fg-muted"
                              fillOpacity="0.65"
                            />
                            <text
                              x={center - barW * 1.1}
                              y={Math.max(9, chartHeight - pH - 4)}
                              textAnchor="middle"
                              className="fill-fg-muted"
                              fontSize="8.5"
                              fontWeight="600"
                            >
                              {pVal}%
                            </text>

                            <rect
                              x={center - barW * 0.5}
                              y={chartHeight - rH}
                              width={barW}
                              height={rH}
                              rx="2"
                              className="fill-accent"
                            />
                            <text
                              x={center}
                              y={Math.max(9, chartHeight - rH - 4)}
                              textAnchor="middle"
                              className="fill-accent"
                              fontSize="8.5"
                              fontWeight="700"
                            >
                              {rVal}%
                            </text>

                            <rect
                              x={center + barW * 0.6}
                              y={chartHeight - fH}
                              width={barW}
                              height={fH}
                              rx="2"
                              className="fill-ok-solid"
                            />
                            <text
                              x={center + barW * 1.1}
                              y={Math.max(9, chartHeight - fH - 4)}
                              textAnchor="middle"
                              className="fill-ok-fg"
                              fontSize="8.5"
                              fontWeight="700"
                            >
                              {fVal}%
                            </text>
                          </g>
                        );
                      })}

                      <path
                        d={finPath}
                        fill="none"
                        className="stroke-ok-solid"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.55"
                      />
                    </svg>

                    <div className="grid grid-cols-6 text-center text-[10px] text-fg-muted mt-2">
                      {currentPeriod.months.map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de todos los porcentajes clave al corte */}
              <div className="lg:col-span-2 p-4 rounded-xl bg-canvas border border-line space-y-3 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  Todos los porcentajes al corte
                </p>

                {[
                  {
                    label: 'Avance Programado',
                    value: avanceProgramadoCalc,
                    bar: 'bg-fg-muted',
                    text: 'text-fg',
                  },
                  {
                    label: 'Avance Físico Real',
                    value: avanceFisicoReal,
                    bar: 'bg-brand',
                    text: 'text-accent',
                  },
                  {
                    label: 'Avance Financiero Real',
                    value: avanceFinancieroReal,
                    bar: 'bg-ok-solid',
                    text: 'text-ok-fg',
                  },
                  {
                    label: 'Tiempo / Plazo Transcurrido',
                    value: plazoStats.pct,
                    bar: 'bg-warn-solid',
                    text: 'text-warn-fg',
                  },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-fg-soft">{metric.label}</span>
                      <span className={`font-bold ${metric.text}`}>{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${metric.bar}`}
                        style={{ width: `${Math.min(100, metric.value)}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-line flex items-center justify-between text-[11px]">
                  <span className="text-fg-muted">Desviación (Real vs. Programado)</span>
                  <strong className={desviacionFisica < 0 ? 'text-warn-fg' : 'text-ok-fg'}>
                    {desviacionFisica >= 0 ? '+' : ''}
                    {desviacionFisica} pp
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 3: Actividades de la semana + Requieren tu atención */}
          <div className="flex flex-col xl:flex-row gap-5 items-stretch">
            <div className="flex-1 bg-surface border border-line rounded-xl overflow-hidden min-w-0">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg">Actividades de la semana</h2>
                <button
                  type="button"
                  onClick={() => onNavigateSection('programa')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline cursor-pointer"
                >
                  <span>Abrir programa completo</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-130">
                  <thead>
                    <tr className="bg-canvas text-[10px] font-medium text-fg-muted uppercase border-y border-line">
                      <th className="py-2 px-5">Actividad</th>
                      <th className="py-2 px-3">Fecha fin</th>
                      <th className="py-2 px-3">Avance</th>
                      <th className="py-2 px-5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {WEEKLY_ACTIVITIES.map((act) => (
                      <tr key={act.id} className="hover:bg-subtle/60">
                        <td className="py-3 px-5">
                          <p className="font-medium text-fg">{act.title}</p>
                          <p className="text-[10px] text-fg-muted">{act.subtitle}</p>
                        </td>
                        <td className="py-3 px-3 text-fg-muted">{act.endDate}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-info-bg rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full"
                                style={{ width: `${act.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-fg-soft">{act.progress}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                              act.status === 'Concluida'
                                ? 'bg-ok-bg text-ok-fg'
                                : 'bg-info-bg text-accent'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-full xl:w-90 shrink-0 bg-surface border border-line rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg">Requieren tu atención</h2>
                <span className="px-2.5 py-0.5 rounded-md bg-warn-bg text-warn-fg text-xs font-semibold">
                  {pendingAttentionCount}
                </span>
              </div>

              <div className="space-y-3">
                {dynamicAttentionItems.map((item) => {
                  const isResolved = resolvedIds.includes(item.id);
                  const Icon = item.category === 'estimacion' ? FileCheck2 : NotebookPen;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAttention(item)}
                      className={`w-full flex items-start gap-3 p-2 -mx-2 rounded-lg text-left hover:bg-subtle transition-colors cursor-pointer ${
                        isResolved ? 'opacity-55' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.urgent
                            ? 'bg-warn-bg text-warn-fg'
                            : 'bg-subtle text-fg-soft'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-fg">{item.title}</p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            item.urgent ? 'text-warn-fg' : 'text-fg-muted'
                          }`}
                        >
                          {isResolved ? 'Atendido' : item.subtitle}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-fg-muted">
            <span>Información reportada por la residencia de obra.</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-ok-fg" />
              Datos guardados y sincronizados
            </span>
          </div>
        </div>
      )}

      {/* 2. MINI-RESUMEN CATÁLOGO */}
      {previewTab === 'catalogo' && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Síntesis del Catálogo de Conceptos
              </h2>
              <p className="text-[11px] text-fg-muted">
                {selectedConceptos.length} concepto(s) activos · Avance programado:{' '}
                {avanceProgramadoCalc}%
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('catalogo')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <span>Abrir catálogo completo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-line text-xs">
            {selectedConceptos.slice(0, 4).map((item) => {
              const volTotal = item.cantidadPresupuestada + item.cantidadAdicionalAutorizada;
              return (
                <div key={item.clave} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-semibold text-accent mr-2">{item.clave}</span>
                    <span className="text-fg-soft">{item.descripcion}</span>
                    <p className="text-[10px] text-fg-muted mt-0.5">
                      Programa: {item.fecha_inicio_programada} → {item.fecha_fin_programada}
                    </p>
                  </div>
                  <span className="font-semibold text-fg shrink-0">
                    {formatMXN(volTotal * item.precioUnitario)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MINI-RESUMEN PROGRAMA */}
      {previewTab === 'programa' && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Síntesis del Programa de Ejecución
              </h2>
              <p className="text-[11px] text-fg-muted">
                Programado: {avanceProgramadoCalc}% · Real: {avanceFisicoReal}% · Desviación:{' '}
                {desviacionFisica} pp
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('programa')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <span>Abrir programa completo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {WEEKLY_ACTIVITIES.map((act) => (
              <div key={act.id} className="p-3 rounded-lg border border-line space-y-1.5">
                <p className="font-medium text-fg truncate">{act.title}</p>
                <div className="flex items-center justify-between text-[11px] text-fg-muted">
                  <span>Fin: {act.endDate}</span>
                  <span className="font-semibold text-accent">{act.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MINI-RESUMEN BITÁCORA */}
      {previewTab === 'bitacora' && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">Últimas notas de Bitácora</h2>
              <p className="text-[11px] text-fg-muted">
                {pendingBitacoraCount} nota(s) pendientes de tu firma (Multifirma 3/3)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('bitacora')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <span>Abrir bitácora completa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-line text-xs">
            {BITACORA_ENTRIES.slice(0, 2).map((nota) => (
              <div key={nota.folio} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-accent mr-2">{nota.folio}</span>
                  <span className="text-fg-soft">{nota.asunto}</span>
                  <p className="text-[10px] text-fg-muted mt-0.5">
                    {nota.fecha} · {nota.autor}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-subtle text-[11px] font-medium shrink-0">
                  {nota.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MINI-RESUMEN ESTIMACIONES */}
      {previewTab === 'estimaciones' && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">Resumen de Estimaciones</h2>
              <p className="text-[11px] text-fg-muted">
                Avance financiero: {avanceFinancieroReal}% · Estimación N.º 06 en revisión
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('estimaciones')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <span>Abrir estimaciones completas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-line text-xs">
            {ESTIMACIONES_LIST.slice(0, 2).map((est) => (
              <div key={est.numero} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-fg">{est.numero}</p>
                  <p className="text-[10px] text-fg-muted">{est.periodo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{est.monto}</span>
                  <span className="text-[11px] text-fg-muted">{est.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MINI-RESUMEN DOCUMENTOS Y CIERRE */}
      {previewTab === 'cierre' && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Contrato, Pólizas y Expediente de Cierre
              </h2>
              <p className="text-[11px] text-fg-muted">
                {selectedPolizas.length}/3 pólizas registradas · Contrato{' '}
                {selectedContrato?.numero_contrato ?? selectedObra.contrato}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('cierre')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <span>Abrir documentos y fianzas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-line text-xs">
            {DOCUMENTOS_OBRA.slice(0, 2).map((doc) => (
              <div key={doc.nombre} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <span className="truncate text-fg-soft">{doc.nombre}</span>
                </div>
                <span className="text-[11px] text-ok-fg font-semibold shrink-0">{doc.estado}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de atención requerida */}
      {selectedAttention && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAttention(null)}
        >
          <div
            className="bg-surface border border-line rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-fg-muted">
                  Folio {selectedAttention.folio}
                </p>
                <h3 className="text-sm font-semibold text-fg mt-1">{selectedAttention.title}</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                  selectedAttention.urgent
                    ? 'bg-warn-bg text-warn-fg'
                    : 'bg-subtle text-fg-soft'
                }`}
              >
                {selectedAttention.urgent ? 'Urgente' : 'Pendiente'}
              </span>
            </div>

            <p className="text-xs text-fg-soft leading-relaxed">{selectedAttention.detail}</p>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedAttention(null)}
                className="px-3 py-1.5 rounded-lg border border-line-strong text-xs font-medium text-fg-soft hover:bg-subtle cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const dest =
                    selectedAttention.folio === 'FNZ-COBERTURA'
                      ? 'cierre'
                      : selectedAttention.category === 'bitacora'
                      ? 'bitacora'
                      : 'estimaciones';
                  setSelectedAttention(null);
                  onNavigateSection(dest);
                }}
                className="px-3 py-1.5 rounded-lg border border-brand text-accent text-xs font-semibold hover:bg-info-bg cursor-pointer"
              >
                Ir al módulo
              </button>
              {!isDirectivo && !resolvedIds.includes(selectedAttention.id) && (
                <button
                  type="button"
                  onClick={() => handleResolveAttention(selectedAttention.id)}
                  className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                >
                  Marcar como atendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
