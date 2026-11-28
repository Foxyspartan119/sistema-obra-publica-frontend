export type UserRole =
  | 'ADMINISTRADOR'
  | 'DIRECTIVO'
  | 'RESIDENTE'
  | 'SUPERVISOR'
  | 'SUPERINTENDENTE';

export type OperationalRole = 'RESIDENTE' | 'SUPERVISOR' | 'SUPERINTENDENTE';

export const OPERATIONAL_SIGNER_ROLES: readonly OperationalRole[] = [
  'RESIDENTE',
  'SUPERVISOR',
  'SUPERINTENDENTE',
];

export type ObraStatus =
  | 'EN_CONFIGURACION'
  | 'EN_EJECUCION'
  | 'ALERTA_VACANTE_OPERATIVA'
  | 'SUSPENDIDA'
  | 'FINIQUITADA';

export type AccessibilityTheme = 'claro' | 'alto-contraste' | 'oscuro';

export interface UserSession {
  id: number;
  nombre: string;
  correo: string;
  rol: UserRole;
  area: string;
  rfc?: string;
  obrasAsignadas: string[];
}

export interface ObraResumen {
  id: string;
  nombre: string;
  contrato: string;
  ubicacion: string;
  estado: ObraStatus;
  vacanteRol?: UserRole;
  avanceFisico: number;
  avanceFinanciero: number;
  presupuestoTotal: number;
}

export interface ContratistaRecord {
  id: string;
  rfc: string;
  razon_social: string;
  dominioCorreo?: string;
  registro_iva?: string;
  registro_cmic?: string;
  registro_padron?: string;
  activo: boolean;
}

export interface AnticipoEjercicioFiscal {
  id: string;
  anio: number;
  monto: number;
  porcentaje_amortizacion: number; // default 10 (%)
}

export interface ContratoObra {
  id: string;
  obraId: string;
  numero_contrato: string;
  monto_contrato: number;
  monto_anticipo: number;
  id_contratista: string;
  fecha_contrato?: string;
  fecha_firma?: string;
  adendum?: string;
  anticipos_por_ejercicio: AnticipoEjercicioFiscal[];
}

export type TipoPolizaFianza = 'ANTICIPO' | 'CUMPLIMIENTO' | 'VICIOS_OCULTOS';

export interface PolizaFianza {
  id: string;
  obraId: string;
  contratoId: string;
  tipo: TipoPolizaFianza;
  numero_poliza: string;
  afianzadora: string;
  monto_asegurado: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  estatus: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';
  archivoNombre?: string;
}

export interface SystemNotification {
  id: string;
  titulo: string;
  detalle: string;
  urgente: boolean;
  seccionDestino: string;
  categoria: 'bitacora' | 'estimaciones' | 'programa' | 'cierre' | 'obra';
  rolesObjetivo?: UserRole[];
  fecha: string;
}
