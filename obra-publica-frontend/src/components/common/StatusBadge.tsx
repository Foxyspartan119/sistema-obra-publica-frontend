import React from 'react';

export type BadgeVariant =
  | 'EN_CONFIGURACION'
  | 'EN_EJECUCION'
  | 'ALERTA_VACANTE_OPERATIVA'
  | 'SUSPENDIDA'
  | 'FINIQUITADA'
  | 'BORRADOR'
  | 'ENVIADO'
  | 'EN_REVISION'
  | 'OBSERVADA'
  | 'RECHAZADA'
  | 'APROBADA'
  | 'AUTORIZADA_PAGO'
  | 'LIQUIDADA'
  | 'FIRMADO'
  | 'ACTIVO'
  | 'SUSPENDIDO';

interface StatusBadgeProps {
  status: BadgeVariant | string;
  label?: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  EN_CONFIGURACION: {
    label: 'En configuración',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hc:bg-white hc:text-black hc:border hc:border-black',
  },
  EN_EJECUCION: {
    label: 'En ejecución',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hc:bg-white hc:text-black hc:border hc:border-black',
  },
  ALERTA_VACANTE_OPERATIVA: {
    label: 'Vacante operativa',
    className:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hc:bg-black hc:text-white',
  },
  SUSPENDIDA: {
    label: 'Suspendida',
    className:
      'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hc:bg-white hc:text-black hc:border-2 hc:border-black',
  },
  FINIQUITADA: {
    label: 'Finiquitada / Cerrada',
    className:
      'bg-blue-50 text-brand dark:bg-blue-950/60 dark:text-blue-300 hc:bg-white hc:text-black hc:border hc:border-black',
  },
  BORRADOR: {
    label: 'Borrador',
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hc:border hc:border-black',
  },
  ENVIADO: {
    label: 'Enviado (sin firma)',
    className:
      'bg-blue-50 text-brand dark:bg-blue-950/60 dark:text-blue-300 hc:border hc:border-black',
  },
  EN_REVISION: {
    label: 'En revisión',
    className:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hc:border hc:border-black',
  },
  OBSERVADA: {
    label: 'Observada',
    className:
      'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hc:border hc:border-black',
  },
  RECHAZADA: {
    label: 'Rechazada',
    className:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hc:bg-black hc:text-white',
  },
  APROBADA: {
    label: 'Aprobada por Supervisión',
    className:
      'bg-blue-50 text-brand dark:bg-blue-950/60 dark:text-blue-300 hc:border hc:border-black',
  },
  AUTORIZADA_PAGO: {
    label: 'Autorizada para pago',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hc:border hc:border-black',
  },
  LIQUIDADA: {
    label: 'Liquidada',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hc:border hc:border-black',
  },
  FIRMADO: {
    label: 'Firmado',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hc:border hc:border-black',
  },
  ACTIVO: {
    label: 'Activo',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hc:border hc:border-black',
  },
  SUSPENDIDO: {
    label: 'Suspendido',
    className:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hc:bg-black hc:text-white',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = STATUS_STYLES[status] ?? {
    label: status,
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hc:border hc:border-black',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${config.className}`}
    >
      {label ?? config.label}
    </span>
  );
};