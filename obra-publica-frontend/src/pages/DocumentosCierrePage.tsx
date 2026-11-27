import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Lock,
  ShieldCheck,
  FolderOpen,
  FileSignature,
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import type { PolizaFianza, TipoPolizaFianza } from '../types/obra.types';
import { StatusBadge } from '../components/common/StatusBadge';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

interface DocumentoItem {
  id: string;
  nombre: string;
  categoria: 'Contractual' | 'Póliza' | 'Técnico' | 'Cierre';
  fecha: string;
  estado: 'Validado' | 'FIRMADO';
}

const INITIAL_DOCS: DocumentoItem[] = [
  {
    id: 'doc-1',
    nombre: 'Contrato de Obra Pública SOP-LP-024-2024.pdf',
    categoria: 'Contractual',
    fecha: '02 may 2024',
    estado: 'Validado',
  },
  {
    id: 'doc-2',
    nombre: 'Póliza de Fianza de Cumplimiento y Anticipo.pdf',
    categoria: 'Póliza',
    fecha: '04 may 2024',
    estado: 'Validado',
  },
  {
    id: 'doc-3',
    nombre: 'Proyecto Ejecutivo Estructural — Rev 03.pdf',
    categoria: 'Técnico',
    fecha: '18 may 2024',
    estado: 'Validado',
  },
];

const POLIZA_TYPES: readonly {
  id: TipoPolizaFianza;
  label: string;
  desc: string;
}[] = [
  {
    id: 'ANTICIPO',
    label: 'Anticipo',
    desc: 'Garantiza la correcta inversión y amortización del 100% del anticipo.',
  },
  {
    id: 'CUMPLIMIENTO',
    label: 'Cumplimiento',
    desc: 'Garantiza el cumplimiento de todas las obligaciones del contrato (10%).',
  },
  {
    id: 'VICIOS_OCULTOS',
    label: 'Vicios Ocultos',
    desc: 'Garantiza defectos, vicios ocultos y calidad por 12 meses post-recepción.',
  },
];

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(n);

export const DocumentosCierrePage: React.FC = () => {
  const { user } = useAuth();
  const {
    selectedObra,
    selectedObraMontoContrato,
    contratistas,
    selectedContrato,
    selectedPolizas,
    saveContratoForSelectedObra,
    savePolizaForSelectedObra,
    deletePolizaForSelectedObra,
    updateObraStatus,
  } = useObra();

  const [docs, setDocs] = useState<DocumentoItem[]>(INITIAL_DOCS);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Precondiciones estrictas de RF-RES-05
  const [tieneAviso6Fotos, setTieneAviso6Fotos] = useState(true);
  const [todasEstimacionesLiquidadas, setTodasEstimacionesLiquidadas] = useState(false);

  const [obraFiniquitada, setObraFiniquitada] = useState(
    selectedObra.estado === 'FINIQUITADA'
  );
  const [selloFiniquito, setSelloFiniquito] = useState<string | null>(null);
  const [confirmCierreOpen, setConfirmCierreOpen] = useState(false);

  // --- Modal Contrato (numero_contrato, monto_contrato, monto_anticipo, id_contratista) ---
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [contratoForm, setContratoForm] = useState({
    numero_contrato: '',
    id_contratista: '',
    monto_contrato: '',
    monto_anticipo: '',
    fecha_firma: '',
  });
  const [contratoError, setContratoError] = useState<string | null>(null);

  // --- Modal Póliza de Fianza (ANTICIPO, CUMPLIMIENTO, VICIOS_OCULTOS) ---
  const [showPolizaModal, setShowPolizaModal] = useState(false);
  const [editingPolizaId, setEditingPolizaId] = useState<string | null>(null);
  const [polizaForm, setPolizaForm] = useState<{
    tipo: TipoPolizaFianza;
    numero_poliza: string;
    afianzadora: string;
    monto_asegurado: string;
    fecha_emision: string;
    fecha_vencimiento: string;
    estatus: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';
  }>({
    tipo: 'ANTICIPO',
    numero_poliza: '',
    afianzadora: '',
    monto_asegurado: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    estatus: 'VIGENTE',
  });
  const [polizaFiles, setPolizaFiles] = useState<File[]>([]);
  const [polizaError, setPolizaError] = useState<string | null>(null);

  const isResidente = user?.rol === 'RESIDENTE';
  const isDirectivo = user?.rol === 'DIRECTIVO';
  const canManageLegal = !isDirectivo && !obraFiniquitada;

  const contratistaActual = contratistas.find(
    (c) => c.id === selectedContrato?.id_contratista
  );

  const anticipoPct =
    selectedContrato && selectedContrato.monto_contrato > 0
      ? (selectedContrato.monto_anticipo / selectedContrato.monto_contrato) * 100
      : 0;

  const openContratoModal = () => {
    setContratoError(null);
    setContratoForm({
      numero_contrato: selectedContrato?.numero_contrato ?? selectedObra.contrato ?? '',
      id_contratista: selectedContrato?.id_contratista ?? contratistas[0]?.id ?? '',
      monto_contrato: String(selectedContrato?.monto_contrato ?? selectedObraMontoContrato),
      monto_anticipo: String(
        selectedContrato?.monto_anticipo ?? Math.round(selectedObraMontoContrato * 0.3)
      ),
      fecha_firma: selectedContrato?.fecha_firma ?? selectedObra.fechaInicio ?? '2024-05-02',
    });
    setShowContratoModal(true);
  };

  const handleSaveContrato = (e: React.FormEvent) => {
    e.preventDefault();
    setContratoError(null);

    const numero = contratoForm.numero_contrato.trim();
    const montoContrato = Number(contratoForm.monto_contrato);
    const montoAnticipo = Number(contratoForm.monto_anticipo);

    if (!numero) {
      setContratoError('Captura el número de contrato (numero_contrato).');
      return;
    }
    if (!contratoForm.id_contratista) {
      setContratoError('Selecciona la empresa contratista (id_contratista).');
      return;
    }
    if (Number.isNaN(montoContrato) || montoContrato <= 0) {
      setContratoError('El monto del contrato debe ser mayor a $0 MXN.');
      return;
    }
    if (Number.isNaN(montoAnticipo) || montoAnticipo < 0 || montoAnticipo > montoContrato) {
      setContratoError(
        'El monto de anticipo debe estar entre $0 y el monto total del contrato.'
      );
      return;
    }

    const saved = saveContratoForSelectedObra({
      numero_contrato: numero,
      id_contratista: contratoForm.id_contratista,
      monto_contrato: montoContrato,
      monto_anticipo: montoAnticipo,
      fecha_firma: contratoForm.fecha_firma || undefined,
    });

    setShowContratoModal(false);
    setFeedbackMsg(
      `Contrato ${saved.numero_contrato} guardado correctamente (Monto: ${formatMXN(
        saved.monto_contrato
      )} · Anticipo: ${formatMXN(saved.monto_anticipo)}).`
    );
  };

  const openNewPolizaModal = (presetTipo: TipoPolizaFianza = 'ANTICIPO') => {
    setPolizaError(null);
    setEditingPolizaId(null);
    const suggestedMonto =
      presetTipo === 'ANTICIPO'
        ? selectedContrato?.monto_anticipo ?? Math.round(selectedObraMontoContrato * 0.3)
        : Math.round((selectedContrato?.monto_contrato ?? selectedObraMontoContrato) * 0.1);

    setPolizaForm({
      tipo: presetTipo,
      numero_poliza: '',
      afianzadora: '',
      monto_asegurado: String(suggestedMonto),
      fecha_emision: selectedObra.fechaInicio ?? '2024-05-03',
      fecha_vencimiento: selectedObra.fechaFinIso ?? '2025-05-03',
      estatus: 'VIGENTE',
    });
    setPolizaFiles([]);
    setShowPolizaModal(true);
  };

  const openEditPolizaModal = (pol: PolizaFianza) => {
    setPolizaError(null);
    setEditingPolizaId(pol.id);
    setPolizaForm({
      tipo: pol.tipo,
      numero_poliza: pol.numero_poliza,
      afianzadora: pol.afianzadora,
      monto_asegurado: String(pol.monto_asegurado),
      fecha_emision: pol.fecha_emision,
      fecha_vencimiento: pol.fecha_vencimiento,
      estatus: pol.estatus,
    });
    setPolizaFiles([]);
    setShowPolizaModal(true);
  };

  const handleSavePoliza = (e: React.FormEvent) => {
    e.preventDefault();
    setPolizaError(null);

    const monto = Number(polizaForm.monto_asegurado);
    if (!polizaForm.numero_poliza.trim() || !polizaForm.afianzadora.trim()) {
      setPolizaError('Captura el número de póliza y la afianzadora.');
      return;
    }
    if (Number.isNaN(monto) || monto <= 0) {
      setPolizaError('El monto asegurado debe ser mayor a $0 MXN.');
      return;
    }
    if (!polizaForm.fecha_emision || !polizaForm.fecha_vencimiento) {
      setPolizaError('Captura las fechas de emisión y vencimiento de la póliza.');
      return;
    }
    if (polizaForm.fecha_vencimiento < polizaForm.fecha_emision) {
      setPolizaError('La fecha de vencimiento no puede ser anterior a la emisión.');
      return;
    }

    const existing = editingPolizaId
      ? selectedPolizas.find((p) => p.id === editingPolizaId)
      : undefined;

    const saved = savePolizaForSelectedObra({
      id: editingPolizaId ?? undefined,
      tipo: polizaForm.tipo,
      numero_poliza: polizaForm.numero_poliza,
      afianzadora: polizaForm.afianzadora,
      monto_asegurado: monto,
      fecha_emision: polizaForm.fecha_emision,
      fecha_vencimiento: polizaForm.fecha_vencimiento,
      estatus: polizaForm.estatus,
      archivoNombre: polizaFiles[0]?.name ?? existing?.archivoNombre,
    });

    if (polizaFiles[0]) {
      setDocs((prev) => [
        {
          id: `doc-pol-${Date.now()}`,
          nombre: polizaFiles[0].name,
          categoria: 'Póliza',
          fecha: 'Hoy',
          estado: 'Validado',
        },
        ...prev,
      ]);
    }

    setShowPolizaModal(false);
    setFeedbackMsg(
      `Póliza de Fianza (${saved.tipo}) ${saved.numero_poliza} guardada correctamente.`
    );
  };

  const canEmitFiniquito =
    isResidente &&
    !obraFiniquitada &&
    tieneAviso6Fotos &&
    todasEstimacionesLiquidadas;

  const handleAttachDocs = () => {
    if (uploadFiles.length === 0) return;
    const nuevos: DocumentoItem[] = uploadFiles.map((f, idx) => ({
      id: `doc-${Date.now()}-${idx}`,
      nombre: f.name,
      categoria: 'Técnico',
      fecha: 'Hoy',
      estado: 'Validado',
    }));
    setDocs((prev) => [...nuevos, ...prev]);
    setUploadFiles([]);
  };

  const handleConfirmFiniquito = ({ selloSimulado }: { selloSimulado?: string }) => {
    setObraFiniquitada(true);
    setSelloFiniquito(selloSimulado ?? 'SAT-SHA256-FINIQUITO');
    updateObraStatus(selectedObra.id, 'FINIQUITADA');
    setDocs((prev) => [
      {
        id: `doc-fin-${Date.now()}`,
        nombre: `Acta_Recepcion_Fisica_y_Finiquito_${selectedObra.id}.pdf`,
        categoria: 'Cierre',
        fecha: 'Hoy',
        estado: 'FIRMADO',
      },
      ...prev,
    ]);
    setConfirmCierreOpen(false);
  };

  const contratadoBase = selectedContrato?.monto_contrato ?? selectedObraMontoContrato;
  const anticipoBase = selectedContrato?.monto_anticipo ?? Math.round(contratadoBase * 0.3);

  const resumenFiniquito = {
    contratado: contratadoBase,
    ordinarias: Math.round(contratadoBase * 0.87),
    adicionales: Math.round(contratadoBase * 0.066),
    extraordinarias: Math.round(contratadoBase * 0.034),
    anticipoAmortizado: anticipoBase,
    saldoLiquidado: Math.round(contratadoBase * 0.87),
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            {selectedObra.id} · Contrato {selectedContrato?.numero_contrato ?? selectedObra.contrato} ·
            Expediente contractual, fianzas y cierre
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="text-2xl font-normal text-fg tracking-tight">
              Documentos, Contrato, Fianzas y Finiquito
            </h1>
            <StatusBadge status={obraFiniquitada ? 'FINIQUITADA' : selectedObra.estado} />
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-ok-bg border border-ok-line text-ok-fg text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="underline cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SECCIÓN 1: Contrato de Obra Pública (Alta / Edición) */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Contrato de Obra Pública
              </h2>
              <p className="text-[11px] text-fg-muted">
                Número de contrato, contratista adjudicado, monto contractual y anticipo otorgado.
              </p>
            </div>
          </div>

          {canManageLegal && (
            <button
              type="button"
              onClick={openContratoModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              {selectedContrato ? (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar contrato</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar contrato</span>
                </>
              )}
            </button>
          )}
        </div>

        {selectedContrato ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-fg-muted uppercase">Número de contrato</p>
              <p className="font-semibold text-accent mt-1">{selectedContrato.numero_contrato}</p>
              {selectedContrato.fecha_firma && (
                <p className="text-[10px] text-fg-muted mt-0.5">
                  Firma: {selectedContrato.fecha_firma}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-canvas border border-line sm:col-span-2">
              <p className="text-[10px] text-fg-muted uppercase">Empresa Contratista</p>
              <p className="font-semibold text-fg mt-1">
                {contratistaActual?.razon_social ?? selectedObra.contratista}
              </p>
              {contratistaActual && (
                <p className="text-[10px] font-mono text-fg-muted mt-0.5">
                  RFC: {contratistaActual.rfc}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-fg-muted uppercase">Monto del contrato</p>
              <p className="font-semibold text-fg mt-1">
                {formatMXN(selectedContrato.monto_contrato)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-fg-muted uppercase">Monto de anticipo</p>
              <p className="font-semibold text-ok-fg mt-1">
                {formatMXN(selectedContrato.monto_anticipo)}
              </p>
              <p className="text-[10px] text-fg-muted mt-0.5">
                {anticipoPct.toFixed(1)}% del contrato
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-warn-bg/60 border border-warn-line text-warn-fg text-xs flex flex-wrap items-center justify-between gap-2">
            <span>
              Esta obra aún no tiene un contrato formal registrado. Captura el contrato para
              vincular contratista, monto y anticipo.
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: Pólizas de Fianza (ANTICIPO, CUMPLIMIENTO, VICIOS_OCULTOS) */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Pólizas de Fianza ({selectedPolizas.length})
              </h2>
              <p className="text-[11px] text-fg-muted">
                Control normativo de garantías: Anticipo, Cumplimiento y Vicios Ocultos.
              </p>
            </div>
          </div>

          {canManageLegal && (
            <button
              type="button"
              onClick={() => openNewPolizaModal('ANTICIPO')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar póliza</span>
            </button>
          )}
        </div>

        {/* Cobertura de los 3 tipos normativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {POLIZA_TYPES.map((pt) => {
            const registered = selectedPolizas.find((p) => p.tipo === pt.id);
            return (
              <div
                key={pt.id}
                className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 ${
                  registered
                    ? 'bg-ok-bg/40 border-ok-line'
                    : 'bg-warn-bg/40 border-warn-line'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-fg">{pt.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        registered
                          ? 'bg-ok-bg text-ok-fg'
                          : 'bg-warn-bg text-warn-fg'
                      }`}
                    >
                      {registered ? registered.estatus : 'PENDIENTE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-fg-muted">{pt.desc}</p>
                </div>

                {registered ? (
                  <div className="text-[11px] pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                    <span className="font-mono text-fg-soft truncate">
                      {registered.numero_poliza}
                    </span>
                    <strong className="text-fg shrink-0">
                      {formatMXN(registered.monto_asegurado)}
                    </strong>
                  </div>
                ) : (
                  canManageLegal && (
                    <button
                      type="button"
                      onClick={() => openNewPolizaModal(pt.id)}
                      className="self-start text-[11px] font-semibold text-accent hover:underline cursor-pointer pt-1"
                    >
                      + Registrar fianza de {pt.label}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Listado detallado de pólizas */}
        {selectedPolizas.length > 0 && (
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-left border-collapse min-w-180 text-xs">
              <thead>
                <tr className="bg-canvas text-[10px] uppercase text-fg-muted border-b border-line">
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">N.º Póliza / Afianzadora</th>
                  <th className="py-2.5 px-3 text-right">Monto Asegurado</th>
                  <th className="py-2.5 px-3">Vigencia</th>
                  <th className="py-2.5 px-3">Estatus</th>
                  {canManageLegal && <th className="py-2.5 px-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {selectedPolizas.map((pol) => (
                  <tr key={pol.id} className="hover:bg-subtle/50">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-info-bg text-accent text-[10px] font-semibold">
                        {pol.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-fg font-mono">{pol.numero_poliza}</p>
                      <p className="text-[11px] text-fg-muted">{pol.afianzadora}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      {formatMXN(pol.monto_asegurado)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-fg-muted">
                      {pol.fecha_emision} → {pol.fecha_vencimiento}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        status={
                          pol.estatus === 'VIGENTE'
                            ? 'ACTIVO'
                            : pol.estatus === 'POR_VENCER'
                            ? 'OBSERVADA'
                            : 'RECHAZADA'
                        }
                        label={pol.estatus}
                      />
                    </td>
                    {canManageLegal && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditPolizaModal(pol)}
                            className="p-1.5 rounded border border-line-strong hover:border-brand text-fg-soft cursor-pointer"
                            aria-label={`Editar póliza ${pol.numero_poliza}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePolizaForSelectedObra(pol.id)}
                            className="p-1.5 rounded border border-line-strong hover:border-danger-solid text-fg-muted hover:text-danger-fg cursor-pointer"
                            aria-label={`Eliminar póliza ${pol.numero_poliza}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: Panel de Recepción Física y Finiquito (RF-RES-05) */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Cierre de contrato y consolidación de finiquito (RF-RES-05)
            </h2>
            <p className="text-[11px] text-fg-muted mt-0.5">
              Facultad exclusiva del Residente una vez cumplidas las precondiciones normativas.
            </p>
          </div>
          {selloFiniquito && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ok-bg text-ok-fg font-mono text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              {selloFiniquito}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div
            className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 ${
              tieneAviso6Fotos
                ? 'bg-ok-bg/60 border-ok-line'
                : 'bg-danger-bg/60 border-danger-line'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {tieneAviso6Fotos ? (
                <CheckCircle2 className="w-4 h-4 text-ok-fg shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-fg shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-fg">
                  1. Aviso de Terminación (≥ 6 fotos)
                </p>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Emitido por el Superintendente en Bitácora (RF-SUPT-05).
                </p>
              </div>
            </div>
            {!obraFiniquitada && (
              <button
                type="button"
                onClick={() => setTieneAviso6Fotos((v) => !v)}
                className="text-[10px] underline text-fg-muted cursor-pointer shrink-0"
              >
                Simular
              </button>
            )}
          </div>

          <div
            className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 ${
              todasEstimacionesLiquidadas
                ? 'bg-ok-bg/60 border-ok-line'
                : 'bg-danger-bg/60 border-danger-line'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {todasEstimacionesLiquidadas ? (
                <CheckCircle2 className="w-4 h-4 text-ok-fg shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-fg shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-fg">
                  2. Cero estimaciones pendientes
                </p>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Todas las estimaciones deben figurar como LIQUIDADA (RF-RES-05).
                </p>
              </div>
            </div>
            {!obraFiniquitada && (
              <button
                type="button"
                onClick={() => setTodasEstimacionesLiquidadas((v) => !v)}
                className="text-[10px] underline text-fg-muted cursor-pointer shrink-0"
              >
                Simular
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {[
            { label: 'Contratado original', value: resumenFiniquito.contratado },
            { label: 'Est. Ordinarias', value: resumenFiniquito.ordinarias },
            { label: 'Cant. Adicionales', value: resumenFiniquito.adicionales },
            { label: 'Extraordinarios', value: resumenFiniquito.extraordinarias },
            { label: 'Anticipo amortizado', value: resumenFiniquito.anticipoAmortizado },
            { label: 'Saldo liquidado', value: resumenFiniquito.saldoLiquidado },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-fg-muted">{item.label}</p>
              <p className="font-semibold text-fg mt-1">{formatMXN(item.value)}</p>
            </div>
          ))}
        </div>

        {isResidente && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-fg-muted">
              {obraFiniquitada
                ? 'Obra y contrato marcados como FINIQUITADA / CERRADA (RN-RES-05.2).'
                : canEmitFiniquito
                ? 'Todas las precondiciones están cubiertas. Listo para firma de cierre.'
                : 'Botón bloqueado hasta cumplir ambas precondiciones obligatorias.'}
            </p>
            <button
              type="button"
              disabled={!canEmitFiniquito}
              onClick={() => setConfirmCierreOpen(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                canEmitFiniquito
                  ? 'bg-brand hover:bg-brand-hover text-white cursor-pointer'
                  : 'bg-line text-fg-muted cursor-not-allowed'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {obraFiniquitada ? 'Finiquito emitido' : 'Emitir Recepción y Finiquito'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 4: Repositorio documental */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-fg">
              Expediente documental ({docs.length})
            </h2>
          </div>
          {isDirectivo && (
            <span className="text-[11px] text-fg-muted">Consulta en solo lectura (RF-DIR-03)</span>
          )}
        </div>

        <div className="divide-y divide-line">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-fg truncate">{doc.nombre}</p>
                  <p className="text-[10px] text-fg-muted">
                    {doc.categoria} · Registrado: {doc.fecha}
                  </p>
                </div>
              </div>
              <StatusBadge
                status={doc.estado === 'FIRMADO' ? 'FIRMADO' : 'ACTIVO'}
                label={doc.estado}
              />
            </div>
          ))}
        </div>

        {!isDirectivo && !obraFiniquitada && (
          <div className="p-5 border-t border-line space-y-3 bg-canvas/50">
            <FileDropzone
              files={uploadFiles}
              onChange={setUploadFiles}
              maxFiles={6}
              helperText="Adjuntar planos, pólizas renovadas o actas (PDF, JPG, PNG · máx. 10 MB c/u)"
            />
            {uploadFiles.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAttachDocs}
                  className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                >
                  Guardar {uploadFiles.length} documento(s) al expediente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Alta / Edición de Contrato */}
      {showContratoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowContratoModal(false)}
        >
          <form
            onSubmit={handleSaveContrato}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5 text-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-fg">
                  {selectedContrato ? 'Editar Contrato de Obra' : 'Alta de Contrato de Obra'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContratoModal(false)}
                aria-label="Cerrar"
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fg-soft mb-1">
                Número de contrato (numero_contrato) *
              </label>
              <input
                type="text"
                value={contratoForm.numero_contrato}
                onChange={(e) =>
                  setContratoForm({ ...contratoForm, numero_contrato: e.target.value })
                }
                placeholder="Ej. SOP-LP-024/2024"
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fg-soft mb-1">
                Empresa Contratista (id_contratista) *
              </label>
              <select
                value={contratoForm.id_contratista}
                onChange={(e) =>
                  setContratoForm({ ...contratoForm, id_contratista: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
              >
                {contratistas
                  .filter((c) => c.activo || c.id === contratoForm.id_contratista)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razon_social} ({c.rfc})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Monto del contrato MXN *
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={contratoForm.monto_contrato}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, monto_contrato: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Monto de anticipo MXN *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={contratoForm.monto_anticipo}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, monto_anticipo: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Fecha de firma
                </label>
                <input
                  type="date"
                  value={contratoForm.fecha_firma}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, fecha_firma: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-canvas border border-line text-[11px]">
                <span className="text-fg-muted block">Porcentaje de anticipo</span>
                <strong className="text-accent">
                  {Number(contratoForm.monto_contrato) > 0
                    ? `${(
                        (Number(contratoForm.monto_anticipo || 0) /
                          Number(contratoForm.monto_contrato)) *
                        100
                      ).toFixed(1)}%`
                    : '0.0%'}
                </strong>
              </div>
            </div>

            {contratoError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{contratoError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowContratoModal(false)}
                className="px-3 py-1.5 rounded-lg border border-line-strong font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
              >
                Guardar contrato
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Alta / Edición de Póliza de Fianza */}
      {showPolizaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPolizaModal(false)}
        >
          <form
            onSubmit={handleSavePoliza}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-lg w-full p-5 shadow-xl space-y-3.5 text-xs max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-fg">
                  {editingPolizaId ? 'Editar Póliza de Fianza' : 'Registrar Póliza de Fianza'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPolizaModal(false)}
                aria-label="Cerrar"
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Tipo de póliza *
                </label>
                <select
                  value={polizaForm.tipo}
                  onChange={(e) =>
                    setPolizaForm({
                      ...polizaForm,
                      tipo: e.target.value as TipoPolizaFianza,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
                >
                  <option value="ANTICIPO">ANTICIPO</option>
                  <option value="CUMPLIMIENTO">CUMPLIMIENTO</option>
                  <option value="VICIOS_OCULTOS">VICIOS_OCULTOS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Estatus *
                </label>
                <select
                  value={polizaForm.estatus}
                  onChange={(e) =>
                    setPolizaForm({
                      ...polizaForm,
                      estatus: e.target.value as 'VIGENTE' | 'POR_VENCER' | 'VENCIDA',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
                >
                  <option value="VIGENTE">VIGENTE</option>
                  <option value="POR_VENCER">POR_VENCER</option>
                  <option value="VENCIDA">VENCIDA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Número de póliza *
                </label>
                <input
                  type="text"
                  value={polizaForm.numero_poliza}
                  onChange={(e) =>
                    setPolizaForm({ ...polizaForm, numero_poliza: e.target.value })
                  }
                  placeholder="Ej. FNZ-VO-2025-1102"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Monto asegurado MXN *
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={polizaForm.monto_asegurado}
                  onChange={(e) =>
                    setPolizaForm({ ...polizaForm, monto_asegurado: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fg-soft mb-1">
                Afianzadora *
              </label>
              <input
                type="text"
                value={polizaForm.afianzadora}
                onChange={(e) =>
                  setPolizaForm({ ...polizaForm, afianzadora: e.target.value })
                }
                placeholder="Ej. Afianzadora Aserta, S.A. de C.V."
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Fecha de emisión *
                </label>
                <input
                  type="date"
                  value={polizaForm.fecha_emision}
                  onChange={(e) =>
                    setPolizaForm({ ...polizaForm, fecha_emision: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Fecha de vencimiento *
                </label>
                <input
                  type="date"
                  value={polizaForm.fecha_vencimiento}
                  onChange={(e) =>
                    setPolizaForm({ ...polizaForm, fecha_vencimiento: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <FileDropzone
              files={polizaFiles}
              onChange={setPolizaFiles}
              maxFiles={1}
              accept=".pdf"
              helperText="Opcional: adjunta el archivo PDF de la póliza (máx. 10 MB)"
            />

            {polizaError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{polizaError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowPolizaModal(false)}
                className="px-3 py-1.5 rounded-lg border border-line-strong font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
              >
                Guardar póliza
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        open={confirmCierreOpen}
        title="Firmar Acta de Recepción Física y Finiquito"
        description="Autoriza con tu correo y contraseña el cierre definitivo. Esta acción consolidará el cierre financiero del contrato y cambiará el estado de la obra a FINIQUITADA / CERRADA (RN-RES-05.2)."
        confirmLabel="Autorizar y firmar cierre"
        tone="warning"
        requireSignature
        onCancel={() => setConfirmCierreOpen(false)}
        onConfirm={handleConfirmFiniquito}
      />
    </div>
  );
};
