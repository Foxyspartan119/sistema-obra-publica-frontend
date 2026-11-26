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

// Asignaciones activas en otras obras (lo usado en Obra B ya no está disponible en Obra A)
const INITIAL_ALLOCATIONS_BY_OBRA: Record<string, ResourceAllocation[]> = {
  'OP-2024-001': [
    { resourceId: 'maq-grua', cantidad: 2 },
    { resourceId: 'maq-bomba', cantidad: 1 },
    { resourceId: 'per-albanil', cantidad: 18 },
    { resourceId: 'per-peon', cantidad: 20 },
    { resourceId: 'eq-vibrador', cantidad: 3 },
  ],
  'OP-2024-002': [
    { resourceId: 'maq-retro', cantidad: 2 }, // Ocupa 2 de 4 retroexcavadoras -> quedan 2 para otras obras
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

interface ObraContextValue {
  obras: ObraPortfolioItem[];
  selectedObra: ObraPortfolioItem;
  selectedObraMontoContrato: number;
  selectedConceptos: CatalogoConcepto[];
  selectObraById: (obraId: string) => void;
  updateObraStatus: (
    obraId: string,
    estado: ObraPortfolioItem['estado'],
    vacanteRol?: string
  ) => void;
  getAvailableForObra: (obraId: string, resourceId: string) => number;
  setObraAllocations: (obraId: string, allocations: ResourceAllocation[]) => void;
  addConceptoToSelectedObra: (concepto: CatalogoConcepto) => void;
  autorizarAdicionalConcepto: (clave: string, delta: number) => void;
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

  const selectedObra =
    obras.find((o) => o.id === selectedObraId) ?? obras[0];

  const selectedObraMontoContrato =
    MONTO_CONTRATO_BY_OBRA[selectedObra.id] ?? 25000000;

  const selectedConceptos =
    conceptosByObra[selectedObra.id] ?? INITIAL_CONCEPTOS_BY_OBRA['OP-2024-001'];

  const selectObraById = (obraId: string) => {
    if (obras.some((o) => o.id === obraId)) {
      setSelectedObraId(obraId);
    }
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

  return (
    <ObraContext.Provider
      value={{
        obras,
        selectedObra,
        selectedObraMontoContrato,
        selectedConceptos,
        selectObraById,
        updateObraStatus,
        getAvailableForObra,
        setObraAllocations,
        addConceptoToSelectedObra,
        autorizarAdicionalConcepto,
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