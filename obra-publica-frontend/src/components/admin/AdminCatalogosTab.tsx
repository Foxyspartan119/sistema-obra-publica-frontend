import React, { useState } from 'react';
import {
  Plus,
  MailCheck,
  Layers,
  Building2,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useObra } from '../../context/ObraContext';
import { validarRFC } from '../../utils/businessRules';

interface CatalogEntry {
  id: string;
  grupo: 'Dominio / Correo Autorizado' | 'Unidad de Medida' | 'Tipo de Documento';
  valor: string;
  alcance: string;
  enUso: boolean;
  activo: boolean;
}

const INITIAL_ENTRIES: CatalogEntry[] = [
  {
    id: 'cat-1',
    grupo: 'Dominio / Correo Autorizado',
    valor: '@obra.gob.mx',
    alcance: 'Roles internos (Admin, Directivo, Residente, Supervisor)',
    enUso: true,
    activo: true,
  },
  {
    id: 'cat-2',
    grupo: 'Dominio / Correo Autorizado',
    valor: '@constructoradelnorte.mx',
    alcance: 'Superintendente · Contrato vigente SOP-LP-024/2024',
    enUso: true,
    activo: true,
  },
  {
    id: 'cat-3',
    grupo: 'Unidad de Medida',
    valor: 'm³',
    alcance: 'Volumetría y conceptos de obra',
    enUso: true,
    activo: true,
  },
  {
    id: 'cat-4',
    grupo: 'Tipo de Documento',
    valor: 'Dictamen Técnico APU',
    alcance: 'Inyección de conceptos extraordinarios',
    enUso: false,
    activo: true,
  },
];

export const AdminCatalogosTab: React.FC = () => {
  const { contratistas, addContratista, toggleContratistaActivo } = useObra();

  // --- Alta de Empresa Contratista (rfc, razon_social + registros opcionales) ---
  const [rfcContratista, setRfcContratista] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [dominioCorreo, setDominioCorreo] = useState('');
  const [registroIva, setRegistroIva] = useState('');
  const [registroCmic, setRegistroCmic] = useState('');
  const [registroPadron, setRegistroPadron] = useState('');
  const [ctrError, setCtrError] = useState<string | null>(null);
  const [ctrSuccess, setCtrSuccess] = useState<string | null>(null);

  // --- Catálogos maestros ---
  const [entries, setEntries] = useState<CatalogEntry[]>(INITIAL_ENTRIES);
  const [valor, setValor] = useState('');
  const [grupo, setGrupo] = useState<CatalogEntry['grupo']>('Dominio / Correo Autorizado');
  const [alcance, setAlcance] = useState('');

  const handleAddContratista = (e: React.FormEvent) => {
    e.preventDefault();
    setCtrError(null);
    setCtrSuccess(null);

    const rfcNorm = rfcContratista.trim().toUpperCase();
    const razonNorm = razonSocial.trim();

    const rfcCheck = validarRFC(rfcNorm);
    if (!rfcCheck.valido) {
      setCtrError(rfcCheck.error ?? 'RFC de contratista inválido.');
      return;
    }

    if (!razonNorm) {
      setCtrError('Captura la razón social de la empresa contratista.');
      return;
    }

    if (contratistas.some((c) => c.rfc.toUpperCase() === rfcNorm)) {
      setCtrError(`Ya existe una empresa contratista registrada con el RFC ${rfcNorm}.`);
      return;
    }

    const domTrim = dominioCorreo.trim().toLowerCase();
    const domFormatted = domTrim
      ? domTrim.startsWith('@')
        ? domTrim
        : `@${domTrim}`
      : undefined;

    const created = addContratista({
      rfc: rfcNorm,
      razon_social: razonNorm,
      dominioCorreo: domFormatted,
      registro_iva: registroIva,
      registro_cmic: registroCmic,
      registro_padron: registroPadron,
    });

    if (domFormatted) {
      setEntries((prev) => [
        {
          id: `cat-dom-${Date.now()}`,
          grupo: 'Dominio / Correo Autorizado',
          valor: domFormatted,
          alcance: `Contratista · ${created.razon_social} (${created.rfc})`,
          enUso: false,
          activo: true,
        },
        ...prev,
      ]);
    }

    setRfcContratista('');
    setRazonSocial('');
    setDominioCorreo('');
    setRegistroIva('');
    setRegistroCmic('');
    setRegistroPadron('');
    setCtrSuccess(
      `Empresa contratista "${created.razon_social}" (RFC: ${created.rfc}) registrada correctamente.`
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor.trim()) return;
    setEntries((prev) => [
      {
        id: `cat-${Date.now()}`,
        grupo,
        valor: valor.trim(),
        alcance: alcance.trim() || 'Catálogo institucional',
        enUso: false,
        activo: true,
      },
      ...prev,
    ]);
    setValor('');
    setAlcance('');
  };

  // RN-ADM-05.1: Solo inactivación lógica (nunca borrado físico)
  const toggleActivo = (id: string) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, activo: !item.activo } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Sección 1: Alta y Padrón de Empresas Contratistas */}
      <div className="space-y-4">
        <form
          onSubmit={handleAddContratista}
          className="bg-surface border border-line rounded-xl p-5 space-y-3.5 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              <div>
                <h2 className="text-sm font-semibold text-fg">
                  Alta de Empresa Contratista
                </h2>
                <p className="text-[11px] text-fg-muted">
                  Registra empresas contratistas (RFC y Razón Social) para vincularlas en Contratos y
                  habilitar cuentas de Superintendente.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-info-bg text-accent text-[11px] font-semibold">
              {contratistas.length} registrada(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
                RFC (12–13 caracteres) *
              </label>
              <input
                type="text"
                maxLength={13}
                placeholder="Ej. CNO9804128A3"
                value={rfcContratista}
                onChange={(e) =>
                  setRfcContratista(
                    e.target.value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '')
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
                Razón Social *
              </label>
              <input
                type="text"
                placeholder="Ej. Constructora del Pacífico, S.A. de C.V."
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
                Dominio de correo autorizado (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. @constructorapacifico.mx"
                value={dominioCorreo}
                onChange={(e) => setDominioCorreo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
                Registro IVA (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. IVA-CDMX-980412"
                value={registroIva}
                onChange={(e) => setRegistroIva(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
                Registro CMIC (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. CMIC-2024-04182"
                value={registroCmic}
                onChange={(e) => setRegistroCmic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
                Registro Padrón / Dependencia (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. SOP-PAD-2024-019"
                value={registroPadron}
                onChange={(e) => setRegistroPadron(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas font-mono"
              />
            </div>
          </div>

          {ctrError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{ctrError}</span>
            </div>
          )}

          {ctrSuccess && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-ok-bg border border-ok-line text-ok-fg">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{ctrSuccess}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar contratista</span>
            </button>
          </div>
        </form>

        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <h3 className="text-xs font-semibold text-fg">
              Padrón de Empresas Contratistas
            </h3>
            <span className="text-[11px] text-fg-muted">
              Disponible en formularios de Contratos
            </span>
          </div>
          <div className="divide-y divide-line text-xs">
            {contratistas.map((ctr) => (
              <div
                key={ctr.id}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">{ctr.razon_social}</span>
                    <span className="px-2 py-0.5 rounded bg-info-bg text-accent font-mono text-[10px] font-semibold">
                      RFC: {ctr.rfc}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-fg-muted pt-0.5">
                    {ctr.dominioCorreo && (
                      <span>
                        Dominio: <span className="font-mono">{ctr.dominioCorreo}</span>
                      </span>
                    )}
                    {ctr.registro_iva && (
                      <span className="px-1.5 py-0.5 rounded bg-subtle font-mono text-[10px]">
                        IVA: {ctr.registro_iva}
                      </span>
                    )}
                    {ctr.registro_cmic && (
                      <span className="px-1.5 py-0.5 rounded bg-subtle font-mono text-[10px]">
                        CMIC: {ctr.registro_cmic}
                      </span>
                    )}
                    {ctr.registro_padron && (
                      <span className="px-1.5 py-0.5 rounded bg-subtle font-mono text-[10px]">
                        Padrón: {ctr.registro_padron}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={ctr.activo ? 'ACTIVO' : 'SUSPENDIDO'} />
                  <button
                    type="button"
                    onClick={() => toggleContratistaActivo(ctr.id)}
                    className="px-2.5 py-1 rounded-lg border border-line-strong hover:border-brand text-[11px] font-medium cursor-pointer"
                  >
                    {ctr.activo ? 'Inactivar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección 2: Catálogos Maestros y Diccionario de Correos */}
      <div className="space-y-4">
        <form
          onSubmit={handleAdd}
          className="bg-surface border border-line rounded-xl p-5 space-y-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <MailCheck className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-fg">
              Catálogos maestros y diccionario de correos autorizados (RF-ADM-01.8 / RF-ADM-05)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={grupo}
              onChange={(e) => setGrupo(e.target.value as CatalogEntry['grupo'])}
              className="px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
            >
              <option value="Dominio / Correo Autorizado">Dominio / Correo Autorizado</option>
              <option value="Unidad de Medida">Unidad de Medida</option>
              <option value="Tipo de Documento">Tipo de Documento</option>
            </select>
            <input
              type="text"
              placeholder="Valor (ej. @contratista.mx o kg)"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />
            <input
              type="text"
              placeholder="Alcance o contrato vinculado"
              value={alcance}
              onChange={(e) => setAlcance(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar en catálogo</span>
            </button>
          </div>
        </form>

        <div className="bg-surface border border-line rounded-xl divide-y divide-line text-xs">
          {entries.map((item) => (
            <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Layers className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-fg">{item.valor}</span>
                    <span className="text-[10px] text-fg-muted">· {item.grupo}</span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-0.5">{item.alcance}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={item.activo ? 'ACTIVO' : 'SUSPENDIDO'} />
                <button
                  type="button"
                  onClick={() => toggleActivo(item.id)}
                  className="px-2.5 py-1 rounded-lg border border-line-strong hover:border-brand text-[11px] font-medium cursor-pointer"
                >
                  {item.activo ? 'Marcar inactivo' : 'Reactivar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
