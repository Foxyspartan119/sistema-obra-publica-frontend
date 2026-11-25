import React from 'react';
import {
  MapPin,
  Calendar,
  Building2,
  TrendingUp,
  Wallet,
  BookOpen,
  Calculator,
  ListChecks,
  FolderOpen,
  AlertTriangle,
  Lock,
  PauseCircle,
  CheckCircle2,
  ArrowRight,
  HardHat,
  BarChart3,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import { StatusBadge } from '../components/common/StatusBadge';

interface ObraInicioPageProps {
  onNavigateSection: (section: string) => void;
}

const REQUIRED_OPERATIONAL_ROLES = [
  { key: 'RESIDENTE', label: 'Residente de Obra' },
  { key: 'SUPERVISOR', label: 'Supervisor Técnico' },
  { key: 'SUPERINTENDENTE', label: 'Superintendente Contratista' },
] as const;

export const ObraInicioPage: React.FC<ObraInicioPageProps> = ({
  onNavigateSection,
}) => {
  const { user } = useAuth();
  const { selectedObra } = useObra();

  const isDirectivo = user?.rol === 'DIRECTIVO';
  const isBlockedByStatus =
    selectedObra.estado === 'EN_CONFIGURACION' ||
    selectedObra.estado === 'ALERTA_VACANTE_OPERATIVA';

  const physicalFinancialDelta =
    selectedObra.avanceFisico - selectedObra.avanceFinanciero;

  const quickModules = [
    {
      id: 'catalogo',
      title: 'Catálogo de conceptos',
      description: 'Presupuesto contratado, volúmenes adicionales y extraordinarios (APU).',
      icon: ListChecks,
      tag: 'RF-SUPT-01 / RF-RES-04',
    },
    {
      id: 'bitacora',
      title: 'Bitácora electrónica',
      description: 'Notas firmadas con SHA-256 y reportes diarios de supervisión.',
      icon: BookOpen,
      tag: 'RF-SUP-03 / RNF-SEG-04',
    },
    {
      id: 'estimaciones',
      title: 'Estimaciones y CFDI',
      description: 'Generadores de cobro, dictámenes de revisión y validación PDF + XML.',
      icon: Calculator,
      tag: 'RF-SUPT-03 / RF-RES-03',
    },
    {
      id: 'cierre',
      title: 'Documentos y Cierre',
      description: 'Expediente legal, pólizas, recepción física y acta de finiquito.',
      icon: FolderOpen,
      tag: 'RF-RES-05 / RF-DIR-03',
    },
    ...(isDirectivo
      ? [
          {
            id: 'reportes',
            title: 'Reportes gerenciales',
            description: 'Consolidado ejecutivo global y exportación trazable en CSV / PDF.',
            icon: BarChart3,
            tag: 'RF-DIR-01 / RF-DIR-04',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado dinámico conectado a useObra() */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              {selectedObra.id} · Contrato {selectedObra.contrato}
            </span>
            <StatusBadge status={selectedObra.estado} />
          </div>

          <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight">
            {selectedObra.nombre}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {selectedObra.ubicacion}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Término contractual: {selectedObra.fechaTermino}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {selectedObra.contratista}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateSection('mis-obras')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hc:border-2 hc:border-black bg-white dark:bg-slate-900 hc:bg-white hover:border-brand text-xs font-semibold text-slate-700 dark:text-slate-200 hc:text-black transition-colors cursor-pointer self-start shrink-0"
        >
          <HardHat className="w-4 h-4 text-brand" />
          <span>Cambiar de obra</span>
        </button>
      </div>

      {/* Banners normativos según el estado de la obra seleccionada */}
      {selectedObra.estado === 'ALERTA_VACANTE_OPERATIVA' && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs"
        >
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Operación pausada por vacante operativa (RN-ADM-03.4)
            </p>
            <p>
              Esta obra requiere suplente activo en el área de{' '}
              <strong>{selectedObra.vacanteRol ?? 'RESIDENTE'}</strong>. Los flujos de
              bitácora y autorización de estimaciones permanecen bloqueados hasta que
              Administración registre el relevo.
            </p>
          </div>
        </div>
      )}

      {selectedObra.estado === 'EN_CONFIGURACION' && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs"
        >
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Obra en fase de configuración inicial (RN-ADM-04.1 / RN-ADM-04.3)
            </p>
            <p>
              Aún no se han asignado los 3 actores operativos obligatorios (Residente,
              Supervisor y Superintendente). La apertura de bitácora y ejecución se
              habilitarán automáticamente al completar la plantilla.
            </p>
          </div>
        </div>
      )}

      {selectedObra.estado === 'SUSPENDIDA' && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs"
        >
          <PauseCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Suspensión temporal vigente (RN-RES-02.2)
            </p>
            <p>
              El reloj de atrasos en ruta crítica está pausado y la captura de nuevos
              generadores de obra se encuentra restringida hasta registrar la nota de
              reanudación.
            </p>
          </div>
        </div>
      )}

      {selectedObra.estado === 'FINIQUITADA' && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Contrato finiquitado y cerrado (RN-RES-05.2)
            </p>
            <p>
              La recepción física y el finiquito han sido firmados electrónicamente. Todo
              el expediente, catálogo y bitácora permanecen inmutables para consulta y
              auditoría.
            </p>
          </div>
        </div>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Avance Físico */}
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Avance físico real</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-brand">
            {selectedObra.avanceFisico}%
          </p>
          <div className="h-1.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${selectedObra.avanceFisico}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Validado por reportes firmados (RN-SUP-03.5)
          </p>
        </div>

        {/* KPI 2: Avance Financiero */}
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Avance financiero</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white hc:text-black">
            {selectedObra.avanceFinanciero}%
          </p>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${selectedObra.avanceFinanciero}%` }}
            />
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Cumple candado Físico ≥ Financiero (+{physicalFinancialDelta}%)
          </p>
        </div>

        {/* KPI 3: Monto Contratado */}
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Presupuesto contratado</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white hc:text-black">
            {selectedObra.montoLabel} <span className="text-xs font-normal">MXN</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Tope estricto en catálogo base (RN-SUPT-01.1)
          </p>
        </div>

        {/* KPI 4: Integración de plantilla operativa */}
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Plantilla operativa</span>
            <Users className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white hc:text-black">
            {selectedObra.asignados.length} / 3
          </p>
          <p className="text-[11px] text-slate-400">
            {selectedObra.asignados.length === 3
              ? 'Residente, Supervisor y Superintendente activos'
              : 'Pendiente asignar plantilla completa'}
          </p>
        </div>
      </div>

      {/* Estado de actores operativos + Accesos directos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Plantilla asignada */}
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
            Actores operativos del contrato
          </h2>
          <p className="text-[11px] text-slate-400">
            Asignación única 1:1 por rol en obra (RN-ADM-03.2)
          </p>

          <div className="space-y-2.5 pt-1 text-xs">
            {REQUIRED_OPERATIONAL_ROLES.map((item) => {
              const assigned = selectedObra.asignados.includes(item.key);
              const isVacantTarget = selectedObra.vacanteRol === item.key;

              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {item.label}
                  </span>
                  {assigned && !isVacantTarget ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                      Asignado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                      Vacante
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Accesos directos a módulos operativos */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
              Módulos de gestión del contrato
            </h2>
            {isBlockedByStatus && (
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Escritura restringida por estatus de obra
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onNavigateSection(mod.id)}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hc:border-black hover:border-brand hover:bg-blue-50/30 dark:hover:bg-slate-800/60 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-brand flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {mod.tag}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white hc:text-black pt-1">
                      {mod.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                    <span>Abrir módulo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};