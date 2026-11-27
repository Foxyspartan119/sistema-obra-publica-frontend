import React, { useEffect, useState } from 'react';
import { UserPlus, UserCog, ShieldAlert, X, BadgeCheck } from 'lucide-react';
import {
  OPERATIONAL_SIGNER_ROLES,
  type UserRole,
} from '../../types/obra.types';
import type { AdminUserRecord } from '../../mocks/admin.mock';
import { validarRFC } from '../../utils/businessRules';
import { useObra } from '../../context/ObraContext';

interface CreateUserModalProps {
  open: boolean;
  existingEmails: string[];
  editingUser?: AdminUserRecord | null;
  onClose: () => void;
  onCreateUser: (newUser: Omit<AdminUserRecord, 'id'>) => void;
  onUpdateUser?: (updatedUser: AdminUserRecord) => void;
}

const INTERNAL_DOMAINS = ['@obra.gob.mx'];
const BASE_CONTRACTOR_DOMAINS = ['@constructoradelnorte.mx'];

const ALL_ROLES: readonly UserRole[] = [
  'RESIDENTE',
  'SUPERVISOR',
  'SUPERINTENDENTE',
  'DIRECTIVO',
  'ADMINISTRADOR',
];

function isOperationalProfile(role: UserRole): boolean {
  return (OPERATIONAL_SIGNER_ROLES as readonly string[]).includes(role);
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  existingEmails,
  editingUser = null,
  onClose,
  onCreateUser,
  onUpdateUser,
}) => {
  const { contratistas } = useObra();
  const isEditing = editingUser !== null;

  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('Residencia');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<UserRole>('RESIDENTE');
  const [rfc, setRfc] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingUser) {
      setNombre(editingUser.nombre);
      setArea(editingUser.area);
      setCorreo(editingUser.correo);
      setRol(editingUser.rol);
      setRfc(editingUser.rfc ?? '');
      setPassword('');
    } else {
      setNombre('');
      setArea('Residencia');
      setCorreo('');
      setRol('RESIDENTE');
      setRfc('');
      setPassword('');
    }
  }, [open, editingUser]);

  if (!open) return null;

  const requiresRfc = isOperationalProfile(rol);
  const roleLockedInEdit =
    isEditing &&
    editingUser !== null &&
    (editingUser.rol === 'ADMINISTRADOR' ||
      editingUser.obrasAsignadas.length > 0 ||
      editingUser.tieneHistorialOperativo);

  const activeContractorDomains = [
    ...BASE_CONTRACTOR_DOMAINS,
    ...contratistas
      .filter((c) => c.activo && c.dominioCorreo)
      .map((c) => c.dominioCorreo!.toLowerCase()),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nombreTrim = nombre.trim();
    const correoNorm = correo.trim().toLowerCase();
    const rfcNorm = rfc.trim().toUpperCase();

    if (!nombreTrim || !correoNorm || !correoNorm.includes('@')) {
      setError('Captura el nombre completo y un correo electrónico válido.');
      return;
    }

    // RN-ADM-01.1: Unicidad de correo (excepto el propio en edición)
    const emailDuplicated = existingEmails.some(
      (em) =>
        em.toLowerCase() === correoNorm &&
        (!isEditing || editingUser?.correo.toLowerCase() !== correoNorm)
    );
    if (emailDuplicated) {
      setError('El correo proporcionado ya existe en el sistema (RN-ADM-01.1).');
      return;
    }

    // RN-ADM-01.8 y RN-ADM-01.10: Validación por diccionario de correos autorizados
    if (rol === 'SUPERINTENDENTE') {
      const validContractor = activeContractorDomains.some((dom) =>
        correoNorm.endsWith(dom)
      );
      if (!validContractor) {
        setError(
          `El correo no pertenece a ningún dominio autorizado de empresa contratista activa (${Array.from(
            new Set(activeContractorDomains)
          ).join(', ')}) (RN-ADM-01.10).`
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

    // Validación RFC (12-13 caracteres) obligatoria para perfiles operativos (SAT)
    if (requiresRfc) {
      const rfcCheck = validarRFC(rfcNorm);
      if (!rfcCheck.valido) {
        setError(rfcCheck.error ?? 'RFC inválido.');
        return;
      }
    } else if (rfcNorm.length > 0) {
      const rfcCheck = validarRFC(rfcNorm);
      if (!rfcCheck.valido) {
        setError(rfcCheck.error ?? 'RFC inválido.');
        return;
      }
    }

    // RNF-SEG-01: Longitud mínima de contraseña (obligatoria en alta; opcional en edición)
    if (!isEditing && password.length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres (RNF-SEG-01).');
      return;
    }
    if (isEditing && password.length > 0 && password.length < 8) {
      setError('Si deseas cambiar la contraseña, debe tener al menos 8 caracteres (RNF-SEG-01).');
      return;
    }

    if (isEditing && editingUser && onUpdateUser) {
      onUpdateUser({
        ...editingUser,
        nombre: nombreTrim,
        area: area.trim() || editingUser.area,
        correo: correoNorm,
        rol,
        rfc: requiresRfc || rfcNorm ? rfcNorm : undefined,
      });
    } else {
      onCreateUser({
        nombre: nombreTrim,
        area: area.trim() || 'Administración',
        correo: correoNorm,
        rol,
        rfc: requiresRfc || rfcNorm ? rfcNorm : undefined,
        obrasAsignadas: [],
        estado: 'ACTIVO',
        tieneHistorialOperativo: false,
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-xl max-w-md w-full p-5 shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <UserCog className="w-4 h-4 text-accent shrink-0" />
            ) : (
              <UserPlus className="w-4 h-4 text-accent shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-fg">
              {isEditing
                ? `Editar cuenta de usuario · ${editingUser.nombre}`
                : 'Registrar nueva cuenta de usuario (RF-ADM-01)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-fg-muted hover:text-fg-soft cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-fg-soft mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ing. Patricia Morales"
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-fg-soft mb-1">
                Rol único (1:1) *
              </label>
              <select
                value={rol}
                disabled={roleLockedInEdit}
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
                className={`w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas ${
                  roleLockedInEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fg-soft mb-1">
                Área / Dependencia
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>
          </div>

          {/* Campo RFC obligatorio para perfiles operativos (RESIDENTE, SUPERVISOR, SUPERINTENDENTE) */}
          {requiresRfc && (
            <div className="p-3 rounded-lg bg-info-bg/40 border border-info-line space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-fg inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-accent" />
                  RFC (12–13 caracteres) *
                </label>
                <span className="text-[10px] font-mono text-fg-muted">
                  {rfc.trim().length}/13
                </span>
              </div>
              <input
                type="text"
                maxLength={13}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, ''))}
                placeholder="Ej. TOMA840512HK4"
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface font-mono uppercase tracking-wider"
              />
              <p className="text-[10px] text-fg-muted">
                Obligatorio para perfiles operativos (Residente, Supervisor y Superintendente)
                por requerimiento del servicio de firma electrónica tipo SAT.
              </p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-fg-soft mb-1">
              Correo electrónico (
              {rol === 'SUPERINTENDENTE' ? '@constructoradelnorte.mx u otra contratista' : '@obra.gob.mx'}) *
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
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-fg-soft mb-1">
              {isEditing
                ? 'Nueva contraseña (opcional, mín. 8 caracteres)'
                : 'Contraseña de acceso (mín. 8 caracteres) *'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? 'Dejar vacío para conservar la actual' : '••••••••'}
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />
            <p className="text-[10px] text-fg-muted mt-1">
              El correo y contraseña de la cuenta se utilizarán para autorizar peticiones al
              servicio externo de firma electrónica.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-line-strong font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
            >
              {isEditing ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
