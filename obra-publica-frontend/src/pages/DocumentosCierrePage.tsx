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
import type {
  AnticipoEjercicioFiscal,
  PolizaFianza,
  TipoPolizaFianza,
} from '../types/obra.types';
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

  // --- Modal Contrato (numero_contrato, monto_contrato, monto_anticipo, id_contratista, lugar_obra, fecha_contrato, adendum, anticipos_por_ejercicio) ---
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [contratoForm, setContratoForm] = useState({
    numero_contrato: '',
    id_contratista: '',
    lugar_obra: '',
    monto_contrato: '',
    fecha_contrato: '',
    adendum: '',
  });
  const [anticiposDraft, setAnticiposDraft] = useState<
    { id: string; anio: string; monto: string; porcentaje_amortizacion: string }[]
  >([]);
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
    const defaultAnio = (selectedObra.fechaInicio ?? '2024-05-06').slice(0, 4);
    const existingEjercicios = selectedContrato?.anticipos_por_ejercicio ?? [];
    setContratoForm({
      numero_contrato: selectedContrato?.numero_contrato ?? selectedObra.contrato ?? '',
      id_contratista: selectedContrato?.id_contratista ?? contratistas[0]?.id ?? '',
      lugar_obra: selectedObra.ubicacion ?? '',
      monto_contrato: String(selectedContrato?.monto_contrato ?? selectedObraMontoContrato),
      fecha_contrato:
        selectedContrato?.fecha_contrato ??
        selectedContrato?.fecha_firma ??
        selectedObra.fechaInicio ??
        '2024-05-02',
      adendum: selectedContrato?.adendum ?? '',
    });
    setAnticiposDraft(
      existingEjercicios.length > 0
        ? existingEjercicios.map((row) => ({
            id: row.id,
            anio: String(row.anio),
            monto: String(row.monto),
            porcentaje_amortizacion: String(row.porcentaje_amortizacion),
          }))
        : [
            {
              id: `ant-${Date.now()}`,
              anio: defaultAnio,
              monto: String(
                selectedContrato?.monto_anticipo ?? Math.round(selectedObraMontoContrato * 0.3)
              ),
              porcentaje_amortizacion: '10',
            },
          ]
    );
    setShowContratoModal(true);
  };

  const handleAddEjercicioRow = () => {
    const maxAnio = anticiposDraft.reduce(
      (max, r) => Math.max(max, Number(r.anio) || 2024),
      2023
    );
    setAnticiposDraft((prev) => [
      ...prev,
      {
        id: `ant-${Date.now()}-${prev.length}`,
        anio: String(maxAnio + 1),
        monto: '0',
        porcentaje_amortizacion: '10',
      },
    ]);
  };

  const totalAnticipoDraft = anticiposDraft.reduce(
    (sum, r) => sum + Math.max(0, Number(r.monto) || 0),
    0
  );

  const handleSaveContrato = (e: React.FormEvent) => {
    e.preventDefault();
    setContratoError(null);

    const numero = contratoForm.numero_contrato.trim();
    const montoContrato = Number(contratoForm.monto_contrato);

    if (!numero) {
      setContratoError('Captura el número de contrato (numero_contrato).');
      return;
    }
    if (!contratoForm.id_contratista) {
      setContratoError('Selecciona la empresa contratista (id_contratista).');
      return;
    }
    if (!contratoForm.fecha_contrato) {
      setContratoError('Captura la fecha de contrato.');
      return;
    }
    if (Number.isNaN(montoContrato) || montoContrato <= 0) {
      setContratoError('El monto del contrato debe ser mayor a $0 MXN.');
      return;
    }

    const parsedEjercicios: AnticipoEjercicioFiscal[] = [];
    const seenYears = new Set<number>();
    for (const row of anticiposDraft) {
      const anio = Math.floor(Number(row.anio));
      const monto = Number(row.monto);
      const pct = Number(row.porcentaje_amortizacion);

      if (Number.isNaN(anio) || anio < 2000 || anio > 2100) {
        setContratoError('Verifica que cada ejercicio fiscal tenga un año válido (ej. 2024).');
        return;
      }
      if (seenYears.has(anio)) {
        setContratoError(`El ejercicio fiscal ${anio} está duplicado en la tabla de anticipos.`);
        return;
      }
      if (Number.isNaN(monto) || monto < 0) {
        setContratoError(`El monto de anticipo del año ${anio} no puede ser negativo.`);
        return;
      }
      if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
        setContratoError(
          `El % de amortización del año ${anio} debe estar entre 1% y 100% (default 10%).`
        );
        return;
      }
      seenYears.add(anio);
      parsedEjercicios.push({
        id: row.id,
        anio,
        monto,
        porcentaje_amortizacion: pct,
      });
    }

    const montoAnticipoTotal = parsedEjercicios.reduce((s, r) => s + r.monto, 0);
    if (montoAnticipoTotal > montoContrato) {
      setContratoError(
        `La suma de anticipos por ejercicio (${formatMXN(
          montoAnticipoTotal
        )}) no puede superar el monto total del contrato (${formatMXN(montoContrato)}).`
      );
      return;
    }

    const saved = saveContratoForSelectedObra(
      {
        numero_contrato: numero,
        id_contratista: contratoForm.id_contratista,
        monto_contrato: montoContrato,
        monto_anticipo: montoAnticipoTotal,
        fecha_contrato: contratoForm.fecha_contrato,
        fecha_firma: contratoForm.fecha_contrato,
        adendum: contratoForm.adendum.trim() || undefined,
        anticipos_por_ejercicio: parsedEjercicios,
      },
      contratoForm.lugar_obra
    );

    setShowContratoModal(false);
    setFeedbackMsg(
      `Contrato ${saved.numero_contrato} guardado correctamente (Monto: ${formatMXN(
        saved.monto_contrato
      )} · Anticipo total: ${formatMXN(saved.monto_anticipo)} en ${
        saved.anticipos_por_ejercicio.length
      } ejercicio(s)).`
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <p className="text-[10px] text-fg-muted uppercase">Número / Fecha de contrato</p>
                <p className="font-semibold text-accent mt-1">{selectedContrato.numero_contrato}</p>
                <p className="text-[10px] text-fg-muted mt-0.5">
                  Fecha: {selectedContrato.fecha_contrato ?? selectedContrato.fecha_firma ?? '—'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-canvas border border-line sm:col-span-2">
                <p className="text-[10px] text-fg-muted uppercase">
                  Empresa Contratista / Lugar de la obra
                </p>
                <p className="font-semibold text-fg mt-1">
                  {contratistaActual?.razon_social ?? selectedObra.contratista}
                </p>
                <p className="text-[10px] text-fg-muted mt-0.5">
                  {contratistaActual && (
                    <span className="font-mono mr-2">RFC: {contratistaActual.rfc}</span>
                  )}
                  · Lugar: <strong className="text-fg-soft">{selectedObra.ubicacion}</strong>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-canvas border border-line">
                <p className="text-[10px] text-fg-muted uppercase">Monto del contrato</p>
                <p className="font-semibold text-fg mt-1">
                  {formatMXN(selectedContrato.monto_contrato)}
                </p>
                {selectedContrato.adendum && (
                  <p className="text-[10px] text-accent mt-0.5 truncate" title={selectedContrato.adendum}>
                    Adendum: {selectedContrato.adendum}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-canvas border border-line">
                <p className="text-[10px] text-fg-muted uppercase">Anticipo total</p>
                <p className="font-semibold text-ok-fg mt-1">
                  {formatMXN(selectedContrato.monto_anticipo)}
                </p>
                <p className="text-[10px] text-fg-muted mt-0.5">
                  {anticipoPct.toFixed(1)}% del contrato
                </p>
              </div>
            </div>

            {/* Tabla de Anticipo por ejercicio fiscal */}
            {selectedContrato.anticipos_por_ejercicio.length > 0 && (
              <div className="border border-line rounded-lg overflow-hidden text-xs">
                <div className="px-3.5 py-2 bg-canvas border-b border-line flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-fg">
                    Anticipo por ejercicio fiscal
                  </span>
                  <span className="text-[10px] text-fg-muted">
                    Base para la amortización en estimaciones (default 10%)
                  </span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas/60 text-[10px] uppercase text-fg-muted border-b border-line">
                      <th className="py-2 px-3.5">Año fiscal</th>
                      <th className="py-2 px-3 text-right">Monto de anticipo</th>
                      <th className="py-2 px-3.5 text-right">% Amortización</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedContrato.anticipos_por_ejercicio.map((ej) => (
                      <tr key={ej.id}>
                        <td className="py-2 px-3.5 font-semibold text-fg">{ej.anio}</td>
                        <td className="py-2 px-3 text-right font-medium text-ok-fg">
                          {formatMXN(ej.monto)}
                        </td>
                        <td className="py-2 px-3.5 text-right font-semibold text-accent">
                          {ej.porcentaje_amortizacion}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  <div className="text-[11px] pt-2 border-t border-line/60 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-fg-soft truncate">
                        {registered.numero_poliza}
                      </span>
                      <strong className="text-fg shrink-0">
                        {formatMXN(registered.monto_asegurado)}
                      </strong>
                    </div>
                    <p className="text-[10px] text-fg-muted">
                      Emisión: <strong>{registered.fecha_emision}</strong> · Vence:{' '}
                      {registered.fecha_vencimiento}
                    </p>
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
                  <th className="py-2.5 px-3">Fecha emisión</th>
                  <th className="py-2.5 px-3">Vencimiento</th>
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
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-fg">
                      {pol.fecha_emision}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-fg-muted">
                      {pol.fecha_vencimiento}
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
            className="bg-surface border border-line rounded-xl max-w-xl w-full p-5 shadow-xl space-y-3.5 text-xs max-h-[92vh] overflow-y-auto"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Fecha de contrato (fecha_contrato) *
                </label>
                <input
                  type="date"
                  value={contratoForm.fecha_contrato}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, fecha_contrato: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Lugar de la obra (lugar_obra)
                </label>
                <input
                  type="text"
                  value={contratoForm.lugar_obra}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, lugar_obra: e.target.value })
                  }
                  placeholder="Ej. San Pedro, Nuevo León"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
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
                  Adendum (opcional)
                </label>
                <input
                  type="text"
                  value={contratoForm.adendum}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, adendum: e.target.value })
                  }
                  placeholder="Ej. Convenio Modificatorio CM-01/2024"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            {/* Tabla editable de Anticipo por ejercicio fiscal */}
            <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-fg text-xs">
                    Anticipo por ejercicio fiscal
                  </p>
                  <p className="text-[10px] text-fg-muted">
                    Año + Monto + % amortización (default 10%) · Total anticipo:{' '}
                    <strong className="text-ok-fg">{formatMXN(totalAnticipoDraft)}</strong>
                    {Number(contratoForm.monto_contrato) > 0 && (
                      <span>
                        {' '}
                        (
                        {(
                          (totalAnticipoDraft / Number(contratoForm.monto_contrato)) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEjercicioRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand text-accent text-[11px] font-semibold hover:bg-info-bg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar año</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-line rounded-lg bg-surface">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-canvas text-[10px] uppercase text-fg-muted border-b border-line">
                      <th className="py-1.5 px-2.5 w-24">Año</th>
                      <th className="py-1.5 px-2.5">Monto MXN</th>
                      <th className="py-1.5 px-2.5 w-28">% Amortización</th>
                      <th className="py-1.5 px-2 w-10 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {anticiposDraft.map((row) => (
                      <tr key={row.id}>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min={2000}
                            max={2100}
                            value={row.anio}
                            onChange={(e) =>
                              setAnticiposDraft((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, anio: e.target.value } : r
                                )
                              )
                            }
                            className="w-full px-2 py-1 rounded border border-line-strong bg-canvas"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.monto}
                            onChange={(e) =>
                              setAnticiposDraft((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, monto: e.target.value } : r
                                )
                              )
                            }
                            className="w-full px-2 py-1 rounded border border-line-strong bg-canvas text-right"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            step="0.5"
                            value={row.porcentaje_amortizacion}
                            onChange={(e) =>
                              setAnticiposDraft((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, porcentaje_amortizacion: e.target.value }
                                    : r
                                )
                              )
                            }
                            className="w-full px-2 py-1 rounded border border-line-strong bg-canvas text-right"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {anticiposDraft.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Quitar año ${row.anio}`}
                              onClick={() =>
                                setAnticiposDraft((prev) =>
                                  prev.filter((r) => r.id !== row.id)
                                )
                              }
                              className="p-1 text-fg-muted hover:text-danger-fg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
