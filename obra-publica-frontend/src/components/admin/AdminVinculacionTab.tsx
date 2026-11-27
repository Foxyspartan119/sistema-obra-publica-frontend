import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Building2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useObra } from '../../context/ObraContext';

export interface ObraAsignacionRow {
  obraId: string;
  contrato: string;
  obraNombre: string;
  estadoObra:
    | 'EN_EJECUCION'
    | 'ALERTA_VACANTE_OPERATIVA'
    | 'EN_CONFIGURACION'
    | 'SUSPENDIDA'
    | 'FINIQUITADA';
  residente: string | null;
  supervisor: string | null;
  superintendente: string | null;
}

const INITIAL_STAFF_BY_OBRA: Record<
  string,
  { residente: string | null; supervisor: string | null; superintendente: string | null }
> = {
  'OP-2024-001': {
    residente: 'Ing. Marco Torres',
    supervisor: 'Ing. Lucía Ramírez',
    superintendente: 'Ing. Javier Mendoza',
  },
  'OP-2024-002': {
    residente: null,
    supervisor: 'Ing. Lucía Ramírez',
    superintendente: 'Ing. Javier Mendoza',
  },
  'OP-2024-003': {
    residente: 'Ing. Marco Torres',
    supervisor: 'Ing. Sofía Navarro',
    superintendente: 'Ing. Javier Mendoza',
  },
  'OP-2024-004': {
    residente: null,
    supervisor: null,
    superintendente: null,
  },
  'OP-2024-005': {
    residente: 'Ing. Roberto Salas',
    supervisor: 'Ing. Lucía Ramírez',
    superintendente: 'Ing. Daniel Cruz',
  },
};

const CANDIDATOS_POR_ROL: Record<'residente' | 'supervisor' | 'superintendente', string[]> = {
  residente: ['Ing. Marco Torres', 'Ing. Roberto Salas', 'Ing. Elena Ruiz'],
  supervisor: ['Ing. Lucía Ramírez', 'Ing. Sofía Navarro', 'Ing. Diego Hernández'],
  superintendente: ['Ing. Javier Mendoza', 'Ing. Daniel Cruz'],
};

export const AdminVinculacionTab: React.FC = () => {
  const { obras, addObra, updateObraStatus } = useObra();
  const [staffByObra, setStaffByObra] = useState(INITIAL_STAFF_BY_OBRA);
  const [selectedObraId, setSelectedObraId] = useState(obras[1]?.id ?? obras[0]?.id ?? '');
  const [rolSlot, setRolSlot] = useState<'residente' | 'supervisor' | 'superintendente'>('residente');
  const [usuarioElegido, setUsuarioElegido] = useState(CANDIDATOS_POR_ROL.residente[0]);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Modal Alta de Obra nueva (nombre_obra, presupuesto_total, fecha_inicio, fecha_fin)
  const [showNewObraModal, setShowNewObraModal] = useState(false);
  const [nombreObra, setNombreObra] = useState('');
  const [presupuestoTotal, setPresupuestoTotal] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [obraError, setObraError] = useState<string | null>(null);

  useEffect(() => {
    if (!obras.some((o) => o.id === selectedObraId) && obras.length > 0) {
      setSelectedObraId(obras[0].id);
    }
  }, [obras, selectedObraId]);

  const filas: ObraAsignacionRow[] = obras.map((o) => {
    const staff = staffByObra[o.id] ?? {
      residente: null,
      supervisor: null,
      superintendente: null,
    };
    const estadoValidado = (
      o.estado === 'EN_EJECUCION' ||
      o.estado === 'ALERTA_VACANTE_OPERATIVA' ||
      o.estado === 'EN_CONFIGURACION' ||
      o.estado === 'SUSPENDIDA' ||
      o.estado === 'FINIQUITADA'
        ? o.estado
        : 'EN_CONFIGURACION'
    ) as ObraAsignacionRow['estadoObra'];

    return {
      obraId: o.id,
      contrato: o.contrato,
      obraNombre: o.nombre,
      estadoObra: estadoValidado,
      ...staff,
    };
  });

  const handleAsignar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const currentStaff = staffByObra[selectedObraId] ?? {
      residente: null,
      supervisor: null,
      superintendente: null,
    };
    const updatedStaff = {
      ...currentStaff,
      [rolSlot]: usuarioElegido,
    };

    setStaffByObra((prev) => ({
      ...prev,
      [selectedObraId]: updatedStaff,
    }));

    const completo =
      Boolean(updatedStaff.residente) &&
      Boolean(updatedStaff.supervisor) &&
      Boolean(updatedStaff.superintendente);

    const targetObra = obras.find((o) => o.id === selectedObraId);
    if (
      completo &&
      targetObra &&
      (targetObra.estado === 'ALERTA_VACANTE_OPERATIVA' ||
        targetObra.estado === 'EN_CONFIGURACION')
    ) {
      updateObraStatus(selectedObraId, 'EN_EJECUCION');
    }

    setMensaje(
      `Relevo / asignación registrada en ${selectedObraId} para ${rolSlot.toUpperCase()}: ${usuarioElegido} (RN-ADM-03.5 / RN-ADM-03.7).`
    );
  };

  const handleCreateObra = (e: React.FormEvent) => {
    e.preventDefault();
    setObraError(null);

    const monto = Number(presupuestoTotal);
    if (!nombreObra.trim()) {
      setObraError('Captura el nombre de la obra.');
      return;
    }
    if (Number.isNaN(monto) || monto <= 0) {
      setObraError('El presupuesto total debe ser un monto mayor a $0 MXN.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setObraError('Selecciona la fecha de inicio y la fecha de término.');
      return;
    }
    if (fechaFin < fechaInicio) {
      setObraError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const creada = addObra({
      nombre_obra: nombreObra,
      presupuesto_total: monto,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      ubicacion,
    });

    setStaffByObra((prev) => ({
      ...prev,
      [creada.id]: { residente: null, supervisor: null, superintendente: null },
    }));
    setSelectedObraId(creada.id);
    setNombreObra('');
    setPresupuestoTotal('');
    setFechaInicio('');
    setFechaFin('');
    setUbicacion('');
    setShowNewObraModal(false);
    setMensaje(
      `Obra nueva registrada correctamente (${creada.id} · ${creada.nombre}) con presupuesto de ${creada.montoLabel} MXN.`
    );
  };

  return (
    <div className="space-y-5">
      {/* Acción rápida: Alta de Obra Nueva */}
      <div className="bg-surface border border-line rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-info-bg text-accent flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Catálogo de Obras y Asignación Operativa
            </h2>
            <p className="text-[11px] text-fg-muted">
              Da de alta nuevas obras públicas y vincula Residente, Supervisor y Superintendente.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setObraError(null);
            setShowNewObraModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Alta de Obra nueva</span>
        </button>
      </div>

      <form
        onSubmit={handleAsignar}
        className="bg-surface border border-line rounded-xl p-5 space-y-4 text-xs"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Asignación y relevo de personal operativo (RF-ADM-03)
            </h2>
            <p className="text-[11px] text-fg-muted mt-0.5">
              Máximo 1 Residente, 1 Supervisor y 1 Superintendente activos por obra (RN-ADM-03.2).
            </p>
          </div>
          <RefreshCw className="w-4 h-4 text-accent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-fg-muted">Obra</label>
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
            >
              {filas.map((f) => (
                <option key={f.obraId} value={f.obraId}>
                  {f.obraId} · {f.obraNombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-fg-muted">Área / Rol operativo</label>
            <select
              value={rolSlot}
              onChange={(e) => {
                const nextSlot = e.target.value as
                  | 'residente'
                  | 'supervisor'
                  | 'superintendente';
                setRolSlot(nextSlot);
                setUsuarioElegido(CANDIDATOS_POR_ROL[nextSlot][0]);
              }}
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
            >
              <option value="residente">RESIDENTE</option>
              <option value="supervisor">SUPERVISOR</option>
              <option value="superintendente">SUPERINTENDENTE</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-fg-muted">Usuario activo asignado</label>
            <select
              value={usuarioElegido}
              onChange={(e) => setUsuarioElegido(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
            >
              {CANDIDATOS_POR_ROL[rolSlot].map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mensaje && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ok-bg text-ok-fg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensaje}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Guardar asignación / relevo</span>
          </button>
        </div>
      </form>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="divide-y divide-line text-xs">
          {filas.map((row) => (
            <div key={row.obraId} className="p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-accent mr-2">{row.obraId}</span>
                  <span className="font-semibold text-fg">{row.obraNombre}</span>
                </div>
                <StatusBadge status={row.estadoObra} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-fg-muted block">Residente</span>
                  <span className="font-medium">
                    {row.residente ?? (
                      <span className="inline-flex items-center gap-1 text-danger-fg">
                        <AlertTriangle className="w-3.5 h-3.5" /> Vacante descubierta
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-fg-muted block">Supervisor</span>
                  <span className="font-medium">{row.supervisor ?? 'Vacante'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-fg-muted block">Superintendente</span>
                  <span className="font-medium">{row.superintendente ?? 'Vacante'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Alta de Obra Nueva */}
      {showNewObraModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNewObraModal(false)}
        >
          <form
            onSubmit={handleCreateObra}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5 text-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-fg">Alta de Obra nueva</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewObraModal(false)}
                aria-label="Cerrar"
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-fg-soft mb-1">
                Nombre de la obra (nombre_obra) *
              </label>
              <input
                type="text"
                value={nombreObra}
                onChange={(e) => setNombreObra(e.target.value)}
                placeholder="Ej. Construcción de Paso Desnivel Norte"
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Presupuesto total MXN (presupuesto_total) *
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={presupuestoTotal}
                  onChange={(e) => setPresupuestoTotal(e.target.value)}
                  placeholder="Ej. 18500000"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Alcaldía / Municipio, Estado"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Fecha de inicio (fecha_inicio) *
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Fecha de fin (fecha_fin) *
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            {obraError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-danger-fg"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{obraError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowNewObraModal(false)}
                className="px-3 py-1.5 rounded-lg border border-line-strong font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
              >
                Registrar obra
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
