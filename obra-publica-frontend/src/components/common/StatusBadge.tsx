import React from 'react';
import {
  AlertTriangle,
  Ban,
  Banknote,
  Check,
  CheckCheck,
  Clock,
  Lock,
  Pause,
  Pencil,
  Play,
  Send,
  Settings,
  ShieldCheck,
  UserX,
  X,
} from 'lucide-react';

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

/**
 * Tonos semánticos (los colores de cada modo viven en index.css):
 *  neutral = sin acción / informativo   info = en proceso
 *  ok = completado / vigente            warn = requiere atención
 *  danger = bloqueo / rechazo
 */
type Tone = 'neutral' | 'info' | 'ok' | 'warn' | 'danger';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-subtle text-fg-soft border-line-strong',
  info: 'bg-info-bg text-info-fg border-info-line',
  ok: 'bg-ok-bg text-ok-fg border-ok-line',
  warn: 'bg-warn-bg text-warn-fg border-warn-line',
  danger: 'bg-danger-bg text-danger-fg border-danger-line',
};

/**
 * Cada estado lleva su propio ícono: en alto contraste (o con daltonismo) el
 * significado no puede depender solo del color.
 */
const STATUS_CONFIG: Record<
  string,
  { label: string; tone: Tone; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }
> = {
  EN_CONFIGURACION: { label: 'En configuración', tone: 'neutral', icon: Settings },
  EN_EJECUCION: { label: 'En ejecución', tone: 'ok', icon: Play },
  ALERTA_VACANTE_OPERATIVA: { label: 'Vacante operativa', tone: 'danger', icon: UserX },
  SUSPENDIDA: { label: 'Suspendida', tone: 'warn', icon: Pause },
  FINIQUITADA: { label: 'Finiquitada / Cerrada', tone: 'neutral', icon: Lock },
  BORRADOR: { label: 'Borrador', tone: 'neutral', icon: Pencil },
  ENVIADO: { label: 'Enviado (sin firma)', tone: 'info', icon: Send },
  EN_REVISION: { label: 'En revisión', tone: 'info', icon: Clock },
  OBSERVADA: { label: 'Observada', tone: 'warn', icon: AlertTriangle },
  RECHAZADA: { label: 'Rechazada', tone: 'danger', icon: X },
  APROBADA: { label: 'Aprobada por Supervisión', tone: 'ok', icon: Check },
  AUTORIZADA_PAGO: { label: 'Autorizada para pago', tone: 'ok', icon: Banknote },
  LIQUIDADA: { label: 'Liquidada', tone: 'ok', icon: CheckCheck },
  FIRMADO: { label: 'Firmado', tone: 'ok', icon: ShieldCheck },
  ACTIVO: { label: 'Activo', tone: 'ok', icon: Check },
  SUSPENDIDO: { label: 'Suspendido', tone: 'danger', icon: Ban },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = STATUS_CONFIG[status];
  const tone: Tone = config?.tone ?? 'neutral';
  const Icon = config?.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" aria-hidden={true} />}
      {label ?? config?.label ?? status}
    </span>
  );
};
