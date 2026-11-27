import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import { StatusBadge } from '../components/common/StatusBadge';

interface ExportAuditEntry {
  id: string;
  fechaUtc: string;
  formato: 'EXCEL (CSV)' | 'PDF';
  actor: string;
  ipOrigen: string;
}

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);

export const ReportesPage: React.FC = () => {
  const { user } = useAuth();
  const { obras } = useObra();
  const [auditExports, setAuditExports] = useState<ExportAuditEntry[]>([]);

  const reportRows = useMemo(() => {
    return obras.map((o) => {
      const contratado = o.presupuestoTotal ?? 25000000;
      const liquidado = Math.round(contratado * (o.avanceFinanciero / 100));
      const amortizacion = Math.round(liquidado * 0.08);
      const brutoEstimado = liquidado + amortizacion;
      return {
        clave: o.id,
        contrato: o.contrato,
        nombre: o.nombre,
        estado: o.estado,
        avanceProgramado: o.avanceProgramado,
        avanceFisico: o.avanceFisico,
        avanceFinanciero: o.avanceFinanciero,
        desviacion: Number((o.avanceFisico - o.avanceProgramado).toFixed(1)),
        presupuestoContratado: contratado,
        montoBrutoEstimado: brutoEstimado,
        amortizacionAnticipo: amortizacion,
        montoNetoAutorizado: liquidado,
        montoLiquidado: liquidado,
      };
    });
  }, [obras]);

  const totalContratado = reportRows.reduce((s, r) => s + r.presupuestoContratado, 0);
  const totalLiquidado = reportRows.reduce((s, r) => s + r.montoLiquidado, 0);
  const totalPorEjercer = totalContratado - totalLiquidado;
  const promedioProgramado =
    reportRows.length > 0
      ? Number(
          (
            reportRows.reduce((s, r) => s + r.avanceProgramado, 0) / reportRows.length
          ).toFixed(1)
        )
      : 0;
  const promedioFisico =
    reportRows.length > 0
      ? Number(
          (reportRows.reduce((s, r) => s + r.avanceFisico, 0) / reportRows.length).toFixed(1)
        )
      : 0;
  const promedioFinanciero =
    reportRows.length > 0
      ? Number(
          (
            reportRows.reduce((s, r) => s + r.avanceFinanciero, 0) / reportRows.length
          ).toFixed(1)
        )
      : 0;

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

  const handleExportCsv = () => {
    const headers = [
      'Clave',
      'Contrato',
      'Obra',
      'Estatus',
      'Avance Programado (%)',
      'Avance Fisico Real (%)',
      'Avance Financiero (%)',
      'Desviacion (pp)',
      'Presupuesto Contratado',
      'Monto Bruto Estimado',
      'Amortizacion Anticipo',
      'Monto Neto Autorizado',
      'Monto Liquidado',
      'Saldo por Ejercer',
    ];

    const lines = reportRows.map((r) => [
      r.clave,
      r.contrato,
      `"${r.nombre}"`,
      r.estado,
      r.avanceProgramado,
      r.avanceFisico,
      r.avanceFinanciero,
      r.desviacion,
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            Tablero directivo y consolidado financiero (RF-DIR-01 / RF-DIR-04)
          </p>
          <h1 className="text-2xl font-normal text-fg tracking-tight mt-0.5">
            Reportes gerenciales
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line-strong bg-surface hover:border-brand text-xs font-semibold text-fg-soft cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-ok-fg" />
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

      {/* Resumen ejecutivo global con todos los porcentajes promedio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Presupuesto total contratado</p>
          <p className="text-xl font-bold text-fg mt-1">{formatMXN(totalContratado)}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Monto efectivamente liquidado</p>
          <p className="text-xl font-bold text-ok-fg mt-1">{formatMXN(totalLiquidado)}</p>
          <p className="text-[10px] text-fg-muted mt-0.5">
            Promedio financiero: <strong>{promedioFinanciero}%</strong>
          </p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-fg-muted">Saldo pendiente por ejercer</p>
          <p className="text-xl font-bold text-fg mt-1">{formatMXN(totalPorEjercer)}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="flex items-center justify-between text-fg-muted">
            <span>Promedios de avance</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <p className="text-xl font-bold text-accent mt-1">Real: {promedioFisico}%</p>
          <p className="text-[10px] text-fg-muted mt-0.5">
            Programado: <strong>{promedioProgramado}%</strong> · Financiero:{' '}
            <strong>{promedioFinanciero}%</strong>
          </p>
        </div>
      </div>

      {/* Tabla desglosada financiera con los 3 porcentajes */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-fg">
            Desglose financiero y comparativo Programado vs. Físico Real vs. Financiero
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-240 text-xs">
            <thead>
              <tr className="bg-canvas text-[10px] font-semibold uppercase text-fg-muted border-b border-line">
                <th className="py-3 px-4">Obra / Contrato</th>
                <th className="py-3 px-3">Estatus</th>
                <th className="py-3 px-3">Prog. / Físico / Financ.</th>
                <th className="py-3 px-3 text-right">Contratado</th>
                <th className="py-3 px-3 text-right">Bruto Est.</th>
                <th className="py-3 px-3 text-right">Amortiz.</th>
                <th className="py-3 px-3 text-right">Liquidado</th>
                <th className="py-3 px-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reportRows.map((r) => {
                const saldo = r.presupuestoContratado - r.montoLiquidado;
                return (
                  <tr key={r.clave} className="hover:bg-subtle/60">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-accent">{r.clave}</p>
                      <p className="font-medium text-fg">{r.nombre}</p>
                      <p className="text-[10px] text-fg-muted">{r.contrato}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={r.estado} />
                    </td>
                    <td className="py-3.5 px-3 w-48">
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-fg-muted">Programado</span>
                          <span className="font-semibold text-fg-soft">{r.avanceProgramado}%</span>
                        </div>
                        <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                          <div
                            className="h-full bg-fg-muted"
                            style={{ width: `${r.avanceProgramado}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-fg-muted">Físico Real</span>
                          <span className="font-semibold text-accent">
                            {r.avanceFisico}% ({r.desviacion >= 0 ? '+' : ''}
                            {r.desviacion} pp)
                          </span>
                        </div>
                        <div className="h-1.5 bg-info-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand"
                            style={{ width: `${r.avanceFisico}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-fg-muted">Financiero</span>
                          <span className="font-semibold text-ok-fg">{r.avanceFinanciero}%</span>
                        </div>
                        <div className="h-1.5 bg-ok-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-ok-solid"
                            style={{ width: `${r.avanceFinanciero}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">{formatMXN(r.presupuestoContratado)}</td>
                    <td className="py-3.5 px-3 text-right">{formatMXN(r.montoBrutoEstimado)}</td>
                    <td className="py-3.5 px-3 text-right text-fg-muted">
                      -{formatMXN(r.amortizacionAnticipo)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-ok-fg">
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
      <div className="bg-surface border border-line rounded-xl p-5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-fg inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Trazabilidad de exportaciones (RN-DIR-04.2)
          </span>
          <span className="text-[10px] text-fg-muted">Registrado en Auditoría Logs</span>
        </div>

        {auditExports.length === 0 ? (
          <p className="text-[11px] text-fg-muted">
            Aún no se han generado descargas en esta sesión. Al exportar en Excel o PDF se
            registrará automáticamente fecha UTC, usuario e IP de origen.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {auditExports.map((log) => (
              <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-fg-muted">{log.fechaUtc}</span>
                <span className="font-medium text-fg">{log.actor}</span>
                <span className="px-2 py-0.5 rounded bg-info-bg text-accent text-[10px] font-semibold">
                  {log.formato}
                </span>
                <span className="text-[11px] text-fg-muted">IP: {log.ipOrigen}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
