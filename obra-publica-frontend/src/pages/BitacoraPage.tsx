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
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useObra,
  RESOURCE_CATALOG,
  type ResourceAllocation,
  type ResourceCategory,
} from '../context/ObraContext';
import type { UserRole } from '../types/obra.types';
import { BUSINESS_CONSTANTS } from '../utils/businessRules';
import { StatusBadge } from '../components/common/StatusBadge';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

type BitacoraTab = 'notas' | 'reportes';
type ClimaOption =
  | 'Soleado'
  | 'Parcialmente nublado'
  | 'Nublado'
  | 'Lluvioso'
  | 'Tormenta eléctrica';

type IncidenciaEstatus = 'RECIENTE' | 'EN_ATENCION' | 'ATENDIDA';

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
  obraId: string;
  fecha: string;
  actividadesRealizadas: string;
  clima: ClimaOption;
  horasLluvia: number;
  avanceReportado: number;
  huboIncidencia: boolean;
  incidenciaTipo?: 'Anomalía técnica' | 'Accidente / Seguridad' | 'Atraso externo';
  incidenciaDescripcion?: string;
  incidenciaEstatus?: IncidenciaEstatus;
  recursos: ResourceAllocation[];
  imagenes: string[];
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

const INCIDENCIA_LABELS: Record<IncidenciaEstatus, { label: string; badge: string }> = {
  RECIENTE: {
    label: 'Reciente / Reportada',
    badge: 'bg-danger-bg text-danger-fg border border-danger-line',
  },
  EN_ATENCION: {
    label: 'En proceso de atención',
    badge: 'bg-warn-bg text-warn-fg border border-warn-line',
  },
  ATENDIDA: {
    label: 'Atendida / Resuelta',
    badge: 'bg-ok-bg text-ok-fg border border-ok-line',
  },
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
    obraId: 'OP-2024-001',
    fecha: '2024-10-14',
    actividadesRealizadas:
      'Habilitado y armado de acero de refuerzo en losa central; verificación topográfica de niveles de cimbra y colado de 45 m³ de concreto.',
    clima: 'Parcialmente nublado',
    horasLluvia: 0,
    avanceReportado: 62,
    huboIncidencia: true,
    incidenciaTipo: 'Anomalía técnica',
    incidenciaDescripcion:
      'Filtración menor en junta de cimbra lateral en apoyo 02; se ordenó recalafateo previo al vaciado.',
    incidenciaEstatus: 'EN_ATENCION',
    recursos: [
      { resourceId: 'maq-grua', cantidad: 2 },
      { resourceId: 'maq-bomba', cantidad: 1 },
      { resourceId: 'per-albanil', cantidad: 18 },
      { resourceId: 'per-peon', cantidad: 20 },
      { resourceId: 'eq-vibrador', cantidad: 3 },
    ],
    imagenes: ['colado_losa_01.jpg', 'revision_armado_02.png'],
    estatus: 'FIRMADO',
    selloDigital: 'SHA256-REP6200AF12',
  },
];

function blockNegativeKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
}

export const BitacoraPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedObra, getAvailableForObra, setObraAllocations } = useObra();
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
  const [ultimoAvanceOficial, setUltimoAvanceOficial] = useState(selectedObra.avanceFisico || 62);

  const [repFecha, setRepFecha] = useState('2024-10-15');
  const [repActividades, setRepActividades] = useState('');
  const [repClima, setRepClima] = useState<ClimaOption>('Soleado');
  const [repHorasLluvia, setRepHorasLluvia] = useState('0');
  const [repAvance, setRepAvance] = useState(String(selectedObra.avanceFisico || 62));

  // Incidencias
  const [huboIncidencia, setHuboIncidencia] = useState(false);
  const [incidenciaTipo, setIncidenciaTipo] =
    useState<'Anomalía técnica' | 'Accidente / Seguridad' | 'Atraso externo'>('Anomalía técnica');
  const [incidenciaDesc, setIncidenciaDesc] = useState('');
  const [incidenciaEstatus, setIncidenciaEstatus] = useState<IncidenciaEstatus>('RECIENTE');

  // Selectores de Maquinaria, Personal y Equipo
  const [selectedMaqId, setSelectedMaqId] = useState('maq-retro');
  const [qtyMaq, setQtyMaq] = useState('1');

  const [selectedPerId, setSelectedPerId] = useState('per-albanil');
  const [qtyPer, setQtyPer] = useState('5');

  const [selectedEqId, setSelectedEqId] = useState('eq-revolvedora');
  const [qtyEq, setQtyEq] = useState('1');

  const [selectedRecursos, setSelectedRecursos] = useState<ResourceAllocation[]>([]);
  const [repImages, setRepImages] = useState<File[]>([]);
  const [repError, setRepError] = useState<string | null>(null);
  const [reportToSign, setReportToSign] = useState<ReporteSupervision | null>(null);

  useEffect(() => {
    setUltimoAvanceOficial(selectedObra.avanceFisico);
    setRepAvance(String(selectedObra.avanceFisico));
    setSelectedRecursos([]);
    setRepError(null);
  }, [selectedObra]);

  const allowedTypes = user ? NOTE_TYPES_BY_ROLE[user.rol] : [];
  const canCreateNote = allowedTypes.length > 0 && !bitacoraCerrada;
  const isSupervisor = user?.rol === 'SUPERVISOR';
  const isAvisoTerminacion = noteType === 'AVISO_TERMINACION';
  const isRainyWeather = repClima === 'Lluvioso' || repClima === 'Tormenta eléctrica';

  // Autoguardado local del borrador de nota (RNF-USA-01)
  useEffect(() => {
    if (!showNewNote || (!asunto.trim() && !contenido.trim())) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ asunto, contenido }));
        setDraftSavedAt(new Date().toTimeString().slice(0, 8));
      } catch {
        // Ignorar
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
    if (noteType === 'CIERRE') setBitacoraCerrada(true);

    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setAsunto('');
    setContenido('');
    setNoteFiles([]);
    setDraftSavedAt(null);
    setConfirmNoteSign(false);
    setShowNewNote(false);
  };

  // --- Agregar recurso (Maquinaria / Personal / Equipo) validando stock entre obras ---
  const handleAddRecurso = (resourceId: string, rawQty: string) => {
    setRepError(null);
    const qty = Math.floor(Number(rawQty));
    const catalogItem = RESOURCE_CATALOG.find((r) => r.id === resourceId);
    if (!catalogItem) return;

    if (Number.isNaN(qty) || qty <= 0) {
      setRepError('No se permiten cantidades negativas ni iguales a 0.');
      return;
    }

    const maxAvailable = getAvailableForObra(selectedObra.id, resourceId);
    const alreadyAdded =
      selectedRecursos.find((r) => r.resourceId === resourceId)?.cantidad ?? 0;

    if (alreadyAdded + qty > maxAvailable) {
      setRepError(
        `Disponibilidad excedida para "${catalogItem.nombre}": solo hay ${maxAvailable} ${catalogItem.unidad} libres (el resto está asignado en otras obras).`
      );
      return;
    }

    setSelectedRecursos((prev) => {
      const exists = prev.some((r) => r.resourceId === resourceId);
      if (exists) {
        return prev.map((r) =>
          r.resourceId === resourceId ? { ...r, cantidad: r.cantidad + qty } : r
        );
      }
      return [...prev, { resourceId, cantidad: qty }];
    });
  };

  const handleRemoveRecurso = (resourceId: string) => {
    setSelectedRecursos((prev) => prev.filter((r) => r.resourceId !== resourceId));
  };

  // --- Guardar Reporte Diario de Supervisión ---
  const handleSaveReporte = (targetStatus: 'BORRADOR' | 'ENVIADO') => {
    setRepError(null);
    const pct = Number(repAvance);
    const lluvia = isRainyWeather ? Number(repHorasLluvia) : 0;

    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setRepError('El porcentaje de avance físico real debe estar entre 0% y 100% (no negativos).');
      return;
    }

    if (pct < ultimoAvanceOficial) {
      setRepError(
        `Inconsistencia de avance físico (RN-SUP-03.6): el avance capturado (${pct}%) no puede ser menor al último avance registrado (${ultimoAvanceOficial}%).`
      );
      return;
    }

    if (Number.isNaN(lluvia) || lluvia < 0 || lluvia > 24) {
      setRepError('Las horas de lluvia deben estar entre 0 y 24 horas (sin números negativos).');
      return;
    }

    if (isRainyWeather && lluvia <= 0) {
      setRepError('Si seleccionaste clima lluvioso, indica las horas de lluvia (> 0).');
      return;
    }

    if (targetStatus === 'ENVIADO' && !repActividades.trim()) {
      setRepError('Describe las actividades realizadas en la jornada antes de enviar el reporte.');
      return;
    }

    if (huboIncidencia && !incidenciaDesc.trim()) {
      setRepError('Capturaste que hubo una incidencia: describe el hecho ocurrido.');
      return;
    }

    // Actualiza la asignación de recursos de esta obra para bloquearlos en otras obras
    if (selectedRecursos.length > 0) {
      setObraAllocations(selectedObra.id, selectedRecursos);
    }

    const nuevoReporte: ReporteSupervision = {
      id: `rep-${Date.now()}`,
      obraId: selectedObra.id,
      fecha: repFecha,
      actividadesRealizadas:
        repActividades.trim() || 'Actividades pendientes de captura (borrador)',
      clima: repClima,
      horasLluvia: lluvia,
      avanceReportado: pct,
      huboIncidencia,
      incidenciaTipo: huboIncidencia ? incidenciaTipo : undefined,
      incidenciaDescripcion: huboIncidencia ? incidenciaDesc.trim() : undefined,
      incidenciaEstatus: huboIncidencia ? incidenciaEstatus : undefined,
      recursos: selectedRecursos,
      imagenes: repImages.map((f) => f.name),
      estatus: targetStatus,
    };

    setReportes((prev) => [nuevoReporte, ...prev]);
    setRepActividades('');
    setRepHorasLluvia('0');
    setHuboIncidencia(false);
    setIncidenciaDesc('');
    setIncidenciaEstatus('RECIENTE');
    setRepImages([]);
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
    if (reportToSign.avanceReportado >= ultimoAvanceOficial) {
      setUltimoAvanceOficial(reportToSign.avanceReportado);
    }
    setReportToSign(null);
  };

  // Permite cambiar manualmente el estatus de la incidencia conforme avanza la solución
  const handleUpdateIncidenciaEstatus = (
    reporteId: string,
    nuevoEstatus: IncidenciaEstatus
  ) => {
    setReportes((prev) =>
      prev.map((r) =>
        r.id === reporteId ? { ...r, incidenciaEstatus: nuevoEstatus } : r
      )
    );
  };

  const pageSize = 5;
  const paginatedNotes = notas.slice((page - 1) * pageSize, page * pageSize);

  const renderResourceSelector = (
    title: string,
    category: ResourceCategory,
    selectedId: string,
    setSelectedId: (id: string) => void,
    qty: string,
    setQty: (val: string) => void
  ) => {
    const items = RESOURCE_CATALOG.filter((r) => r.categoria === category);
    const maxAvail = getAvailableForObra(selectedObra.id, selectedId);

    return (
      <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col justify-between gap-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-fg truncate">{title}</span>
          <span className="px-2 py-0.5 rounded bg-subtle text-fg-muted shrink-0">
            Disp.: <strong className="text-fg">{maxAvail}</strong>
          </span>
        </div>

        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setQty('1');
          }}
          className="w-full min-w-0 px-2.5 py-2 text-xs rounded-lg border border-line-strong bg-surface cursor-pointer truncate"
        >
          {items.map((item) => {
            const avail = getAvailableForObra(selectedObra.id, item.id);
            return (
              <option key={item.id} value={item.id} disabled={avail === 0}>
                {item.nombre} ({avail}/{item.totalFlota})
              </option>
            );
          })}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, maxAvail)}
            step={1}
            disabled={maxAvail === 0}
            value={qty}
            onKeyDown={blockNegativeKey}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setQty('');
                return;
              }
              const parsed = Math.max(0, Math.min(maxAvail, Math.floor(Number(val))));
              setQty(String(parsed));
            }}
            className="flex-1 min-w-0 px-2.5 py-2 text-xs rounded-lg border border-line-strong bg-surface"
          />

          <button
            type="button"
            disabled={maxAvail === 0}
            onClick={() => handleAddRecurso(selectedId, qty)}
            className="px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-40 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            Agregar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            {selectedObra.id} · Registro inmutable con firma electrónica (RNF-SEG-02 / RNF-SEG-04)
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
              : 'border-transparent text-fg-muted hover:text-fg'
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
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Reportes de Supervisión · Avance físico real: {ultimoAvanceOficial}%</span>
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

          <div className="space-y-3">
            {paginatedNotes.map((nota) => (
              <article
                key={nota.numero}
                className="bg-surface border border-line rounded-xl p-5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-accent">Nota N.º {nota.numero}</span>
                    <span className="px-2 py-0.5 rounded bg-subtle text-[10px] font-semibold text-fg-soft">
                      {nota.tipo}
                    </span>
                    <span className="text-[11px] text-fg-muted">· {nota.fecha}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ok-fg bg-ok-bg px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" />
                    {nota.selloDigital}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-fg">{nota.asunto}</h3>
                <p className="text-xs text-fg-soft leading-relaxed">{nota.contenido}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-[11px] text-fg-muted">
                  <span>
                    Firmado por <strong className="text-fg-soft">{nota.autor}</strong> (
                    {nota.rolAutor})
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

      {/* TAB 2: REPORTES DIARIOS DE SUPERVISIÓN (RF-SUP-03) */}
      {subTab === 'reportes' && (
        <div className="space-y-5">
          {isSupervisor && (
            <div className="bg-surface border border-line rounded-xl p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-fg">
                  Registrar Reporte Diario de Supervisión (RF-SUP-03)
                </h2>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Captura manual del avance físico real (mínimo vigente: {ultimoAvanceOficial}%),
                  recursos en sitio e incidencias de obra.
                </p>
              </div>

              {/* Fila 1: Fecha, Clima, Horas de lluvia, Avance Físico Real */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-fg-soft">
                    Fecha del reporte *
                  </label>
                  <input
                    type="date"
                    value={repFecha}
                    onChange={(e) => setRepFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-fg-soft">
                    Condiciones de clima *
                  </label>
                  <select
                    value={repClima}
                    onChange={(e) => {
                      const next = e.target.value as ClimaOption;
                      setRepClima(next);
                      if (next !== 'Lluvioso' && next !== 'Tormenta eléctrica') {
                        setRepHorasLluvia('0');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
                  >
                    <option value="Soleado">Soleado</option>
                    <option value="Parcialmente nublado">Parcialmente nublado</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Lluvioso">Lluvioso</option>
                    <option value="Tormenta eléctrica">Tormenta eléctrica</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-fg-soft">
                    Horas de lluvia (0–24 h)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    disabled={!isRainyWeather}
                    value={repHorasLluvia}
                    onKeyDown={blockNegativeKey}
                    onChange={(e) => setRepHorasLluvia(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-fg-soft">
                    Avance físico real (%) *
                  </label>
                  <input
                    type="number"
                    min={ultimoAvanceOficial}
                    max={100}
                    step={0.5}
                    value={repAvance}
                    onKeyDown={blockNegativeKey}
                    onChange={(e) => setRepAvance(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas font-semibold text-accent"
                  />
                </div>
              </div>

              {/* Fila 2: Actividades realizadas */}
              <div className="space-y-1 text-xs">
                <label className="text-[11px] font-medium text-fg-soft">
                  Actividades realizadas en la jornada *
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe los frentes trabajados, volúmenes ejecutados y maniobras principales..."
                  value={repActividades}
                  onChange={(e) => setRepActividades(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>

              {/* Fila 3: Selectores de Maquinaria, Personal y Equipo con stock compartido */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {renderResourceSelector(
                    'Maquinaria contemplada',
                    'MAQUINARIA',
                    selectedMaqId,
                    setSelectedMaqId,
                    qtyMaq,
                    setQtyMaq
                  )}
                  {renderResourceSelector(
                    'Personal involucrado',
                    'PERSONAL',
                    selectedPerId,
                    setSelectedPerId,
                    qtyPer,
                    setQtyPer
                  )}
                  {renderResourceSelector(
                    'Equipo utilizado',
                    'EQUIPO',
                    selectedEqId,
                    setSelectedEqId,
                    qtyEq,
                    setQtyEq
                  )}
                </div>

                {selectedRecursos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedRecursos.map((rec) => {
                      const info = RESOURCE_CATALOG.find((r) => r.id === rec.resourceId);
                      if (!info) return null;
                      return (
                        <span
                          key={rec.resourceId}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-info-bg text-accent text-xs font-medium"
                        >
                          <span>
                            {info.nombre}: <strong>{rec.cantidad}</strong> {info.unidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecurso(rec.resourceId)}
                            className="hover:text-danger-fg cursor-pointer"
                            aria-label={`Quitar ${info.nombre}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fila 4: Incidencias (anomalía o accidente) con estatus */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 font-semibold text-fg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={huboIncidencia}
                      onChange={(e) => setHuboIncidencia(e.target.checked)}
                      className="rounded border-line-strong"
                    />
                    <span>Registrar incidencia (anomalía técnica o accidente en obra)</span>
                  </label>
                </div>

                {huboIncidencia && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-fg-muted">Tipo de incidencia</label>
                        <select
                          value={incidenciaTipo}
                          onChange={(e) =>
                            setIncidenciaTipo(
                              e.target.value as
                                | 'Anomalía técnica'
                                | 'Accidente / Seguridad'
                                | 'Atraso externo'
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface cursor-pointer"
                        >
                          <option value="Anomalía técnica">Anomalía técnica</option>
                          <option value="Accidente / Seguridad">Accidente / Seguridad</option>
                          <option value="Atraso externo">Atraso externo / suministro</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-fg-muted">
                          Estatus inicial de atención
                        </label>
                        <select
                          value={incidenciaEstatus}
                          onChange={(e) =>
                            setIncidenciaEstatus(e.target.value as IncidenciaEstatus)
                          }
                          className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface cursor-pointer"
                        >
                          <option value="RECIENTE">Reciente / Reportada</option>
                          <option value="EN_ATENCION">En proceso de atención</option>
                          <option value="ATENDIDA">Atendida / Resuelta</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Describe la anomalía o accidente, frente afectado y medidas inmediatas..."
                      value={incidenciaDesc}
                      onChange={(e) => setIncidenciaDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface"
                    />
                  </div>
                )}
              </div>

              {/* Fila 5: Apartado de añadir imágenes */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-fg-soft">
                  Evidencia fotográfica del reporte diario
                </label>
                <FileDropzone
                  files={repImages}
                  onChange={setRepImages}
                  maxFiles={6}
                  imagesOnly
                  helperText="Adjunta fotografías del avance y frentes activos (JPG o PNG · máx. 10 MB c/u)"
                />
              </div>

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

          {/* Historial de reportes con seguimiento editable de incidencias */}
          <div className="space-y-3">
            {reportes.map((rep) => (
              <div
                key={rep.id}
                className="bg-surface border border-line rounded-xl p-5 space-y-3 text-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">Reporte del {rep.fecha}</span>
                    <StatusBadge status={rep.estatus} />
                    <span className="font-bold text-accent">
                      Avance físico real: {rep.avanceReportado}%
                    </span>
                    <span className="text-fg-muted">
                      · Clima: {rep.clima}
                      {rep.horasLluvia > 0 ? ` (${rep.horasLluvia} h de lluvia)` : ''}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {rep.estatus === 'ENVIADO' && isSupervisor ? (
                      <button
                        type="button"
                        onClick={() => setReportToSign(rep)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ok-solid hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Firmar reporte</span>
                      </button>
                    ) : rep.selloDigital ? (
                      <span className="text-[10px] font-mono text-ok-fg bg-ok-bg px-2.5 py-1 rounded">
                        {rep.selloDigital}
                      </span>
                    ) : (
                      <span className="text-[11px] text-fg-muted">
                        Preliminar (no afecta avance oficial)
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-fg-soft leading-relaxed">
                  <strong>Actividades realizadas:</strong> {rep.actividadesRealizadas}
                </p>

                {/* Recursos empleados */}
                {rep.recursos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rep.recursos.map((rec) => {
                      const info = RESOURCE_CATALOG.find((r) => r.id === rec.resourceId);
                      if (!info) return null;
                      return (
                        <span
                          key={`${rep.id}-${rec.resourceId}`}
                          className="px-2 py-0.5 rounded bg-subtle text-[11px] text-fg-soft"
                        >
                          {info.nombre}: <strong>{rec.cantidad}</strong> {info.unidad}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Bloque de Incidencia con cambio manual de estatus */}
                {rep.huboIncidencia && rep.incidenciaEstatus && (
                  <div className="p-3 rounded-lg bg-canvas border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg">
                          Incidencia · {rep.incidenciaTipo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            INCIDENCIA_LABELS[rep.incidenciaEstatus].badge
                          }`}
                        >
                          {INCIDENCIA_LABELS[rep.incidenciaEstatus].label}
                        </span>
                      </div>
                      <p className="text-fg-soft">{rep.incidenciaDescripcion}</p>
                    </div>

                    {isSupervisor && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[10px] text-fg-muted">Estatus:</label>
                        <select
                          aria-label="Actualizar estatus de incidencia"
                          value={rep.incidenciaEstatus}
                          onChange={(e) =>
                            handleUpdateIncidenciaEstatus(
                              rep.id,
                              e.target.value as IncidenciaEstatus
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface text-[11px] font-medium cursor-pointer"
                        >
                          <option value="RECIENTE">Reciente / Reportada</option>
                          <option value="EN_ATENCION">En proceso de atención</option>
                          <option value="ATENDIDA">Atendida / Resuelta</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Imágenes adjuntas */}
                {rep.imagenes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-accent">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {rep.imagenes.map((img) => (
                      <span
                        key={img}
                        className="px-2 py-0.5 rounded bg-info-bg font-medium"
                      >
                        {img}
                      </span>
                    ))}
                  </div>
                )}
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
              <h3 className="text-sm font-semibold text-fg">
                Nueva nota de bitácora ({user?.rol})
              </h3>
              {draftSavedAt && (
                <span className="text-[10px] text-fg-muted">
                  Borrador autoguardado ({draftSavedAt})
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-soft">
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas"
            />

            <textarea
              rows={4}
              placeholder="Redacción técnica detallada..."
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas"
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

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
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