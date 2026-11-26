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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import {
  BUSINESS_CONSTANTS,
  validarControlPresupuestal,
} from '../utils/businessRules';
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
/*
interface ConceptoCatalogoBase {
  clave: string;
  nombre: string;
  unidad: string;
  cantidadContratada: number;
  acumuladoAnterior: number;
  precioUnitario: number;
}*/

interface ConceptoEstimacionDetalle {
  clave: string;
  nombre: string;
  unidad: string;
  cantidadContratada: number;
  acumuladoAnterior: number;
  estimado: number; // Captura del usuario
  acumuladoActual: number; // Cálculo: acumuladoAnterior + estimado
  saldo: number; // Cálculo: cantidadContratada - acumuladoActual
  precioUnitario: number; // Consulta
  importe: number; // Cálculo: estimado * precioUnitario
}

interface DatosContratoConsulta {
  noContrato: string;
  razonSocial: string;
  rfc: string;
  noFianzaAnticipo: string;
  montoContrato: number;
  montoAnticipo: number;
  porcentajeAnticipo: number;
}

interface EstimacionItem {
  id: string;
  numero: number;
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

  // Resumen financiero y amortización (Consulta + Cálculo)
  importeEstimado: number; // Suma de importes de conceptos
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
  montoNeto: number; // Total a pagar

  // Detalle por concepto
  conceptos: ConceptoEstimacionDetalle[];

  estado: EstimacionEstado;
  diasEnRevision: number;
  versionSubsanacion: number;
  uuidFiscal?: string;
  archivosFiscales?: string[];
  historial: HistorialRevision[];
}

// Constantes fiscales / normativas
const TASA_IVA = 0.16;
// Nota: En pizarrón se anotó 0.05% (0.0005). Si el profesor confirma "5 al millar" (0.5%), cambiar a 0.005.
const TASA_RETENCION_SFP = 0.0005;

const CONTRATO_EXTRA_BY_OBRA: Record<
  string,
  { rfc: string; noFianzaAnticipo: string; montoContrato: number; porcentajeAnticipo: number }
> = {
  'OP-2024-001': {
    rfc: 'CNO9804128A3',
    noFianzaAnticipo: 'FNZ-ANT-2024-08914',
    montoContrato: 25000000,
    porcentajeAnticipo: 0.3,
  },
  'OP-2024-002': {
    rfc: 'IHM0511209K1',
    noFianzaAnticipo: 'FNZ-ANT-2024-09102',
    montoContrato: 18400000,
    porcentajeAnticipo: 0.3,
  },
  'OP-2024-003': {
    rfc: 'PEV0108154R7',
    noFianzaAnticipo: 'FNZ-ANT-2024-09450',
    montoContrato: 32000000,
    porcentajeAnticipo: 0.3,
  },
  'OP-2024-004': {
    rfc: 'ECC1203087M2',
    noFianzaAnticipo: 'FNZ-ANT-2024-09881',
    montoContrato: 14200000,
    porcentajeAnticipo: 0.3,
  },
  'OP-2024-005': {
    rfc: 'IEU0907223B5',
    noFianzaAnticipo: 'FNZ-ANT-2024-07740',
    montoContrato: 9800000,
    porcentajeAnticipo: 0.3,
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
  porcentajeAnticipo: number;
  acumuladoAnterior: number;
  amortizacionAcumuladaAnterior: number;
  retencionAtraso: number;
}) {
  const {
    importeEstimado,
    montoContrato,
    montoAnticipo,
    porcentajeAnticipo,
    acumuladoAnterior,
    amortizacionAcumuladaAnterior,
    retencionAtraso,
  } = params;

  const acumuladoActual = acumuladoAnterior + importeEstimado;
  const saldoPorEstimar = Math.max(0, montoContrato - acumuladoActual);

  const saldoPorAmortizarPrevio = Math.max(
    0,
    montoAnticipo - amortizacionAcumuladaAnterior
  );
  const amortizacionEstimacion = Math.min(
    saldoPorAmortizarPrevio,
    importeEstimado * porcentajeAnticipo
  );
  const amortizacionAcumuladaActual =
    amortizacionAcumuladaAnterior + amortizacionEstimacion;
  const saldoPorAmortizar = Math.max(
    0,
    montoAnticipo - amortizacionAcumuladaActual
  );

  // Subtotal tras amortización proporcional + IVA 16% - Retenciones
  const subtotalTrasAmortizacion = Math.max(
    0,
    importeEstimado - amortizacionEstimacion
  );
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
    amortizacionEstimacion,
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

  // Estimación 4 (Liquidada: $13,500,000 acumulado bruto = 54% del contrato)
  const calc4 = calcularCaratula({
    importeEstimado: 13500000,
    montoContrato,
    montoAnticipo,
    porcentajeAnticipo: 0.3,
    acumuladoAnterior: 0,
    amortizacionAcumuladaAnterior: 0,
    retencionAtraso: 0,
  });

  // Estimación 5 (Aprobada por Supervisión)
  const calc5 = calcularCaratula({
    importeEstimado: 900000,
    montoContrato,
    montoAnticipo,
    porcentajeAnticipo: 0.3,
    acumuladoAnterior: 13500000,
    amortizacionAcumuladaAnterior: calc4.amortizacionAcumuladaActual,
    retencionAtraso: 0,
  });

  // Estimación 6 (En revisión)
  const calc6 = calcularCaratula({
    importeEstimado: 450000,
    montoContrato,
    montoAnticipo,
    porcentajeAnticipo: 0.3,
    acumuladoAnterior: 14400000,
    amortizacionAcumuladaAnterior: calc5.amortizacionAcumuladaActual,
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
      id: 'est-6',
      numero: 6,
      tipo: 'ORDINARIO',
      fechaEstimacion: '2024-10-12',
      periodoInicio: '2024-10-01',
      periodoFin: '2024-10-12',
      ...baseContrato,
      ...calc6,
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
      id: 'est-5',
      numero: 5,
      tipo: 'CANTIDADES_ADICIONALES',
      fechaEstimacion: '2024-09-30',
      periodoInicio: '2024-09-16',
      periodoFin: '2024-09-30',
      ...baseContrato,
      ...calc5,
      conceptos: [
        {
          clave: 'TER-008',
          nombre: 'Relleno compactado al 95% PVSM con material de banco',
          unidad: 'm³',
          cantidadContratada: 1970,
          acumuladoAnterior: 392,
          estimado: 200,
          acumuladoActual: 592,
          saldo: 1378,
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
            'Ajustar volumen en concepto TER-008 conforme a levantamiento topográfico.',
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
      id: 'est-4',
      numero: 4,
      tipo: 'ORDINARIO',
      fechaEstimacion: '2024-09-15',
      periodoInicio: '2024-09-01',
      periodoFin: '2024-09-15',
      ...baseContrato,
      ...calc4,
      conceptos: [
        {
          clave: 'CIM-004',
          nombre: 'Cimentación profunda con pilas coladas in situ Ø1.20 m',
          unidad: 'm',
          cantidadContratada: 260,
          acumuladoAnterior: 0,
          estimado: 210,
          acumuladoActual: 210,
          saldo: 50,
          precioUnitario: 28500,
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
      archivosFiscales: ['CFDI_EST04.pdf', 'CFDI_EST04.xml'],
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
  const { selectedObra, selectedConceptos } = useObra();
  const [estimaciones, setEstimaciones] = useState<EstimacionItem[]>(() =>
    buildInitialEstimaciones()
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de detalle de carátula para cualquier estimación listada
  const [detailTarget, setDetailTarget] = useState<EstimacionItem | null>(null);

  // Modal crear nueva estimación (Carátula + Detalle de conceptos)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForm, setNewForm] = useState({
    tipo: 'ORDINARIO' as EstimacionTipo,
    fechaEstimacion: '2024-10-25',
    periodoInicio: '2024-10-13',
    periodoFin: '2024-10-25',
    retencionAtraso: '0',
  });
  const [capturaPorClave, setCapturaPorClave] = useState<Record<string, string>>({});

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

  // Datos de consulta del contrato de la obra activa
  const contratoConsulta: DatosContratoConsulta = useMemo(() => {
    const extra =
      CONTRATO_EXTRA_BY_OBRA[selectedObra.id] ?? CONTRATO_EXTRA_BY_OBRA['OP-2024-001'];
    return {
      noContrato: selectedObra.contrato,
      razonSocial: selectedObra.contratista,
      rfc: extra.rfc,
      noFianzaAnticipo: extra.noFianzaAnticipo,
      montoContrato: extra.montoContrato,
      montoAnticipo: extra.montoContrato * extra.porcentajeAnticipo,
      porcentajeAnticipo: extra.porcentajeAnticipo,
    };
  }, [selectedObra]);

  const avanceFisicoVigente = selectedObra.avanceFisico;

  // Acumulados ejercidos (LIQUIDADA o AUTORIZADA_PAGO) para candado Físico >= Financiero
  const acumuladoEjercidoBruto = useMemo(
    () =>
      estimaciones
        .filter((e) => e.estado === 'LIQUIDADA' || e.estado === 'AUTORIZADA_PAGO')
        .reduce((acc, e) => acc + e.importeEstimado, 0),
    [estimaciones]
  );

  // Acumulado anterior para nueva estimación (considerando estimaciones no rechazadas)
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

  const siguienteNumeroEstimacion = useMemo(
    () => estimaciones.reduce((max, item) => Math.max(max, item.numero), 0) + 1,
    [estimaciones]
  );

  const avanceFinancieroActual = Number(
    ((acumuladoEjercidoBruto / contratoConsulta.montoContrato) * 100).toFixed(2)
  );

  // Detalle calculado en vivo de cada concepto en el modal de alta
  const conceptosCalculados = useMemo<ConceptoEstimacionDetalle[]>(() => {
  return selectedConceptos.map((c) => {
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
}, [selectedConceptos, capturaPorClave]);

  const importeEstimadoEnVivo = useMemo(
    () => conceptosCalculados.reduce((acc, c) => acc + c.importe, 0),
    [conceptosCalculados]
  );

  const caratulaEnVivo = useMemo(() => {
    const retAtraso = Math.max(0, Number(newForm.retencionAtraso || 0));
    return calcularCaratula({
      importeEstimado: importeEstimadoEnVivo,
      montoContrato: contratoConsulta.montoContrato,
      montoAnticipo: contratoConsulta.montoAnticipo,
      porcentajeAnticipo: contratoConsulta.porcentajeAnticipo,
      acumuladoAnterior: acumuladoAnteriorConsulta,
      amortizacionAcumuladaAnterior: amortizacionAcumuladaAnteriorConsulta,
      retencionAtraso: retAtraso,
    });
  }, [
    importeEstimadoEnVivo,
    contratoConsulta,
    acumuladoAnteriorConsulta,
    amortizacionAcumuladaAnteriorConsulta,
    newForm.retencionAtraso,
  ]);

  const handleOpenCreateModal = () => {
    setErrorMsg(null);
    setCapturaPorClave({});
    setNewForm({
      tipo: 'ORDINARIO',
      fechaEstimacion: '2024-10-25',
      periodoInicio: '2024-10-13',
      periodoFin: '2024-10-25',
      retencionAtraso: '0',
    });
    setShowCreateModal(true);
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

    const conceptosConVolumen = conceptosCalculados.filter((c) => c.estimado > 0);
    if (conceptosConVolumen.length === 0) {
      setErrorMsg(
        'Captura la cantidad estimada (> 0) en al menos un concepto del detalle antes de enviar.'
      );
      return;
    }

    // Validar que ningún concepto exceda su saldo disponible (excepto Cantidades Adicionales)
    if (newForm.tipo === 'ORDINARIO') {
      const excedido = conceptosConVolumen.find((c) => c.saldo < 0);
      if (excedido) {
        setErrorMsg(
          `Volumen excedido en ${excedido.clave}: el acumulado actual (${excedido.acumuladoActual} ${excedido.unidad}) rebasa la cantidad contratada (${excedido.cantidadContratada} ${excedido.unidad}).`
        );
        return;
      }

      // RN-SUPT-03.4: No traslape de periodos en estimaciones ordinarias
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

    // RN-DIR-01.6: Verificar candado Físico >= Financiero
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
      id: `est-${Date.now()}`,
      numero: siguienteNumeroEstimacion,
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
      `Estimación N.º ${nueva.numero} registrada y enviada a EN REVISIÓN. Importe estimado: ${formatMXN(
        nueva.importeEstimado
      )} · Total neto: ${formatMXN(nueva.montoNeto)}.`
    );
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

    setSuccessMsg(
      type === 'APROBAR_SUP'
        ? `Estimación N.º ${item.numero} aprobada por Supervisión (RF-SUP-02).`
        : type === 'RECHAZAR_SUP'
        ? `Estimación N.º ${item.numero} rechazada. Se habilitó la subsanación al Superintendente (RF-SUPT-07).`
        : `Estimación N.º ${item.numero} autorizada para pago. El Superintendente ya puede adjuntar PDF y XML (RF-RES-03).`
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
      `Estimación N.º ${item.numero} reenviada a revisión (v${
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
      `CFDI (${uuidNorm}) validado y asociado a la Estimación N.º ${cfdiTarget.numero}. Estatus actualizado a LIQUIDADA.`
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
          <p className="text-xl font-semibold text-accent mt-0.5">
            {avanceFisicoVigente}%
          </p>
          <p className="text-[10px] text-fg-muted mt-0.5">
            Programado: {selectedObra.avanceProgramado}%
          </p>
        </div>
        <div>
          <p className="text-[11px] text-fg-muted">Avance financiero ejercido</p>
          <p className="text-xl font-semibold text-fg mt-0.5">
            {avanceFinancieroActual}%
          </p>
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
          <p className="text-[11px] text-fg-muted">Anticipo / Fianza (Consulta)</p>
          <p className="text-sm font-semibold text-fg mt-1">
            {formatMXN(contratoConsulta.montoAnticipo)} (30%)
          </p>
          <p className="text-[10px] text-fg-muted font-mono mt-0.5">
            Fianza: {contratoConsulta.noFianzaAnticipo}
          </p>
        </div>
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
        {estimaciones.map((est) => {
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
                      Estimación N.º {String(est.numero).padStart(2, '0')}
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
        })}
      </div>

      {/* MODAL 1: CREAR NUEVA ESTIMACIÓN (CARÁTULA 3 COLUMNAS + DETALLE POR CONCEPTO) */}
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
                    Nueva Estimación N.º {String(siguienteNumeroEstimacion).padStart(2, '0')} ·
                    Carátula y Detalle de Conceptos
                  </h3>
                  <p className="text-[11px] text-fg-muted">
                    Los campos de contrato son de consulta (✓); los importes, acumulados, saldos,
                    amortización e impuestos se calculan automáticamente (Ⓒ).
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

            {/* Bloque de Carátula en 3 columnas (espejo del pizarrón) */}
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
                    <span className="text-fg-muted">No. Estimación (Ⓒ):</span>
                    <span className="font-bold text-accent">
                      N.º {String(siguienteNumeroEstimacion).padStart(2, '0')}
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
                      <option value="ORDINARIO">1. Ordinario (catálogo original)</option>
                      <option value="CANTIDADES_ADICIONALES">2. Cantidades Adicionales</option>
                      <option value="EXTRAORDINARIO">3. Extraordinarios (APU)</option>
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
                        className="w-full px-2 py-1.5 rounded-lg border border-line-strong bg-surface"
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
                        className="w-full px-2 py-1.5 rounded-lg border border-line-strong bg-surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna 2: Control presupuestal y amortización */}
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
                    <span className="text-fg-muted">Monto de anticipo (✓):</span>
                    <span className="font-semibold">{formatMXN(contratoConsulta.montoAnticipo)}</span>
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

                  <div className="border-t border-line my-1.5 pt-1.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Amortización actual (30% Ⓒ):</span>
                      <span className="font-semibold text-warn-fg">
                        -{formatMXN(caratulaEnVivo.amortizacionEstimacion)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Acum. amortización ant. (✓):</span>
                      <span>{formatMXN(caratulaEnVivo.amortizacionAcumuladaAnterior)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Acum. amortización actual (Ⓒ):</span>
                      <span className="font-semibold">
                        {formatMXN(caratulaEnVivo.amortizacionAcumuladaActual)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Saldo por amortizar (Ⓒ):</span>
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

            {/* Tabla: Detalle de cada concepto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-fg">
                  Detalle por concepto (captura el volumen en la columna &quot;Estimado&quot;)
                </h4>
                <span className="text-[11px] text-fg-muted">
                  Importe estimado calculado:{' '}
                  <strong className="text-accent">
                    {formatMXN(caratulaEnVivo.importeEstimado)}
                  </strong>
                </span>
              </div>

              <div className="border border-line rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-195 text-xs">
                    <thead>
                      <tr className="bg-canvas text-[10px] font-semibold uppercase text-fg-muted border-b border-line">
                        <th className="py-2.5 px-3">Nombre del concepto (✓)</th>
                        <th className="py-2.5 px-2 text-right">Contratado</th>
                        <th className="py-2.5 px-2 text-right">Ac. Anterior (✓)</th>
                        <th className="py-2.5 px-2 text-right text-accent">
                          Estimación (Captura)
                        </th>
                        <th className="py-2.5 px-2 text-right">Ac. Actual (Ⓒ)</th>
                        <th className="py-2.5 px-2 text-right">Saldo (Ⓒ)</th>
                        <th className="py-2.5 px-2 text-right">P.U. (✓)</th>
                        <th className="py-2.5 px-3 text-right">Importe (Ⓒ)</th>
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
                              <span className="ml-1 text-[10px] text-fg-muted">({c.unidad})</span>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

      {/* MODAL 2: VER CARÁTULA Y DETALLE DE UNA ESTIMACIÓN EXISTENTE */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetailTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-4xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-fg">
                    Carátula · Estimación N.º {String(detailTarget.numero).padStart(2, '0')}
                  </h3>
                  <StatusBadge status={detailTarget.estado as BadgeVariant} />
                </div>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Contrato {detailTarget.noContrato} · {detailTarget.razonSocial} (RFC:{' '}
                  {detailTarget.rfc})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="p-1 text-fg-muted hover:text-fg cursor-pointer"
                aria-label="Cerrar carátula"
              >
                <X className="w-4 h-4" />
              </button>
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
                  <span className="text-fg-muted">Tipo:</span> <strong>{detailTarget.tipo}</strong>
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
                      <th className="py-2 px-2 text-right">Estimación</th>
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
              Facturación · Estimación N.º {cfdiTarget.numero} (RF-SUPT-06)
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
            ? `Aprobar Estimación N.º ${signAction.item.numero}`
            : signAction?.type === 'RECHAZAR_SUP'
            ? `Rechazar Estimación N.º ${signAction.item.numero}`
            : `Autorizar pago · Estimación N.º ${signAction?.item.numero}`
        }
        description={
          signAction?.type === 'RECHAZAR_SUP'
            ? 'El rechazo quedará registrado de forma inmutable y habilitará al Superintendente para cargar una versión corregida.'
            : `Total neto a pagar: ${formatMXN(
                signAction?.item.montoNeto ?? 0
              )}. Se validará tu firma electrónica (RNF-SEG-04).`
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