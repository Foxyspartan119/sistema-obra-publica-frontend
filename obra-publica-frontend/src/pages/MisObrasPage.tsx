import React, { useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Building2,
  Plus,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import { StatusBadge, type BadgeVariant } from '../components/common/StatusBadge';

export interface ObraPortfolioItem {
  id: string;
  contrato: string;
  nombre: string;
  ubicacion: string;
  contratista: string;
  estado: BadgeVariant;
  vacanteRol?: string;
  avanceFisico: number;      // Avance físico real validado
  avanceProgramado: number;  // Avance físico programado contractual
  avanceFinanciero: number;  // Avance financiero ejercido/pagado
  fechaInicio?: string;      // YYYY-MM-DD
  fechaFinIso?: string;      // YYYY-MM-DD
  fechaTermino: string;
  presupuestoTotal?: number;
  montoLabel: string;
  asignados: string[];
}

export const PORTFOLIO_OBRAS_MOCK: ObraPortfolioItem[] = [
  {
    id: 'OP-2024-001',
    contrato: 'SOP-LP-024/2024',
    nombre: 'Construcción de Puente Vehicular OP-2024-001',
    ubicacion: 'San Pedro, Nuevo León',
    contratista: 'Constructora del Norte, S.A. de C.V.',
    estado: 'EN_EJECUCION',
    avanceFisico: 62,
    avanceProgramado: 65,
    avanceFinanciero: 58,
    fechaInicio: '2024-05-06',
    fechaFinIso: '2024-12-20',
    fechaTermino: '20 dic 2024',
    presupuestoTotal: 25000000,
    montoLabel: '$25.0 M',
    asignados: ['RESIDENTE', 'SUPERVISOR', 'SUPERINTENDENTE'],
  },
  {
    id: 'OP-2024-002',
    contrato: 'SOP-LP-031/2024',
    nombre: 'Rehabilitación de Colector Pluvial Zona Norte',
    ubicacion: 'Gustavo A. Madero, CDMX',
    contratista: 'Infraestructura Hidráulica MX, S.A.',
    estado: 'ALERTA_VACANTE_OPERATIVA',
    vacanteRol: 'RESIDENTE',
    avanceFisico: 44,
    avanceProgramado: 48,
    avanceFinanciero: 40,
    fechaInicio: '2024-06-15',
    fechaFinIso: '2025-01-15',
    fechaTermino: '15 ene 2025',
    presupuestoTotal: 18400000,
    montoLabel: '$18.4 M',
    asignados: ['SUPERVISOR', 'SUPERINTENDENTE'],
  },
  {
    id: 'OP-2024-003',
    contrato: 'SOP-LP-045/2024',
    nombre: 'Modernización de Vialidad Primaria Av. Politécnico',
    ubicacion: 'Lindavista, CDMX',
    contratista: 'Pavimentos y Estructuras del Valle',
    estado: 'SUSPENDIDA',
    avanceFisico: 31,
    avanceProgramado: 31,
    avanceFinanciero: 28,
    fechaInicio: '2024-07-10',
    fechaFinIso: '2025-03-30',
    fechaTermino: '30 mar 2025',
    presupuestoTotal: 32000000,
    montoLabel: '$32.0 M',
    asignados: ['RESIDENTE', 'SUPERVISOR', 'SUPERINTENDENTE'],
  },
  {
    id: 'OP-2024-004',
    contrato: 'SOP-LP-052/2024',
    nombre: 'Construcción de Centro de Salud Comunitario',
    ubicacion: 'Azcapotzalco, CDMX',
    contratista: 'Edificaciones Civiles del Centro',
    estado: 'EN_CONFIGURACION',
    avanceFisico: 0,
    avanceProgramado: 0,
    avanceFinanciero: 0,
    fechaInicio: '2025-01-15',
    fechaFinIso: '2025-08-10',
    fechaTermino: '10 ago 2025',
    presupuestoTotal: 14200000,
    montoLabel: '$14.2 M',
    asignados: [],
  },
  {
    id: 'OP-2024-005',
    contrato: 'SOP-LP-011/2024',
    nombre: 'Sustitución de Red de Alumbrado Público Etapa I',
    ubicacion: 'Miguel Hidalgo, CDMX',
    contratista: 'Ingeniería Eléctrica Urbana',
    estado: 'FINIQUITADA',
    avanceFisico: 100,
    avanceProgramado: 100,
    avanceFinanciero: 100,
    fechaInicio: '2024-02-20',
    fechaFinIso: '2024-09-30',
    fechaTermino: '30 sep 2024',
    presupuestoTotal: 9800000,
    montoLabel: '$9.8 M',
    asignados: ['RESIDENTE', 'SUPERVISOR', 'SUPERINTENDENTE'],
  },
];

interface MisObrasPageProps {
  selectedObraId?: string;
  onSelectObra: (obra: ObraPortfolioItem) => void;
}

export const MisObrasPage: React.FC<MisObrasPageProps> = ({
  selectedObraId = 'OP-2024-001',
  onSelectObra,
}) => {
  const { user } = useAuth();
  const { obras, addObra } = useObra();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');
  const [showNewObraModal, setShowNewObraModal] = useState(false);
  const [nombreObra, setNombreObra] = useState('');
  const [presupuestoTotal, setPresupuestoTotal] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [obraError, setObraError] = useState<string | null>(null);

  const isGlobalViewer =
    user?.rol === 'DIRECTIVO' || user?.rol === 'ADMINISTRADOR';
  const canCreateObra =
    user?.rol === 'ADMINISTRADOR' || user?.rol === 'RESIDENTE';

  const visibleObras = useMemo(() => {
    return obras.filter((obra) => {
      if (!isGlobalViewer && user && !obra.asignados.includes(user.rol)) {
        return false;
      }
      if (statusFilter !== 'TODAS' && obra.estado !== statusFilter) {
        return false;
      }
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        obra.id.toLowerCase().includes(q) ||
        obra.nombre.toLowerCase().includes(q) ||
        obra.contrato.toLowerCase().includes(q) ||
        obra.ubicacion.toLowerCase().includes(q)
      );
    });
  }, [obras, isGlobalViewer, user, search, statusFilter]);

  const handleCreateObra = (e: React.FormEvent) => {
    e.preventDefault();
    setObraError(null);
    const monto = Number(presupuestoTotal);

    if (!nombreObra.trim()) {
      setObraError('Captura el nombre de la obra.');
      return;
    }
    if (Number.isNaN(monto) || monto <= 0) {
      setObraError('El presupuesto total debe ser mayor a $0 MXN.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setObraError('Captura las fechas de inicio y fin de la obra.');
      return;
    }
    if (fechaFin < fechaInicio) {
      setObraError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    addObra({
      nombre_obra: nombreObra,
      presupuesto_total: monto,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      lugar_obra: ubicacion,
    });

    setNombreObra('');
    setPresupuestoTotal('');
    setFechaInicio('');
    setFechaFin('');
    setUbicacion('');
    setShowNewObraModal(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            {isGlobalViewer ? 'Portafolio institucional global' : 'Obras asignadas'}
          </p>
          <h1 className="text-2xl font-normal text-fg tracking-tight mt-0.5">
            Mis Obras
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-info-bg text-accent text-xs font-semibold">
            <Building2 className="w-4 h-4" />
            <span>{visibleObras.length} obra(s) disponibles</span>
          </div>
          {canCreateObra && (
            <button
              type="button"
              onClick={() => {
                setObraError(null);
                setShowNewObraModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Alta de Obra nueva</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clave, contrato, nombre o ubicación"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-line text-fg focus:border-brand"
          />
        </div>

        <select
          aria-label="Filtrar por estatus"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-surface border border-line text-fg-soft cursor-pointer"
        >
          <option value="TODAS">Todos los estatus</option>
          <option value="EN_EJECUCION">En ejecución</option>
          <option value="ALERTA_VACANTE_OPERATIVA">Alerta de vacante</option>
          <option value="EN_CONFIGURACION">En configuración</option>
          <option value="SUSPENDIDA">Suspendida</option>
          <option value="FINIQUITADA">Finiquitada</option>
        </select>
      </div>

      {/* Listado de obras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleObras.map((obra) => {
          const isSelected = obra.id === selectedObraId;
          const desviacion = obra.avanceFisico - obra.avanceProgramado;

          return (
            <div
              key={obra.id}
              className={`bg-surface rounded-xl p-5 border transition-colors flex flex-col justify-between gap-4 ${
                isSelected ? 'border-brand ring-1 ring-brand/30' : 'border-line'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold text-accent">
                    {obra.id} · {obra.contrato}
                  </span>
                  <StatusBadge status={obra.estado} />
                </div>

                <h2 className="text-sm font-semibold text-fg">{obra.nombre}</h2>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {obra.ubicacion}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Término: {obra.fechaTermino}
                  </span>
                  <span className="font-medium text-fg-soft">
                    {obra.montoLabel} MXN
                  </span>
                </div>

                {obra.estado === 'ALERTA_VACANTE_OPERATIVA' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger-bg border border-danger-line text-[11px] text-danger-fg">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Requiere suplente de <strong>{obra.vacanteRol}</strong>. Trámites pausados
                      (RN-ADM-03.4).
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-line">
                {/* Diferenciación explícita de los 3 avances */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-fg-muted">Físico real</span>
                      <span className="font-semibold text-accent">{obra.avanceFisico}%</span>
                    </div>
                    <div className="h-1.5 bg-info-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${obra.avanceFisico}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-fg-muted">Físico programado</span>
                      <span className="font-semibold text-fg-soft">
                        {obra.avanceProgramado}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-fg-muted rounded-full"
                        style={{ width: `${obra.avanceProgramado}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-fg-muted">Financiero</span>
                      <span className="font-semibold text-ok-fg">
                        {obra.avanceFinanciero}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-ok-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ok-solid rounded-full"
                        style={{ width: `${obra.avanceFinanciero}%` }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-fg-muted">
                  Desviación física (Real vs. Programado):{' '}
                  <strong className={desviacion < 0 ? 'text-warn-fg' : 'text-ok-fg'}>
                    {desviacion > 0 ? `+${desviacion}` : desviacion} pp
                  </strong>
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-fg-muted truncate">
                    {obra.contratista}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectObra(obra)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <span>{isSelected ? 'Obra activa · Abrir' : 'Seleccionar obra'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
                placeholder="Ej. Rehabilitación de Puente Peatonal Sur"
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Presupuesto total MXN *
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={presupuestoTotal}
                  onChange={(e) => setPresupuestoTotal(e.target.value)}
                  placeholder="Ej. 15000000"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Lugar de la obra (lugar_obra)
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. San Pedro Garza García, N.L."
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-fg-soft mb-1">
                  Fecha de inicio *
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
                  Fecha de fin *
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