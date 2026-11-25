import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Lock,
  ShieldCheck,
  ClipboardCheck,
  Save,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/obra.types';
import { BUSINESS_CONSTANTS } from '../utils/businessRules';
import { StatusBadge } from '../components/common/StatusBadge';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

type BitacoraTab = 'notas' | 'reportes';

interface BitacoraNota {
  numero: number;
  tipo: string;
  asunto: string;
  contenido: string;
  autor: string;
  rolAutor: UserRole;
  fecha: string;
  evidencias: string[];
  selloDigital: string;
}

interface ReporteSupervision {
  id: string;
  fecha: string;
  clima: string;
  fuerzaTrabajo: string;
  maquinaria: string;
  incidencias: string;
  avanceReportado: number;
  estatus: 'BORRADOR' | 'ENVIADO' | 'FIRMADO';
  selloDigital?: string;
}

const NOTE_TYPES_BY_ROLE: Record<UserRole, string[]> = {
  RESIDENTE: [
    'ORDEN_TRABAJO',
    'AUTORIZACION',
    'SUSPENSION_TEMPORAL',
    'REANUDACION',
    'CIERRE',
  ],
  SUPERVISOR: ['SEGUIMIENTO', 'INCIDENCIA_CAMPO', 'ACUERDO_JUNTA', 'DICTAMEN_CALIDAD'],
  SUPERINTENDENTE: ['SOLICITUD', 'INCIDENTE_OPERATIVO', 'RESPUESTA', 'AVISO_TERMINACION'],
  DIRECTIVO: [],
  ADMINISTRADOR: [],
};

const DRAFT_STORAGE_KEY = 'obra_bitacora_draft_OP_2024_001';

const INITIAL_NOTES: BitacoraNota[] = [
  {
    numero: 3,
    tipo: 'SEGUIMIENTO',
    asunto: 'Inicio de colado en losa tramo central — Frente 02',
    contenido: 'Se verificó armado de acero, cimbra y revenimiento de concreto antes del vaciado.',
    autor: 'Ing. Lucía Ramírez',
    rolAutor: 'SUPERVISOR',
    fecha: '14 oct 2024 · 09:15 h',
    evidencias: ['colado_frente02.jpg'],
    selloDigital: 'SHA256-9A81F4C2E11B',
  },
  {
    numero: 2,
    tipo: 'SOLICITUD',
    asunto: 'Solicitud de autorización de precio extraordinario APE-014',
    contenido: 'Se presenta análisis por presencia de manto freático en apoyo 03.',
    autor: 'Ing. Javier Mendoza',
    rolAutor: 'SUPERINTENDENTE',
    fecha: '10 oct 2024 · 16:40 h',
    evidencias: ['apu_apoyo03.pdf'],
    selloDigital: 'SHA256-7D32B90F44AC',
  },
  {
    numero: 1,
    tipo: 'APERTURA',
    asunto: 'Nota N.º 1 · Apertura oficial de bitácora electrónica',
    contenido: 'Queda formalmente abierta la bitácora del contrato SOP-LP-024/2024 con los 3 actores operativos asignados.',
    autor: 'Ing. Marco Torres',
    rolAutor: 'RESIDENTE',
    fecha: '06 may 2024 · 08:00 h',
    evidencias: [],
    selloDigital: 'SHA256-1000A7E5F901',
  },
];

const INITIAL_REPORTES: ReporteSupervision[] = [
  {
    id: 'rep-1',
    fecha: '2024-10-14',
    clima: 'Despejado · 24 °C',
    fuerzaTrabajo: '38 trabajadores activos',
    maquinaria: '2 grúas, 1 bomba de concreto, 1 compactador',
    incidencias: 'Sin incidentes de seguridad; colado en curso.',
    avanceReportado: 62,
    estatus: 'FIRMADO',
    selloDigital: 'SHA256-REP6200AF12',
  },
];

export const BitacoraPage: React.FC = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<BitacoraTab>('notas');

  // --- Estado Bitácora ---
  const [notas, setNotas] = useState<BitacoraNota[]>(INITIAL_NOTES);
  const [bitacoraCerrada, setBitacoraCerrada] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [noteType, setNoteType] = useState('');
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState('');
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [confirmNoteSign, setConfirmNoteSign] = useState(false);
  const [page, setPage] = useState(1);

  // --- Estado Reportes de Supervisión (RF-SUP-03) ---
  const [reportes, setReportes] = useState<ReporteSupervision[]>(INITIAL_REPORTES);
  const [ultimoAvanceOficial, setUltimoAvanceOficial] = useState(62);
  const [repForm, setRepForm] = useState({
    fecha: '2024-10-15',
    clima: '',
    fuerzaTrabajo: '',
    maquinaria: '',
    incidencias: '',
    avanceReportado: '62',
  });
  const [repError, setRepError] = useState<string | null>(null);
  const [reportToSign, setReportToSign] = useState<ReporteSupervision | null>(null);

  const allowedTypes = user ? NOTE_TYPES_BY_ROLE[user.rol] : [];
  const canCreateNote = allowedTypes.length > 0 && !bitacoraCerrada;
  const isSupervisor = user?.rol === 'SUPERVISOR';
  const isAvisoTerminacion = noteType === 'AVISO_TERMINACION';

  // Cargar borrador guardado localmente (RNF-USA-01)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { asunto?: string; contenido?: string };
        if (parsed.asunto) setAsunto(parsed.asunto);
        if (parsed.contenido) setContenido(parsed.contenido);
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, []);

  // Autoguardado local del borrador de nota (RNF-USA-01)
  useEffect(() => {
    if (!showNewNote || (!asunto.trim() && !contenido.trim())) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ asunto, contenido }));
        setDraftSavedAt(new Date().toTimeString().slice(0, 8));
      } catch {
        // Ignorar error de cuota
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [showNewNote, asunto, contenido]);

  const handleOpenNewNote = () => {
    setNoteError(null);
    setNoteType(allowedTypes[0] ?? '');
    setShowNewNote(true);
  };

  const handleValidateNote = (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError(null);

    if (!noteType || !asunto.trim() || !contenido.trim()) {
      setNoteError('Selecciona el tipo de nota y completa el asunto y descripción técnica.');
      return;
    }

    // RN-SUPT-05.2: Mínimo 6 fotos JPG/PNG en Aviso de Terminación
    if (
      isAvisoTerminacion &&
      noteFiles.length < BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION
    ) {
      setNoteError(
        `Aviso de Terminación bloqueado (RN-SUPT-05.2): debes adjuntar al menos ${BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION} fotografías válidas (JPG o PNG).`
      );
      return;
    }

    setConfirmNoteSign(true);
  };

  const handleConfirmNoteSign = ({ selloSimulado }: { selloSimulado?: string }) => {
    if (!user) return;
    const nextNum = notas.length + 1;
    const nueva: BitacoraNota = {
      numero: nextNum,
      tipo: noteType,
      asunto: asunto.trim(),
      contenido: contenido.trim(),
      autor: user.nombre,
      rolAutor: user.rol,
      fecha: 'Hoy · ' + new Date().toTimeString().slice(0, 5) + ' h',
      evidencias: noteFiles.map((f) => f.name),
      selloDigital: selloSimulado ?? 'SHA256-FIRMADO',
    };

    setNotas((prev) => [nueva, ...prev]);

    // RN-RES-01.2: Cierre definitivo de bitácora
    if (noteType === 'CIERRE') {
      setBitacoraCerrada(true);
    }

    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setAsunto('');
    setContenido('');
    setNoteFiles([]);
    setDraftSavedAt(null);
    setConfirmNoteSign(false);
    setShowNewNote(false);
  };

  // --- Lógica de Reportes de Supervisión (RN-SUP-03.4 / RN-SUP-03.6) ---
  const handleSaveReporte = (targetStatus: 'BORRADOR' | 'ENVIADO') => {
    setRepError(null);
    const pct = Number(repForm.avanceReportado);

    // RN-SUP-03.6: Validación de no retroceso del avance físico
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setRepError('El avance físico debe estar entre 0.00% y 100.00% (RN-SUP-03.6).');
      return;
    }
    if (pct < ultimoAvanceOficial) {
      setRepError(
        `Inconsistencia de avance físico (RN-SUP-03.6): el avance por registrar (${pct}%) no puede ser menor al último avance registrado (${ultimoAvanceOficial}%).`
      );
      return;
    }

    if (
      targetStatus === 'ENVIADO' &&
      (!repForm.clima.trim() ||
        !repForm.fuerzaTrabajo.trim() ||
        !repForm.maquinaria.trim() ||
        !repForm.incidencias.trim())
    ) {
      setRepError(
        'Para pasar el reporte a estado ENVIADO todos los campos obligatorios deben estar capturados (RN-SUP-03.4).'
      );
      return;
    }

    const nuevoReporte: ReporteSupervision = {
      id: `rep-${Date.now()}`,
      fecha: repForm.fecha,
      clima: repForm.clima.trim() || 'Pendiente (borrador)',
      fuerzaTrabajo: repForm.fuerzaTrabajo.trim() || 'Pendiente (borrador)',
      maquinaria: repForm.maquinaria.trim() || 'Pendiente (borrador)',
      incidencias: repForm.incidencias.trim() || 'Sin capturar',
      avanceReportado: pct,
      estatus: targetStatus,
    };

    setReportes((prev) => [nuevoReporte, ...prev]);
    setRepForm({
      fecha: '2024-10-16',
      clima: '',
      fuerzaTrabajo: '',
      maquinaria: '',
      incidencias: '',
      avanceReportado: String(pct),
    });
  };

  const handleConfirmReporteSign = ({ selloSimulado }: { selloSimulado?: string }) => {
    if (!reportToSign) return;
    setReportes((prev) =>
      prev.map((r) =>
        r.id === reportToSign.id
          ? { ...r, estatus: 'FIRMADO', selloDigital: selloSimulado ?? 'SHA256-REP' }
          : r
      )
    );
    // RN-SUP-03.5: Al firmar, actualiza el avance físico oficial
    if (reportToSign.avanceReportado >= ultimoAvanceOficial) {
      setUltimoAvanceOficial(reportToSign.avanceReportado);
    }
    setReportToSign(null);
  };

  const pageSize = 5;
  const paginatedNotes = notas.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted ">
            Registro inmutable con firma electrónica (RNF-SEG-02 / RNF-SEG-04)
          </p>
          <h1 className="text-2xl font-normal text-fg tracking-tight mt-0.5">
            Bitácora electrónica y supervisión
          </h1>
        </div>

        {subTab === 'notas' && canCreateNote && (
          <button
            type="button"
            onClick={handleOpenNewNote}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva nota de bitácora</span>
          </button>
        )}
      </div>

      {/* Pestañas internas */}
      <div className="border-b border-line flex items-center gap-6 text-xs">
        <button
          type="button"
          onClick={() => setSubTab('notas')}
          className={`pb-3 font-medium border-b-2 cursor-pointer inline-flex items-center gap-1.5 ${
            subTab === 'notas'
              ? 'border-brand text-accent font-semibold'
              : 'border-transparent text-fg-muted hover:text-fg '
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Notas de Bitácora ({notas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('reportes')}
          className={`pb-3 font-medium border-b-2 cursor-pointer inline-flex items-center gap-1.5 ${
            subTab === 'reportes'
              ? 'border-brand text-accent font-semibold'
              : 'border-transparent text-fg-muted hover:text-fg '
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Reportes de Supervisión · Avance oficial: {ultimoAvanceOficial}%</span>
        </button>
      </div>

      {/* TAB 1: BITÁCORA DE NOTAS */}
      {subTab === 'notas' && (
        <div className="space-y-4">
          {bitacoraCerrada && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-info-bg border border-info-line text-info-fg text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                <strong>Bitácora cerrada y congelada (RN-RES-01.2):</strong> se firmó la nota de CIERRE.
                No se permiten nuevas notas ni modificaciones.
              </span>
            </div>
          )}

          {/* Listado cronológico */}
          <div className="space-y-3">
            {paginatedNotes.map((nota) => (
              <article
                key={nota.numero}
                className="bg-surface border border-line rounded-xl p-5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-accent">Nota N.º {nota.numero}</span>
                    <span className="px-2 py-0.5 rounded bg-subtle text-[10px] font-semibold text-fg-soft ">
                      {nota.tipo}
                    </span>
                    <span className="text-[11px] text-fg-muted">· {nota.fecha}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ok-fg bg-ok-bg px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" />
                    {nota.selloDigital}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-fg ">
                  {nota.asunto}
                </h3>
                <p className="text-xs text-fg-soft leading-relaxed">
                  {nota.contenido}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-[11px] text-fg-muted">
                  <span>
                    Firmado por <strong className="text-fg-soft ">{nota.autor}</strong>{' '}
                    ({nota.rolAutor})
                  </span>
                  {nota.evidencias.length > 0 && (
                    <span className="text-accent font-medium">
                      {nota.evidencias.length} evidencia(s) adjunta(s)
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Paginación (RNF-REN-03 / RN-DIR-03.2) */}
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>
              Página {page} de {Math.max(1, Math.ceil(notas.length / pageSize))}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-line-strong disabled:opacity-40 cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page * pageSize >= notas.length}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-line-strong disabled:opacity-40 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORTES DE SUPERVISIÓN (RF-SUP-03) */}
      {subTab === 'reportes' && (
        <div className="space-y-5">
          {isSupervisor && (
            <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-fg ">
                  Registrar Reporte Diario de Supervisión (RF-SUP-03)
                </h2>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Puedes guardar en BORRADOR (parcial), pasar a ENVIADO o firmar electrónicamente para
                  actualizar el Avance Físico Real (mínimo actual: {ultimoAvanceOficial}%).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <input
                  type="date"
                  value={repForm.fecha}
                  onChange={(e) => setRepForm({ ...repForm, fecha: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-line-strong bg-canvas "
                />
                <input
                  type="text"
                  placeholder="Condiciones de clima"
                  value={repForm.clima}
                  onChange={(e) => setRepForm({ ...repForm, clima: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-line-strong bg-canvas "
                />
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={100}
                  placeholder="Avance físico (%)"
                  value={repForm.avanceReportado}
                  onChange={(e) => setRepForm({ ...repForm, avanceReportado: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-line-strong bg-canvas "
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Estado de fuerza de trabajo (ej. 40 trabajadores)"
                  value={repForm.fuerzaTrabajo}
                  onChange={(e) => setRepForm({ ...repForm, fuerzaTrabajo: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-line-strong bg-canvas "
                />
                <input
                  type="text"
                  placeholder="Maquinaria activa en sitio"
                  value={repForm.maquinaria}
                  onChange={(e) => setRepForm({ ...repForm, maquinaria: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-line-strong bg-canvas "
                />
              </div>

              <textarea
                rows={2}
                placeholder="Incidencias relevantes y dictámenes de calidad"
                value={repForm.incidencias}
                onChange={(e) => setRepForm({ ...repForm, incidencias: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas "
              />

              {repError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{repError}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveReporte('BORRADOR')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line-strong text-xs font-medium cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar borrador</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReporte('ENVIADO')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar (previo a firma)</span>
                </button>
              </div>
            </div>
          )}

          {/* Historial de reportes */}
          <div className="space-y-3">
            {reportes.map((rep) => (
              <div
                key={rep.id}
                className="bg-surface border border-line rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-fg ">
                      Reporte del {rep.fecha}
                    </span>
                    <StatusBadge status={rep.estatus} />
                    <span className="font-bold text-accent">Avance: {rep.avanceReportado}%</span>
                  </div>
                  <p className="text-fg-muted ">
                    Clima: {rep.clima} · Personal: {rep.fuerzaTrabajo} · Maquinaria: {rep.maquinaria}
                  </p>
                  <p className="text-fg-soft ">{rep.incidencias}</p>
                </div>

                <div className="shrink-0">
                  {rep.estatus === 'ENVIADO' && isSupervisor ? (
                    <button
                      type="button"
                      onClick={() => setReportToSign(rep)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ok-solid hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Firmar reporte</span>
                    </button>
                  ) : rep.selloDigital ? (
                    <span className="text-[10px] font-mono text-ok-fg bg-ok-bg px-2.5 py-1 rounded">
                      {rep.selloDigital}
                    </span>
                  ) : (
                    <span className="text-[11px] text-fg-muted">Preliminar (no afecta avance oficial)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nueva nota de bitácora */}
      {showNewNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNewNote(false)}
        >
          <form
            onSubmit={handleValidateNote}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-lg w-full p-5 space-y-3.5 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg ">
                Nueva nota de bitácora ({user?.rol})
              </h3>
              {draftSavedAt && (
                <span className="text-[10px] text-fg-muted">
                  Borrador autoguardado ({draftSavedAt})
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft ">
                Tipo de nota permitido para tu rol
              </label>
              <select
                value={noteType}
                onChange={(e) => {
                  setNoteType(e.target.value);
                  setNoteError(null);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas cursor-pointer"
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Asunto de la nota"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas "
            />

            <textarea
              rows={4}
              placeholder="Redacción técnica detallada..."
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas "
            />

            <FileDropzone
              files={noteFiles}
              onChange={setNoteFiles}
              maxFiles={6}
              minFiles={isAvisoTerminacion ? BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION : 0}
              imagesOnly={isAvisoTerminacion}
              helperText={
                isAvisoTerminacion
                  ? 'Aviso de Terminación: obligatorio adjuntar mínimo 6 fotografías (JPG o PNG, máx. 10 MB c/u).'
                  : 'Evidencias opcionales (PDF, JPG, PNG · máx. 10 MB c/u)'
              }
            />

            {noteError && (
              <p className="text-xs text-danger-fg font-medium">{noteError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-line ">
              <button
                type="button"
                onClick={() => setShowNewNote(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Firmar y guardar nota
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        open={confirmNoteSign}
        title={
          noteType === 'CIERRE'
            ? 'Confirmar cierre definitivo de bitácora'
            : 'Firmar nota de bitácora electrónica'
        }
        description={
          noteType === 'CIERRE'
            ? 'Al firmar la nota de CIERRE, la bitácora quedará congelada de forma irreversible para todos los roles (RN-RES-01.2).'
            : 'Una vez estampada tu firma electrónica, el contenido y sus evidencias quedarán inalterables (RNF-SEG-02).'
        }
        confirmLabel="Estampar firma"
        tone={noteType === 'CIERRE' ? 'danger' : 'brand'}
        requireSignature
        onCancel={() => setConfirmNoteSign(false)}
        onConfirm={handleConfirmNoteSign}
      />

      <ConfirmActionModal
        open={reportToSign !== null}
        title="Firmar Reporte Diario de Supervisión"
        description={`Al firmar el reporte del ${reportToSign?.fecha}, quedará inmutable y el Avance Físico Real oficial se actualizará a ${reportToSign?.avanceReportado}% (RN-SUP-03.5).`}
        confirmLabel="Firmar reporte"
        requireSignature
        onCancel={() => setReportToSign(null)}
        onConfirm={handleConfirmReporteSign}
      />
    </div>
  );
};