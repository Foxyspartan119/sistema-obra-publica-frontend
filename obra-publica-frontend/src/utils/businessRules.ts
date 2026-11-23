import type { ObraStatus, UserRole, UserSession } from '../types/obra.types';

export const BUSINESS_CONSTANTS = {
  SESSION_TIMEOUT_MS: 20 * 60 * 1000, // 20 minutos de inactividad (RNF-SEG-05)
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB por archivo (RNF-REN-01)
  MAX_TOTAL_BATCH_SIZE_BYTES: 60 * 1024 * 1024, // 60 MB en carga multiple (RNF-REN-01)
  MAX_BATCH_FILES: 6, // Hasta 6 documentos/evidencias simultáneas (RNF-REN-01 / RN-SUPT-05.2)
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.xml'],
  BLOCKED_EXTENSIONS: ['.exe', '.js', '.bat', '.sh', '.cmd', '.ps1', '.php', '.py', '.dll', '.msi'],
  MIN_FOTOS_TERMINACION: 6, // RN-SUPT-05.2
  MIN_PASSWORD_LENGTH: 8, // RNF-SEG-01
  MIN_FIRMA_LENGTH: 6, // RNF-SEG-01
  PLAZO_REVISION_ESTIMACION_DIAS: 15, // RF-SUP-06
  ALERTA_PREVENTIVA_DIA_INICIO: 10, // RN-SUP-06.2 (dias 10 a 14)
  AUTOSAVE_INTERVAL_MS: 30 * 1000, // Autoguardado cada 30 segundos (RNF-REN-02)
};

export interface ValidationResult {
  valido: boolean;
  error?: string;
}

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

// Validación de lote de archivos para carga múltiple
export function validarLoteArchivos(
  files: File[],
  options?: { minFotosAvisoTerminacion?: boolean }
): ValidationResult {
  if (files.length > BUSINESS_CONSTANTS.MAX_BATCH_FILES) {
    return {
      valido: false,
      error: `Se permite un máximo de ${BUSINESS_CONSTANTS.MAX_BATCH_FILES} archivos simultáneos por solicitud.`,
    };
  }

  if(
    options?.minFotosAvisoTerminacion &&
    files.length < BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION
  ) {
    return {
      valido: false,
      error: `Se requieren al menos ${BUSINESS_CONSTANTS.MIN_FOTOS_TERMINACION} fotos para el aviso de terminación.`,
    };
  }

  let totalBytes = 0;
  for (const file of files) {
    const singleCheck = validarArchivo(file);
    if (!singleCheck.valido) {
      return singleCheck;
    }
    totalBytes += file.size;

    if (options?.minFotosAvisoTerminacion) {
      const lower = file.name.toLowerCase();
      const esImagen =
        lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
      if (!esImagen) {
        return {
          valido: false,
          error: 'Para el aviso de terminación, todos los archivos deben ser imágenes (JPG o PNG).',
        };
      }
    }
  }

  if (totalBytes > BUSINESS_CONSTANTS.MAX_TOTAL_BATCH_SIZE_BYTES) {
    return {
      valido: false,
      error: `El tamaño total de los archivos supera el límite máximo permitido de 60 MB.`,
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

// Progresividad / No retroceso del avance físico (RN-SUP-03.6 y RN-DIR-01.7)
export function validarAvanceFisico(
  nuevoPorcentaje: number,
  avanceAnterior: number
): ValidationResult {
  if (Number.isNaN(nuevoPorcentaje) || nuevoPorcentaje < 0 || nuevoPorcentaje > 100) {
    return {
      valido: false,
      error: 'El porcentaje de avance físico debe ser un número entre 0.00% y 100.00% (RN-SUP-03.6).',
    };
  }

  if (nuevoPorcentaje < avanceAnterior) {
    return {
      valido: false,
      error: `Inconsistencia de avance físico: el avance (${nuevoPorcentaje}%) no puede ser menor al registrado previamente (${avanceAnterior}%) (RN-DIR-03.6).`,
    };
  }
  return { valido: true };
}

// Validación de cantidad aprobada y observacion obligatoria ante recorte (RN-SUP-01.1 y RN-SUP-01.2)
export function validarCantidadAprobada(
  cantidadAprobada: number,
  cantidadEjecutada: number,
  observaciones?: string
): ValidationResult {
  if (cantidadAprobada < 0) {
    return {
      valido: false,
      error: 'La cantidad aprobada no puede ser negativa (RN-SUP-01.1).',
    };
  }

  if (cantidadAprobada > cantidadEjecutada) {
    return {
      valido: false,
      error: 'La cantidad aprobada no puede exceder la cantidad ejecutada (RN-SUP-01.1).',
    };
  }

  if (cantidadAprobada < cantidadEjecutada && (!observaciones || !observaciones.trim())) {
    return {
      valido: false,
      error: 'Debe capturar observaciones técnicas obligatorias al aprobar un volumen menor al ejecutado (RN-SUP-01.2).',
    };
  }

  return { valido: true };
}

// Prohibición de auto-suspensión (RN-ADM-01.6)
export function puedeCambiarEstatusUsuario(
  adminActual: UserSession,
  usuarioObjetivoId: number
): boolean {
  return adminActual.rol === 'ADMINISTRADOR' && adminActual.id !== usuarioObjetivoId;
}

// Estado de permisos operativos según rol y estado de la obra
export function puedeOperarEnObra(
  rol: UserRole,
  estadoObra: ObraStatus,
  accion: 'bitacora' | 'estimacion' | 'generadores' | 'cierre'
): ValidationResult {
  if (rol === 'DIRECTIVO') {
    return {
      valido: false,
      error: 'El rol Directivo opera en modo de consulta (solo lectura) (RN-DIR-03.1.',
    };
  }

  if (estadoObra === 'FINIQUITADA') {
    return {
      valido: false,
      error: 'La obra se encuentra finiquitada, la bitácora y operaciones están congeladas (RN-DIR-03.1).',
    };
  }

  if (estadoObra === 'EN_CONFIGURACION' || estadoObra === 'ALERTA_VACANTE_OPERATIVA') {
    if (accion === 'bitacora' || accion === 'estimacion' || accion === 'generadores') {
      return {
        valido: false,
        error:
        'Operación bloqueada: la obra está en configuración o tiene vacante operativa pendiente (RN-ADM-04.3 / RN-ADM-03.4).',
      };
    }
  }

  if (estadoObra === 'SUSPENDIDA' && accion === 'generadores') {
    return {
      valido: false,
      error: 'Registro de generadores bloqueado mientras la obra permanezca suspendida (RN-RES-02.2).',
    };
  }

  return { valido: true };
}

// Semáforo de plazos de revisión de estimaciones (RF-SUP-06 / RN-SUP-06.2)
export function evaluarPlazoRevisionEstimacion(diasTranscurridos: number): {
  nivel: 'NORMAL' | 'PREVENTIVA' | 'CRITICA';
  mensaje: string;
} {
  if (diasTranscurridos >= BUSINESS_CONSTANTS.PLAZO_REVISION_ESTIMACION_DIAS) {
    return {
      nivel: 'CRITICA',
      mensaje: `Plazo normativo vencido (${diasTranscurridos} días naturales · límite 15 días).`,
    };
  }

  if (diasTranscurridos >= BUSINESS_CONSTANTS.ALERTA_PREVENTIVA_DIA_INICIO) {
    const restantes = BUSINESS_CONSTANTS.PLAZO_REVISION_ESTIMACION_DIAS - diasTranscurridos;
    return {
      nivel: 'PREVENTIVA',
      mensaje: `Alerta preventiva (${diasTranscurridos} días transcurridos · quedan ${restantes} días).`,
    };
  }

  return {
    nivel: 'NORMAL',
    mensaje: `Dentro del plazo de revisión (${diasTranscurridos} de 15 días naturales).`,
  };
}