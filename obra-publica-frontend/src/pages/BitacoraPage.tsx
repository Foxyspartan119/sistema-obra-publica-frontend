import React, { useEffect, useMemo, useState } from 'react';
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
  Pencil,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useObra,
  RESOURCE_CATALOG,
  type ResourceAllocation,
  type ResourceCategory,
} from '../context/ObraContext';
import {
  OPERATIONAL_SIGNER_ROLES,
  type OperationalRole,
  type UserRole,
} from '../types/obra.types';
import { BUSINESS_CONSTANTS, validarControlPresupuestal } from '../utils/businessRules';
import { calcularAvanceProgramadoAFecha } from '../mocks/catalogoParametrico.mock';
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

interface NotaFirma {
  rol: OperationalRole;
  nombre: string;
  correo: string;
  rfc?: string;
  fecha: string;
  selloDigital: string;
}

interface BitacoraNota {
  numero: number;
  tipo: string;
  asunto: string;
  contenido: string;
  autor: string;
  autorCorreo: string;
  rolAutor: UserRole;
  fecha: string;
  evidencias: string[];
  firmas: NotaFirma[];
}

interface ReporteSupervision {
  id: string;
  obraId: string;
  fecha: string;
  actividadesRealizadas: string;
  clima: ClimaOption;
  horasLluvia: number;
  avanceProgramado: number;
  avanceReportado: number;
  avanceFinanciero: number;
  huboIncidencia: boolean;
  incidenciaTipo?: 'Anomalía técnica' | 'Accidente / Seguridad' | 'Atraso externo';
  incidenciaDescripcion?: string;
  incidenciaEstatus?: IncidenciaEstatus;
  recursos: ResourceAllocation[];
  totalesRecursos: {
    maquinaria: number;
    equipo: number;
    personal: number;
  };
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

const ROLE_LABELS: Record<OperationalRole, string> = {
  RESIDENTE: 'Residente',
  SUPERVISOR: 'Supervisor',
  SUPERINTENDENTE: 'Superintendente',
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
    numero: 4,
    tipo: 'ORDEN_TRABAJO',
    asunto: 'Instrucción de refuerzo en juntas de dilatación — Tramo Norte',
    contenido:
      'Se instruye verificar separación y sellado elastomérico en juntas de dilatación antes del colado de banquetas. Nota en borrador abierta para revisión previa a firmas.',
    autor: 'Ing. Marco Torres',
    autorCorreo: 'marco.torres@obra.gob.mx',
    rolAutor: 'RESIDENTE',
    fecha: '15 oct 2024 · 08:30 h',
    evidencias: ['detalle_juntas_v1.pdf'],
    firmas: [],
  },
  {
    numero: 3,
    tipo: 'SEGUIMIENTO',
    asunto: 'Inicio de colado en losa tramo central — Frente 02',
    contenido:
      'Se verificó armado de acero, cimbra y revenimiento de concreto antes del vaciado.',
    autor: 'Ing. Lucía Ramírez',
    autorCorreo: 'lucia.ramirez@obra.gob.mx',
    rolAutor: 'SUPERVISOR',
    fecha: '14 oct 2024 · 09:15 h',
    evidencias: ['colado_frente02.jpg'],
    firmas: [
      {
        rol: 'SUPERVISOR',
        nombre: 'Ing. Lucía Ramírez',
        correo: 'lucia.ramirez@obra.gob.mx',
        rfc: 'RALU880923MN7',
        fecha: '14 oct 2024 · 09:18 h',
        selloDigital: 'SAT-SHA256-RALU-9A81F4C2',
      },
    ],
  },
  {
    numero: 2,
    tipo: 'SOLICITUD',
    asunto: 'Solicitud de autorización de precio extraordinario APE-014',
    contenido: 'Se presenta análisis por presencia de manto freático en apoyo 03.',
    autor: 'Ing. Javier Mendoza',
    autorCorreo: 'javier.mendoza@obra.gob.mx',
    rolAutor: 'SUPERINTENDENTE',
    fecha: '10 oct 2024 · 16:40 h',
    evidencias: ['apu_apoyo03.pdf'],
    firmas: [
      {
        rol: 'SUPERINTENDENTE',
        nombre: 'Ing. Javier Mendoza',
        correo: 'javier.mendoza@obra.gob.mx',
        rfc: 'MEJA811104PQ2',
        fecha: '10 oct 2024 · 16:42 h',
        selloDigital: 'SAT-SHA256-MEJA-7D32B90F',
      },
      {
        rol: 'SUPERVISOR',
        nombre: 'Ing. Lucía Ramírez',
        correo: 'lucia.ramirez@obra.gob.mx',
        rfc: 'RALU880923MN7',
        fecha: '11 oct 2024 · 10:15 h',
        selloDigital: 'SAT-SHA256-RALU-8B41E30D',
      },
    ],
  },
  {
    numero: 1,
    tipo: 'APERTURA',
    asunto: 'Nota N.º 1 · Apertura oficial de bitácora electrónica',
    contenido:
      'Queda formalmente abierta la bitácora del contrato SOP-LP-024/2024 con los 3 actores operativos asignados.',
    autor: 'Ing. Marco Torres',
    autorCorreo: 'marco.torres@obra.gob.mx',
    rolAutor: 'RESIDENTE',
    fecha: '06 may 2024 · 08:00 h',
    evidencias: [],
    firmas: [
      {
        rol: 'RESIDENTE',
        nombre: 'Ing. Marco Torres',
        correo: 'marco.torres@obra.gob.mx',
        rfc: 'TOMA840512HK4',
        fecha: '06 may 2024 · 08:02 h',
        selloDigital: 'SAT-SHA256-TOMA-1000A7E5',
      },
      {
        rol: 'SUPERVISOR',
        nombre: 'Ing. Lucía Ramírez',
        correo: 'lucia.ramirez@obra.gob.mx',
        rfc: 'RALU880923MN7',
        fecha: '06 may 2024 · 08:14 h',
        selloDigital: 'SAT-SHA256-RALU-2041C8B9',
      },
      {
        rol: 'SUPERINTENDENTE',
        nombre: 'Ing. Javier Mendoza',
        correo: 'javier.mendoza@obra.gob.mx',
        rfc: 'MEJA811104PQ2',
        fecha: '06 may 2024 · 08:29 h',
        selloDigital: 'SAT-SHA256-MEJA-3099F1A4',
      },
    ],
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
    avanceProgramado: 65,
    avanceReportado: 62,
    avanceFinanciero: 58,
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
    totalesRecursos: {
      maquinaria: 3,
      equipo: 3,
      personal: 38,
    },
    imagenes: ['colado_losa_01.jpg', 'revision_armado_02.png'],
    estatus: 'FIRMADO',
    selloDigital: 'SAT-SHA256-RALU-REP6200A',
  },
];

function blockNegativeKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
}

function summarizeResourceTotals(allocations: ResourceAllocation[]) {
  let maquinaria = 0;
  let equipo = 0;
  let personal = 0;

  for (const alloc of allocations) {
    const info = RESOURCE_CATALOG.find((r) => r.id === alloc.resourceId);
    if (!info) continue;
    if (info.categoria === 'MAQUINARIA') maquinaria += alloc.cantidad;
    else if (info.categoria === 'EQUIPO') equipo += alloc.cantidad;
    else if (info.categoria === 'PERSONAL') personal += alloc.cantidad;
  }

  return { maquinaria, equipo, personal };
}

function isOperationalSigner(role?: UserRole): role is OperationalRole {
  return role !== undefined && (OPERATIONAL_SIGNER_ROLES as readonly string[]).includes(role);
}

export const BitacoraPage: React.FC = () => {
  const { user } = useAuth();
  const {
    selectedObra,
    selectedConceptos,
    getAvailableForObra,
    setObraAllocations,
    updateObraAvance,
    setPendingBitacoraByRole,
  } = useObra();
  const [subTab, setSubTab] = useState<BitacoraTab>('notas');

  // --- Estado Bitácora ---
  const [notas, setNotas] = useState<BitacoraNota[]>(INITIAL_NOTES);
  const [bitacoraCerrada, setBitacoraCerrada] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNoteNum, setEditingNoteNum] = useState<number | null>(null);
  const [noteType, setNoteType] = useState('');
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState('');
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [existingEvidencias, setExistingEvidencias] = useState<string[]>([]);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [signIntent, setSignIntent] = useState<
    | { mode: 'CREATE_AND_SIGN' }
    | { mode: 'SIGN_EXISTING'; notaNumero: number }
    | null
  >(null);
  const [page, setPage] = useState(1);

  // --- Estado Reportes de Supervisión (RF-SUP-03) ---
  const [reportes, setReportes] = useState<ReporteSupervision[]>(INITIAL_REPORTES);
  const [ultimoAvanceOficial, setUltimoAvanceOficial] = useState(
    selectedObra.avanceFisico || 62
  );

  const [repFecha, setRepFecha] = useState('2024-10-15');
  const [repActividades, setRepActividades] = useState('');
  const [repClima, setRepClima] = useState<ClimaOption>('Soleado');
  const [repHorasLluvia, setRepHorasLluvia] = useState('0');
  const [repAvance, setRepAvance] = useState(String(selectedObra.avanceFisico || 62));

  // Incidencias
  const [huboIncidencia, setHuboIncidencia] = useState(false);
  const [incidenciaTipo, setIncidenciaTipo] = useState<
    'Anomalía técnica' | 'Accidente / Seguridad' | 'Atraso externo'
  >('Anomalía técnica');
  const [incidenciaDesc, setIncidenciaDesc] = useState('');
  const [incidenciaEstatus, setIncidenciaEstatus] =
    useState<IncidenciaEstatus>('RECIENTE');

  // Selectores de Maquinaria, Personal y Equipo (suman automáticamente los 3 totales)
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

  // Sincronizar contador de notas pendientes de firma por rol hacia AppLayout (notificaciones)
  useEffect(() => {
    const counts: Record<OperationalRole, number> = {
      RESIDENTE: 0,
      SUPERVISOR: 0,
      SUPERINTENDENTE: 0,
    };
    for (const nota of notas) {
      for (const role of OPERATIONAL_SIGNER_ROLES) {
        if (!nota.firmas.some((f) => f.rol === role)) {
          counts[role] += 1;
        }
      }
    }
    setPendingBitacoraByRole(counts);
  }, [notas, setPendingBitacoraByRole]);

  const allowedTypes = user ? NOTE_TYPES_BY_ROLE[user.rol] : [];
  const canCreateNote = allowedTypes.length > 0 && !bitacoraCerrada;
  const isSupervisor = user?.rol === 'SUPERVISOR';
  const isAvisoTerminacion = noteType === 'AVISO_TERMINACION';
  const isRainyWeather =
    repClima === 'Lluvioso' || repClima === 'Tormenta eléctrica';

  // Avance programado calculado dinámicamente a la fecha del reporte (base: fechas de conceptos)
  const avanceProgramadoFecha = useMemo(() => {
    const calculado = calcularAvanceProgramadoAFecha(selectedConceptos, repFecha);
    return calculado > 0 ? calculado : selectedObra.avanceProgramado;
  }, [selectedConceptos, repFecha, selectedObra.avanceProgramado]);

  const avanceFinancieroActual = selectedObra.avanceFinanciero;
  const totalesRecursosActual = useMemo(
    () => summarizeResourceTotals(selectedRecursos),
    [selectedRecursos]
  );

  // Autoguardado local del borrador de nota (RNF-USA-01)
  useEffect(() => {
    if (!showNoteModal || editingNoteNum !== null || (!asunto.trim() && !contenido.trim())) {
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ asunto, contenido }));
        setDraftSavedAt(new Date().toTimeString().slice(0, 8));
      } catch {
        // Ignorar
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [showNoteModal, editingNoteNum, asunto, contenido]);

  const handleOpenNewNote = () => {
    setNoteError(null);
    setNoteFeedback(null);
    setEditingNoteNum(null);
    setNoteType(allowedTypes[0] ?? '');
    setAsunto('');
    setContenido('');
    setNoteFiles([]);
    setExistingEvidencias([]);
    setShowNoteModal(true);
  };

  const handleOpenEditNote = (nota: BitacoraNota) => {
    setNoteError(null);
    setNoteFeedback(null);
    setEditingNoteNum(nota.numero);
    setNoteType(nota.tipo);
    setAsunto(nota.asunto);
    setContenido(nota.contenido);
    setExistingEvidencias(nota.evidencias);
    setNoteFiles([]);
    setShowNoteModal(true);
  };

  const validateNoteForm = (): boolean => {
    setNoteError(null);
    if (!noteType || !asunto.trim() || !contenido.trim()) {
      setNoteError(
        'Selecciona el tipo de nota y completa el asunto y descripción técnica.'
      );
      return false;
    }

    const totalFilesCount = existingEvidencias.length + noteFiles.length;
    if (
      isAvisoTerminacion &&
      totalFilesCount < BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION
    ) {
      setNoteError(
        `Aviso de Terminación bloqueado (RN-SUPT-05.2): debes adjuntar al menos ${BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION} fotografías válidas (JPG o PNG).`
      );
      return false;
    }
    return true;
  };

  const resetNoteModal = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setEditingNoteNum(null);
    setAsunto('');
    setContenido('');
    setNoteFiles([]);
    setExistingEvidencias([]);
    setDraftSavedAt(null);
    setShowNoteModal(false);
  };

  // Guardar nota con 0 firmas (permite al autor editar antes de que reciba la primera firma)
  const handleSaveUnsignedNote = () => {
    if (!user || !validateNoteForm()) return;
    const mergedEvidencias = [...existingEvidencias, ...noteFiles.map((f) => f.name)];

    if (editingNoteNum !== null) {
      setNotas((prev) =>
        prev.map((n) =>
          n.numero === editingNoteNum && n.firmas.length === 0
            ? {
                ...n,
                tipo: noteType,
                asunto: asunto.trim(),
                contenido: contenido.trim(),
                evidencias: mergedEvidencias,
              }
            : n
        )
      );
      setNoteFeedback(
        `Nota N.º ${editingNoteNum} actualizada (0/3 firmas). Seguirá siendo editable por el autor hasta recibir su primera firma.`
      );
    } else {
      const nextNum = Math.max(0, ...notas.map((n) => n.numero)) + 1;
      const nueva: BitacoraNota = {
        numero: nextNum,
        tipo: noteType,
        asunto: asunto.trim(),
        contenido: contenido.trim(),
        autor: user.nombre,
        autorCorreo: user.correo,
        rolAutor: user.rol,
        fecha: 'Hoy · ' + new Date().toTimeString().slice(0, 5) + ' h',
        evidencias: mergedEvidencias,
        firmas: [],
      };
      setNotas((prev) => [nueva, ...prev]);
      setNoteFeedback(
        `Nota N.º ${nextNum} guardada sin firmas (0/3). Puedes editarla o estampar la primera firma.`
      );
    }

    resetNoteModal();
  };

  const handleSubmitAndSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNoteForm()) return;
    setSignIntent({ mode: 'CREATE_AND_SIGN' });
  };

  const handleConfirmNoteSignature = ({
    selloSimulado,
  }: {
    correo?: string;
    password?: string;
    selloSimulado?: string;
  }) => {
    if (!user || !isOperationalSigner(user.rol) || !signIntent) return;

    const nowLabel = 'Hoy · ' + new Date().toTimeString().slice(0, 5) + ' h';
    const firmaNueva: NotaFirma = {
      rol: user.rol,
      nombre: user.nombre,
      correo: user.correo,
      rfc: user.rfc,
      fecha: nowLabel,
      selloDigital: selloSimulado ?? 'SAT-SHA256-FIRMADO',
    };

    if (signIntent.mode === 'CREATE_AND_SIGN') {
      const mergedEvidencias = [...existingEvidencias, ...noteFiles.map((f) => f.name)];

      if (editingNoteNum !== null) {
        setNotas((prev) =>
          prev.map((n) =>
            n.numero === editingNoteNum
              ? {
                  ...n,
                  tipo: noteType,
                  asunto: asunto.trim(),
                  contenido: contenido.trim(),
                  evidencias: mergedEvidencias,
                  firmas: [firmaNueva],
                }
              : n
          )
        );
        setNoteFeedback(
          `Nota N.º ${editingNoteNum} guardada y firmada (1/3) por ${user.nombre} (${user.rol}). La edición ha quedado bloqueada.`
        );
      } else {
        const nextNum = Math.max(0, ...notas.map((n) => n.numero)) + 1;
        const nueva: BitacoraNota = {
          numero: nextNum,
          tipo: noteType,
          asunto: asunto.trim(),
          contenido: contenido.trim(),
          autor: user.nombre,
          autorCorreo: user.correo,
          rolAutor: user.rol,
          fecha: nowLabel,
          evidencias: mergedEvidencias,
          firmas: [firmaNueva],
        };
        setNotas((prev) => [nueva, ...prev]);
        setNoteFeedback(
          `Nota N.º ${nextNum} creada y firmada (1/3) por ${user.nombre} (${user.rol}). Pendiente firma de los 2 perfiles restantes.`
        );
      }

      if (noteType === 'CIERRE') setBitacoraCerrada(true);
      resetNoteModal();
    } else if (signIntent.mode === 'SIGN_EXISTING') {
      const targetNum = signIntent.notaNumero;
      const existingNote = notas.find((n) => n.numero === targetNum);
      if (existingNote && !existingNote.firmas.some((f) => f.rol === user.rol)) {
        const totalDespues = existingNote.firmas.length + 1;
        const isCierreNote = existingNote.tipo === 'CIERRE';

        setNotas((prev) =>
          prev.map((n) => {
            if (n.numero !== targetNum) return n;
            if (n.firmas.some((f) => f.rol === user.rol)) return n;
            return { ...n, firmas: [...n.firmas, firmaNueva] };
          })
        );

        if (isCierreNote && totalDespues === 3) {
          setBitacoraCerrada(true);
        }

        setNoteFeedback(
          `Firma de ${user.rol} estampada en Nota N.º ${targetNum} (${totalDespues}/3 firmas completadas).`
        );
      }
    }

    setSignIntent(null);
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
      setRepError(
        'El porcentaje de avance físico real debe estar entre 0% y 100% (no negativos).'
      );
      return;
    }

    if (pct < ultimoAvanceOficial) {
      setRepError(
        `Inconsistencia de avance físico (RN-SUP-03.6): el avance capturado (${pct}%) no puede ser menor al último avance registrado (${ultimoAvanceOficial}%).`
      );
      return;
    }

    if (Number.isNaN(lluvia) || lluvia < 0 || lluvia > 24) {
      setRepError(
        'Las horas de lluvia deben estar entre 0 y 24 horas (sin números negativos).'
      );
      return;
    }

    if (isRainyWeather && lluvia <= 0) {
      setRepError(
        'Si seleccionaste clima lluvioso, indica las horas de lluvia (> 0).'
      );
      return;
    }

    if (targetStatus === 'ENVIADO' && !repActividades.trim()) {
      setRepError(
        'Describe las actividades realizadas en la jornada antes de enviar el reporte.'
      );
      return;
    }

    if (huboIncidencia && !incidenciaDesc.trim()) {
      setRepError(
        'Capturaste que hubo una incidencia: describe el hecho ocurrido.'
      );
      return;
    }

    if (selectedRecursos.length > 0) {
      setObraAllocations(selectedObra.id, selectedRecursos);
    }

    const totales = summarizeResourceTotals(selectedRecursos);
    const nuevoReporte: ReporteSupervision = {
      id: `rep-${Date.now()}`,
      obraId: selectedObra.id,
      fecha: repFecha,
      actividadesRealizadas:
        repActividades.trim() || 'Actividades pendientes de captura (borrador)',
      clima: repClima,
      horasLluvia: lluvia,
      avanceProgramado: avanceProgramadoFecha,
      avanceReportado: pct,
      avanceFinanciero: avanceFinancieroActual,
      huboIncidencia,
      incidenciaTipo: huboIncidencia ? incidenciaTipo : undefined,
      incidenciaDescripcion: huboIncidencia ? incidenciaDesc.trim() : undefined,
      incidenciaEstatus: huboIncidencia ? incidenciaEstatus : undefined,
      recursos: selectedRecursos,
      totalesRecursos: totales,
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
          ? {
              ...r,
              estatus: 'FIRMADO',
              selloDigital: selloSimulado ?? 'SAT-SHA256-REP',
            }
          : r
      )
    );
    if (reportToSign.avanceReportado >= ultimoAvanceOficial) {
      setUltimoAvanceOficial(reportToSign.avanceReportado);
      updateObraAvance(selectedObra.id, {
        avanceFisico: reportToSign.avanceReportado,
        avanceProgramado: reportToSign.avanceProgramado,
      });
    }
    setReportToSign(null);
  };

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

  const currentSignerRole: OperationalRole | null =
    user && isOperationalSigner(user.rol) ? user.rol : null;

  const pendingForCurrentUser = currentSignerRole
    ? notas.filter((n) => !n.firmas.some((f) => f.rol === currentSignerRole)).length
    : 0;

  const targetSignNote =
    signIntent?.mode === 'SIGN_EXISTING'
      ? notas.find((n) => n.numero === signIntent.notaNumero) ?? null
      : null;

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
            {selectedObra.id} · Multifirma electrónica tipo SAT (Residente · Supervisor · Superintendente)
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
      <div className="border-b border-line flex flex-wrap items-center gap-6 text-xs">
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
          {pendingForCurrentUser > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-warn-bg text-warn-fg text-[10px] font-bold">
              {pendingForCurrentUser} por firmar
            </span>
          )}
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
          <span>
            Reportes Diarios · Prog: {avanceProgramadoFecha}% · Real: {ultimoAvanceOficial}% · Fin:{' '}
            {avanceFinancieroActual}%
          </span>
        </button>
      </div>

      {/* TAB 1: BITÁCORA DE NOTAS */}
      {subTab === 'notas' && (
        <div className="space-y-4">
          {bitacoraCerrada && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-info-bg border border-info-line text-info-fg text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                <strong>Bitácora cerrada y congelada (RN-RES-01.2):</strong> se firmó la nota de
                CIERRE. No se permiten nuevas notas ni modificaciones.
              </span>
            </div>
          )}

          {noteFeedback && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-ok-bg border border-ok-line text-ok-fg text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{noteFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setNoteFeedback(null)}
                className="underline cursor-pointer shrink-0"
              >
                Cerrar
              </button>
            </div>
          )}

          <div className="space-y-3">
            {paginatedNotes.map((nota) => {
              const firmasCount = nota.firmas.length;
              const isAuthor =
                user !== null &&
                (nota.autorCorreo.toLowerCase() === user.correo.toLowerCase() ||
                  (nota.autor === user.nombre && nota.rolAutor === user.rol));
              const canEdit = isAuthor && firmasCount === 0 && !bitacoraCerrada;
              const userAlreadySigned =
                currentSignerRole !== null &&
                nota.firmas.some((f) => f.rol === currentSignerRole);
              const canSign =
                currentSignerRole !== null &&
                !userAlreadySigned &&
                !bitacoraCerrada;

              const progressBadgeClass =
                firmasCount === 3
                  ? 'bg-ok-bg text-ok-fg border-ok-line'
                  : firmasCount > 0
                  ? 'bg-info-bg text-info-fg border-info-line'
                  : 'bg-warn-bg text-warn-fg border-warn-line';

              return (
                <article
                  key={nota.numero}
                  className="bg-surface border border-line rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-accent">Nota N.º {nota.numero}</span>
                      <span className="px-2 py-0.5 rounded bg-subtle text-[10px] font-semibold text-fg-soft">
                        {nota.tipo}
                      </span>
                      <span className="text-[11px] text-fg-muted">· {nota.fecha}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${progressBadgeClass}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {firmasCount}/3 firmas
                          {firmasCount === 3
                            ? ' · Completa'
                            : firmasCount === 0
                            ? ' · Sin firmas'
                            : ' · En curso'}
                        </span>
                      </span>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditNote(nota)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line-strong hover:border-brand text-[11px] font-semibold text-fg-soft cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar nota</span>
                        </button>
                      )}

                      {canSign && currentSignerRole && (
                        <button
                          type="button"
                          onClick={() =>
                            setSignIntent({ mode: 'SIGN_EXISTING', notaNumero: nota.numero })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand hover:bg-brand-hover text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Firmar nota ({ROLE_LABELS[currentSignerRole]})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-fg">{nota.asunto}</h3>
                  <p className="text-xs text-fg-soft leading-relaxed">{nota.contenido}</p>

                  {/* Panel de Multifirma (3 perfiles operativos: 1/3, 2/3, 3/3) */}
                  <div className="p-3 rounded-lg bg-canvas border border-line space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-fg">
                        Avance de multifirma electrónica ({firmasCount}/3 perfiles operativos)
                      </span>
                      <span className="text-fg-muted">
                        {Math.round((firmasCount / 3) * 100)}%
                      </span>
                    </div>

                    <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          firmasCount === 3 ? 'bg-ok-solid' : 'bg-brand'
                        }`}
                        style={{ width: `${(firmasCount / 3) * 100}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                      {OPERATIONAL_SIGNER_ROLES.map((rolPerfil) => {
                        const firma = nota.firmas.find((f) => f.rol === rolPerfil);
                        return (
                          <div
                            key={`${nota.numero}-${rolPerfil}`}
                            className={`p-2.5 rounded-lg border ${
                              firma
                                ? 'bg-ok-bg/50 border-ok-line'
                                : 'bg-surface border-line border-dashed'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-fg text-[10px] uppercase tracking-wide">
                                {ROLE_LABELS[rolPerfil]}
                              </span>
                              {firma ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-ok-fg shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                              )}
                            </div>

                            {firma ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="font-medium text-fg truncate">{firma.nombre}</p>
                                <p className="text-[10px] text-fg-muted">{firma.fecha}</p>
                                <p
                                  className="text-[9px] font-mono text-ok-fg truncate"
                                  title={firma.selloDigital}
                                >
                                  {firma.selloDigital}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-1 text-[10px] text-fg-muted">
                                Pendiente de firma
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-[11px] text-fg-muted">
                    <span>
                      Autor: <strong className="text-fg-soft">{nota.autor}</strong> (
                      {nota.rolAutor})
                      {firmasCount === 0 && isAuthor && (
                        <span className="ml-2 text-accent font-medium">
                          · Editable mientras tenga 0 firmas
                        </span>
                      )}
                      {firmasCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-fg-muted">
                          <Lock className="w-3 h-3" /> Inmutable tras primera firma
                        </span>
                      )}
                    </span>
                    {nota.evidencias.length > 0 && (
                      <span className="text-accent font-medium">
                        {nota.evidencias.length} evidencia(s) adjunta(s)
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
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
          {/* Resumen comparativo de los 3 avances a la fecha de corte */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-surface border border-line rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-fg-muted">
                <span>Avance Programado (al {repFecha})</span>
                <CalendarClock className="w-4 h-4 text-fg-muted" />
              </div>
              <p className="text-2xl font-semibold text-fg">{avanceProgramadoFecha}%</p>
              <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-fg-muted rounded-full"
                  style={{ width: `${Math.min(100, avanceProgramadoFecha)}%` }}
                />
              </div>
              <p className="text-[10px] text-fg-muted">
                Calculado desde las fechas programadas del catálogo
              </p>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-fg-muted">
                <span>Avance Físico Real</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <p className="text-2xl font-semibold text-accent">{ultimoAvanceOficial}%</p>
              <div className="h-1.5 bg-info-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${Math.min(100, ultimoAvanceOficial)}%` }}
                />
              </div>
              <p className="text-[10px] text-fg-muted">
                Desviación vs. programado:{' '}
                <strong
                  className={
                    ultimoAvanceOficial - avanceProgramadoFecha < 0
                      ? 'text-warn-fg'
                      : 'text-ok-fg'
                  }
                >
                  {ultimoAvanceOficial - avanceProgramadoFecha >= 0 ? '+' : ''}
                  {(ultimoAvanceOficial - avanceProgramadoFecha).toFixed(1)} pp
                </strong>
              </p>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-fg-muted">
                <span>Avance Financiero Real</span>
                <Wallet className="w-4 h-4 text-ok-fg" />
              </div>
              <p
                className={`text-2xl font-semibold ${
                  validarControlPresupuestal(avanceFinancieroActual, ultimoAvanceOficial)
                    ? 'text-ok-fg'
                    : 'text-danger-fg'
                }`}
              >
                {avanceFinancieroActual}%
              </p>
              <div className="h-1.5 bg-ok-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-ok-solid rounded-full"
                  style={{ width: `${Math.min(100, avanceFinancieroActual)}%` }}
                />
              </div>
              <p className="text-[10px] text-fg-muted">
                {validarControlPresupuestal(avanceFinancieroActual, ultimoAvanceOficial)
                  ? 'En regla (Financiero ≤ Físico Real)'
                  : 'Alerta: Financiero rebasa Físico Real'}
              </p>
            </div>
          </div>

          {isSupervisor && (
            <div className="bg-surface border border-line rounded-xl p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-fg">
                  Registrar Reporte Diario de Supervisión (RF-SUP-03)
                </h2>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Captura manual del avance físico real (mínimo vigente: {ultimoAvanceOficial}%),
                  recursos en sitio con totales automáticos e incidencias de obra.
                </p>
              </div>

              {/* Fila 1: Fecha, Clima, Horas de lluvia, Avance Físico Real */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
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
                    Avance Programado (auto)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${avanceProgramadoFecha}%`}
                    className="w-full px-3 py-2 rounded-lg border border-line bg-subtle font-semibold text-fg-soft"
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

              {/* Fila 3: Selectores de Maquinaria, Personal y Equipo + totales numéricos automáticos */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-fg">
                    Recursos en sitio (totales calculados automáticamente)
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2.5 py-1 rounded-md bg-subtle text-fg-soft">
                      Total Maquinaria:{' '}
                      <strong className="text-fg">{totalesRecursosActual.maquinaria}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-subtle text-fg-soft">
                      Total Personal:{' '}
                      <strong className="text-fg">{totalesRecursosActual.personal}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-subtle text-fg-soft">
                      Total Equipo:{' '}
                      <strong className="text-fg">{totalesRecursosActual.equipo}</strong>
                    </span>
                  </div>
                </div>

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

              {/* Fila 4: Incidencias */}
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

              {/* Fila 5: Evidencia fotográfica */}
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

          {/* Historial de reportes con los 3 porcentajes y totales de recursos */}
          <div className="space-y-3">
            {reportes.map((rep) => {
              const desviacion = Number((rep.avanceReportado - rep.avanceProgramado).toFixed(1));
              return (
                <div
                  key={rep.id}
                  className="bg-surface border border-line rounded-xl p-5 space-y-3 text-xs"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-fg">Reporte del {rep.fecha}</span>
                      <StatusBadge status={rep.estatus} />
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

                  {/* Barra comparativa de los 3 avances del reporte */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-canvas border border-line text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">Avance Programado:</span>
                      <strong className="text-fg">{rep.avanceProgramado}%</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">Avance Físico Real:</span>
                      <span className="inline-flex items-center gap-1.5">
                        <strong className="text-accent">{rep.avanceReportado}%</strong>
                        <span
                          className={`text-[10px] font-semibold ${
                            desviacion < 0 ? 'text-warn-fg' : 'text-ok-fg'
                          }`}
                        >
                          ({desviacion >= 0 ? '+' : ''}
                          {desviacion} pp)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">Avance Financiero Real:</span>
                      <strong className="text-ok-fg">{rep.avanceFinanciero}%</strong>
                    </div>
                  </div>

                  <p className="text-fg-soft leading-relaxed">
                    <strong>Actividades realizadas:</strong> {rep.actividadesRealizadas}
                  </p>

                  {/* Totales numéricos + desglose de recursos */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-info-bg text-accent font-semibold">
                        Maquinaria: {rep.totalesRecursos.maquinaria}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-info-bg text-accent font-semibold">
                        Personal: {rep.totalesRecursos.personal}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-info-bg text-accent font-semibold">
                        Equipo: {rep.totalesRecursos.equipo}
                      </span>
                    </div>

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
                  </div>

                  {/* Incidencia */}
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
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nueva / editar nota de bitácora */}
      {showNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNoteModal(false)}
        >
          <form
            onSubmit={handleSubmitAndSign}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-lg w-full p-5 space-y-3.5 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">
                {editingNoteNum !== null
                  ? `Editar nota N.º ${editingNoteNum} (0/3 firmas)`
                  : `Nueva nota de bitácora (${user?.rol})`}
              </h3>
              {draftSavedAt && editingNoteNum === null && (
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

            {existingEvidencias.length > 0 && (
              <div className="space-y-1 text-[11px]">
                <p className="text-fg-muted font-medium">Evidencias actuales:</p>
                <div className="flex flex-wrap gap-1.5">
                  {existingEvidencias.map((ev) => (
                    <span
                      key={ev}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-subtle text-fg-soft"
                    >
                      <span>{ev}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExistingEvidencias((prev) => prev.filter((item) => item !== ev))
                        }
                        className="hover:text-danger-fg cursor-pointer"
                        aria-label={`Quitar ${ev}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

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

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUnsignedNote}
                className="px-3 py-1.5 text-xs rounded-lg border border-brand text-accent font-semibold hover:bg-info-bg cursor-pointer"
              >
                {editingNoteNum !== null ? 'Guardar cambios (0/3)' : 'Guardar sin firmar (0/3)'}
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
              >
                Firmar y guardar (1/3)
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        open={signIntent !== null}
        title={
          signIntent?.mode === 'SIGN_EXISTING'
            ? `Firmar Nota N.º ${signIntent.notaNumero} (${user?.rol ?? ''})`
            : noteType === 'CIERRE'
            ? 'Confirmar cierre definitivo de bitácora'
            : 'Firmar nota de bitácora electrónica'
        }
        description={
          signIntent?.mode === 'SIGN_EXISTING'
            ? `Autoriza con tu correo y contraseña la petición al servicio externo de firma SAT para estampar tu sello en la Nota N.º ${signIntent.notaNumero} (avance actual: ${targetSignNote?.firmas.length ?? 0}/3 firmas).`
            : noteType === 'CIERRE'
            ? 'Al firmar la nota de CIERRE, la bitácora quedará congelada de forma irreversible (RN-RES-01.2).'
            : 'Autoriza con tu correo y contraseña la petición al servicio externo de firma SAT. Una vez estampada la primera firma, la nota no podrá editarse.'
        }
        confirmLabel="Autorizar y estampar firma"
        tone={noteType === 'CIERRE' && signIntent?.mode === 'CREATE_AND_SIGN' ? 'danger' : 'brand'}
        requireSignature
        onCancel={() => setSignIntent(null)}
        onConfirm={handleConfirmNoteSignature}
      />

      <ConfirmActionModal
        open={reportToSign !== null}
        title="Firmar Reporte Diario de Supervisión"
        description={`Autoriza con tu correo y contraseña la firma del reporte del ${reportToSign?.fecha}. El Avance Físico Real oficial se actualizará a ${reportToSign?.avanceReportado}% (RN-SUP-03.5).`}
        confirmLabel="Autorizar y firmar reporte"
        requireSignature
        onCancel={() => setReportToSign(null)}
        onConfirm={handleConfirmReporteSign}
      />
    </div>
  );
};
