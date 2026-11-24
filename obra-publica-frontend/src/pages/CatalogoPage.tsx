import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Lock,
  Unlock,
  ShieldAlert,
  FilePlus2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

export interface CatalogoConcepto {
  clave: string;
  descripcion: string;
  unidad: string;
  cantidadPresupuestada: number;
  cantidadAdicionalAutorizada: number;
  cantidadEjecutada: number;
  precioUnitario: number;
  tipo: 'ORDINARIO' | 'EXTRAORDINARIO';
  autorizadoPorResidente?: boolean;
  dictamenApuNombre?: string;
}

const MONTO_CONTRATO = 25000000;

const INITIAL_CONCEPTS: CatalogoConcepto[] = [
  {
    clave: 'EST-001',
    descripcion: "Concreto hidráulico f'c=350 kg/cm² en losa de rodamiento",
    unidad: 'm³',
    cantidadPresupuestada: 420,
    cantidadAdicionalAutorizada: 0,
    cantidadEjecutada: 315,
    precioUnitario: 4500,
    tipo: 'ORDINARIO',
  },
  {
    clave: 'SUP-012',
    descripcion: 'Suministro y montaje de trabe AASHTO tipo IV prefabricada',
    unidad: 'pza',
    cantidadPresupuestada: 16,
    cantidadAdicionalAutorizada: 0,
    cantidadEjecutada: 16,
    precioUnitario: 400000,
    tipo: 'ORDINARIO',
  },
  {
    clave: 'TER-008',
    descripcion: 'Relleno compactado al 95% PVSM con material de banco',
    unidad: 'm³',
    cantidadPresupuestada: 1850,
    cantidadAdicionalAutorizada: 120,
    cantidadEjecutada: 592,
    precioUnitario: 500,
    tipo: 'ORDINARIO',
  },
];

const formatMXN = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(amount);

export const CatalogoPage: React.FC = () => {
  const { user } = useAuth();
  const [conceptos, setConceptos] = useState<CatalogoConcepto[]>(INITIAL_CONCEPTS);
  const [lineaBaseCongelada, setLineaBaseCongelada] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'ORDINARIO' | 'EXTRAORDINARIO'>('TODOS');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal alta ordinaria (Superintendente en fase inicial)
  const [showAddOrdModal, setShowAddOrdModal] = useState(false);
  const [ordForm, setOrdForm] = useState({
    clave: '',
    descripcion: '',
    unidad: 'm³',
    cantidad: '',
    precioUnitario: '',
  });

  // Modal extraordinario (Residente - RF-RES-04)
  const [showAddExtModal, setShowAddExtModal] = useState(false);
  const [extForm, setExtForm] = useState({
    clave: '',
    descripcion: '',
    unidad: 'm³',
    cantidad: '',
    precioUnitario: '',
  });
  const [apuFiles, setApuFiles] = useState<File[]>([]);
  const [confirmExtSign, setConfirmExtSign] = useState(false);

  // Modal cantidad adicional (Residente - RN-RES-02.1)
  const [adicionalTarget, setAdicionalTarget] = useState<CatalogoConcepto | null>(null);
  const [adicionalDelta, setAdicionalDelta] = useState('');

  const isSuperintendente = user?.rol === 'SUPERINTENDENTE';
  const isResidente = user?.rol === 'RESIDENTE';

  const importeOrdinarioTotal = useMemo(
    () =>
      conceptos
        .filter((c) => c.tipo === 'ORDINARIO')
        .reduce((acc, c) => acc + c.cantidadPresupuestada * c.precioUnitario, 0),
    [conceptos]
  );

  const porcentajeAsignado = Math.min(100, (importeOrdinarioTotal / MONTO_CONTRATO) * 100);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conceptos.filter((c) => {
      if (tipoFilter !== 'TODOS' && c.tipo !== tipoFilter) return false;
      if (!q) return true;
      return (
        c.clave.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q) ||
        c.unidad.toLowerCase().includes(q)
      );
    });
  }, [conceptos, search, tipoFilter]);

  const handleSaveOrdinario = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (lineaBaseCongelada) {
      setErrorMsg(
        'Catálogo congelado (RN-SUPT-01.3): no se pueden agregar conceptos ordinarios tras la apertura de obra.'
      );
      return;
    }

    const claveNorm = ordForm.clave.trim().toUpperCase();
    const cantidad = Number(ordForm.cantidad);
    const pu = Number(ordForm.precioUnitario);

    if (!claveNorm || !ordForm.descripcion.trim() || cantidad <= 0 || pu <= 0) {
      setErrorMsg('Completa clave, descripción, volumen (> 0) y precio unitario (> 0).');
      return;
    }

    // RN-SUPT-01.2: Unicidad de clave por obra
    if (conceptos.some((c) => c.clave.toUpperCase() === claveNorm)) {
      setErrorMsg(`Clave duplicada (RN-SUPT-01.2): el concepto "${claveNorm}" ya existe en esta obra.`);
      return;
    }

    // RN-SUPT-01.1: Tope presupuestal estricto
    const nuevoImporte = importeOrdinarioTotal + cantidad * pu;
    if (nuevoImporte > MONTO_CONTRATO) {
      setErrorMsg(
        `Tope presupuestal excedido (RN-SUPT-01.1): el acumulado (${formatMXN(
          nuevoImporte
        )}) rebasa el monto contratado (${formatMXN(MONTO_CONTRATO)}).`
      );
      return;
    }

    setConceptos((prev) => [
      ...prev,
      {
        clave: claveNorm,
        descripcion: ordForm.descripcion.trim(),
        unidad: ordForm.unidad,
        cantidadPresupuestada: cantidad,
        cantidadAdicionalAutorizada: 0,
        cantidadEjecutada: 0,
        precioUnitario: pu,
        tipo: 'ORDINARIO',
      },
    ]);

    setOrdForm({ clave: '', descripcion: '', unidad: 'm³', cantidad: '', precioUnitario: '' });
    setShowAddOrdModal(false);
    setSuccessMsg(`Concepto ordinario ${claveNorm} agregado al catálogo base.`);
  };

  const handleRequestExtraordinario = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const claveNorm = extForm.clave.trim().toUpperCase();
    const cantidad = Number(extForm.cantidad);
    const pu = Number(extForm.precioUnitario);

    if (!claveNorm || !extForm.descripcion.trim() || cantidad <= 0 || pu <= 0) {
      setErrorMsg('Completa todos los datos numéricos y descriptivos del concepto extraordinario.');
      return;
    }

    if (conceptos.some((c) => c.clave.toUpperCase() === claveNorm)) {
      setErrorMsg(`La clave "${claveNorm}" ya existe en el catálogo (RN-SUPT-01.2).`);
      return;
    }

    // RN-RES-04.1: Dictamen técnico y APU en PDF obligatorio
    if (apuFiles.length === 0 || !apuFiles[0].name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg(
        'Evidencia requerida (RN-RES-04.1): adjunta el dictamen técnico y APU en formato PDF (máx. 10 MB).'
      );
      return;
    }

    setConfirmExtSign(true);
  };

  const handleConfirmExtraordinarioSign = () => {
    const claveNorm = extForm.clave.trim().toUpperCase();
    setConceptos((prev) => [
      ...prev,
      {
        clave: claveNorm,
        descripcion: extForm.descripcion.trim(),
        unidad: extForm.unidad,
        cantidadPresupuestada: Number(extForm.cantidad),
        cantidadAdicionalAutorizada: 0,
        cantidadEjecutada: 0,
        precioUnitario: Number(extForm.precioUnitario),
        tipo: 'EXTRAORDINARIO',
        autorizadoPorResidente: true,
        dictamenApuNombre: apuFiles[0]?.name,
      },
    ]);
    setConfirmExtSign(false);
    setShowAddExtModal(false);
    setExtForm({ clave: '', descripcion: '', unidad: 'm³', cantidad: '', precioUnitario: '' });
    setApuFiles([]);
    setSuccessMsg(
      `Concepto extraordinario ${claveNorm} autorizado con firma electrónica e inyectado en catálogo (RF-RES-04).`
    );
  };

  const handleAutorizarAdicional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adicionalTarget) return;
    const delta = Number(adicionalDelta);
    if (delta <= 0) {
      setErrorMsg('La cantidad adicional autorizada debe ser mayor a 0 (RN-RES-02.1).');
      return;
    }

    setConceptos((prev) =>
      prev.map((c) =>
        c.clave === adicionalTarget.clave
          ? { ...c, cantidadAdicionalAutorizada: c.cantidadAdicionalAutorizada + delta }
          : c
      )
    );
    setSuccessMsg(
      `Se autorizaron +${delta} ${adicionalTarget.unidad} adicionales en ${adicionalTarget.clave} (RN-RES-02.1).`
    );
    setAdicionalTarget(null);
    setAdicionalDelta('');
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Contrato SOP-LP-024/2024 · Presupuesto base y conceptos no previstos
          </p>
          <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight mt-0.5">
            Catálogo de conceptos
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Interruptor de demostración para probar fase inicial vs congelada (RN-SUPT-01.3) */}
          {isSuperintendente && (
            <button
              type="button"
              onClick={() => setLineaBaseCongelada((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {lineaBaseCongelada ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{lineaBaseCongelada ? 'Línea base congelada' : 'Fase inicial (editable)'}</span>
            </button>
          )}

          {isSuperintendente && (
            <button
              type="button"
              disabled={lineaBaseCongelada}
              onClick={() => {
                setErrorMsg(null);
                setShowAddOrdModal(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                lineaBaseCongelada
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar concepto base</span>
            </button>
          )}

          {isResidente && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowAddExtModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Inyectar extraordinario (APU)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta de tope presupuestal (RN-SUPT-01.1) */}
      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Control de tope presupuestal (Catálogo Ordinario)
            </span>
            {lineaBaseCongelada && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <Lock className="w-3 h-3" /> Inmutable tras apertura
              </span>
            )}
          </div>
          <span className="text-slate-600 dark:text-slate-300">
            <strong>{formatMXN(importeOrdinarioTotal)}</strong> de{' '}
            <strong>{formatMXN(MONTO_CONTRATO)}</strong> contratados ({porcentajeAsignado.toFixed(1)}%)
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full" style={{ width: `${porcentajeAsignado}%` }} />
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clave, concepto o unidad"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand"
          />
        </div>
        <select
          aria-label="Filtrar por tipo de concepto"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as 'TODOS' | 'ORDINARIO' | 'EXTRAORDINARIO')}
          className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="ORDINARIO">Ordinarios</option>
          <option value="EXTRAORDINARIO">Extraordinarios (APU)</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 hc:bg-white border border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-195 text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-semibold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Clave</th>
                <th className="py-3 px-3">Concepto</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Unidad</th>
                <th className="py-3 px-3 text-right">Presup. (+Adic.)</th>
                <th className="py-3 px-3 text-right">Ejecutado</th>
                <th className="py-3 px-3 text-right">P.U.</th>
                <th className="py-3 px-4 text-right">Importe</th>
                {isResidente && <th className="py-3 px-4 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => {
                const importe = (c.cantidadPresupuestada + c.cantidadAdicionalAutorizada) * c.precioUnitario;
                return (
                  <tr key={c.clave} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-semibold text-brand whitespace-nowrap">{c.clave}</td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{c.descripcion}</p>
                      {c.dictamenApuNombre && (
                        <p className="text-[10px] text-slate-400 mt-0.5">APU: {c.dictamenApuNombre}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.tipo === 'EXTRAORDINARIO'
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-50 text-brand dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {c.tipo}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">{c.unidad}</td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <span>{c.cantidadPresupuestada.toLocaleString('es-MX')}</span>
                      {c.cantidadAdicionalAutorizada > 0 && (
                        <span className="ml-1 text-[10px] font-semibold text-emerald-600">
                          (+{c.cantidadAdicionalAutorizada})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">{c.cantidadEjecutada.toLocaleString('es-MX')}</td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">{formatMXN(c.precioUnitario)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold whitespace-nowrap">
                      {formatMXN(importe)}
                    </td>
                    {isResidente && (
                      <td className="py-3.5 px-4 text-right">
                        {c.tipo === 'ORDINARIO' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAdicionalTarget(c);
                              setAdicionalDelta('');
                            }}
                            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-brand text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            + Adicional
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Autorizado</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Agregar concepto ordinario */}
      {showAddOrdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAddOrdModal(false)}
        >
          <form
            onSubmit={handleSaveOrdinario}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-3 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Nuevo concepto del catálogo original
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Clave (ej. EST-002)"
                value={ordForm.clave}
                onChange={(e) => setOrdForm({ ...ordForm, clave: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="text"
                placeholder="Unidad (m³, kg, pza)"
                value={ordForm.unidad}
                onChange={(e) => setOrdForm({ ...ordForm, unidad: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Descripción técnica del concepto"
              value={ordForm.descripcion}
              onChange={(e) => setOrdForm({ ...ordForm, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="Cantidad presupuestada"
                value={ordForm.cantidad}
                onChange={(e) => setOrdForm({ ...ordForm, cantidad: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio unitario (MXN)"
                value={ordForm.precioUnitario}
                onChange={(e) => setOrdForm({ ...ordForm, precioUnitario: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddOrdModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Guardar concepto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Inyectar concepto extraordinario (RF-RES-04) */}
      {showAddExtModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAddExtModal(false)}
        >
          <form
            onSubmit={handleRequestExtraordinario}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Inyectar Concepto Extraordinario (RF-RES-04)
            </h3>
            <p className="text-[11px] text-slate-500">
              Requiere adjuntar el Análisis de Precio Unitario (APU) en PDF y validar tu firma electrónica.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Clave (ej. EXT-001)"
                value={extForm.clave}
                onChange={(e) => setExtForm({ ...extForm, clave: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="text"
                placeholder="Unidad (m³, lote, pza)"
                value={extForm.unidad}
                onChange={(e) => setExtForm({ ...extForm, unidad: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Descripción del trabajo no previsto"
              value={extForm.descripcion}
              onChange={(e) => setExtForm({ ...extForm, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="Cantidad autorizada"
                value={extForm.cantidad}
                onChange={(e) => setExtForm({ ...extForm, cantidad: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="number"
                step="0.01"
                placeholder="P.U. autorizado (MXN)"
                value={extForm.precioUnitario}
                onChange={(e) => setExtForm({ ...extForm, precioUnitario: e.target.value })}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <FileDropzone
              files={apuFiles}
              onChange={setApuFiles}
              maxFiles={1}
              accept=".pdf"
              helperText="Adjunta el dictamen técnico y APU autorizado (PDF, máx. 10 MB)"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddExtModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Continuar a firma
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Autorizar cantidad adicional (RN-RES-02.1) */}
      {adicionalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAdicionalTarget(null)}
        >
          <form
            onSubmit={handleAutorizarAdicional}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Autorizar volumen adicional · {adicionalTarget.clave}
            </h3>
            <p className="text-[11px] text-slate-500">
              Habilita al Superintendente para cobrar excedentes mediante Estimación de Cantidades
              Adicionales al mismo P.U. ({formatMXN(adicionalTarget.precioUnitario)}).
            </p>
            <input
              type="number"
              step="0.01"
              placeholder={`Cantidad adicional en ${adicionalTarget.unidad}`}
              value={adicionalDelta}
              onChange={(e) => setAdicionalDelta(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdicionalTarget(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Autorizar volumen
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        open={confirmExtSign}
        title="Firmar inyección de concepto extraordinario"
        description={`Se incorporará ${extForm.clave.toUpperCase()} al catálogo oficial con dictamen ${
          apuFiles[0]?.name ?? 'PDF'
        }. Esta autorización quedará registrada en auditoría.`}
        confirmLabel="Firmar e inyectar"
        requireSignature
        onCancel={() => setConfirmExtSign(false)}
        onConfirm={handleConfirmExtraordinarioSign}
      />
    </div>
  );
};