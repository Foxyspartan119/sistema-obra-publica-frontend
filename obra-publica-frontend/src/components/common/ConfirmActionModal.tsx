import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, X } from 'lucide-react';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'brand' | 'danger' | 'warning';
  requireSignature?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  onCancel: () => void;
  onConfirm: (payload: { firma?: string; motivo?: string; selloSimulado?: string }) => void;
}

const MIN_FIRMA_LENGTH = 6; // RNF-SEG-01

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  tone = 'brand',
  requireSignature = false,
  requireReason = false,
  reasonLabel = 'Motivo / observaciones técnicas',
  onCancel,
  onConfirm,
}) => {
  const [firma, setFirma] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requireReason && !motivo.trim()) {
      setError('Debes capturar una justificación técnica antes de continuar.');
      return;
    }

    if (requireSignature && firma.trim().length < MIN_FIRMA_LENGTH) {
      setError(
        `La firma electrónica debe contener al menos ${MIN_FIRMA_LENGTH} caracteres (RNF-SEG-01).`
      );
      return;
    }

    const selloSimulado = requireSignature
      ? `SHA256-${Date.now().toString(16).toUpperCase()}-${Math.random()
          .toString(16)
          .slice(2, 10)
          .toUpperCase()}`
      : undefined;

    onConfirm({
      firma: requireSignature ? firma.trim() : undefined,
      motivo: requireReason ? motivo.trim() : undefined,
      selloSimulado,
    });

    setFirma('');
    setMotivo('');
  };

  const btnStyle =
    tone === 'danger'
      ? 'bg-danger-solid hover:bg-rose-700 text-white'
      : tone === 'warning'
      ? 'bg-warn-solid hover:bg-amber-700 text-white'
      : 'bg-brand hover:bg-brand-hover text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-line rounded-xl max-w-md w-full p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {tone === 'danger' || tone === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-warn-fg shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-fg ">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-fg-muted hover:text-fg-soft cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-fg-soft leading-relaxed mb-4">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {requireReason && (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-fg-soft ">
                {reasonLabel} *
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el fundamento técnico o las observaciones..."
                className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-xs text-fg focus:border-brand"
              />
            </div>
          )}

          {requireSignature && (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-fg-soft ">
                Firma electrónica (mínimo 6 caracteres) *
              </label>
              <input
                type="password"
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                placeholder="Ingresa tu clave de firma electrónica"
                className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-xs text-fg focus:border-brand"
              />
              <p className="text-[10px] text-fg-muted">
                Al firmar, el registro quedará sellado con SHA-256 y bloqueado contra cambios
                (RNF-SEG-02 / RNF-SEG-04).
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-danger-fg font-medium">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line ">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border border-line-strong text-xs font-medium text-fg-soft hover:bg-subtle cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${btnStyle}`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};