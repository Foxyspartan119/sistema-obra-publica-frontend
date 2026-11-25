import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Lock,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(n);

export const DocumentosCierrePage: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentoItem[]>(INITIAL_DOCS);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  // Precondiciones estrictas de RF-RES-05 (con switches de simulación para pruebas)
  const [tieneAviso6Fotos, setTieneAviso6Fotos] = useState(true);
  const [todasEstimacionesLiquidadas, setTodasEstimacionesLiquidadas] = useState(false);

  const [obraFiniquitada, setObraFiniquitada] = useState(false);
  const [selloFiniquito, setSelloFiniquito] = useState<string | null>(null);
  const [confirmCierreOpen, setConfirmCierreOpen] = useState(false);

  const isResidente = user?.rol === 'RESIDENTE';
  const isDirectivo = user?.rol === 'DIRECTIVO';

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
    setSelloFiniquito(selloSimulado ?? 'SHA256-FINIQUITO');
    setDocs((prev) => [
      {
        id: `doc-fin-${Date.now()}`,
        nombre: 'Acta_Recepcion_Fisica_y_Finiquito_OP-2024-001.pdf',
        categoria: 'Cierre',
        fecha: 'Hoy',
        estado: 'FIRMADO',
      },
      ...prev,
    ]);
    setConfirmCierreOpen(false);
  };

  // Consolidación financiera automática (RN-RES-05.1)
  const resumenFiniquito = {
    contratado: 25000000,
    ordinarias: 21800000,
    adicionales: 1650000,
    extraordinarias: 850000,
    anticipoAmortizado: 2500000,
    saldoLiquidado: 21800000,
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted ">
            Contrato SOP-LP-024/2024 · Expediente legal y cierre administrativo
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-normal text-fg tracking-tight">
              Documentos, Recepción Física y Finiquito
            </h1>
            <StatusBadge status={obraFiniquitada ? 'FINIQUITADA' : 'EN_EJECUCION'} />
          </div>
        </div>
      </div>

      {/* Panel de Recepción Física y Finiquito (RF-RES-05) */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-fg ">
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

        {/* Checklist de Precondiciones Estrictas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div
            className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 ${
              tieneAviso6Fotos
                ? 'bg-ok-bg/60 border-ok-line '
                : 'bg-danger-bg/60 border-danger-line '
            }`}
          >
            <div className="flex items-start gap-2.5">
              {tieneAviso6Fotos ? (
                <CheckCircle2 className="w-4 h-4 text-ok-fg shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-fg shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-fg ">
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
                ? 'bg-ok-bg/60 border-ok-line '
                : 'bg-danger-bg/60 border-danger-line '
            }`}
          >
            <div className="flex items-start gap-2.5">
              {todasEstimacionesLiquidadas ? (
                <CheckCircle2 className="w-4 h-4 text-ok-fg shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-fg shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-fg ">
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

        {/* Consolidación Financiera Automática (RN-RES-05.1) */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {[
            { label: 'Contratado original', value: resumenFiniquito.contratado },
            { label: 'Est. Ordinarias', value: resumenFiniquito.ordinarias },
            { label: 'Cant. Adicionales', value: resumenFiniquito.adicionales },
            { label: 'Extraordinarios', value: resumenFiniquito.extraordinarias },
            { label: 'Anticipo amortizado', value: resumenFiniquito.anticipoAmortizado },
            { label: 'Saldo liquidado', value: resumenFiniquito.saldoLiquidado },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-lg bg-canvas border border-line "
            >
              <p className="text-[10px] text-fg-muted">{item.label}</p>
              <p className="font-semibold text-fg mt-1">
                {formatMXN(item.value)}
              </p>
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
              <span>{obraFiniquitada ? 'Finiquito emitido' : 'Emitir Recepción y Finiquito'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Repositorio documental */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-fg ">
              Expediente documental ({docs.length})
            </h2>
          </div>
          {isDirectivo && (
            <span className="text-[11px] text-fg-muted">Consulta en solo lectura (RF-DIR-03)</span>
          )}
        </div>

        <div className="divide-y divide-line ">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-fg truncate">
                    {doc.nombre}
                  </p>
                  <p className="text-[10px] text-fg-muted">
                    {doc.categoria} · Registrado: {doc.fecha}
                  </p>
                </div>
              </div>
              <StatusBadge status={doc.estado === 'FIRMADO' ? 'FIRMADO' : 'ACTIVO'} label={doc.estado} />
            </div>
          ))}
        </div>

        {!isDirectivo && !obraFiniquitada && (
          <div className="p-5 border-t border-line space-y-3 bg-canvas/50 ">
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

      <ConfirmActionModal
        open={confirmCierreOpen}
        title="Firmar Acta de Recepción Física y Finiquito"
        description="Esta acción consolidará el cierre financiero del contrato y cambiará el estado de la obra a FINIQUITADA / CERRADA de forma irreversible (RN-RES-05.2)."
        confirmLabel="Firmar cierre definitivo"
        tone="warning"
        requireSignature
        onCancel={() => setConfirmCierreOpen(false)}
        onConfirm={handleConfirmFiniquito}
      />
    </div>
  );
};