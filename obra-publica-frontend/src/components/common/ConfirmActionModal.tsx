import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, X, Mail, Lock, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OPERATIONAL_SIGNER_ROLES } from '../../types/obra.types';

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
  onConfirm: (payload: {
    correo?: string;
    password?: string;
    firma?: string;
    motivo?: string;
    selloSimulado?: string;
  }) => void;
}

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
  const { user } = useAuth();
  const [correo, setCorreo] = useState(user?.correo ?? '');
  const [password, setPassword] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCorreo(user?.correo ?? '');
      setPassword('');
      setMotivo('');
      setError(null);
    }
  }, [open, user?.correo]);

  if (!open) return null;

  const isOperationalSigner =
    user !== null &&
    (OPERATIONAL_SIGNER_ROLES as readonly string[]).includes(user.rol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requireReason && !motivo.trim()) {
      setError('Debes capturar una justificación técnica antes de continuar.');
      return;
    }

    if (requireSignature) {
      const correoNorm = correo.trim().toLowerCase();
      const sessionEmail = (user?.correo ?? '').trim().toLowerCase();

      if (!correoNorm || !correoNorm.includes('@')) {
        setError('Captura el correo electrónico del usuario en sesión para autorizar la firma.');
        return;
      }

      if (sessionEmail && correoNorm !== sessionEmail) {
        setError(
          `El correo debe coincidir con el usuario autenticado en sesión (${user?.correo}).`
        );
        return;
      }

      if (password.trim().length < 6) {
        setError(
          'Ingresa la contraseña de tu cuenta en sesión (mínimo 6 caracteres) para autorizar la petición al servicio externo de firma.'
        );
        return;
      }

      if (isOperationalSigner && !user?.rfc) {
        setError(
          'Tu perfil operativo no tiene RFC registrado. Solicita al Administrador capturar tu RFC (12–13 caracteres) para usar el servicio de firma tipo SAT.'
        );
        return;
      }
    }

    const rfcPrefix = user?.rfc ? `${user.rfc.slice(0, 4)}-` : '';
    const selloSimulado = requireSignature
      ? `SAT-SHA256-${rfcPrefix}${Date.now().toString(16).toUpperCase()}-${Math.random()
          .toString(16)
          .slice(2, 8)
          .toUpperCase()}`
      : undefined;

    onConfirm({
      correo: requireSignature ? correo.trim().toLowerCase() : undefined,
      password: requireSignature ? password : undefined,
      firma: requireSignature ? correo.trim().toLowerCase() : undefined,
      motivo: requireReason ? motivo.trim() : undefined,
      selloSimulado,
    });

    setPassword('');
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
            <h3 className="text-sm font-semibold text-fg">{title}</h3>
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

        <p className="text-xs text-fg-soft leading-relaxed mb-4">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {requireReason && (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-fg-soft">
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
            <div className="space-y-2.5 p-3 rounded-lg bg-canvas border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-fg inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-accent" />
                  Autorización · Servicio externo de firma (SAT)
                </span>
                {user?.rfc && (
                  <span className="px-2 py-0.5 rounded bg-info-bg text-accent font-mono text-[10px] font-semibold">
                    RFC: {user.rfc}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-fg-soft">
                  Correo electrónico del usuario en sesión *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder={user?.correo ?? 'usuario@obra.gob.mx'}
                    autoComplete="username"
                    className="w-full rounded-lg border border-line-strong bg-surface pl-8 pr-3 py-2 text-xs text-fg focus:border-brand"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-fg-soft">
                  Contraseña de tu cuenta *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña de acceso"
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-line-strong bg-surface pl-8 pr-3 py-2 text-xs text-fg focus:border-brand"
                  />
                </div>
              </div>

              <p className="text-[10px] text-fg-muted leading-snug">
                Tus credenciales autorizan la solicitud al servicio externo de firma electrónica
                con tu perfil <strong>{user?.rol}</strong> y generan un sello criptográfico
                SHA-256 (RNF-SEG-02 / RNF-SEG-04).
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-danger-fg font-medium">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
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
