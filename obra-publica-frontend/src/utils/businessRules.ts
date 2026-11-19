import type { UserSession } from '../types/obra.types';

export const BUSINESS_CONSTANTS = {
  SESSION_TIMEOUT_MS: 20 * 60 * 1000, // 20 minutos (RNF-SEG-05)
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB (RNF-REN-01)
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.xml'],
  BLOCKED_EXTENSIONS: ['.exe', '.js', '.bat', '.sh', '.cmd'],
  MIN_FOTOS_TERMINACION: 6, // RN-SUPT-05.2
  PLAZO_REVISION_ESTIMACION_DIAS: 15, // RF-SUP-06
};

export function validarArchivo(file: File): { valido: boolean; error?: string } {
  const fileName = file.name.toLowerCase();

  if (BUSINESS_CONSTANTS.BLOCKED_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    return {
      valido: false,
      error: `Archivo bloqueado por seguridad (${file.name}). No se permiten ejecutables ni scripts.`,
    };
  }

  if (!BUSINESS_CONSTANTS.ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    return {
      valido: false,
      error: 'Formato no válido. Solo se admiten PDF, JPG, PNG o XML.',
    };
  }

  if (file.size > BUSINESS_CONSTANTS.MAX_FILE_SIZE_BYTES) {
    return {
      valido: false,
      error: 'El archivo supera el límite máximo permitido de 10 MB.',
    };
  }

  return { valido: true };
}

// Candado Físico >= Financiero (RN-DIR-01.6 y RN-SUP-02.2)
export function validarControlPresupuestal(
  avanceFinancieroProyectado: number,
  avanceFisicoReal: number
): boolean {
  return avanceFinancieroProyectado <= avanceFisicoReal;
}

// Prohibición de auto-suspensión (RN-ADM-01.6)
export function puedeCambiarEstatusUsuario(
  adminActual: UserSession,
  usuarioObjetivoId: number
): boolean {
  return adminActual.rol === 'ADMINISTRADOR' && adminActual.id !== usuarioObjetivoId;
}