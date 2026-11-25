import React, { createContext, useContext, useState } from 'react';
import {
  PORTFOLIO_OBRAS_MOCK,
  type ObraPortfolioItem,
} from '../pages/MisObrasPage';

interface ObraContextValue {
  obras: ObraPortfolioItem[];
  selectedObra: ObraPortfolioItem;
  selectObraById: (obraId: string) => void;
  updateObraStatus: (
    obraId: string,
    estado: ObraPortfolioItem['estado'],
    vacanteRol?: string
  ) => void;
}

const ObraContext = createContext<ObraContextValue | undefined>(undefined);

export const ObraProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [obras, setObras] = useState<ObraPortfolioItem[]>(PORTFOLIO_OBRAS_MOCK);
  const [selectedObraId, setSelectedObraId] = useState<string>(
    PORTFOLIO_OBRAS_MOCK[0].id
  );

  const selectedObra =
    obras.find((o) => o.id === selectedObraId) ?? obras[0];

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
              vacanteRol: estado === 'ALERTA_VACANTE_OPERATIVA' ? vacanteRol : undefined,
            }
          : o
      )
    );
  };

  return (
    <ObraContext.Provider
      value={{ obras, selectedObra, selectObraById, updateObraStatus }}
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