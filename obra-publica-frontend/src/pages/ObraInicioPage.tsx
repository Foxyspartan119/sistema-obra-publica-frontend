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
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Seguimiento de obra</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{lastUpdated}</span>
          </button>
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight">
            {OBRA_DETAIL_MOCK.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
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
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Obras activas</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-normal text-slate-900 dark:text-white hc:text-black">
              0{OBRA_DETAIL_MOCK.obrasActivas}
            </span>
            <span className="text-xs text-slate-400">
              de {OBRA_DETAIL_MOCK.obrasRegistradas} registradas
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {OBRA_DETAIL_MOCK.obrasPorConcluir} obras próximas a concluir
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Avance físico</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <div className="text-3xl font-normal text-brand">{OBRA_DETAIL_MOCK.avanceFisico}%</div>
          <div className="w-full h-1.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full"
              style={{ width: `${OBRA_DETAIL_MOCK.avanceFisico}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Programado: {OBRA_DETAIL_MOCK.avanceProgramado}% · Desviación: −3 pp
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Avance financiero</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-3xl font-normal ${
              presupuestoEnRegla
                ? 'text-slate-900 dark:text-white hc:text-black'
                : 'text-rose-600'
            }`}
          >
            {OBRA_DETAIL_MOCK.avanceFinanciero}%
          </div>
          <div className="w-full h-1.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                presupuestoEnRegla ? 'bg-blue-300 dark:bg-blue-500' : 'bg-rose-600'
              }`}
              style={{ width: `${OBRA_DETAIL_MOCK.avanceFinanciero}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            $14.5 M de $25.0 M contratados
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Pendientes</span>
            <ClipboardList className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-normal text-slate-900 dark:text-white hc:text-black">
            0{pendingAttentionCount}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
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
        className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto"
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
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
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
            <div className="flex-1 bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 flex flex-col justify-between gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
                    Avance físico acumulado
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Comparativo de ejecución respecto al programa de obra
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPeriodMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span>{currentPeriod.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {periodMenuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20">
                      {PROGRESS_PERIODS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPeriodId(p.id);
                            setPeriodMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                            p.id === selectedPeriodId
                              ? 'font-semibold text-brand'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-brand rounded" />
                  Avance real
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-blue-300 rounded" />
                  Avance programado
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <div className="min-w-130 flex gap-3">
                  <div className="flex flex-col justify-between h-35 text-[10px] text-slate-400 shrink-0">
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
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="1"
                        />
                      ))}

                      <path d={realAreaPath} fill="#2563EB" fillOpacity="0.08" />
                      <path
                        d={progPath}
                        fill="none"
                        stroke="#93C5FD"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <path d={realPath} fill="none" stroke="#2563EB" strokeWidth="2.5" />
                      <circle cx={lastRealPoint.x} cy={lastRealPoint.y} r="4.5" fill="#2563EB" />
                      <g
                        transform={`translate(${Math.max(0, lastRealPoint.x - 36)}, ${Math.max(
                          4,
                          lastRealPoint.y - 26
                        )})`}
                      >
                        <rect width="34" height="18" rx="4" fill="#2563EB" />
                        <text
                          x="17"
                          y="12"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {currentPeriod.badge}
                        </text>
                      </g>
                    </svg>

                    <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                      {currentPeriod.months.map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{currentPeriod.note}</span>
              </div>
            </div>

            {/* Ficha de la obra */}
            <div className="w-full xl:w-90 shrink-0 bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between relative">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
                  Información de la obra
                </h2>
                <button
                  type="button"
                  aria-label="Opciones de ficha"
                  onClick={() => setInfoMenuOpen((prev) => !prev)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {infoMenuOpen && (
                  <div className="absolute right-0 top-7 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setInfoMenuOpen(false);
                        onNavigateSection('catalogo');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Ir a Catálogo completo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoMenuOpen(false);
                        onNavigateSection('estimaciones');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Ir a Estimaciones
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[11px] text-slate-400">Contratista</p>
                  <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                    {OBRA_DETAIL_MOCK.contratista}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Inicio de obra</p>
                    <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                      {OBRA_DETAIL_MOCK.fechaInicio}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Término contractual</p>
                    <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                      {OBRA_DETAIL_MOCK.fechaTermino}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Monto contratado</span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    $25,000,000 <span className="text-[10px] text-slate-400">MXN</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Plazo transcurrido</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {OBRA_DETAIL_MOCK.diasTranscurridos} de {OBRA_DETAIL_MOCK.diasTotales} días
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
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
            <div className="flex-1 bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl overflow-hidden min-w-0">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
                  Actividades de la semana
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateSection('programa')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline cursor-pointer"
                >
                  <span>Abrir programa completo</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-130">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-medium text-slate-500 uppercase border-y border-slate-200 dark:border-slate-800">
                      <th className="py-2 px-5">Actividad</th>
                      <th className="py-2 px-3">Fecha fin</th>
                      <th className="py-2 px-3">Avance</th>
                      <th className="py-2 px-5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {WEEKLY_ACTIVITIES.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-5">
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            {act.title}
                          </p>
                          <p className="text-[10px] text-slate-400">{act.subtitle}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {act.endDate}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full"
                                style={{ width: `${act.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300">
                              {act.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                              act.status === 'Concluida'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-300'
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

            <div className="w-full xl:w-90 shrink-0 bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
                  Requieren tu atención
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold">
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
                      className={`w-full flex items-start gap-3 p-2 -mx-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        isResolved ? 'opacity-55' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.urgent
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            item.urgent
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {isResolved ? 'Atendido' : item.subtitle}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Información reportada por la residencia de obra.</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Datos guardados y sincronizados
            </span>
          </div>
        </div>
      )}

      {/* 2. MINI-RESUMEN CATÁLOGO */}
      {previewTab === 'catalogo' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Síntesis del Catálogo de Conceptos
              </h2>
              <p className="text-[11px] text-slate-400">
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

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {CATALOG_CONCEPTS.slice(0, 3).map((item) => (
              <div key={item.clave} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-semibold text-brand mr-2">{item.clave}</span>
                  <span className="text-slate-700 dark:text-slate-200">{item.concepto}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                  {item.importe}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MINI-RESUMEN PROGRAMA */}
      {previewTab === 'programa' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Síntesis del Programa de Ejecución
              </h2>
              <p className="text-[11px] text-slate-400">
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
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
              >
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                  {act.title}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Fin: {act.endDate}</span>
                  <span className="font-semibold text-brand">{act.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MINI-RESUMEN BITÁCORA */}
      {previewTab === 'bitacora' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Últimas notas de Bitácora
              </h2>
              <p className="text-[11px] text-slate-400">
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

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {BITACORA_ENTRIES.slice(0, 2).map((nota) => (
              <div key={nota.folio} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-brand mr-2">{nota.folio}</span>
                  <span className="text-slate-700 dark:text-slate-200">{nota.asunto}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {nota.fecha} · {nota.autor}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium shrink-0">
                  {nota.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MINI-RESUMEN ESTIMACIONES */}
      {previewTab === 'estimaciones' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Resumen de Estimaciones
              </h2>
              <p className="text-[11px] text-slate-400">
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

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {ESTIMACIONES_LIST.slice(0, 2).map((est) => (
              <div key={est.numero} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{est.numero}</p>
                  <p className="text-[10px] text-slate-400">{est.periodo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{est.monto}</span>
                  <span className="text-[11px] text-slate-500">{est.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MINI-RESUMEN DOCUMENTOS Y CIERRE */}
      {previewTab === 'cierre' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Expediente Documental y Cierre
              </h2>
              <p className="text-[11px] text-slate-400">
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

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {DOCUMENTOS_OBRA.slice(0, 2).map((doc) => (
              <div key={doc.nombre} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-brand shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {doc.nombre}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold shrink-0">
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Folio {selectedAttention.folio}
                </p>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {selectedAttention.title}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                  selectedAttention.urgent
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {selectedAttention.urgent ? 'Urgente' : 'Pendiente'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedAttention.detail}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAttention(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
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