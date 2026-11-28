import React, { createContext, useContext, useState } from 'react';
import {
  PORTFOLIO_OBRAS_MOCK,
  type ObraPortfolioItem,
} from '../pages/MisObrasPage';
import {
  INITIAL_CONCEPTOS_BY_OBRA,
  MONTO_CONTRATO_BY_OBRA,
  type CatalogoConcepto,
} from '../mocks/catalogoParametrico.mock';
import type {
  ContratistaRecord,
  ContratoObra,
  OperationalRole,
  PolizaFianza,
} from '../types/obra.types';

export type ResourceCategory = 'MAQUINARIA' | 'PERSONAL' | 'EQUIPO';

export interface ResourceCatalogItem {
  id: string;
  categoria: ResourceCategory;
  nombre: string;
  unidad: string;
  totalFlota: number;
}

export interface ResourceAllocation {
  resourceId: string;
  cantidad: number;
}

export interface NewObraInput {
  nombre_obra: string;
  presupuesto_total: number;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  lugar_obra?: string;
  ubicacion?: string;
}

export const RESOURCE_CATALOG: ResourceCatalogItem[] = [
  // Maquinaria pesada (exclusiva por obra)
  { id: 'maq-retro', categoria: 'MAQUINARIA', nombre: 'Retroexcavadora', unidad: 'unid.', totalFlota: 4 },
  { id: 'maq-excavadora', categoria: 'MAQUINARIA', nombre: 'Excavadora', unidad: 'unid.', totalFlota: 3 },
  { id: 'maq-motoniveladora', categoria: 'MAQUINARIA', nombre: 'Motoniveladora', unidad: 'unid.', totalFlota: 2 },
  { id: 'maq-bulldozer', categoria: 'MAQUINARIA', nombre: 'Bulldozer', unidad: 'unid.', totalFlota: 3 },
  { id: 'maq-grua', categoria: 'MAQUINARIA', nombre: 'Grúa hidráulica', unidad: 'unid.', totalFlota: 3 },
  { id: 'maq-bomba', categoria: 'MAQUINARIA', nombre: 'Bomba de concreto', unidad: 'unid.', totalFlota: 2 },
  { id: 'maq-comp', categoria: 'MAQUINARIA', nombre: 'Compactador vibratorio', unidad: 'unid.', totalFlota: 4 },
  { id: 'maq-volteo', categoria: 'MAQUINARIA', nombre: 'Camión de volteo (14 m³)', unidad: 'unid.', totalFlota: 8 },

  // Personal involucrado por especialidad
  { id: 'per-albanil', categoria: 'PERSONAL', nombre: 'Oficiales albañiles', unidad: 'trab.', totalFlota: 45 },
  { id: 'per-peon', categoria: 'PERSONAL', nombre: 'Peones / Ayudantes generales', unidad: 'trab.', totalFlota: 60 },
  { id: 'per-fierrero', categoria: 'PERSONAL', nombre: 'Fierreros y armadores', unidad: 'trab.', totalFlota: 30 },
  { id: 'per-carpintero', categoria: 'PERSONAL', nombre: 'Carpinteros y encofradores', unidad: 'trab.', totalFlota: 25 },
  { id: 'per-electricista', categoria: 'PERSONAL', nombre: 'Electricistas y plomeros', unidad: 'trab.', totalFlota: 15 },
  { id: 'per-operador', categoria: 'PERSONAL', nombre: 'Operadores de maquinaria', unidad: 'trab.', totalFlota: 12 },
  { id: 'per-topo', categoria: 'PERSONAL', nombre: 'Topógrafos y técnicos', unidad: 'trab.', totalFlota: 8 },

  // Equipo menor y medición
  { id: 'eq-revolvedora', categoria: 'EQUIPO', nombre: 'Revolvedora de concreto', unidad: 'eq.', totalFlota: 6 },
  { id: 'eq-vibrador', categoria: 'EQUIPO', nombre: 'Vibrador de inmersión', unidad: 'eq.', totalFlota: 8 },
  { id: 'eq-estacion', categoria: 'EQUIPO', nombre: 'Estación total / Nivel óptico', unidad: 'eq.', totalFlota: 4 },
  { id: 'eq-soldar', categoria: 'EQUIPO', nombre: 'Planta de soldar', unidad: 'eq.', totalFlota: 5 },
  { id: 'eq-cortadora', categoria: 'EQUIPO', nombre: 'Cortadora de concreto / acero', unidad: 'eq.', totalFlota: 5 },
  { id: 'eq-taladro', categoria: 'EQUIPO', nombre: 'Taladros', unidad: 'eq.', totalFlota: 10 },
  { id: 'eq-soldadora', categoria: 'EQUIPO', nombre: 'Soldadora', unidad: 'eq.', totalFlota: 6 },
];

const INITIAL_ALLOCATIONS_BY_OBRA: Record<string, ResourceAllocation[]> = {
  'OP-2024-001': [
    { resourceId: 'maq-grua', cantidad: 2 },
    { resourceId: 'maq-bomba', cantidad: 1 },
    { resourceId: 'per-albanil', cantidad: 18 },
    { resourceId: 'per-peon', cantidad: 20 },
    { resourceId: 'eq-vibrador', cantidad: 3 },
  ],
  'OP-2024-002': [
    { resourceId: 'maq-retro', cantidad: 2 },
    { resourceId: 'maq-comp', cantidad: 2 },
    { resourceId: 'per-albanil', cantidad: 12 },
    { resourceId: 'eq-estacion', cantidad: 1 },
  ],
  'OP-2024-003': [
    { resourceId: 'maq-volteo', cantidad: 3 },
    { resourceId: 'per-peon', cantidad: 15 },
    { resourceId: 'eq-revolvedora', cantidad: 2 },
  ],
};

const INITIAL_CONTRATISTAS: ContratistaRecord[] = [
  {
    id: 'ctr-1',
    rfc: 'CNO9804128A3',
    razon_social: 'Constructora del Norte, S.A. de C.V.',
    dominioCorreo: '@constructoradelnorte.mx',
    registro_iva: 'IVA-NL-980412',
    registro_cmic: 'CMIC-2024-04182',
    registro_padron: 'SOP-PAD-2024-019',
    activo: true,
  },
  {
    id: 'ctr-2',
    rfc: 'IHM0511209K1',
    razon_social: 'Infraestructura Hidráulica MX, S.A.',
    dominioCorreo: '@hidraulicamx.com',
    registro_iva: 'IVA-CDMX-051120',
    registro_cmic: 'CMIC-2024-07210',
    registro_padron: 'SOP-PAD-2024-034',
    activo: true,
  },
  {
    id: 'ctr-3',
    rfc: 'PEV0108154R7',
    razon_social: 'Pavimentos y Estructuras del Valle, S.A. de C.V.',
    dominioCorreo: '@pavimentosvalle.mx',
    registro_cmic: 'CMIC-2024-05309',
    activo: true,
  },
  {
    id: 'ctr-4',
    rfc: 'ECC1203087M2',
    razon_social: 'Edificaciones Civiles del Centro, S.A. de C.V.',
    dominioCorreo: '@edificacionescentro.mx',
    registro_padron: 'SOP-PAD-2024-088',
    activo: true,
  },
  {
    id: 'ctr-5',
    rfc: 'IEU0907223B5',
    razon_social: 'Ingeniería Eléctrica Urbana, S.A. de C.V.',
    dominioCorreo: '@electricaurbana.mx',
    activo: true,
  },
];

const INITIAL_CONTRATOS_BY_OBRA: Record<string, ContratoObra> = {
  'OP-2024-001': {
    id: 'cnt-001',
    obraId: 'OP-2024-001',
    numero_contrato: 'SOP-LP-024/2024',
    monto_contrato: 25000000,
    monto_anticipo: 7500000,
    id_contratista: 'ctr-1',
    fecha_contrato: '2024-05-02',
    fecha_firma: '2024-05-02',
    adendum: 'Convenio Modificatorio CM-01/2024 (ajuste programa)',
    anticipos_por_ejercicio: [
      { id: 'ant-2024-1', anio: 2024, monto: 5000000, porcentaje_amortizacion: 10 },
      { id: 'ant-2025-1', anio: 2025, monto: 2500000, porcentaje_amortizacion: 10 },
    ],
  },
  'OP-2024-002': {
    id: 'cnt-002',
    obraId: 'OP-2024-002',
    numero_contrato: 'SOP-LP-031/2024',
    monto_contrato: 18400000,
    monto_anticipo: 5520000,
    id_contratista: 'ctr-2',
    fecha_contrato: '2024-06-10',
    fecha_firma: '2024-06-10',
    anticipos_por_ejercicio: [
      { id: 'ant-2024-2', anio: 2024, monto: 5520000, porcentaje_amortizacion: 10 },
    ],
  },
  'OP-2024-003': {
    id: 'cnt-003',
    obraId: 'OP-2024-003',
    numero_contrato: 'SOP-LP-045/2024',
    monto_contrato: 32000000,
    monto_anticipo: 9600000,
    id_contratista: 'ctr-3',
    fecha_contrato: '2024-07-05',
    fecha_firma: '2024-07-05',
    anticipos_por_ejercicio: [
      { id: 'ant-2024-3', anio: 2024, monto: 9600000, porcentaje_amortizacion: 10 },
    ],
  },
  'OP-2024-004': {
    id: 'cnt-004',
    obraId: 'OP-2024-004',
    numero_contrato: 'SOP-LP-052/2024',
    monto_contrato: 14200000,
    monto_anticipo: 4260000,
    id_contratista: 'ctr-4',
    fecha_contrato: '2024-09-20',
    fecha_firma: '2024-09-20',
    anticipos_por_ejercicio: [
      { id: 'ant-2025-4', anio: 2025, monto: 4260000, porcentaje_amortizacion: 10 },
    ],
  },
  'OP-2024-005': {
    id: 'cnt-005',
    obraId: 'OP-2024-005',
    numero_contrato: 'SOP-LP-011/2024',
    monto_contrato: 9800000,
    monto_anticipo: 2940000,
    id_contratista: 'ctr-5',
    fecha_contrato: '2024-02-15',
    fecha_firma: '2024-02-15',
    anticipos_por_ejercicio: [
      { id: 'ant-2024-5', anio: 2024, monto: 2940000, porcentaje_amortizacion: 10 },
    ],
  },
};

const INITIAL_POLIZAS_BY_OBRA: Record<string, PolizaFianza[]> = {
  'OP-2024-001': [
    {
      id: 'pol-1',
      obraId: 'OP-2024-001',
      contratoId: 'cnt-001',
      tipo: 'ANTICIPO',
      numero_poliza: 'FNZ-ANT-2024-08914',
      afianzadora: 'Afianzadora Aserta, S.A. de C.V.',
      monto_asegurado: 7500000,
      fecha_emision: '2024-05-03',
      fecha_vencimiento: '2024-12-31',
      estatus: 'VIGENTE',
      archivoNombre: 'Poliza_Anticipo_08914.pdf',
    },
    {
      id: 'pol-2',
      obraId: 'OP-2024-001',
      contratoId: 'cnt-001',
      tipo: 'CUMPLIMIENTO',
      numero_poliza: 'FNZ-CUM-2024-08915',
      afianzadora: 'Afianzadora Aserta, S.A. de C.V.',
      monto_asegurado: 2500000,
      fecha_emision: '2024-05-03',
      fecha_vencimiento: '2025-01-20',
      estatus: 'VIGENTE',
      archivoNombre: 'Poliza_Cumplimiento_08915.pdf',
    },
  ],
  'OP-2024-002': [
    {
      id: 'pol-3',
      obraId: 'OP-2024-002',
      contratoId: 'cnt-002',
      tipo: 'ANTICIPO',
      numero_poliza: 'FNZ-ANT-2024-09102',
      afianzadora: 'Chubb Fianzas Monterrey',
      monto_asegurado: 5520000,
      fecha_emision: '2024-06-12',
      fecha_vencimiento: '2025-02-15',
      estatus: 'VIGENTE',
    },
  ],
};

function formatShortDate(iso: string): string {
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const monthIdx = Math.max(0, Math.min(11, Number(parts[1]) - 1));
  return `${parts[2]} ${months[monthIdx]} ${parts[0]}`;
}

function formatMontoLabel(monto: number): string {
  if (monto >= 1_000_000) {
    return `$${(monto / 1_000_000).toFixed(1)} M`;
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(monto);
}

interface ObraContextValue {
  obras: ObraPortfolioItem[];
  selectedObra: ObraPortfolioItem;
  selectedObraMontoContrato: number;
  selectedConceptos: CatalogoConcepto[];
  contratistas: ContratistaRecord[];
  selectedContrato: ContratoObra | null;
  selectedPolizas: PolizaFianza[];
  pendingBitacoraByRole: Record<OperationalRole, number>;
  selectObraById: (obraId: string) => void;
  addObra: (input: NewObraInput) => ObraPortfolioItem;
  updateObraStatus: (
    obraId: string,
    estado: ObraPortfolioItem['estado'],
    vacanteRol?: string
  ) => void;
  updateObraAvance: (
    obraId: string,
    updates: Partial<Pick<ObraPortfolioItem, 'avanceFisico' | 'avanceProgramado' | 'avanceFinanciero'>>
  ) => void;
  getAvailableForObra: (obraId: string, resourceId: string) => number;
  setObraAllocations: (obraId: string, allocations: ResourceAllocation[]) => void;
  addConceptoToSelectedObra: (concepto: CatalogoConcepto) => void;
  updateConceptoInSelectedObra: (originalClave: string, concepto: CatalogoConcepto) => void;
  importConceptosToSelectedObra: (nuevos: CatalogoConcepto[]) => { added: number; updated: number };
  autorizarAdicionalConcepto: (clave: string, delta: number) => void;
  addContratista: (input: Omit<ContratistaRecord, 'id' | 'activo'>) => ContratistaRecord;
  toggleContratistaActivo: (id: string) => void;
  saveContratoForSelectedObra: (
    input: Omit<ContratoObra, 'id' | 'obraId'>,
    lugarObra?: string
  ) => ContratoObra;
  savePolizaForSelectedObra: (
    input: Omit<PolizaFianza, 'id' | 'obraId' | 'contratoId'> & { id?: string }
  ) => PolizaFianza;
  deletePolizaForSelectedObra: (polizaId: string) => void;
  setPendingBitacoraByRole: (counts: Record<OperationalRole, number>) => void;
}

const ObraContext = createContext<ObraContextValue | undefined>(undefined);

export const ObraProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [obras, setObras] = useState<ObraPortfolioItem[]>(PORTFOLIO_OBRAS_MOCK);
  const [selectedObraId, setSelectedObraId] = useState<string>(
    PORTFOLIO_OBRAS_MOCK[0].id
  );
  const [allocationsByObra, setAllocationsByObra] = useState<
    Record<string, ResourceAllocation[]>
  >(INITIAL_ALLOCATIONS_BY_OBRA);
  const [conceptosByObra, setConceptosByObra] = useState<
    Record<string, CatalogoConcepto[]>
  >(INITIAL_CONCEPTOS_BY_OBRA);
  const [contratistas, setContratistas] =
    useState<ContratistaRecord[]>(INITIAL_CONTRATISTAS);
  const [contratosByObra, setContratosByObra] = useState<
    Record<string, ContratoObra>
  >(INITIAL_CONTRATOS_BY_OBRA);
  const [polizasByObra, setPolizasByObra] = useState<
    Record<string, PolizaFianza[]>
  >(INITIAL_POLIZAS_BY_OBRA);
  const [pendingBitacoraByRole, setPendingBitacoraByRole] = useState<
    Record<OperationalRole, number>
  >({
    RESIDENTE: 2,
    SUPERVISOR: 1,
    SUPERINTENDENTE: 2,
  });

  const selectedObra =
    obras.find((o) => o.id === selectedObraId) ?? obras[0];

  const selectedContrato = contratosByObra[selectedObra.id] ?? null;

  const selectedObraMontoContrato =
    selectedContrato?.monto_contrato ??
    selectedObra.presupuestoTotal ??
    MONTO_CONTRATO_BY_OBRA[selectedObra.id] ??
    25000000;

  const selectedConceptos =
    conceptosByObra[selectedObra.id] ?? INITIAL_CONCEPTOS_BY_OBRA['OP-2024-001'];

  const selectedPolizas = polizasByObra[selectedObra.id] ?? [];

  const selectObraById = (obraId: string) => {
    if (obras.some((o) => o.id === obraId)) {
      setSelectedObraId(obraId);
    }
  };

  const addObra = (input: NewObraInput): ObraPortfolioItem => {
    const nextIdx = obras.length + 1;
    const newId = `OP-2024-${String(nextIdx).padStart(3, '0')}`;
    const lugar = (input.lugar_obra ?? input.ubicacion ?? '').trim() || 'Por definir';
    const created: ObraPortfolioItem = {
      id: newId,
      contrato: 'Sin contrato asignado',
      nombre: input.nombre_obra.trim(),
      ubicacion: lugar,
      contratista: 'Sin contratista asignado',
      estado: 'EN_CONFIGURACION',
      avanceFisico: 0,
      avanceProgramado: 0,
      avanceFinanciero: 0,
      fechaInicio: input.fecha_inicio,
      fechaFinIso: input.fecha_fin,
      fechaTermino: formatShortDate(input.fecha_fin),
      presupuestoTotal: input.presupuesto_total,
      montoLabel: formatMontoLabel(input.presupuesto_total),
      asignados: ['RESIDENTE', 'SUPERVISOR', 'SUPERINTENDENTE'],
    };

    setObras((prev) => [created, ...prev]);
    setConceptosByObra((prev) => ({
      ...prev,
      [newId]: [],
    }));
    return created;
  };

  const updateObraStatus = (
    obraId: string,
    estado: ObraPortfolioItem['estado'],
    vacanteRol?: string
  ) => {
    setObras((prev) =>
      prev.map((o) =>
        o.id === obraId
          ? {
              ...o,
              estado,
              vacanteRol:
                estado === 'ALERTA_VACANTE_OPERATIVA' ? vacanteRol : undefined,
            }
          : o
      )
    );
  };

  const updateObraAvance = (
    obraId: string,
    updates: Partial<
      Pick<ObraPortfolioItem, 'avanceFisico' | 'avanceProgramado' | 'avanceFinanciero'>
    >
  ) => {
    setObras((prev) =>
      prev.map((o) => (o.id === obraId ? { ...o, ...updates } : o))
    );
  };

  const getAvailableForObra = (obraId: string, resourceId: string): number => {
    const item = RESOURCE_CATALOG.find((r) => r.id === resourceId);
    if (!item) return 0;

    let usedInOtherObras = 0;
    for (const [otherObraId, list] of Object.entries(allocationsByObra)) {
      if (otherObraId === obraId) continue;
      const found = list.find((a) => a.resourceId === resourceId);
      if (found) usedInOtherObras += found.cantidad;
    }

    return Math.max(0, item.totalFlota - usedInOtherObras);
  };

  const setObraAllocations = (
    obraId: string,
    allocations: ResourceAllocation[]
  ) => {
    setAllocationsByObra((prev) => ({
      ...prev,
      [obraId]: allocations,
    }));
  };

  const addConceptoToSelectedObra = (concepto: CatalogoConcepto) => {
    setConceptosByObra((prev) => {
      const current = prev[selectedObra.id] ?? INITIAL_CONCEPTOS_BY_OBRA['OP-2024-001'];
      return {
        ...prev,
        [selectedObra.id]: [...current, concepto],
      };
    });
  };

  const updateConceptoInSelectedObra = (
    originalClave: string,
    concepto: CatalogoConcepto
  ) => {
    setConceptosByObra((prev) => {
      const current = prev[selectedObra.id] ?? INITIAL_CONCEPTOS_BY_OBRA['OP-2024-001'];
      return {
        ...prev,
        [selectedObra.id]: current.map((c) =>
          c.clave === originalClave ? concepto : c
        ),
      };
    });
  };

  const importConceptosToSelectedObra = (
    nuevos: CatalogoConcepto[]
  ): { added: number; updated: number } => {
    const existingList =
      conceptosByObra[selectedObra.id] ?? INITIAL_CONCEPTOS_BY_OBRA['OP-2024-001'];
    const merged = [...existingList];
    let added = 0;
    let updated = 0;

    for (const incoming of nuevos) {
      const idx = merged.findIndex(
        (c) => c.clave.toUpperCase() === incoming.clave.toUpperCase()
      );
      if (idx >= 0) {
        merged[idx] = {
          ...merged[idx],
          ...incoming,
          cantidadEjecutada: merged[idx].cantidadEjecutada,
          cantidadAdicionalAutorizada: merged[idx].cantidadAdicionalAutorizada,
        };
        updated += 1;
      } else {
        merged.push(incoming);
        added += 1;
      }
    }

    setConceptosByObra((prev) => ({
      ...prev,
      [selectedObra.id]: merged,
    }));
    return { added, updated };
  };

  const autorizarAdicionalConcepto = (clave: string, delta: number) => {
    setConceptosByObra((prev) => {
      const current = prev[selectedObra.id] ?? INITIAL_CONCEPTOS_BY_OBRA['OP-2024-001'];
      return {
        ...prev,
        [selectedObra.id]: current.map((c) =>
          c.clave === clave
            ? { ...c, cantidadAdicionalAutorizada: c.cantidadAdicionalAutorizada + delta }
            : c
        ),
      };
    });
  };

  const addContratista = (
    input: Omit<ContratistaRecord, 'id' | 'activo'>
  ): ContratistaRecord => {
    const created: ContratistaRecord = {
      id: `ctr-${Date.now()}`,
      rfc: input.rfc.trim().toUpperCase(),
      razon_social: input.razon_social.trim(),
      dominioCorreo: input.dominioCorreo?.trim().toLowerCase() || undefined,
      registro_iva: input.registro_iva?.trim() || undefined,
      registro_cmic: input.registro_cmic?.trim() || undefined,
      registro_padron: input.registro_padron?.trim() || undefined,
      activo: true,
    };
    setContratistas((prev) => [created, ...prev]);
    return created;
  };

  const toggleContratistaActivo = (id: string) => {
    setContratistas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, activo: !c.activo } : c))
    );
  };

  const saveContratoForSelectedObra = (
    input: Omit<ContratoObra, 'id' | 'obraId'>,
    lugarObra?: string
  ): ContratoObra => {
    const existing = contratosByObra[selectedObra.id];
    const saved: ContratoObra = {
      id: existing?.id ?? `cnt-${Date.now()}`,
      obraId: selectedObra.id,
      ...input,
      fecha_firma: input.fecha_contrato ?? input.fecha_firma,
    };
    setContratosByObra((prev) => ({
      ...prev,
      [selectedObra.id]: saved,
    }));

    const contratista = contratistas.find((c) => c.id === input.id_contratista);
    setObras((prev) =>
      prev.map((o) =>
        o.id === selectedObra.id
          ? {
              ...o,
              contrato: input.numero_contrato,
              contratista: contratista?.razon_social ?? o.contratista,
              ubicacion: lugarObra?.trim() ? lugarObra.trim() : o.ubicacion,
              presupuestoTotal: input.monto_contrato,
              montoLabel: formatMontoLabel(input.monto_contrato),
            }
          : o
      )
    );
    return saved;
  };

  const savePolizaForSelectedObra = (
    input: Omit<PolizaFianza, 'id' | 'obraId' | 'contratoId'> & { id?: string }
  ): PolizaFianza => {
    const contratoId = contratosByObra[selectedObra.id]?.id ?? `cnt-${selectedObra.id}`;
    const saved: PolizaFianza = {
      id: input.id ?? `pol-${Date.now()}`,
      obraId: selectedObra.id,
      contratoId,
      tipo: input.tipo,
      numero_poliza: input.numero_poliza.trim(),
      afianzadora: input.afianzadora.trim(),
      monto_asegurado: input.monto_asegurado,
      fecha_emision: input.fecha_emision,
      fecha_vencimiento: input.fecha_vencimiento,
      estatus: input.estatus,
      archivoNombre: input.archivoNombre,
    };

    setPolizasByObra((prev) => {
      const current = prev[selectedObra.id] ?? [];
      const exists = current.some((p) => p.id === saved.id);
      return {
        ...prev,
        [selectedObra.id]: exists
          ? current.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...current],
      };
    });
    return saved;
  };

  const deletePolizaForSelectedObra = (polizaId: string) => {
    setPolizasByObra((prev) => ({
      ...prev,
      [selectedObra.id]: (prev[selectedObra.id] ?? []).filter((p) => p.id !== polizaId),
    }));
  };

  return (
    <ObraContext.Provider
      value={{
        obras,
        selectedObra,
        selectedObraMontoContrato,
        selectedConceptos,
        contratistas,
        selectedContrato,
        selectedPolizas,
        pendingBitacoraByRole,
        selectObraById,
        addObra,
        updateObraStatus,
        updateObraAvance,
        getAvailableForObra,
        setObraAllocations,
        addConceptoToSelectedObra,
        updateConceptoInSelectedObra,
        importConceptosToSelectedObra,
        autorizarAdicionalConcepto,
        addContratista,
        toggleContratistaActivo,
        saveContratoForSelectedObra,
        savePolizaForSelectedObra,
        deletePolizaForSelectedObra,
        setPendingBitacoraByRole,
      }}
    >
      {children}
    </ObraContext.Provider>
  );
};

export function useObra(): ObraContextValue {
  const ctx = useContext(ObraContext);
  if (!ctx) {
    throw new Error('useObra debe utilizarse dentro de un ObraProvider');
  }
  return ctx;
}
