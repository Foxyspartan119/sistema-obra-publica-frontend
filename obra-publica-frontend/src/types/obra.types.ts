export type UserRole =
  | 'ADMINISTRADOR'
  | 'DIRECTIVO'
  | 'RESIDENTE'
  | 'SUPERVISOR'
  | 'SUPERINTENDENTE';

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