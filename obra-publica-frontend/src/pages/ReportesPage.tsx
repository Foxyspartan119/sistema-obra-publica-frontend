import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';

interface ReporteObraRow {
  clave: string;
  contrato: string;
  nombre: string;
  estado: 'EN_EJECUCION' | 'ALERTA_VACANTE_OPERATIVA' | 'SUSPENDIDA' | 'EN_CONFIGURACION' | 'FINIQUITADA';
  avanceFisico: number;
  avanceFinanciero: number;
  presupuestoContratado: number;
  montoBrutoEstimado: number;
  amortizacionAnticipo: number;
  montoNetoAutorizado: number;
  montoLiquidado: number;
}

interface ExportAuditEntry {
  id: string;
  fechaUtc: string;
  formato: 'EXCEL (CSV)' | 'PDF';
  actor: string;
  ipOrigen: string;
}

const REPORT_ROWS: ReporteObraRow[] = [
  {
    clave: 'OP-2024-001',
    contrato: 'SOP-LP-024/2024',
    nombre: 'Construcción de Puente Vehicular OP-2024-001',
    estado: 'EN_EJECUCION',
    avanceFisico: 62,
    avanceFinanciero: 58,
    presupuestoContratado: 25000000,
    montoBrutoEstimado: 15500000,
    amortizacionAnticipo: 1000000,
    montoNetoAutorizado: 14500000,
    montoLiquidado: 14500000,
  },
  {
    clave: 'OP-2024-002',
    contrato: 'SOP-LP-031/2024',
    nombre: 'Rehabilitación de Colector Pluvial Zona Norte',
    estado: 'ALERTA_VACANTE_OPERATIVA',
    avanceFisico: 44,
    avanceFinanciero: 40,
    presupuestoContratado: 18400000,
    montoBrutoEstimado: 8100000,
    amortizacionAnticipo: 740000,
    montoNetoAutorizado: 7360000,
    montoLiquidado: 7360000,
  },
  {
    clave: 'OP-2024-003',
    contrato: 'SOP-LP-045/2024',
    nombre: 'Modernización de Vialidad Primaria Av. Politécnico',
    estado: 'SUSPENDIDA',
    avanceFisico: 31,
    avanceFinanciero: 28,
    presupuestoContratado: 32000000,
    montoBrutoEstimado: 9800000,
    amortizacionAnticipo: 840000,
    montoNetoAutorizado: 8960000,
    montoLiquidado: 8960000,
  },
  {
    clave: 'OP-2024-005',
    contrato: 'SOP-LP-011/2024',
    nombre: 'Sustitución de Red de Alumbrado Público Etapa I',
    estado: 'FINIQUITADA',
    avanceFisico: 100,
    avanceFinanciero: 100,
    presupuestoContratado: 9800000,
    montoBrutoEstimado: 10300000,
    amortizacionAnticipo: 500000,
    montoNetoAutorizado: 9800000,
    montoLiquidado: 9800000,
  },
];

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);

export const ReportesPage: React.FC = () => {
  const { user } = useAuth();
  const [auditExports, setAuditExports] = useState<ExportAuditEntry[]>([]);

  const totalContratado = REPORT_ROWS.reduce((s, r) => s + r.presupuestoContratado, 0);
  const totalLiquidado = REPORT_ROWS.reduce((s, r) => s + r.montoLiquidado, 0);
  const totalPorEjercer = totalContratado - totalLiquidado;
  const promedioFisico = Math.round(
    REPORT_ROWS.reduce((s, r) => s + r.avanceFisico, 0) / REPORT_ROWS.length
  );

  const registerExportLog = (formato: 'EXCEL (CSV)' | 'PDF') => {
    setAuditExports((prev) => [
      {
        id: `exp-${Date.now()}`,
        fechaUtc: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        formato,
        actor: user?.nombre ?? 'Carlos López (Directivo)',
        ipOrigen: '10.24.18.42 (simulada)',
      },
      ...prev,
    ]);
  };

  // RF-DIR-04 / RN-DIR-04.1: Exportación real a CSV compatible con Excel
  const handleExportCsv = () => {
    const headers = [
      'Clave',
      'Contrato',
      'Obra',
      'Estatus',
      'Avance Fisico (%)',
      'Avance Financiero (%)',
      'Presupuesto Contratado',
      'Monto Bruto Estimado',
      'Amortizacion Anticipo',
      'Monto Neto Autorizado',
      'Monto Liquidado',
      'Saldo por Ejercer',
    ];

    const lines = REPORT_ROWS.map((r) => [
      r.clave,
      r.contrato,
      `"${r.nombre}"`,
      r.estado,
      r.avanceFisico,
      r.avanceFinanciero,
      r.presupuestoContratado,
      r.montoBrutoEstimado,
      r.amortizacionAnticipo,
      r.montoNetoAutorizado,
      r.montoLiquidado,
      r.presupuestoContratado - r.montoLiquidado,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...lines.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_gerencial_obras_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    registerExportLog('EXCEL (CSV)');
  };

  const handleExportPdf = () => {
    registerExportLog('PDF');
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tablero directivo y consolidado financiero (RF-DIR-01 / RF-DIR-04)
          </p>
          <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight mt-0.5">
            Reportes gerenciales
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel (.csv)</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Resumen ejecutivo global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4">
          <p className="text-slate-400">Presupuesto total contratado</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatMXN(totalContratado)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4">
          <p className="text-slate-400">Monto efectivamente liquidado</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatMXN(totalLiquidado)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4">
          <p className="text-slate-400">Saldo pendiente por ejercer</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatMXN(totalPorEjercer)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span>Avance físico promedio</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <p className="text-xl font-bold text-brand mt-1">{promedioFisico}%</p>
        </div>
      </div>

      {/* Tabla desglosada financiera (RN-DIR-04.1) */}
      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
            Desglose financiero y avance físico vs. financiero por contrato
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-230 text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-semibold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Obra / Contrato</th>
                <th className="py-3 px-3">Estatus</th>
                <th className="py-3 px-3">Físico / Financ.</th>
                <th className="py-3 px-3 text-right">Contratado</th>
                <th className="py-3 px-3 text-right">Bruto Est.</th>
                <th className="py-3 px-3 text-right">Amortiz.</th>
                <th className="py-3 px-3 text-right">Liquidado</th>
                <th className="py-3 px-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {REPORT_ROWS.map((r) => {
                const saldo = r.presupuestoContratado - r.montoLiquidado;
                return (
                  <tr key={r.clave} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-brand">{r.clave}</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{r.nombre}</p>
                      <p className="text-[10px] text-slate-400">{r.contrato}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={r.estado} />
                    </td>
                    <td className="py-3.5 px-3 w-40">
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Físico</span>
                          <span className="font-semibold text-brand">{r.avanceFisico}%</span>
                        </div>
                        <div className="h-1.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand" style={{ width: `${r.avanceFisico}%` }} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Financ.</span>
                          <span className="font-semibold">{r.avanceFinanciero}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-500"
                            style={{ width: `${r.avanceFinanciero}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">{formatMXN(r.presupuestoContratado)}</td>
                    <td className="py-3.5 px-3 text-right">{formatMXN(r.montoBrutoEstimado)}</td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      -{formatMXN(r.amortizacionAnticipo)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-emerald-600">
                      {formatMXN(r.montoLiquidado)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold">{formatMXN(saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trazabilidad de descargas (RN-DIR-04.2) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand" />
            Trazabilidad de exportaciones (RN-DIR-04.2)
          </span>
          <span className="text-[10px] text-slate-400">Registrado en Auditoría Logs</span>
        </div>

        {auditExports.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            Aún no se han generado descargas en esta sesión. Al exportar en Excel o PDF se registrará
            automáticamente fecha UTC, usuario e IP de origen.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {auditExports.map((log) => (
              <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-500">{log.fechaUtc}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{log.actor}</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-brand text-[10px] font-semibold">
                  {log.formato}
                </span>
                <span className="text-[11px] text-slate-400">IP: {log.ipOrigen}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};