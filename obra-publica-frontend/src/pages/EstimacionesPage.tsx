import React, { useMemo, useState } from 'react';
import {
  Plus,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileUp,
  RotateCcw,
  ShieldCheck,
  XCircle,
  Eye,
  Calculator,
  X,
  Search,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import {
  BUSINESS_CONSTANTS,
  validarControlPresupuestal,
} from '../utils/businessRules';
import { exportarEstimacionExcel } from '../utils/excelExport';
import { StatusBadge, type BadgeVariant } from '../components/common/StatusBadge';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

type EstimacionTipo = 'ORDINARIO' | 'CANTIDADES_ADICIONALES' | 'EXTRAORDINARIO';
type EstimacionEstado =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'RECHAZADA'
  | 'APROBADA'
  | 'AUTORIZADA_PAGO'
  | 'LIQUIDADA';

interface HistorialRevision {
  version: number;
  fecha: string;
  actor: string;
  dictamen: 'APROBADA' | 'RECHAZADA';
  observaciones: string;
}

interface ConceptoEstimacionDetalle {
  clave: string;
  nombre: string;
  unidad: string;
  cantidadContratada: number;
  acumuladoAnterior: number;
  estimado: number; // Captura "De esta estimación"
  acumuladoActual: number;
  saldo: number;
  precioUnitario: number;
  importe: number;
}

interface DatosContratoConsulta {
  noContrato: string;
  razonSocial: string;
  rfc: string;
  noFianzaAnticipo: string;
  montoContrato: number;
  montoAnticipo: number;
  porcentajeAmortizacionDefault: number; // 10% por defecto
}

interface EstimacionItem {
  id: string;
  numero: number; // Numeración independiente por tipo (Ordinaria #1, Extraordinaria #1, etc.)
  tipo: EstimacionTipo;
  fechaEstimacion: string;
  periodoInicio: string;
  periodoFin: string;

  // Datos de consulta del contrato
  noContrato: string;
  razonSocial: string;
  rfc: string;
  noFianzaAnticipo: string;
  montoContrato: number;
  montoAnticipo: number;

  // Resumen financiero y amortización
  importeEstimado: number;
  acumuladoAnterior: number;
  acumuladoActual: number;
  saldoPorEstimar: number;

  amortizacionEstimacion: number;
  amortizacionAcumuladaAnterior: number;
  amortizacionAcumuladaActual: number;
  saldoPorAmortizar: number;

  // Impuestos, retenciones y total
  iva: number;
  retencionAtraso: number;
  retencionSfp: number;
  montoNeto: number;

  conceptos: ConceptoEstimacionDetalle[];
  estado: EstimacionEstado;
  diasEnRevision: number;
  versionSubsanacion: number;
  uuidFiscal?: string;
  archivosFiscales?: string[];
  historial: HistorialRevision[];
}

const TASA_IVA = 0.16;
const TASA_RETENCION_SFP = 0.0005;
const DEFAULT_AMORTIZACION_PCT = 10;

const TIPO_LABEL: Record<EstimacionTipo, string> = {
  ORDINARIO: 'Ordinaria',
  CANTIDADES_ADICIONALES: 'Cantidades Adicionales',
  EXTRAORDINARIO: 'Extraordinaria',
};

function formatEstimacionNombre(tipo: EstimacionTipo, numero: number): string {
  return `${TIPO_LABEL[tipo]} #${numero}`;
}

const CONTRATO_EXTRA_BY_OBRA: Record<
  string,
  { rfc: string; noFianzaAnticipo: string; montoContrato: number; montoAnticipo: number }
> = {
  'OP-2024-001': {
    rfc: 'CNO9804128A3',
    noFianzaAnticipo: 'FNZ-ANT-2024-08914',
    montoContrato: 25000000,
    montoAnticipo: 7500000,
  },
  'OP-2024-002': {
    rfc: 'IHM0511209K1',
    noFianzaAnticipo: 'FNZ-ANT-2024-09102',
    montoContrato: 18400000,
    montoAnticipo: 5520000,
  },
  'OP-2024-003': {
    rfc: 'PEV0108154R7',
    noFianzaAnticipo: 'FNZ-ANT-2024-09450',
    montoContrato: 32000000,
    montoAnticipo: 9600000,
  },
  'OP-2024-004': {
    rfc: 'ECC1203087M2',
    noFianzaAnticipo: 'FNZ-ANT-2024-09881',
    montoContrato: 14200000,
    montoAnticipo: 4260000,
  },
  'OP-2024-005': {
    rfc: 'IEU0907223B5',
    noFianzaAnticipo: 'FNZ-ANT-2024-07740',
    montoContrato: 9800000,
    montoAnticipo: 2940000,
  },
};

function blockNegativeKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
}

function calcularCaratula(params: {
  importeEstimado: number;
  montoContrato: number;
  montoAnticipo: number;
  acumuladoAnterior: number;
  amortizacionAcumuladaAnterior: number;
  amortizacionEstimacion: number;
  retencionAtraso: number;
}) {
  const {
    importeEstimado,
    montoContrato,
    montoAnticipo,
    acumuladoAnterior,
    amortizacionAcumuladaAnterior,
    amortizacionEstimacion,
    retencionAtraso,
  } = params;

  const acumuladoActual = acumuladoAnterior + importeEstimado;
  const saldoPorEstimar = Math.max(0, montoContrato - acumuladoActual);

  const amortClamped = Math.max(0, amortizacionEstimacion);
  const amortizacionAcumuladaActual = amortizacionAcumuladaAnterior + amortClamped;
  const saldoPorAmortizar = Math.max(0, montoAnticipo - amortizacionAcumuladaActual);

  const subtotalTrasAmortizacion = Math.max(0, importeEstimado - amortClamped);
  const iva = subtotalTrasAmortizacion * TASA_IVA;
  const retencionSfp = importeEstimado * TASA_RETENCION_SFP;
  const montoNeto = Math.max(
    0,
    subtotalTrasAmortizacion + iva - retencionAtraso - retencionSfp
  );

  return {
    importeEstimado,
    acumuladoAnterior,
    acumuladoActual,
    saldoPorEstimar,
    amortizacionEstimacion: amortClamped,
    amortizacionAcumuladaAnterior,
    amortizacionAcumuladaActual,
    saldoPorAmortizar,
    iva,
    retencionAtraso,
    retencionSfp,
    montoNeto,
  };
}

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(n);

function buildInitialEstimaciones(): EstimacionItem[] {
  const montoContrato = 25000000;
  const montoAnticipo = 7500000;

  // Ordinaria #1 (Liquidada)
  const calcOrd1 = calcularCaratula({
    importeEstimado: 13500000,
    montoContrato,
    montoAnticipo,
    acumuladoAnterior: 0,
    amortizacionAcumuladaAnterior: 0,
    amortizacionEstimacion: 1350000, // 10%
    retencionAtraso: 0,
  });

  // Cantidades Adicionales #1 (Aprobada por Supervisión)
  const calcAdic1 = calcularCaratula({
    importeEstimado: 900000,
    montoContrato,
    montoAnticipo,
    acumuladoAnterior: 13500000,
    amortizacionAcumuladaAnterior: calcOrd1.amortizacionAcumuladaActual,
    amortizacionEstimacion: 90000, // 10%
    retencionAtraso: 0,
  });

  // Extraordinaria #1 (Liquidada)
  const calcExt1 = calcularCaratula({
    importeEstimado: 320000,
    montoContrato,
    montoAnticipo,
    acumuladoAnterior: 14400000,
    amortizacionAcumuladaAnterior: calcAdic1.amortizacionAcumuladaActual,
    amortizacionEstimacion: 32000, // 10%
    retencionAtraso: 0,
  });

  // Ordinaria #2 (En revisión)
  const calcOrd2 = calcularCaratula({
    importeEstimado: 450000,
    montoContrato,
    montoAnticipo,
    acumuladoAnterior: 14720000,
    amortizacionAcumuladaAnterior: calcExt1.amortizacionAcumuladaActual,
    amortizacionEstimacion: 45000, // 10%
    retencionAtraso: 15000,
  });

  const baseContrato = {
    noContrato: 'SOP-LP-024/2024',
    razonSocial: 'Constructora del Norte, S.A. de C.V.',
    rfc: 'CNO9804128A3',
    noFianzaAnticipo: 'FNZ-ANT-2024-08914',
    montoContrato,
    montoAnticipo,
  };

  return [
    {
      id: 'est-ord-2',
      numero: 2,
      tipo: 'ORDINARIO',
      fechaEstimacion: '2024-10-12',
      periodoInicio: '2024-10-01',
      periodoFin: '2024-10-12',
      ...baseContrato,
      ...calcOrd2,
      conceptos: [
        {
          clave: 'EST-001',
          nombre: "Concreto hidráulico f'c=350 kg/cm² en losa de rodamiento",
          unidad: 'm³',
          cantidadContratada: 420,
          acumuladoAnterior: 215,
          estimado: 100,
          acumuladoActual: 315,
          saldo: 105,
          precioUnitario: 4500,
          importe: 450000,
        },
      ],
      estado: 'EN_REVISION',
      diasEnRevision: 12,
      versionSubsanacion: 1,
      historial: [],
    },
    {
      id: 'est-ext-1',
      numero: 1,
      tipo: 'EXTRAORDINARIO',
      fechaEstimacion: '2024-10-05',
      periodoInicio: '2024-09-25',
      periodoFin: '2024-10-05',
      ...baseContrato,
      ...calcExt1,
      conceptos: [
        {
          clave: 'EXT-014',
          nombre: 'Refuerzo de cimentación en apoyo 03 por presencia de manto freático (APU)',
          unidad: 'm³',
          cantidadContratada: 64,
          acumuladoAnterior: 0,
          estimado: 64,
          acumuladoActual: 64,
          saldo: 0,
          precioUnitario: 5000,
          importe: 320000,
        },
      ],
      estado: 'AUTORIZADA_PAGO',
      diasEnRevision: 3,
      versionSubsanacion: 1,
      historial: [
        {
          version: 1,
          fecha: '07 oct 2024',
          actor: 'Ing. Lucía Ramírez (Supervisor)',
          dictamen: 'APROBADA',
          observaciones: 'APU validado y obra extraordinaria verificada en sitio.',
        },
      ],
    },
    {
      id: 'est-adic-1',
      numero: 1,
      tipo: 'CANTIDADES_ADICIONALES',
      fechaEstimacion: '2024-09-30',
      periodoInicio: '2024-09-16',
      periodoFin: '2024-09-30',
      ...baseContrato,
      ...calcAdic1,
      conceptos: [
        {
          clave: 'F01-410',
          nombre: 'Base de 10 cm y sub-base de 10 cm en accesos y rampas',
          unidad: 'm²',
          cantidadContratada: 4750,
          acumuladoAnterior: 2700,
          estimado: 200,
          acumuladoActual: 2900,
          saldo: 1850,
          precioUnitario: 500,
          importe: 100000,
        },
        {
          clave: 'SUP-012',
          nombre: 'Suministro y montaje de trabe AASHTO tipo IV prefabricada',
          unidad: 'pza',
          cantidadContratada: 16,
          acumuladoAnterior: 14,
          estimado: 2,
          acumuladoActual: 16,
          saldo: 0,
          precioUnitario: 400000,
          importe: 800000,
        },
      ],
      estado: 'APROBADA',
      diasEnRevision: 4,
      versionSubsanacion: 2,
      historial: [
        {
          version: 1,
          fecha: '02 oct 2024',
          actor: 'Ing. Lucía Ramírez (Supervisor)',
          dictamen: 'RECHAZADA',
          observaciones:
            'Ajustar volumen en concepto F01-410 conforme a levantamiento topográfico.',
        },
        {
          version: 2,
          fecha: '05 oct 2024',
          actor: 'Ing. Lucía Ramírez (Supervisor)',
          dictamen: 'APROBADA',
          observaciones:
            'Volumen subsanado y concordante con reporte de supervisión.',
        },
      ],
    },
    {
      id: 'est-ord-1',
      numero: 1,
      tipo: 'ORDINARIO',
      fechaEstimacion: '2024-09-15',
      periodoInicio: '2024-09-01',
      periodoFin: '2024-09-15',
      ...baseContrato,
      ...calcOrd1,
      conceptos: [
        {
          clave: 'E01-041',
          nombre: 'Cimentación profunda y zapatas en apoyos de puente vehicular',
          unidad: 'm²',
          cantidadContratada: 1200,
          acumuladoAnterior: 0,
          estimado: 980,
          acumuladoActual: 980,
          saldo: 220,
          precioUnitario: 6107.14,
          importe: 5985000,
        },
        {
          clave: 'SUP-012',
          nombre: 'Suministro y montaje de trabe AASHTO tipo IV prefabricada',
          unidad: 'pza',
          cantidadContratada: 16,
          acumuladoAnterior: 0,
          estimado: 14,
          acumuladoActual: 14,
          saldo: 2,
          precioUnitario: 400000,
          importe: 5600000,
        },
        {
          clave: 'EST-001',
          nombre: "Concreto hidráulico f'c=350 kg/cm² en losa de rodamiento",
          unidad: 'm³',
          cantidadContratada: 420,
          acumuladoAnterior: 0,
          estimado: 215,
          acumuladoActual: 215,
          saldo: 205,
          precioUnitario: 4500,
          importe: 967500,
        },
      ],
      estado: 'LIQUIDADA',
      diasEnRevision: 0,
      versionSubsanacion: 1,
      uuidFiscal: '550E8400-E29B-41D4-A716-446655440004',
      archivosFiscales: ['CFDI_EST01.pdf', 'CFDI_EST01.xml'],
      historial: [
        {
          version: 1,
          fecha: '19 sep 2024',
          actor: 'Ing. Lucía Ramírez (Supervisor)',
          dictamen: 'APROBADA',
          observaciones: 'Validación técnica sin observaciones.',
        },
      ],
    },
  ];
}

export const EstimacionesPage: React.FC = () => {
  const { user } = useAuth();
  const {
    selectedObra,
    selectedConceptos,
    selectedContrato,
    selectedPolizas,
    contratistas,
  } = useObra();

  const [estimaciones, setEstimaciones] = useState<EstimacionItem[]>(() =>
    buildInitialEstimaciones()
  );
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | EstimacionTipo>('TODOS');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de detalle de carátula + exportación Excel (.xlsx)
  const [detailTarget, setDetailTarget] = useState<EstimacionItem | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Modal crear nueva estimación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForm, setNewForm] = useState({
    tipo: 'ORDINARIO' as EstimacionTipo,
    fechaEstimacion: '2024-10-25',
    periodoInicio: '2024-10-13',
    periodoFin: '2024-10-25',
    retencionAtraso: '0',
  });

  // Buscador de conceptos para agregar únicamente los seleccionados a la tabla
  const [conceptSearch, setConceptSearch] = useState('');
  const [conceptoElegidoClave, setConceptoElegidoClave] = useState('');
  const [selectedConceptoClaves, setSelectedConceptoClaves] = useState<string[]>([]);
  const [capturaPorClave, setCapturaPorClave] = useState<Record<string, string>>({});

  // Campo editable de amortización del anticipo (precargado al 10% topado al saldo del año)
  const [amortizacionManual, setAmortizacionManual] = useState<string | null>(null);

  // Modal confirmación / firma (Supervisor o Residente)
  const [signAction, setSignAction] = useState<{
    item: EstimacionItem;
    type: 'APROBAR_SUP' | 'RECHAZAR_SUP' | 'AUTORIZAR_RES';
  } | null>(null);

  // Modal facturación PDF + XML (Superintendente - RF-SUPT-06)
  const [cfdiTarget, setCfdiTarget] = useState<EstimacionItem | null>(null);
  const [cfdiUuid, setCfdiUuid] = useState('');
  const [cfdiMonto, setCfdiMonto] = useState('');
  const [cfdiFiles, setCfdiFiles] = useState<File[]>([]);

  const isSuperintendente = user?.rol === 'SUPERINTENDENTE';
  const isSupervisor = user?.rol === 'SUPERVISOR';
  const isResidente = user?.rol === 'RESIDENTE';

  // Datos de consulta del contrato sincronizados con ObraContext
  const contratoConsulta: DatosContratoConsulta = useMemo(() => {
    const fallback =
      CONTRATO_EXTRA_BY_OBRA[selectedObra.id] ?? CONTRATO_EXTRA_BY_OBRA['OP-2024-001'];
    const ctr = contratistas.find((c) => c.id === selectedContrato?.id_contratista);
    const fianzaAnt = selectedPolizas.find((p) => p.tipo === 'ANTICIPO');
    return {
      noContrato: selectedContrato?.numero_contrato ?? selectedObra.contrato,
      razonSocial: ctr?.razon_social ?? selectedObra.contratista,
      rfc: ctr?.rfc ?? fallback.rfc,
      noFianzaAnticipo: fianzaAnt?.numero_poliza ?? fallback.noFianzaAnticipo,
      montoContrato: selectedContrato?.monto_contrato ?? fallback.montoContrato,
      montoAnticipo: selectedContrato?.monto_anticipo ?? fallback.montoAnticipo,
      porcentajeAmortizacionDefault:
        selectedContrato?.anticipos_por_ejercicio?.[0]?.porcentaje_amortizacion ??
        DEFAULT_AMORTIZACION_PCT,
    };
  }, [selectedObra, selectedContrato, selectedPolizas, contratistas]);

  const avanceFisicoVigente = selectedObra.avanceFisico;

  const acumuladoEjercidoBruto = useMemo(
    () =>
      estimaciones
        .filter((e) => e.estado === 'LIQUIDADA' || e.estado === 'AUTORIZADA_PAGO')
        .reduce((acc, e) => acc + e.importeEstimado, 0),
    [estimaciones]
  );

  const acumuladoAnteriorConsulta = useMemo(
    () =>
      estimaciones
        .filter((e) => e.estado !== 'RECHAZADA' && e.estado !== 'BORRADOR')
        .reduce((acc, e) => acc + e.importeEstimado, 0),
    [estimaciones]
  );

  const amortizacionAcumuladaAnteriorConsulta = useMemo(
    () =>
      estimaciones
        .filter((e) => e.estado !== 'RECHAZADA' && e.estado !== 'BORRADOR')
        .reduce((acc, e) => acc + e.amortizacionEstimacion, 0),
    [estimaciones]
  );

  // Numeración independiente por tipo de estimación
  const siguienteNumeroPorTipo = useMemo(() => {
    const ofType = estimaciones.filter((e) => e.tipo === newForm.tipo);
    return ofType.reduce((max, item) => Math.max(max, item.numero), 0) + 1;
  }, [estimaciones, newForm.tipo]);

  const estimacionesFiltradas = useMemo(() => {
    if (tipoFilter === 'TODOS') return estimaciones;
    return estimaciones.filter((e) => e.tipo === tipoFilter);
  }, [estimaciones, tipoFilter]);

  const conteosPorTipo = useMemo(
    () => ({
      TODOS: estimaciones.length,
      ORDINARIO: estimaciones.filter((e) => e.tipo === 'ORDINARIO').length,
      CANTIDADES_ADICIONALES: estimaciones.filter((e) => e.tipo === 'CANTIDADES_ADICIONALES')
        .length,
      EXTRAORDINARIO: estimaciones.filter((e) => e.tipo === 'EXTRAORDINARIO').length,
    }),
    [estimaciones]
  );

  const avanceFinancieroActual = Number(
    ((acumuladoEjercidoBruto / contratoConsulta.montoContrato) * 100).toFixed(2)
  );

  // Conceptos disponibles para agregar (excluye los ya agregados a esta estimación)
  const conceptosDisponiblesParaAgregar = useMemo(() => {
    const q = conceptSearch.trim().toLowerCase();
    return selectedConceptos.filter((c) => {
      if (selectedConceptoClaves.includes(c.clave)) return false;
      if (!q) return true;
      return (
        c.clave.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q) ||
        c.unidad.toLowerCase().includes(q)
      );
    });
  }, [selectedConceptos, selectedConceptoClaves, conceptSearch]);

  // Conceptos seleccionados en la tabla de esta estimación
  const conceptosCalculados = useMemo<ConceptoEstimacionDetalle[]>(() => {
    return selectedConceptoClaves
      .map((clave) => selectedConceptos.find((c) => c.clave === clave))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .map((c) => {
        const raw = Number(capturaPorClave[c.clave] || 0);
        const estimado = Number.isNaN(raw) || raw < 0 ? 0 : raw;
        const cantidadContratada =
          c.cantidadPresupuestada + c.cantidadAdicionalAutorizada;
        const acumuladoActual = c.cantidadEjecutada + estimado;
        const saldo = cantidadContratada - acumuladoActual;
        const importe = estimado * c.precioUnitario;
        return {
          clave: c.clave,
          nombre: c.descripcion,
          unidad: c.unidad,
          cantidadContratada,
          acumuladoAnterior: c.cantidadEjecutada,
          estimado,
          acumuladoActual,
          saldo,
          precioUnitario: c.precioUnitario,
          importe,
        };
      });
  }, [selectedConceptoClaves, selectedConceptos, capturaPorClave]);

  const importeEstimadoEnVivo = useMemo(
    () => conceptosCalculados.reduce((acc, c) => acc + c.importe, 0),
    [conceptosCalculados]
  );

  // Cálculo de anticipo y saldo por amortizar del ejercicio fiscal de la fecha de estimación
  const ejercicioAmortizacion = useMemo(() => {
    const anio = Number(newForm.fechaEstimacion.slice(0, 4)) || 2024;
    const ejercicios = selectedContrato?.anticipos_por_ejercicio ?? [];
    const match =
      ejercicios.find((e) => e.anio === anio) ??
      ejercicios[0] ?? {
        id: 'default',
        anio,
        monto: contratoConsulta.montoAnticipo,
        porcentaje_amortizacion: DEFAULT_AMORTIZACION_PCT,
      };

    const amortizadoPrevioAnio = estimaciones
      .filter(
        (e) =>
          e.estado !== 'RECHAZADA' &&
          e.estado !== 'BORRADOR' &&
          Number(e.fechaEstimacion.slice(0, 4)) === match.anio
      )
      .reduce((sum, e) => sum + e.amortizacionEstimacion, 0);

    const saldoPorAmortizarAnio = Math.max(0, match.monto - amortizadoPrevioAnio);
    const pct = match.porcentaje_amortizacion || DEFAULT_AMORTIZACION_PCT;
    const sugerida = Math.min(
      saldoPorAmortizarAnio,
      Number((importeEstimadoEnVivo * (pct / 100)).toFixed(2))
    );

    return {
      anio: match.anio,
      montoAnio: match.monto,
      pct,
      amortizadoPrevioAnio,
      saldoPorAmortizarAnio,
      sugerida,
    };
  }, [
    newForm.fechaEstimacion,
    selectedContrato?.anticipos_por_ejercicio,
    contratoConsulta.montoAnticipo,
    estimaciones,
    importeEstimadoEnVivo,
  ]);

  const amortizacionActivaValor = useMemo(() => {
    if (amortizacionManual === null) return ejercicioAmortizacion.sugerida;
    const parsed = Number(amortizacionManual);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  }, [amortizacionManual, ejercicioAmortizacion.sugerida]);

  const caratulaEnVivo = useMemo(() => {
    const retAtraso = Math.max(0, Number(newForm.retencionAtraso || 0));
    return calcularCaratula({
      importeEstimado: importeEstimadoEnVivo,
      montoContrato: contratoConsulta.montoContrato,
      montoAnticipo: contratoConsulta.montoAnticipo,
      acumuladoAnterior: acumuladoAnteriorConsulta,
      amortizacionAcumuladaAnterior: amortizacionAcumuladaAnteriorConsulta,
      amortizacionEstimacion: amortizacionActivaValor,
      retencionAtraso: retAtraso,
    });
  }, [
    importeEstimadoEnVivo,
    contratoConsulta,
    acumuladoAnteriorConsulta,
    amortizacionAcumuladaAnteriorConsulta,
    amortizacionActivaValor,
    newForm.retencionAtraso,
  ]);

  const handleOpenCreateModal = () => {
    setErrorMsg(null);
    setConceptSearch('');
    setSelectedConceptoClaves([]);
    setCapturaPorClave({});
    setAmortizacionManual(null);
    setConceptoElegidoClave(selectedConceptos[0]?.clave ?? '');
    setNewForm({
      tipo: 'ORDINARIO',
      fechaEstimacion: '2024-10-25',
      periodoInicio: '2024-10-13',
      periodoFin: '2024-10-25',
      retencionAtraso: '0',
    });
    setShowCreateModal(true);
  };

  const handleAgregarConcepto = () => {
    const targetClave =
      conceptoElegidoClave &&
      conceptosDisponiblesParaAgregar.some((c) => c.clave === conceptoElegidoClave)
        ? conceptoElegidoClave
        : conceptosDisponiblesParaAgregar[0]?.clave;

    if (!targetClave) return;
    setSelectedConceptoClaves((prev) =>
      prev.includes(targetClave) ? prev : [...prev, targetClave]
    );
    setConceptSearch('');
    const remaining = conceptosDisponiblesParaAgregar.filter(
      (c) => c.clave !== targetClave
    );
    setConceptoElegidoClave(remaining[0]?.clave ?? '');
  };

  const handleQuitarConcepto = (clave: string) => {
    setSelectedConceptoClaves((prev) => prev.filter((k) => k !== clave));
    setCapturaPorClave((prev) => {
      const next = { ...prev };
      delete next[clave];
      return next;
    });
  };

  const handleCreateEstimacion = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (
      !newForm.fechaEstimacion ||
      !newForm.periodoInicio ||
      !newForm.periodoFin ||
      newForm.periodoFin < newForm.periodoInicio
    ) {
      setErrorMsg('Verifica la fecha de estimación y el rango de fechas del periodo.');
      return;
    }

    if (selectedConceptoClaves.length === 0) {
      setErrorMsg(
        'Agrega al menos un concepto del catálogo mediante el buscador antes de enviar la estimación.'
      );
      return;
    }

    const conceptosConVolumen = conceptosCalculados.filter((c) => c.estimado > 0);
    if (conceptosConVolumen.length === 0) {
      setErrorMsg(
        'Captura la cantidad "De esta estimación" (> 0) en al menos un concepto agregado.'
      );
      return;
    }

    if (amortizacionActivaValor > ejercicioAmortizacion.saldoPorAmortizarAnio + 0.01) {
      setErrorMsg(
        `La amortización del anticipo (${formatMXN(
          amortizacionActivaValor
        )}) excede el saldo por amortizar del ejercicio ${ejercicioAmortizacion.anio} (${formatMXN(
          ejercicioAmortizacion.saldoPorAmortizarAnio
        )}).`
      );
      return;
    }

    if (amortizacionActivaValor > importeEstimadoEnVivo + 0.01) {
      setErrorMsg(
        'La amortización del anticipo no puede superar el importe estimado.'
      );
      return;
    }

    if (newForm.tipo === 'ORDINARIO') {
      const excedido = conceptosConVolumen.find((c) => c.saldo < 0);
      if (excedido) {
        setErrorMsg(
          `Volumen excedido en ${excedido.clave}: el acumulado actual (${excedido.acumuladoActual} ${excedido.unidad}) rebasa la cantidad contratada (${excedido.cantidadContratada} ${excedido.unidad}).`
        );
        return;
      }

      const overlap = estimaciones.some(
        (est) =>
          est.tipo === 'ORDINARIO' &&
          newForm.periodoInicio <= est.periodoFin &&
          newForm.periodoFin >= est.periodoInicio
      );
      if (overlap) {
        setErrorMsg(
          'Traslape de periodos detectado (RN-SUPT-03.4): el rango se cruza con una estimación ordinaria previa.'
        );
        return;
      }
    }

    const retAtraso = Number(newForm.retencionAtraso || 0);
    if (Number.isNaN(retAtraso) || retAtraso < 0) {
      setErrorMsg('La retención por atraso no puede ser negativa.');
      return;
    }

    const financieroProyectado =
      ((acumuladoEjercidoBruto + caratulaEnVivo.importeEstimado) /
        contratoConsulta.montoContrato) *
      100;
    if (!validarControlPresupuestal(financieroProyectado, avanceFisicoVigente)) {
      setErrorMsg(
        `Violación de control presupuestal (RN-DIR-01.6): el avance financiero proyectado (${financieroProyectado.toFixed(
          2
        )}%) supera al avance físico real vigente (${avanceFisicoVigente}%).`
      );
      return;
    }

    const nueva: EstimacionItem = {
      id: `est-${newForm.tipo.toLowerCase().slice(0, 3)}-${Date.now()}`,
      numero: siguienteNumeroPorTipo,
      tipo: newForm.tipo,
      fechaEstimacion: newForm.fechaEstimacion,
      periodoInicio: newForm.periodoInicio,
      periodoFin: newForm.periodoFin,
      noContrato: contratoConsulta.noContrato,
      razonSocial: contratoConsulta.razonSocial,
      rfc: contratoConsulta.rfc,
      noFianzaAnticipo: contratoConsulta.noFianzaAnticipo,
      montoContrato: contratoConsulta.montoContrato,
      montoAnticipo: contratoConsulta.montoAnticipo,
      ...caratulaEnVivo,
      conceptos: conceptosConVolumen,
      estado: 'EN_REVISION',
      diasEnRevision: 1,
      versionSubsanacion: 1,
      historial: [],
    };

    setEstimaciones((prev) => [nueva, ...prev]);
    setShowCreateModal(false);
    setSuccessMsg(
      `Estimación ${formatEstimacionNombre(
        nueva.tipo,
        nueva.numero
      )} registrada y enviada a EN REVISIÓN. Importe: ${formatMXN(
        nueva.importeEstimado
      )} · Total neto: ${formatMXN(nueva.montoNeto)}.`
    );
  };

  const handleExportCaratulaExcel = async (est: EstimacionItem) => {
    setExportingExcel(true);
    setErrorMsg(null);
    try {
      const etiqueta = formatEstimacionNombre(est.tipo, est.numero);
      const res = await exportarEstimacionExcel({
        ...est,
        etiqueta,
      });
      setSuccessMsg(
        res.mode === 'api'
          ? `Carátula exportada desde ${res.endpoint} (${res.fileName}).`
          : `Archivo Excel (${res.fileName}) descargado localmente (endpoint listo: GET ${res.endpoint}).`
      );
    } catch {
      setErrorMsg('No se pudo exportar la carátula en formato Excel (.xlsx).');
    } finally {
      setExportingExcel(false);
    }
  };

  const requestDecision = (
    item: EstimacionItem,
    type: 'APROBAR_SUP' | 'RECHAZAR_SUP' | 'AUTORIZAR_RES'
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (type === 'APROBAR_SUP' || type === 'AUTORIZAR_RES') {
      const financieroProyectado =
        ((acumuladoEjercidoBruto + item.importeEstimado) /
          contratoConsulta.montoContrato) *
        100;
      if (!validarControlPresupuestal(financieroProyectado, avanceFisicoVigente)) {
        setErrorMsg(
          `Bloqueo automático (RN-DIR-01.6 / RN-SUP-02.2): autorizar esta estimación llevaría el avance financiero a ${financieroProyectado.toFixed(
            2
          )}%, por encima del avance físico real (${avanceFisicoVigente}%).`
        );
        return;
      }
    }

    setSignAction({ item, type });
  };

  const handleConfirmDecision = ({ motivo }: { motivo?: string }) => {
    if (!signAction || !user) return;
    const { item, type } = signAction;

    setEstimaciones((prev) =>
      prev.map((est) => {
        if (est.id !== item.id) return est;

        if (type === 'APROBAR_SUP') {
          return {
            ...est,
            estado: 'APROBADA',
            historial: [
              ...est.historial,
              {
                version: est.versionSubsanacion,
                fecha: 'Hoy',
                actor: `${user.nombre} (Supervisor)`,
                dictamen: 'APROBADA',
                observaciones: 'Dictamen técnico aprobado con firma electrónica.',
              },
            ],
          };
        }

        if (type === 'RECHAZAR_SUP') {
          return {
            ...est,
            estado: 'RECHAZADA',
            historial: [
              ...est.historial,
              {
                version: est.versionSubsanacion,
                fecha: 'Hoy',
                actor: `${user.nombre} (Supervisor)`,
                dictamen: 'RECHAZADA',
                observaciones: motivo ?? 'Observaciones técnicas registradas.',
              },
            ],
          };
        }

        return {
          ...est,
          estado: 'AUTORIZADA_PAGO',
        };
      })
    );

    const label = formatEstimacionNombre(item.tipo, item.numero);
    setSuccessMsg(
      type === 'APROBAR_SUP'
        ? `Estimación ${label} aprobada por Supervisión (RF-SUP-02).`
        : type === 'RECHAZAR_SUP'
        ? `Estimación ${label} rechazada. Se habilitó la subsanación al Superintendente (RF-SUPT-07).`
        : `Estimación ${label} autorizada para pago. El Superintendente ya puede adjuntar PDF y XML (RF-RES-03).`
    );
    setSignAction(null);
  };

  const handleSubsanar = (item: EstimacionItem) => {
    setErrorMsg(null);
    setEstimaciones((prev) =>
      prev.map((est) =>
        est.id === item.id
          ? {
              ...est,
              estado: 'EN_REVISION',
              versionSubsanacion: est.versionSubsanacion + 1,
              diasEnRevision: 1,
            }
          : est
      )
    );
    setSuccessMsg(
      `Estimación ${formatEstimacionNombre(item.tipo, item.numero)} reenviada a revisión (v${
        item.versionSubsanacion + 1
      }), preservando el historial de rechazos anteriores (RN-SUPT-07.2).`
    );
  };

  const handleSubmitCfdi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfdiTarget) return;
    setErrorMsg(null);

    const uuidNorm = cfdiUuid.trim().toUpperCase();
    const montoCapturado = Number(cfdiMonto);

    if (!uuidNorm || uuidNorm.length < 12) {
      setErrorMsg('Captura un folio fiscal (UUID del SAT) válido (RN-SUPT-06.1).');
      return;
    }

    if (estimaciones.some((est) => est.uuidFiscal?.toUpperCase() === uuidNorm)) {
      setErrorMsg(
        `El folio fiscal UUID "${uuidNorm}" ya fue registrado anteriormente (RN-SUPT-06.1).`
      );
      return;
    }

    const hasPdf = cfdiFiles.some((f) => f.name.toLowerCase().endsWith('.pdf'));
    const hasXml = cfdiFiles.some((f) => f.name.toLowerCase().endsWith('.xml'));
    if (!hasPdf || !hasXml) {
      setErrorMsg(
        'Par fiscal obligatorio (RN-SUPT-06.1): debes adjuntar tanto el archivo .pdf como el .xml del CFDI.'
      );
      return;
    }

    if (Number.isNaN(montoCapturado) || montoCapturado < 0) {
      setErrorMsg('El monto de factura no puede ser negativo.');
      return;
    }

    if (Math.abs(montoCapturado - cfdiTarget.montoNeto) > 0.01) {
      setErrorMsg(
        `Descuadre financiero (RN-SUPT-06.2): el monto de factura (${formatMXN(
          montoCapturado
        )}) debe coincidir exactamente con el Total neto autorizado (${formatMXN(
          cfdiTarget.montoNeto
        )}).`
      );
      return;
    }

    setEstimaciones((prev) =>
      prev.map((est) =>
        est.id === cfdiTarget.id
          ? {
              ...est,
              estado: 'LIQUIDADA',
              uuidFiscal: uuidNorm,
              archivosFiscales: cfdiFiles.map((f) => f.name),
            }
          : est
      )
    );
    setSuccessMsg(
      `CFDI (${uuidNorm}) validado y asociado a ${formatEstimacionNombre(
        cfdiTarget.tipo,
        cfdiTarget.numero
      )}. Estatus actualizado a LIQUIDADA.`
    );
    setCfdiTarget(null);
    setCfdiUuid('');
    setCfdiMonto('');
    setCfdiFiles([]);
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            {contratoConsulta.noContrato} · Candado Avance Financiero ≤ Avance Físico Real (
            {avanceFisicoVigente}%)
          </p>
          <h1 className="text-2xl font-normal text-fg tracking-tight mt-0.5">
            Estimaciones de obra y facturación
          </h1>
        </div>

        {isSuperintendente && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva estimación</span>
          </button>
        )}
      </div>

      {/* Barra comparativa Físico vs Financiero + Datos base del contrato */}
      <div className="bg-surface border border-line rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <p className="text-[11px] text-fg-muted">Avance físico real (tope legal)</p>
          <p className="text-xl font-semibold text-accent mt-0.5">{avanceFisicoVigente}%</p>
          <p className="text-[10px] text-fg-muted mt-0.5">
            Programado: {selectedObra.avanceProgramado}%
          </p>
        </div>
        <div>
          <p className="text-[11px] text-fg-muted">Avance financiero ejercido</p>
          <p className="text-xl font-semibold text-fg mt-0.5">{avanceFinancieroActual}%</p>
          <p className="text-[10px] text-fg-muted mt-0.5">
            {formatMXN(acumuladoEjercidoBruto)} de {formatMXN(contratoConsulta.montoContrato)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-fg-muted">Margen disponible para estimar</p>
          <p className="text-xl font-semibold text-ok-fg mt-0.5">
            {formatMXN(
              Math.max(
                0,
                (avanceFisicoVigente / 100) * contratoConsulta.montoContrato -
                  acumuladoEjercidoBruto
              )
            )}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-fg-muted">Anticipo / Amortización default</p>
          <p className="text-sm font-semibold text-fg mt-1">
            {formatMXN(contratoConsulta.montoAnticipo)} ({contratoConsulta.porcentajeAmortizacionDefault}%/est.)
          </p>
          <p className="text-[10px] text-fg-muted font-mono mt-0.5">
            Fianza: {contratoConsulta.noFianzaAnticipo}
          </p>
        </div>
      </div>

      {/* Selector / Filtro de Tipo de estimación con numeración independiente */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filtrar por tipo de estimación"
          className="flex flex-wrap items-center gap-2 text-xs"
        >
          {(
            [
              { id: 'TODOS', label: 'Todas' },
              { id: 'ORDINARIO', label: 'Ordinarias' },
              { id: 'CANTIDADES_ADICIONALES', label: 'Cantidades Adicionales' },
              { id: 'EXTRAORDINARIO', label: 'Extraordinarias' },
            ] as const
          ).map((tab) => {
            const active = tipoFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTipoFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface border-line-strong text-fg-soft hover:border-brand'
                }`}
              >
                {tab.label} ({conteosPorTipo[tab.id]})
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-fg-muted">
          Numeración independiente por tipo (Ordinaria #1, Extraordinaria #1, etc.)
        </span>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-ok-bg border border-ok-line text-ok-fg text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="underline cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Listado de Estimaciones */}
      <div className="space-y-3">
        {estimacionesFiltradas.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-8 text-center text-xs text-fg-muted">
            No hay estimaciones registradas para el tipo seleccionado.
          </div>
        ) : (
          estimacionesFiltradas.map((est) => {
            const isAlertCritica =
              est.estado === 'EN_REVISION' &&
              est.diasEnRevision >= BUSINESS_CONSTANTS.PLAZO_REVISION_ESTIMACION_DIAS;
            const isAlertPreventiva =
              est.estado === 'EN_REVISION' &&
              est.diasEnRevision >= 10 &&
              est.diasEnRevision < BUSINESS_CONSTANTS.PLAZO_REVISION_ESTIMACION_DIAS;

            return (
              <div
                key={est.id}
                className="bg-surface border border-line rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-fg">
                        {formatEstimacionNombre(est.tipo, est.numero)}
                      </span>
                      <StatusBadge status={est.estado as BadgeVariant} />
                      <span className="px-2 py-0.5 rounded bg-subtle text-[10px] font-semibold text-fg-soft">
                        {est.tipo} · v{est.versionSubsanacion}
                      </span>

                      {isAlertCritica && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-danger-bg text-danger-fg text-[10px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Plazo vencido ({est.diasEnRevision} días · RF-SUP-06)
                        </span>
                      )}
                      {isAlertPreventiva && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warn-bg text-warn-fg text-[10px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Alerta preventiva: día {est.diasEnRevision} de 15
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-fg-muted">
                      Fecha: <strong>{est.fechaEstimacion}</strong> · Periodo:{' '}
                      <strong>{est.periodoInicio}</strong> al <strong>{est.periodoFin}</strong>
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      Importe estimado: <strong>{formatMXN(est.importeEstimado)}</strong> ·
                      Amortización: -{formatMXN(est.amortizacionEstimacion)} · IVA 16%:{' '}
                      +{formatMXN(est.iva)} · Ret. 0.05% SFP: -{formatMXN(est.retencionSfp)}
                      {est.retencionAtraso > 0
                        ? ` · Ret. atraso: -${formatMXN(est.retencionAtraso)}`
                        : ''}
                    </p>

                    {est.uuidFiscal && (
                      <p className="text-[11px] font-mono text-ok-fg">
                        CFDI UUID: {est.uuidFiscal} ({est.archivosFiscales?.join(', ')})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-fg-muted uppercase">Total a pagar</p>
                      <p className="text-base font-bold text-fg">{formatMXN(est.montoNeto)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailTarget(est)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line-strong hover:border-brand text-xs font-medium text-fg-soft cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Carátula y detalle</span>
                    </button>

                    {isSupervisor && est.estado === 'EN_REVISION' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => requestDecision(est, 'RECHAZAR_SUP')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-danger-line text-danger-fg hover:bg-danger-bg text-xs font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDecision(est, 'APROBAR_SUP')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ok-solid hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </button>
                      </div>
                    )}

                    {isSuperintendente && est.estado === 'RECHAZADA' && (
                      <button
                        type="button"
                        onClick={() => handleSubsanar(est)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Subsanar y reenviar</span>
                      </button>
                    )}

                    {isResidente && est.estado === 'APROBADA' && (
                      <button
                        type="button"
                        onClick={() => requestDecision(est, 'AUTORIZAR_RES')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Autorizar pago</span>
                      </button>
                    )}

                    {isSuperintendente && est.estado === 'AUTORIZADA_PAGO' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setCfdiTarget(est);
                          setCfdiMonto(est.montoNeto.toFixed(2));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ok-solid hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Adjuntar CFDI (PDF + XML)</span>
                      </button>
                    )}
                  </div>
                </div>

                {est.historial.length > 0 && (
                  <div className="pt-3 border-t border-line space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase text-fg-muted">
                      Historial de dictámenes (inmutable)
                    </p>
                    {est.historial.map((h, i) => (
                      <div
                        key={`${est.id}-hist-${i}`}
                        className="text-[11px] flex flex-wrap items-center gap-2 text-fg-soft"
                      >
                        <span className="font-semibold">v{h.version}</span>
                        <span
                          className={
                            h.dictamen === 'APROBADA'
                              ? 'text-ok-fg font-semibold'
                              : 'text-danger-fg font-semibold'
                          }
                        >
                          {h.dictamen}
                        </span>
                        <span className="text-fg-muted">
                          · {h.fecha} · {h.actor}:
                        </span>
                        <span>{h.observaciones}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: CREAR NUEVA ESTIMACIÓN */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <form
            onSubmit={handleCreateEstimacion}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-5xl w-full p-5 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto text-xs"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-accent shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    Nueva Estimación · {formatEstimacionNombre(newForm.tipo, siguienteNumeroPorTipo)}
                  </h3>
                  <p className="text-[11px] text-fg-muted">
                    Selecciona los conceptos de esta estimación y ajusta si es necesario la
                    amortización del anticipo (precargada al {ejercicioAmortizacion.pct}% topada al
                    saldo del año {ejercicioAmortizacion.anio}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-fg-muted hover:text-fg cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bloque de Carátula en 3 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna 1: Datos generales del contrato y estimación */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  1. Datos del Contrato y Estimación
                </p>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-muted">No. Contrato (✓):</span>
                    <span className="font-semibold text-fg">{contratoConsulta.noContrato}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-muted">Contratista (✓):</span>
                    <span className="font-medium text-fg text-right">
                      {contratoConsulta.razonSocial}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-muted">RFC (✓):</span>
                    <span className="font-mono text-fg">{contratoConsulta.rfc}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-muted">No. Fianza Anticipo (✓):</span>
                    <span className="font-mono text-fg">{contratoConsulta.noFianzaAnticipo}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-muted">Numeración (Ⓒ):</span>
                    <span className="font-bold text-accent">
                      {formatEstimacionNombre(newForm.tipo, siguienteNumeroPorTipo)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-line space-y-2">
                  <div>
                    <label className="block text-[10px] text-fg-muted mb-1">
                      Tipo de estimación *
                    </label>
                    <select
                      value={newForm.tipo}
                      onChange={(e) =>
                        setNewForm({ ...newForm, tipo: e.target.value as EstimacionTipo })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface cursor-pointer"
                    >
                      <option value="ORDINARIO">Ordinaria (catálogo original)</option>
                      <option value="CANTIDADES_ADICIONALES">Cantidades Adicionales</option>
                      <option value="EXTRAORDINARIO">Extraordinaria (APU)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-fg-muted mb-1">
                      Fecha de estimación *
                    </label>
                    <input
                      type="date"
                      value={newForm.fechaEstimacion}
                      onChange={(e) =>
                        setNewForm({ ...newForm, fechaEstimacion: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-fg-muted mb-1">Periodo inicio</label>
                      <input
                        type="date"
                        value={newForm.periodoInicio}
                        onChange={(e) =>
                          setNewForm({ ...newForm, periodoInicio: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-fg-muted mb-1">Periodo fin</label>
                      <input
                        type="date"
                        value={newForm.periodoFin}
                        onChange={(e) =>
                          setNewForm({ ...newForm, periodoFin: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna 2: Control presupuestal y Amortización Editable (10% precargado, topado al saldo del año) */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  2. Importes y Amortización del Anticipo
                </p>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-fg-muted">Monto del contrato (✓):</span>
                    <span className="font-semibold">{formatMXN(contratoConsulta.montoContrato)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-muted">Anticipo año {ejercicioAmortizacion.anio}:</span>
                    <span className="font-semibold">{formatMXN(ejercicioAmortizacion.montoAnio)}</span>
                  </div>

                  <div className="border-t border-line my-1.5 pt-1.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Importe estimado (Ⓒ):</span>
                      <span className="font-bold text-accent">
                        {formatMXN(caratulaEnVivo.importeEstimado)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Acumulado anterior (✓):</span>
                      <span>{formatMXN(caratulaEnVivo.acumuladoAnterior)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Acumulado actual (Ⓒ):</span>
                      <span className="font-semibold">
                        {formatMXN(caratulaEnVivo.acumuladoActual)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Saldo por estimar (Ⓒ):</span>
                      <span className="font-semibold text-ok-fg">
                        {formatMXN(caratulaEnVivo.saldoPorEstimar)}
                      </span>
                    </div>
                  </div>

                  {/* Campo editable de Amortización del anticipo */}
                  <div className="border-t border-line my-1.5 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-semibold text-fg-soft">
                        Amortización anticipo MXN (precargada {ejercicioAmortizacion.pct}%)
                      </label>
                      {amortizacionManual !== null && (
                        <button
                          type="button"
                          onClick={() => setAmortizacionManual(null)}
                          className="text-[10px] text-accent hover:underline cursor-pointer"
                        >
                          Usar {ejercicioAmortizacion.pct}%
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={ejercicioAmortizacion.saldoPorAmortizarAnio}
                      step="0.01"
                      value={
                        amortizacionManual !== null
                          ? amortizacionManual
                          : ejercicioAmortizacion.sugerida.toFixed(2)
                      }
                      onKeyDown={blockNegativeKey}
                      onChange={(e) => setAmortizacionManual(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface text-right font-semibold text-warn-fg"
                    />
                    <p className="text-[10px] text-fg-muted">
                      Saldo por amortizar ({ejercicioAmortizacion.anio}):{' '}
                      <strong className="text-fg">
                        {formatMXN(ejercicioAmortizacion.saldoPorAmortizarAnio)}
                      </strong>
                    </p>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Saldo global tras esta est.:</span>
                      <span className="font-semibold">
                        {formatMXN(caratulaEnVivo.saldoPorAmortizar)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna 3: IVA, Retenciones y Total Neto */}
              <div className="p-4 rounded-xl bg-canvas border border-line flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                    3. Impuestos, Retenciones y Total
                  </p>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Subtotal (Est. − Amort.):</span>
                      <span className="font-medium">
                        {formatMXN(
                          Math.max(
                            0,
                            caratulaEnVivo.importeEstimado -
                              caratulaEnVivo.amortizacionEstimacion
                          )
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-fg-muted">IVA 16% (Ⓒ):</span>
                      <span className="font-semibold text-fg">
                        +{formatMXN(caratulaEnVivo.iva)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-fg-muted">
                        Retención por atraso (Captura MXN, ≥ 0)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={newForm.retencionAtraso}
                        onKeyDown={blockNegativeKey}
                        onChange={(e) =>
                          setNewForm({ ...newForm, retencionAtraso: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface text-right"
                      />
                    </div>

                    <div className="flex justify-between">
                      <span className="text-fg-muted">Retención 0.05% SFP (Ⓒ):</span>
                      <span className="font-semibold text-danger-fg">
                        -{formatMXN(caratulaEnVivo.retencionSfp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-info-bg border border-brand/30">
                  <p className="text-[10px] font-semibold uppercase text-fg-muted">
                    Total neto a pagar (Ⓒ)
                  </p>
                  <p className="text-xl font-bold text-accent mt-0.5">
                    {formatMXN(caratulaEnVivo.montoNeto)}
                  </p>
                </div>
              </div>
            </div>

            {/* Buscador + Botón "Agregar concepto a esta estimación" */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-fg">
                  Conceptos incluidos en esta estimación ({conceptosCalculados.length})
                </h4>
                <span className="text-[11px] text-fg-muted">
                  Importe estimado calculado:{' '}
                  <strong className="text-accent">
                    {formatMXN(caratulaEnVivo.importeEstimado)}
                  </strong>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-canvas border border-line grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-medium text-fg-muted">
                    Buscar concepto del catálogo
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-fg-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={conceptSearch}
                      onChange={(e) => setConceptSearch(e.target.value)}
                      placeholder="Filtrar por clave o descripción..."
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-line-strong bg-surface text-xs"
                    />
                  </div>
                </div>

                <div className="md:col-span-5 space-y-1">
                  <label className="text-[10px] font-medium text-fg-muted">
                    Concepto disponible ({conceptosDisponiblesParaAgregar.length})
                  </label>
                  <select
                    value={
                      conceptosDisponiblesParaAgregar.some(
                        (c) => c.clave === conceptoElegidoClave
                      )
                        ? conceptoElegidoClave
                        : conceptosDisponiblesParaAgregar[0]?.clave ?? ''
                    }
                    onChange={(e) => setConceptoElegidoClave(e.target.value)}
                    disabled={conceptosDisponiblesParaAgregar.length === 0}
                    className="w-full px-2.5 py-2 rounded-lg border border-line-strong bg-surface text-xs cursor-pointer disabled:opacity-50"
                  >
                    {conceptosDisponiblesParaAgregar.length === 0 ? (
                      <option value="">No hay más conceptos coincidentes</option>
                    ) : (
                      conceptosDisponiblesParaAgregar.map((c) => (
                        <option key={c.clave} value={c.clave}>
                          {c.clave} · {c.descripcion} ({c.unidad} · {formatMXN(c.precioUnitario)})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    disabled={conceptosDisponiblesParaAgregar.length === 0}
                    onClick={handleAgregarConcepto}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar concepto a esta estimación</span>
                  </button>
                </div>
              </div>

              {/* Tabla SOLO con los conceptos agregados */}
              <div className="border border-line rounded-xl overflow-hidden">
                {conceptosCalculados.length === 0 ? (
                  <div className="p-6 text-center text-xs text-fg-muted bg-canvas/40">
                    Aún no has agregado conceptos. Usa el buscador superior y haz clic en{' '}
                    <strong className="text-fg">&quot;Agregar concepto a esta estimación&quot;</strong>{' '}
                    para capturar la columna <strong className="text-accent">&quot;De esta estimación&quot;</strong>.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-200 text-xs">
                      <thead>
                        <tr className="bg-canvas text-[10px] font-semibold uppercase text-fg-muted border-b border-line">
                          <th className="py-2.5 px-3">Concepto (✓)</th>
                          <th className="py-2.5 px-2 text-right">Contratado</th>
                          <th className="py-2.5 px-2 text-right">Ac. Anterior (✓)</th>
                          <th className="py-2.5 px-2 text-right text-accent">
                            De esta estimación *
                          </th>
                          <th className="py-2.5 px-2 text-right">Ac. Actual (Ⓒ)</th>
                          <th className="py-2.5 px-2 text-right">Saldo (Ⓒ)</th>
                          <th className="py-2.5 px-2 text-right">P.U. (✓)</th>
                          <th className="py-2.5 px-3 text-right">Importe (Ⓒ)</th>
                          <th className="py-2.5 px-2 text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {conceptosCalculados.map((c) => {
                          const maxRestante = Math.max(
                            0,
                            c.cantidadContratada - c.acumuladoAnterior
                          );
                          const excede = c.saldo < 0;
                          return (
                            <tr key={c.clave}>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-accent mr-1.5">{c.clave}</span>
                                <span className="text-fg">{c.nombre}</span>
                                <span className="ml-1 text-[10px] text-fg-muted">
                                  ({c.unidad})
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right text-fg-muted">
                                {c.cantidadContratada.toLocaleString('es-MX')}
                              </td>
                              <td className="py-2.5 px-2 text-right text-fg-muted">
                                {c.acumuladoAnterior.toLocaleString('es-MX')}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0"
                                  value={capturaPorClave[c.clave] ?? ''}
                                  onKeyDown={blockNegativeKey}
                                  onChange={(e) =>
                                    setCapturaPorClave((prev) => ({
                                      ...prev,
                                      [c.clave]: e.target.value,
                                    }))
                                  }
                                  title={`Saldo disponible: ${maxRestante} ${c.unidad}`}
                                  className={`w-24 px-2 py-1 rounded-md border text-right bg-canvas ${
                                    excede
                                      ? 'border-danger-line text-danger-fg font-semibold'
                                      : 'border-line-strong text-fg'
                                  }`}
                                />
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium">
                                {c.acumuladoActual.toLocaleString('es-MX')}
                              </td>
                              <td
                                className={`py-2.5 px-2 text-right font-medium ${
                                  excede ? 'text-danger-fg' : 'text-ok-fg'
                                }`}
                              >
                                {c.saldo.toLocaleString('es-MX')}
                              </td>
                              <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                {formatMXN(c.precioUnitario)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                                {formatMXN(c.importe)}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  aria-label={`Quitar ${c.clave}`}
                                  onClick={() => handleQuitarConcepto(c.clave)}
                                  className="p-1 text-fg-muted hover:text-danger-fg cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
              >
                Enviar estimación a revisión
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: VER CARÁTULA Y DETALLE + BOTÓN EXPORTAR EXCEL (.xlsx) */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetailTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-4xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-fg">
                    Carátula · {formatEstimacionNombre(detailTarget.tipo, detailTarget.numero)}
                  </h3>
                  <StatusBadge status={detailTarget.estado as BadgeVariant} />
                </div>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Contrato {detailTarget.noContrato} · {detailTarget.razonSocial} (RFC:{' '}
                  {detailTarget.rfc})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={() => void handleExportCaratulaExcel(detailTarget)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ok-solid hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{exportingExcel ? 'Exportando...' : 'Exportar Excel (.xlsx)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="p-1 text-fg-muted hover:text-fg cursor-pointer"
                  aria-label="Cerrar carátula"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1.5">
                <p className="font-semibold text-accent uppercase text-[10px]">Generales</p>
                <p>
                  <span className="text-fg-muted">Fianza anticipo:</span>{' '}
                  <strong className="font-mono">{detailTarget.noFianzaAnticipo}</strong>
                </p>
                <p>
                  <span className="text-fg-muted">Fecha estimación:</span>{' '}
                  <strong>{detailTarget.fechaEstimacion}</strong>
                </p>
                <p>
                  <span className="text-fg-muted">Tipo / Folio:</span>{' '}
                  <strong>{formatEstimacionNombre(detailTarget.tipo, detailTarget.numero)}</strong>
                </p>
                <p>
                  <span className="text-fg-muted">Monto contrato:</span>{' '}
                  <strong>{formatMXN(detailTarget.montoContrato)}</strong>
                </p>
                <p>
                  <span className="text-fg-muted">Monto anticipo:</span>{' '}
                  <strong>{formatMXN(detailTarget.montoAnticipo)}</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1.5">
                <p className="font-semibold text-accent uppercase text-[10px]">
                  Avance y Amortización
                </p>
                <p>
                  <span className="text-fg-muted">Importe estimado:</span>{' '}
                  <strong>{formatMXN(detailTarget.importeEstimado)}</strong>
                </p>
                <p>
                  <span className="text-fg-muted">Acumulado anterior:</span>{' '}
                  {formatMXN(detailTarget.acumuladoAnterior)}
                </p>
                <p>
                  <span className="text-fg-muted">Acumulado actual:</span>{' '}
                  <strong>{formatMXN(detailTarget.acumuladoActual)}</strong>
                </p>
                <p>
                  <span className="text-fg-muted">Saldo por estimar:</span>{' '}
                  <strong className="text-ok-fg">
                    {formatMXN(detailTarget.saldoPorEstimar)}
                  </strong>
                </p>
                <p>
                  <span className="text-fg-muted">Amort. actual / Saldo:</span>{' '}
                  {formatMXN(detailTarget.amortizacionEstimacion)} /{' '}
                  {formatMXN(detailTarget.saldoPorAmortizar)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1.5">
                <p className="font-semibold text-accent uppercase text-[10px]">
                  Impuestos y Total
                </p>
                <p>
                  <span className="text-fg-muted">IVA (16%):</span> +{formatMXN(detailTarget.iva)}
                </p>
                <p>
                  <span className="text-fg-muted">Retención atraso:</span> -
                  {formatMXN(detailTarget.retencionAtraso)}
                </p>
                <p>
                  <span className="text-fg-muted">Retención 0.05% SFP:</span> -
                  {formatMXN(detailTarget.retencionSfp)}
                </p>
                <div className="pt-2 mt-2 border-t border-line">
                  <span className="text-fg-muted block text-[10px] uppercase">Total neto</span>
                  <span className="text-base font-bold text-accent">
                    {formatMXN(detailTarget.montoNeto)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-170 text-xs">
                  <thead>
                    <tr className="bg-canvas text-[10px] uppercase text-fg-muted border-b border-line">
                      <th className="py-2 px-3">Concepto</th>
                      <th className="py-2 px-2 text-right">Ac. Ant.</th>
                      <th className="py-2 px-2 text-right">De esta est.</th>
                      <th className="py-2 px-2 text-right">Ac. Actual</th>
                      <th className="py-2 px-2 text-right">Saldo</th>
                      <th className="py-2 px-2 text-right">P.U.</th>
                      <th className="py-2 px-3 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detailTarget.conceptos.map((c) => (
                      <tr key={c.clave}>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-accent mr-1.5">{c.clave}</span>
                          <span>{c.nombre}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-fg-muted">
                          {c.acumuladoAnterior.toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold text-accent">
                          {c.estimado.toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {c.acumuladoActual.toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {c.saldo.toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-2 text-right">{formatMXN(c.precioUnitario)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {formatMXN(c.importe)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CARGAR CFDI (PDF + XML) */}
      {cfdiTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCfdiTarget(null)}
        >
          <form
            onSubmit={handleSubmitCfdi}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-lg w-full p-5 space-y-3.5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-fg">
              Facturación · {formatEstimacionNombre(cfdiTarget.tipo, cfdiTarget.numero)} (RF-SUPT-06)
            </h3>
            <p className="text-[11px] text-fg-muted">
              Adjunta el par fiscal obligatorio (PDF + XML) y captura el UUID irrepetible del SAT.
              Total neto exacto autorizado: <strong>{formatMXN(cfdiTarget.montoNeto)}</strong>.
            </p>

            <input
              type="text"
              placeholder="Folio fiscal UUID del SAT"
              value={cfdiUuid}
              onChange={(e) => setCfdiUuid(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas font-mono"
            />

            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Monto total de factura (MXN)"
              value={cfdiMonto}
              onKeyDown={blockNegativeKey}
              onChange={(e) => setCfdiMonto(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas"
            />

            <FileDropzone
              files={cfdiFiles}
              onChange={setCfdiFiles}
              maxFiles={2}
              minFiles={2}
              accept=".pdf,.xml"
              helperText="Obligatorio cargar 1 archivo .PDF y 1 archivo .XML (máx. 10 MB cada uno)"
            />

            {errorMsg && (
              <div
                role="alert"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setCfdiTarget(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-ok-solid text-white font-semibold cursor-pointer"
              >
                Validar y registrar CFDI
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de firma electrónica para dictámenes y autorizaciones */}
      <ConfirmActionModal
        open={signAction !== null}
        title={
          signAction?.type === 'APROBAR_SUP'
            ? `Aprobar ${formatEstimacionNombre(signAction.item.tipo, signAction.item.numero)}`
            : signAction?.type === 'RECHAZAR_SUP'
            ? `Rechazar ${formatEstimacionNombre(signAction.item.tipo, signAction.item.numero)}`
            : `Autorizar pago · ${
                signAction
                  ? formatEstimacionNombre(signAction.item.tipo, signAction.item.numero)
                  : ''
              }`
        }
        description={
          signAction?.type === 'RECHAZAR_SUP'
            ? 'El rechazo quedará registrado de forma inmutable y habilitará al Superintendente para cargar una versión corregida.'
            : `Total neto a pagar: ${formatMXN(
                signAction?.item.montoNeto ?? 0
              )}. Se autorizará con tu correo y contraseña mediante el servicio de firma SAT (RNF-SEG-04).`
        }
        confirmLabel={
          signAction?.type === 'RECHAZAR_SUP'
            ? 'Firmar rechazo'
            : signAction?.type === 'APROBAR_SUP'
            ? 'Firmar aprobación'
            : 'Firmar autorización'
        }
        tone={signAction?.type === 'RECHAZAR_SUP' ? 'danger' : 'brand'}
        requireSignature
        requireReason={signAction?.type === 'RECHAZAR_SUP'}
        reasonLabel="Motivo técnico detallado del rechazo (obligatorio)"
        onCancel={() => setSignAction(null)}
        onConfirm={handleConfirmDecision}
      />
    </div>
  );
};
