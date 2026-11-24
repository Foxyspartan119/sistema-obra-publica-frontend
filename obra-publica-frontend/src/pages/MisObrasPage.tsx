import React, { useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, type BadgeVariant } from '../components/common/StatusBadge';

export interface ObraPortfolioItem {
  id: string;
  contrato: string;
  nombre: string;
  ubicacion: string;
  contratista: string;
  estado: BadgeVariant;
  vacanteRol?: string;
  avanceFisico: number;
  avanceFinanciero: number;
  fechaTermino: string;
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
    avanceFinanciero: 58,
    fechaTermino: '20 dic 2024',
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
    avanceFinanciero: 40,
    fechaTermino: '15 ene 2025',
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
    avanceFinanciero: 28,
    fechaTermino: '30 mar 2025',
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
    avanceFinanciero: 0,
    fechaTermino: '10 ago 2025',
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
    avanceFinanciero: 100,
    fechaTermino: '30 sep 2024',
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');

  const isGlobalViewer =
    user?.rol === 'DIRECTIVO' || user?.rol === 'ADMINISTRADOR';

  const visibleObras = useMemo(() => {
    return PORTFOLIO_OBRAS_MOCK.filter((obra) => {
      // RN-ADM-03.1: Directivo/Admin ven todas; operativos solo donde están asignados
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
  }, [isGlobalViewer, user, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isGlobalViewer ? 'Portafolio institucional global' : 'Obras asignadas'}
          </p>
          <h1 className="text-2xl font-normal text-slate-900 dark:text-white hc:text-black tracking-tight mt-0.5">
            Mis Obras
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-brand dark:text-blue-300 text-xs font-semibold self-start">
          <Building2 className="w-4 h-4" />
          <span>{visibleObras.length} obra(s) disponibles</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clave, contrato, nombre o ubicación"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand"
          />
        </div>

        <select
          aria-label="Filtrar por estatus"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
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
          return (
            <div
              key={obra.id}
              className={`bg-white dark:bg-slate-900 hc:bg-white rounded-xl p-5 border transition-colors flex flex-col justify-between gap-4 ${
                isSelected
                  ? 'border-brand ring-1 ring-brand/30 hc:border-2 hc:border-black'
                  : 'border-slate-200 dark:border-slate-800 hc:border-2 hc:border-black'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold text-brand">
                    {obra.id} · {obra.contrato}
                  </span>
                  <StatusBadge status={obra.estado} />
                </div>

                <h2 className="text-sm font-semibold text-slate-900 dark:text-white hc:text-black">
                  {obra.nombre}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {obra.ubicacion}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Término: {obra.fechaTermino}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {obra.montoLabel} MXN
                  </span>
                </div>

                {obra.estado === 'ALERTA_VACANTE_OPERATIVA' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Requiere suplente de <strong>{obra.vacanteRol}</strong>. Trámites pausados
                      (RN-ADM-03.4).
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Avance físico</span>
                      <span className="font-semibold text-brand">{obra.avanceFisico}%</span>
                    </div>
                    <div className="h-1.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${obra.avanceFisico}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Avance financiero</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {obra.avanceFinanciero}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${obra.avanceFinanciero}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 truncate">
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
    </div>
  );
};