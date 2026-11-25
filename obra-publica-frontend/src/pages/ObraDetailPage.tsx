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

interface ObraDetailPageProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const OBRA_TABS = [
  { id: 'inicio', label: 'Resumen' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'programa', label: 'Programa' },
  { id: 'bitacora', label: 'Bitácora' },
  { id: 'estimaciones', label: 'Estimaciones' },
  { id: 'cierre', label: 'Documentos y Cierre' },
] as const;

export const ObraDetailPage: React.FC<ObraDetailPageProps> = ({
  activeSection,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Actualizado hoy, 08:45 h');

  const [selectedPeriodId, setSelectedPeriodId] = useState('may-oct');
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
  const [selectedAttention, setSelectedAttention] = useState<AttentionItem | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const isDirectivo = user?.rol === 'DIRECTIVO';
  const currentTab = OBRA_TABS.some((t) => t.id === activeSection)
    ? activeSection
    : 'inicio';

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
      {/* Encabezado de la obra */}
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
        {/* KPI 1 */}
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

        {/* KPI 2 */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted ">
            <span>Avance físico</span>
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

        {/* KPI 3 */}
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

        {/* KPI 4 */}
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

      {/* Pestañas de secciones de la obra sincronizadas con el Sidebar */}
      <div
        role="tablist"
        className="border-b border-line flex items-center gap-6 overflow-x-auto"
      >
        {OBRA_TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onNavigate(tab.id)}
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

      {/* Contenido de cada pestaña */}
      {currentTab === 'inicio' && (
        <div className="space-y-5">
          {/* Fila 1: Gráfico de avance acumulado + Ficha de información */}
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

                {/* Selector de periodo */}
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

              {/* Leyenda */}
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

              {/* Gráfico SVG responsivo */}
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

                      <circle
                        cx={lastRealPoint.x}
                        cy={lastRealPoint.y}
                        r="4.5"
                        className="fill-accent"
                      />
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
                        onNavigate('catalogo');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-subtle cursor-pointer"
                    >
                      Ver catálogo de conceptos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoMenuOpen(false);
                        onNavigate('estimaciones');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-subtle cursor-pointer"
                    >
                      Consultar estimaciones
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
                      {OBRA_DETAIL_MOCK.diasTranscurridos} de {OBRA_DETAIL_MOCK.diasTotales}{' '}
                      días
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fg-muted rounded-full"
                      style={{
                        width: `${
                          (OBRA_DETAIL_MOCK.diasTranscurridos /
                            OBRA_DETAIL_MOCK.diasTotales) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 2: Actividades de la semana + Requieren tu atención */}
          <div className="flex flex-col xl:flex-row gap-5 items-stretch">
            <div className="flex-1 bg-surface border border-line rounded-xl overflow-hidden min-w-0">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg ">
                  Actividades de la semana
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('programa')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline cursor-pointer"
                >
                  <span>Ver programa</span>
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

            {/* Requieren tu atención */}
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

      {/* Pestaña Catálogo */}
      {currentTab === 'catalogo' && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-line ">
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Catálogo de conceptos
              </h2>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Partidas principales del contrato {OBRA_DETAIL_MOCK.contrato}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              Volver a Resumen
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-150">
              <thead>
                <tr className="bg-canvas text-[10px] font-medium text-fg-muted uppercase">
                  <th className="py-2.5 px-5">Clave</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Unidad</th>
                  <th className="py-2.5 px-3">Volumen</th>
                  <th className="py-2.5 px-3">Ejecutado</th>
                  <th className="py-2.5 px-5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {CATALOG_CONCEPTS.map((row) => (
                  <tr key={row.clave}>
                    <td className="py-3.5 px-5 font-semibold text-accent">{row.clave}</td>
                    <td className="py-3.5 px-3 font-medium text-fg ">
                      {row.concepto}
                    </td>
                    <td className="py-3.5 px-3 text-fg-muted">{row.unidad}</td>
                    <td className="py-3.5 px-3 text-fg-muted">{row.volumen}</td>
                    <td className="py-3.5 px-3">{row.ejecutado}</td>
                    <td className="py-3.5 px-5 text-right font-semibold">{row.importe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña Programa */}
      {currentTab === 'programa' && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-line ">
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Programa de ejecución
              </h2>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Frentes activos y seguimiento de fechas contractuales
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              Volver a Resumen
            </button>
          </div>
          <div className="divide-y divide-line ">
            {WEEKLY_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs font-medium text-fg ">
                    {act.title}
                  </p>
                  <p className="text-[11px] text-fg-muted mt-0.5">
                    {act.subtitle} · Término programado: {act.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-1.5 bg-info-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${act.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-9 text-right">{act.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña Bitácora */}
      {currentTab === 'bitacora' && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-line ">
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Bitácora de obra
              </h2>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Registro cronológico de notas técnicas y supervisión
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              Volver a Resumen
            </button>
          </div>
          <div className="divide-y divide-line ">
            {BITACORA_ENTRIES.map((nota) => (
              <div
                key={nota.folio}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-accent">{nota.folio}</span>
                    <span className="text-fg-muted">· {nota.fecha}</span>
                  </div>
                  <p className="text-xs font-medium text-fg mt-1">
                    {nota.asunto}
                  </p>
                  <p className="text-[11px] text-fg-muted mt-0.5">{nota.autor}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                    nota.estado === 'Firmada'
                      ? 'bg-ok-bg text-ok-fg '
                      : 'bg-warn-bg text-warn-fg '
                  }`}
                >
                  {nota.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña Estimaciones */}
      {currentTab === 'estimaciones' && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-line ">
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Estimaciones de obra
              </h2>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Control de pagos y avance financiero acumulado
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              Volver a Resumen
            </button>
          </div>
          <div className="divide-y divide-line ">
            {ESTIMACIONES_LIST.map((est) => (
              <div
                key={est.numero}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs font-medium text-fg ">
                    {est.numero}
                  </p>
                  <p className="text-[11px] text-fg-muted mt-0.5">Periodo: {est.periodo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold">{est.monto}</span>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      est.estado === 'Pagada'
                        ? 'bg-ok-bg text-ok-fg '
                        : 'bg-warn-bg text-warn-fg '
                    }`}
                  >
                    {est.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña Documentos y Cierre */}
      {currentTab === 'cierre' && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-line ">
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Repositorio documental y cierre
              </h2>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Contrato {OBRA_DETAIL_MOCK.contrato} · Planos, licencias y actas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              Volver a Resumen
            </button>
          </div>
          <div className="divide-y divide-line ">
            {DOCUMENTOS_OBRA.map((doc) => (
              <div
                key={doc.nombre}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <p className="font-medium text-fg ">
                      {doc.nombre}
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      {doc.categoria} · Subido el {doc.fecha}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-ok-bg text-ok-fg text-[11px] font-semibold">
                  {doc.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalle de atención requerida */}
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