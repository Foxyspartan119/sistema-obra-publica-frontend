export interface ActivityItem {
    id: string;
    title: string;
    subtitle: string;
    endDate: string;
    progress: number;
    status: 'En proceso' | 'Concluida';
}

export interface AttentionItem {
    id: string;
    title: string;
    subtitle: string;
    urgent: boolean;
    category: 'estimacion' | 'bitacora';
    detail: string;
    folio: string;
}

export interface ProgressPeriod {
    id: string;
    label: string;
    note: string;
    badge: string;
    months: string[];
    programado: number[];
    real: number[];
}

export const OBRA_DETAIL_MOCK = {
    id: 'OP-2024-001',
    nombre: 'Construcción de Puente Vehicular OP-2024-001',
    ubicacion: 'San Pedro, Nuevo León',
    contrato: 'SOP-LP-024/2024',
    estadoEtiqueta: 'En ejecución',
    contratista: 'Constructora del Norte, S.A. de C.V.',
    fechaInicio: '06 may 2024',
    fechaTermino: '20 dic 2024',
    montoContratado: 25000000,
    montoEjercido: 14500000,
    obrasActivas: 8,
    obrasRegistradas: 12,
    obrasPorConcluir: 2,
    avanceFisico: 62,
    avanceProgramado: 65,
    avanceFinanciero: 58,
    diasTranscurridos: 161,
    diasTotales: 228,
};

export const PROGRESS_PERIODS: ProgressPeriod[] = [
    {
        id: 'may-oct',
        label: 'May - Oct 2024',
        note: 'Corte al 14 oct 2024 · 3 puntos por debajo del avance programado.',
        badge: '62%',
        months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        programado: [10, 22, 35, 48, 57, 65],
        real: [9, 20, 31, 42, 53, 62],
    },
    {
        id: 'may-ago',
        label: 'May - Ago 2024',
        note: 'Corte al 31 ago 2024 · 4 puntos por debajo del avance programado.',
        badge: '42%',
        months: ['May', 'Jun', 'Jul', 'Aug'],
        programado: [10, 22, 35, 46],
        real: [9, 20, 31, 42],
    },
    {
        id: 'ago-oct',
        label: 'Ago - Oct 2024',
        note: 'Periodo bimestral · Recuperación de 2 puntos en frente estructural.',
        badge: '62%',
        months: ['Ago', 'Sep', 'Oct'],
        programado: [46, 57, 65],
        real: [42, 53, 62],
    },
];

export const WEEKLY_ACTIVITIES: ActivityItem[] = [
    {
        id: 'act-1',
        title: 'Colado de losa en tramo central',
        subtitle: 'Estructura · Frente 02',
        endDate: '14 oct 2024',
        progress: 75,
        status: 'En proceso',
    },
    {
        id: 'act-2',
        title: 'Montaje de trabes prefabricadas',
        subtitle: 'Superestructura · Frente 01',
        endDate: '16 oct 2024',
        progress: 100,
        status: 'Concluida',
    },
    {
        id: 'act-3',
        title: 'Relleno y compactación de accesos',
        subtitle: 'Terracerías · Frente 03',
        endDate: '18 oct 2024',
        progress: 32,
        status: 'En proceso',
    },
];

export const ATTENTION_ITEMS: AttentionItem[] = [
    {
        id: 'att-1',
        title: 'Autorizar trámite de pago final - Estimación N.° 06',
        subtitle: 'Vence hoy · $2,350,000 MXN',
        urgent: true,
        category: 'estimacion',
        folio: 'EST-2024-006',
        detail: 'Estimación correspondiente al periodo del 01 al 12 de octubre de 2024. Incluye generadores de obra validados por supervisión externa y factura fiscal adjunta.',
    },
    {
        id: 'att-2',
        title: 'Revisar Análisis de Precio Extraordinario',
        subtitle: 'Pendiente desde el 12 de oct',
        urgent: false,
        category: 'bitacora',
        folio: 'APE-014-OP24',
        detail: 'Solicitud de precio unitario extraordinario para refuerzo de cimentación en apoyo 03 por presencia de manto freático.',
    },
];

export const CATALOG_CONCEPTS = [
    {
        clave: 'EST-001',
        concepto: "Concreto hidráulico f'c=350 kg/cm² en losa de rodamiento",
        unidad: 'm³',
        volumen: '420.00',
        ejecutado: '315.00',
        importe: '$1,890,000 MXN',
    },
    {
        clave: 'SUP-012',
        concepto: 'Suministro y montaje de trabe AASHTO tipo IV prefabricada',
        unidad: 'pza',
        volumen: '16.00',
        ejecutado: '16.00',
        importe: '$6,400,000 MXN',
    },
    {
        clave: 'TER-008',
        concepto: 'Relleno y compactación de terracería en accesos',
        unidad: 'm³',
        volumen: '1,850.00',
        ejecutado: '592.00',
        importe: '$925,000 MXN',
    },
];

export const BITACORA_ENTRIES = [
    {
        folio: 'Nota N.° 42',
        fecha: '14 oct 2024',
        autor: 'Ing. Javier Mendoza (Residente de obra)',
        asunto: 'Inicio de colado en losa tramo central - Frente 02',
        estado: 'Firmada',
    },
    {
    folio: 'Nota N.º 41',
    fecha: '12 oct 2024',
    autor: 'Ing. Lucía Ramírez (Supervisión)',
    asunto: 'Validación de montaje completo de trabes en claros 1 y 2',
    estado: 'Firmada',
    },
    {
    folio: 'Nota N.º 40',
    fecha: '10 oct 2024',
    autor: 'Ing. Javier Mendoza (Residente)',
    asunto: 'Registro de análisis de precio extraordinario APE-014',
    estado: 'En revisión',
    },
];

export const ESTIMACIONES_LIST = [
  {
    numero: 'Estimación N.º 06',
    periodo: '01 oct – 12 oct 2024',
    monto: '$2,350,000 MXN',
    estado: 'Por autorizar',
  },
  {
    numero: 'Estimación N.º 05',
    periodo: '16 sep – 30 sep 2024',
    monto: '$3,120,000 MXN',
    estado: 'Pagada',
  },
  {
    numero: 'Estimación N.º 04',
    periodo: '01 sep – 15 sep 2024',
    monto: '$2,890,000 MXN',
    estado: 'Pagada',
  },
];

export const DOCUMENTOS_OBRA = [
  {
    nombre: 'Contrato de Obra Pública SOP-LP-024-2024.pdf',
    categoria: 'Contractual',
    fecha: '02 may 2024',
    estado: 'Validado',
  },
  {
    nombre: 'Proyecto Ejecutivo Estructural — Rev 03.pdf',
    categoria: 'Técnico',
    fecha: '18 may 2024',
    estado: 'Validado',
  },
  {
    nombre: 'Dictamen de Impacto Vial y Ambiental.pdf',
    categoria: 'Normativo',
    fecha: '29 abr 2024',
    estado: 'Validado',
  },
];