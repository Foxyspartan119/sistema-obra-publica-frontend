import React, { useState } from 'react';
import {
  RefreshCw,
  MapPin,
  Building2,
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validarControlPresupuestal } from '../utils/businessRules';
import {
  ATTENTION_ITEMS,
  BITACORA_ENTRIES,
  CATALOG_CONCEPTS,
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

export const ObraInicioPage: React.FC<ObraInicioPageProps> = ({ onNavigateSection }) => {
  const { user } = useAuth();
  // Estado local: solo cambia la vista previa sin mover el Sidebar
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

  const pendingAttentionCount = ATTENTION_ITEMS.filter(
    (item) => !resolvedIds.includes(item.id)
  ).length;

  const presupuestoEnRegla = validarControlPresupuestal(
    OBRA_DETAIL_MOCK.avanceFinanciero,
    OBRA_DETAIL_MOCK.avanceFisico
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

  // Coordenadas del gráfico SVG
  const chartWidth = 580;
  const chartHeight = 140;
  const toCoords = (values: number[]) =>
    values.map((val, idx) => {
      const x =
        values.length === 1 ? chartWidth / 2 : (idx / (values.length - 1)) * chartWidth;
      const y = chartHeight - (Math.min(80, Math.max(0, val)) / 80) * chartHeight;
      return { x, y, val };
    });

  const progCoords = toCoords(currentPeriod.programado);
  const realCoords = toCoords(currentPeriod.real);
  const progPath = progCoords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const realPath = realCoords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const realAreaPath = `${realPath} L ${realCoords[realCoords.length - 1].x} ${chartHeight} L ${realCoords[0].x} ${chartHeight} Z`;
  const lastRealPoint = realCoords[realCoords.length - 1];

  return (
    <div className="space-y-6">
      {/* Encabezado general de la obra */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-fg-muted ">
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
            {OBRA_DETAIL_MOCK.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted ">
            <span className="px-2.5 py-1 rounded-md bg-ok-bg text-ok-fg font-semibold">
              {OBRA_DETAIL_MOCK.estadoEtiqueta}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {OBRA_DETAIL_MOCK.ubicacion}
            </span>
            <span>Contrato: {OBRA_DETAIL_MOCK.contrato}</span>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted ">
            <span>Obras activas</span>
            <Building2 className="w-4 h-4 text-fg-muted" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-normal text-fg ">
              0{OBRA_DETAIL_MOCK.obrasActivas}
            </span>
            <span className="text-xs text-fg-muted">
              de {OBRA_DETAIL_MOCK.obrasRegistradas} registradas
            </span>
          </div>
          <p className="text-[11px] text-fg-muted ">
            {OBRA_DETAIL_MOCK.obrasPorConcluir} obras próximas a concluir
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted ">
            <span>Avance físico real</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-normal text-accent">{OBRA_DETAIL_MOCK.avanceFisico}%</div>
          <div className="w-full h-1.5 bg-info-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full"
              style={{ width: `${OBRA_DETAIL_MOCK.avanceFisico}%` }}
            />
          </div>
          <p className="text-[11px] text-fg-muted ">
            Programado: {OBRA_DETAIL_MOCK.avanceProgramado}% · Desviación: −3 pp
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted ">
            <span>Avance financiero</span>
            <Wallet className="w-4 h-4 text-fg-muted" />
          </div>
          <div
            className={`text-3xl font-normal ${
              presupuestoEnRegla
                ? 'text-fg '
                : 'text-danger-fg'
            }`}
          >
            {OBRA_DETAIL_MOCK.avanceFinanciero}%
          </div>
          <div className="w-full h-1.5 bg-info-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                presupuestoEnRegla ? 'bg-fg-muted ' : 'bg-danger-solid'
              }`}
              style={{ width: `${OBRA_DETAIL_MOCK.avanceFinanciero}%` }}
            />
          </div>
          <p className="text-[11px] text-fg-muted ">
            $14.5 M de $25.0 M contratados
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted ">
            <span>Pendientes</span>
            <ClipboardList className="w-4 h-4 text-warn-fg" />
          </div>
          <div className="text-3xl font-normal text-fg ">
            0{pendingAttentionCount}
          </div>
          <p className="text-[11px] text-warn-fg font-medium">
            {pendingAttentionCount > 0
              ? 'Requieren atención esta semana'
              : 'Sin pendientes urgentes'}
          </p>
        </div>
      </div>

      {/* Pestañas horizontales de vista rápida (desacopladas del Sidebar) */}
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
                  : 'border-transparent text-fg-muted hover:text-fg '
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. TAB RESUMEN: Gráfica + Ficha + Actividades + Atención */}
      {previewTab === 'resumen' && (
        <div className="space-y-5">
          <div className="flex flex-col xl:flex-row gap-5 items-stretch">
            <div className="flex-1 bg-surface border border-line rounded-xl p-5 flex flex-col justify-between gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-fg ">
                    Avance físico acumulado
                  </h2>
                  <p className="text-[11px] text-fg-muted mt-0.5">
                    Comparativo de ejecución respecto al programa de obra
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
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-subtle  cursor-pointer ${
                            p.id === selectedPeriodId
                              ? 'font-semibold text-accent'
                              : 'text-fg-soft '
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5 text-[11px] text-fg-muted ">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-brand rounded" />
                  Avance real
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-fg-muted rounded" />
                  Avance programado
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <div className="min-w-130 flex gap-3">
                  <div className="flex flex-col justify-between h-35 text-[10px] text-fg-muted shrink-0">
                    <span>80%</span>
                    <span>60%</span>
                    <span>40%</span>
                    <span>20%</span>
                    <span>0%</span>
                  </div>

                  <div className="flex-1">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-35 overflow-visible"
                    >
                      {[0, 35, 70, 105, 140].map((y) => (
                        <line
                          key={y}
                          x1={0}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke="currentColor"
                          className="text-line "
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
                      <circle cx={lastRealPoint.x} cy={lastRealPoint.y} r="4.5" className="fill-accent" />
                      <g
                        transform={`translate(${Math.max(0, lastRealPoint.x - 36)}, ${Math.max(
                          4,
                          lastRealPoint.y - 26
                        )})`}
                      >
                        <rect width="34" height="18" rx="4" className="fill-accent" />
                        <text
                          x="17"
                          y="12"
                          textAnchor="middle"
                          className="fill-surface"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {currentPeriod.badge}
                        </text>
                      </g>
                    </svg>

                    <div className="flex justify-between text-[10px] text-fg-muted mt-2">
                      {currentPeriod.months.map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-fg-muted ">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{currentPeriod.note}</span>
              </div>
            </div>

            {/* Ficha de la obra */}
            <div className="w-full xl:w-90 shrink-0 bg-surface border border-line rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between relative">
                <h2 className="text-sm font-semibold text-fg ">
                  Información de la obra
                </h2>
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
                  </div>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[11px] text-fg-muted">Contratista</p>
                  <p className="font-medium text-fg mt-0.5">
                    {OBRA_DETAIL_MOCK.contratista}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-fg-muted">Inicio de obra</p>
                    <p className="font-medium text-fg mt-0.5">
                      {OBRA_DETAIL_MOCK.fechaInicio}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-fg-muted">Término contractual</p>
                    <p className="font-medium text-fg mt-0.5">
                      {OBRA_DETAIL_MOCK.fechaTermino}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted ">Monto contratado</span>
                  <span className="font-semibold text-sm text-fg ">
                    $25,000,000 <span className="text-[10px] text-fg-muted">MXN</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-fg-muted">Plazo transcurrido</span>
                    <span className="font-medium text-fg-soft ">
                      {OBRA_DETAIL_MOCK.diasTranscurridos} de {OBRA_DETAIL_MOCK.diasTotales} días
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fg-muted rounded-full"
                      style={{
                        width: `${
                          (OBRA_DETAIL_MOCK.diasTranscurridos / OBRA_DETAIL_MOCK.diasTotales) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-5 items-stretch">
            <div className="flex-1 bg-surface border border-line rounded-xl overflow-hidden min-w-0">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg ">
                  Actividades de la semana
                </h2>
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
                    <tr className="bg-canvas text-[10px] font-medium text-fg-muted uppercase border-y border-line ">
                      <th className="py-2 px-5">Actividad</th>
                      <th className="py-2 px-3">Fecha fin</th>
                      <th className="py-2 px-3">Avance</th>
                      <th className="py-2 px-5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {WEEKLY_ACTIVITIES.map((act) => (
                      <tr key={act.id} className="hover:bg-subtle/60 ">
                        <td className="py-3 px-5">
                          <p className="font-medium text-fg ">
                            {act.title}
                          </p>
                          <p className="text-[10px] text-fg-muted">{act.subtitle}</p>
                        </td>
                        <td className="py-3 px-3 text-fg-muted ">
                          {act.endDate}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-info-bg rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full"
                                style={{ width: `${act.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-fg-soft ">
                              {act.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                              act.status === 'Concluida'
                                ? 'bg-ok-bg text-ok-fg '
                                : 'bg-info-bg text-accent '
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
                <h2 className="text-sm font-semibold text-fg ">
                  Requieren tu atención
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-warn-bg text-warn-fg text-xs font-semibold">
                  {pendingAttentionCount}
                </span>
              </div>

              <div className="space-y-3">
                {ATTENTION_ITEMS.map((item) => {
                  const isResolved = resolvedIds.includes(item.id);
                  const Icon = item.category === 'estimacion' ? FileCheck2 : NotebookPen;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAttention(item)}
                      className={`w-full flex items-start gap-3 p-2 -mx-2 rounded-lg text-left hover:bg-subtle  transition-colors cursor-pointer ${
                        isResolved ? 'opacity-55' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.urgent
                            ? 'bg-warn-bg text-warn-fg '
                            : 'bg-subtle text-fg-soft '
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-fg ">
                          {item.title}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            item.urgent
                              ? 'text-warn-fg '
                              : 'text-fg-muted'
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
              <h2 className="text-sm font-semibold text-fg ">
                Síntesis del Catálogo de Conceptos
              </h2>
              <p className="text-[11px] text-fg-muted">
                3 partidas principales activas · $9,215,000 MXN en frentes abiertos
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
            {CATALOG_CONCEPTS.slice(0, 3).map((item) => (
              <div key={item.clave} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-semibold text-accent mr-2">{item.clave}</span>
                  <span className="text-fg-soft ">{item.concepto}</span>
                </div>
                <span className="font-semibold text-fg shrink-0">
                  {item.importe}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MINI-RESUMEN PROGRAMA */}
      {previewTab === 'programa' && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Síntesis del Programa de Ejecución
              </h2>
              <p className="text-[11px] text-fg-muted">
                1 frente concluido · 2 frentes en ejecución esta semana
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
              <div
                key={act.id}
                className="p-3 rounded-lg border border-line space-y-1.5"
              >
                <p className="font-medium text-fg truncate">
                  {act.title}
                </p>
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
              <h2 className="text-sm font-semibold text-fg ">
                Últimas notas de Bitácora
              </h2>
              <p className="text-[11px] text-fg-muted">
                42 notas registradas · 1 pendiente de firma por supervisión
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
                  <span className="text-fg-soft ">{nota.asunto}</span>
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
              <h2 className="text-sm font-semibold text-fg ">
                Resumen de Estimaciones
              </h2>
              <p className="text-[11px] text-fg-muted">
                5 estimaciones pagadas · Estimación N.º 06 en revisión ($2,350,000 MXN)
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
                  <p className="font-medium text-fg ">{est.numero}</p>
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
              <h2 className="text-sm font-semibold text-fg ">
                Expediente Documental y Cierre
              </h2>
              <p className="text-[11px] text-fg-muted">
                3 documentos base validados · Etapa de finiquito pendiente de cierre físico
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('cierre')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <span>Abrir documentos y cierre</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-line text-xs">
            {DOCUMENTOS_OBRA.slice(0, 2).map((doc) => (
              <div key={doc.nombre} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <span className="truncate text-fg-soft ">
                    {doc.nombre}
                  </span>
                </div>
                <span className="text-[11px] text-ok-fg font-semibold shrink-0">
                  {doc.estado}
                </span>
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
                <h3 className="text-sm font-semibold text-fg mt-1">
                  {selectedAttention.title}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                  selectedAttention.urgent
                    ? 'bg-warn-bg text-warn-fg '
                    : 'bg-subtle text-fg-soft '
                }`}
              >
                {selectedAttention.urgent ? 'Urgente' : 'Pendiente'}
              </span>
            </div>

            <p className="text-xs text-fg-soft leading-relaxed">
              {selectedAttention.detail}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line ">
              <button
                type="button"
                onClick={() => setSelectedAttention(null)}
                className="px-3 py-1.5 rounded-lg border border-line-strong text-xs font-medium text-fg-soft hover:bg-subtle cursor-pointer"
              >
                Cerrar
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