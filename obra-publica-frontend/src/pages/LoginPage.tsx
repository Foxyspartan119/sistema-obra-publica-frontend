import React, { useState } from 'react';
import { HardHat, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/obra.types';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

const DEMO_ACCOUNTS: { email: string; role: UserRole; label: string }[] = [
  { email: 'ana.solis@obra.gob.mx', role: 'ADMINISTRADOR', label: 'Administrador (Ana Solís)' },
  { email: 'marco.torres@obra.gob.mx', role: 'RESIDENTE', label: 'Residente (Ing. Marco Torres)' },
  { email: 'lucia.ramirez@obra.gob.mx', role: 'SUPERVISOR', label: 'Supervisor (Ing. Lucía Ramírez)' },
  {
    email: 'javier.mendoza@constructoradelNorte.mx',
    role: 'SUPERINTENDENTE',
    label: 'Superintendente (Ing. Javier Mendoza)',
  },
  { email: 'carlos.lopez@obra.gob.mx', role: 'DIRECTIVO', label: 'Directivo (Carlos López)' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { loginAsRole, sessionExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setError('Ingresa un correo electrónico institucional o empresarial válido.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres (RNF-SEG-01).');
      return;
    }

    // Validación simulada contra el diccionario de correos autorizados (RN-ADM-01.8 / RNF-SEG-06)
    const matched = DEMO_ACCOUNTS.find((acc) => acc.email.toLowerCase() === normalized);
    if (!matched && !normalized.endsWith('@obra.gob.mx')) {
      setError(
        'Correo no reconocido en el diccionario institucional o de contratistas vigentes (RNF-SEG-06).'
      );
      return;
    }

    const assignedRole: UserRole = matched ? matched.role : 'RESIDENTE';
    loginAsRole(assignedRole);
    onLoginSuccess(assignedRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-line p-7 space-y-6">
        {/* Marca */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center text-white shrink-0">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-fg leading-tight">
              OBRA
            </h1>
            <p className="text-xs text-fg-muted ">
              Sistema de Gestión y Auditoría de Obra Pública
            </p>
          </div>
        </div>

        {/* Aviso de expiración por inactividad */}
        {sessionExpired && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-warn-bg border border-warn-line text-warn-fg text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Tu sesión se cerró automáticamente tras 20 minutos de inactividad por seguridad
              (RNF-SEG-05).
            </span>
          </div>
        )}

        {/* Formulario institucional */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-fg-soft ">
              Correo electrónico institucional o contratista
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@obra.gob.mx"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-canvas border border-line-strong text-fg focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-fg-soft ">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-canvas border border-line-strong text-fg focus:border-brand"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Iniciar sesión
          </button>
        </form>

        {/* Atajo de prototipo para pruebas por rol */}
        <div className="pt-4 border-t border-line space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-fg-muted ">
            <span className="font-semibold uppercase tracking-wider">
              Acceso rápido (Prototipo)
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => {
                  loginAsRole(acc.role);
                  onLoginSuccess(acc.role);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-line hover:border-brand hover:bg-info-bg/40 text-xs text-fg-soft transition-colors cursor-pointer"
              >
                <span className="font-medium">{acc.label}</span>
                <span className="text-[10px] font-semibold text-accent">{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};