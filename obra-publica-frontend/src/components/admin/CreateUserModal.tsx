import React, { useState } from 'react';
import { UserPlus, ShieldAlert, X } from 'lucide-react';
import type { UserRole } from '../../types/obra.types';
import type { AdminUserRecord } from '../../mocks/admin.mock';

interface CreateUserModalProps {
  open: boolean;
  existingEmails: string[];
  onClose: () => void;
  onCreateUser: (newUser: Omit<AdminUserRecord, 'id'>) => void;
}

const INTERNAL_DOMAINS = ['@obra.gob.mx'];
const ACTIVE_CONTRACTOR_DOMAINS = ['@constructoradelnorte.mx'];

const ALL_ROLES: readonly UserRole[] = [
  'RESIDENTE',
  'SUPERVISOR',
  'SUPERINTENDENTE',
  'DIRECTIVO',
  'ADMINISTRADOR',
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  existingEmails,
  onClose,
  onCreateUser,
}) => {
  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('Residencia');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<UserRole>('RESIDENTE');
  const [password, setPassword] = useState('');
  const [firmaElectronica, setFirmaElectronica] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nombreTrim = nombre.trim();
    const correoNorm = correo.trim().toLowerCase();

    if (!nombreTrim || !correoNorm || !correoNorm.includes('@')) {
      setError('Captura el nombre completo y un correo electrónico válido.');
      return;
    }

    // RN-ADM-01.1: Unicidad de correo
    if (existingEmails.some((em) => em.toLowerCase() === correoNorm)) {
      setError('El correo proporcionado ya existe en el sistema (RN-ADM-01.1).');
      return;
    }

    // RN-ADM-01.8 y RN-ADM-01.10: Validación por diccionario de correos autorizados
    if (rol === 'SUPERINTENDENTE') {
      const validContractor = ACTIVE_CONTRACTOR_DOMAINS.some((dom) =>
        correoNorm.endsWith(dom)
      );
      if (!validContractor) {
        setError(
          'El correo proporcionado no pertenece al diccionario de correos autorizados de ninguna empresa contratista con contrato activo (RN-ADM-01.10).'
        );
        return;
      }
    } else {
      const validInternal = INTERNAL_DOMAINS.some((dom) =>
        correoNorm.endsWith(dom)
      );
      if (!validInternal) {
        setError(
          'Para roles internos solo se permiten correos del dominio institucional autorizado @obra.gob.mx (RN-ADM-01.8).'
        );
        return;
      }
    }

    // RNF-SEG-01: Longitud mínima de contraseña y firma electrónica
    if (password.length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres (RNF-SEG-01).');
      return;
    }

    if (firmaElectronica.trim().length < 6) {
      setError('La firma electrónica debe tener al menos 6 caracteres (RNF-SEG-01).');
      return;
    }

    onCreateUser({
      nombre: nombreTrim,
      area: area.trim() || 'Administración',
      correo: correoNorm,
      rol,
      obrasAsignadas: [],
      estado: 'ACTIVO',
      tieneHistorialOperativo: false,
    });

    setNombre('');
    setCorreo('');
    setPassword('');
    setFirmaElectronica('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl max-w-md w-full p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
              Registrar nueva cuenta de usuario (RF-ADM-01)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ing. Patricia Morales"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                Rol único (1:1) *
              </label>
              <select
                value={rol}
                onChange={(e) => {
                  const nextRole = e.target.value as UserRole;
                  setRol(nextRole);
                  if (nextRole === 'SUPERINTENDENTE') {
                    setArea('Superintendente');
                  } else if (nextRole === 'DIRECTIVO') {
                    setArea('Dirección de Obras');
                  } else if (nextRole === 'ADMINISTRADOR') {
                    setArea('Administración');
                  } else {
                    setArea(nextRole === 'SUPERVISOR' ? 'Supervisión' : 'Residencia');
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                Área / Dependencia
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Correo electrónico ({rol === 'SUPERINTENDENTE' ? '@constructoradelnorte.mx' : '@obra.gob.mx'}) *
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder={
                rol === 'SUPERINTENDENTE'
                  ? 'nombre@constructoradelnorte.mx'
                  : 'nombre@obra.gob.mx'
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                Contraseña (mín. 8) *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                Firma electrónica (mín. 6) *
              </label>
              <input
                type="password"
                value={firmaElectronica}
                onChange={(e) => setFirmaElectronica(e.target.value)}
                placeholder="••••••"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
            >
              Crear cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};