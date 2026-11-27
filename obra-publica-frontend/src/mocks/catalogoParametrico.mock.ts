export type PartidaId =
  | '1.0'
  | '2.0'
  | '3.0'
  | '4.0'
  | '5.0'
  | '6.0'
  | '7.0'
  | '8.0';

export interface PartidaInfo {
  id: PartidaId;
  nombre: string;
}

export const PARTIDAS_CONSTRUCTIVAS: readonly PartidaInfo[] = [
  { id: '1.0', nombre: '1.0 CIMENTACIÓN' },
  { id: '2.0', nombre: '2.0 ESTRUCTURA' },
  { id: '3.0', nombre: '3.0 FACHADAS Y TECHADOS' },
  { id: '4.0', nombre: '4.0 ALBAÑILERÍA Y ACABADOS' },
  { id: '5.0', nombre: '5.0 OBRAS EXTERIORES' },
  { id: '6.0', nombre: '6.0 INST. HIDRÁULICAS Y SANITARIAS' },
  { id: '7.0', nombre: '7.0 INSTALACIONES ELÉCTRICAS' },
  { id: '8.0', nombre: '8.0 INSTALACIONES ESPECIALES' },
];

export interface EnsambladoParametrico {
  clave: string;
  partidaId: PartidaId;
  titulo: string;
  alcances: string[];
  unidad: string;
  costoMateriales: number;   // Materiales (Herr. y Eq.)
  costoInstalacion: number;  // Instalación (M. de Obra)
  indirectosPct: number;     // 28% por defecto según catálogo paramétrico
}

export interface CatalogoConcepto {
  clave: string;
  partidaId: PartidaId;
  descripcion: string;       // Título principal del ensamblado/concepto
  alcances: string[];        // Viñetas de especificaciones ("incluye: ...")
  unidad: string;
  cantidadPresupuestada: number;
  cantidadAdicionalAutorizada: number;
  cantidadEjecutada: number;
  costoMateriales: number;
  costoInstalacion: number;
  costoDirecto: number;      // Materiales + Instalación
  indirectosPct: number;     // Ej. 28
  indirectosMonto: number;   // Costo Directo * (indirectosPct / 100)
  precioUnitario: number;    // Costo Directo + Indirectos
  fecha_inicio_programada: string; // YYYY-MM-DD (base del avance programado)
  fecha_fin_programada: string;    // YYYY-MM-DD (base del avance programado)
  tipo: 'ORDINARIO' | 'EXTRAORDINARIO';
  autorizadoPorResidente?: boolean;
  dictamenApuNombre?: string;
}

/** Calcula el porcentaje programado (0-100) de un concepto a una fecha de corte dada. */
export function calcularAvanceProgramadoConcepto(
  fechaInicio: string,
  fechaFin: string,
  fechaCorte: string
): number {
  if (!fechaInicio || !fechaFin || !fechaCorte) return 0;
  const start = new Date(`${fechaInicio}T00:00:00`).getTime();
  const end = new Date(`${fechaFin}T00:00:00`).getTime();
  const cutoff = new Date(`${fechaCorte}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(cutoff)) return 0;
  if (cutoff < start) return 0;
  if (cutoff >= end || end <= start) return 100;
  return Number((((cutoff - start) / (end - start)) * 100).toFixed(1));
}

/** Calcula el Avance Programado ponderado por importe total del catálogo a una fecha de corte. */
export function calcularAvanceProgramadoAFecha(
  conceptos: CatalogoConcepto[],
  fechaCorte: string
): number {
  let totalImporte = 0;
  let importeProgramado = 0;

  for (const c of conceptos) {
    const vol = c.cantidadPresupuestada + c.cantidadAdicionalAutorizada;
    const importe = vol * c.precioUnitario;
    if (importe <= 0) continue;
    const pct = calcularAvanceProgramadoConcepto(
      c.fecha_inicio_programada,
      c.fecha_fin_programada,
      fechaCorte
    );
    totalImporte += importe;
    importeProgramado += importe * (pct / 100);
  }

  if (totalImporte <= 0) return 0;
  return Number(((importeProgramado / totalImporte) * 100).toFixed(1));
}

export function calcularCostosUnitarios(
  costoMateriales: number,
  costoInstalacion: number,
  indirectosPct = 28
) {
  const mat = Math.max(0, Number(costoMateriales) || 0);
  const inst = Math.max(0, Number(costoInstalacion) || 0);
  const pct = Math.max(0, Number(indirectosPct) || 0);
  const costoDirecto = Number((mat + inst).toFixed(2));
  const indirectosMonto = Number((costoDirecto * (pct / 100)).toFixed(2));
  const precioUnitario = Number((costoDirecto + indirectosMonto).toFixed(2));

  return {
    costoMateriales: mat,
    costoInstalacion: inst,
    costoDirecto,
    indirectosPct: pct,
    indirectosMonto,
    precioUnitario,
  };
}

// Banco de ensamblados reales del PDF "Costos Paramétricos"
export const CATALOGO_PARAMETRICO_PDF: EnsambladoParametrico[] = [
  // 1.0 CIMENTACIÓN
  {
    clave: 'E01-010',
    partidaId: '1.0',
    titulo: 'Cimentación para edificación de 1 nivel uso habitacional',
    alcances: [
      'Limpieza, desenraice de terreno, acarreos, trazo y nivelación para desplante de estructura',
      'Excavación a mano en cepa, material tipo I zona A, prof. de 0.00 a 2.00 m',
      "Losa de cimentación de 10 cm, cimbra común reforzada con 60 kg de acero/m³, concreto f'c=200 kg/cm²",
      'Traspaleo horizontal y acarreo en carretilla a 20.00 m con carga y descarga',
    ],
    unidad: 'm²',
    costoMateriales: 234.95,
    costoInstalacion: 365.11,
    indirectosPct: 28,
  },
  {
    clave: 'E01-041',
    partidaId: '1.0',
    titulo: 'Cimentación para edificación de 4 niveles uso comercial',
    alcances: [
      'Limpieza, desenraice, trazo y nivelación para desplante de estructura',
      'Excavación en cepa con afine de taludes y fondo, prof. 0.00 a 2.00 m',
      'Relleno compactado en capas de 20 cm e impermeabilización con emulsión asfáltica y 2 capas de fieltro No. 5',
      "Zapatas corridas y aisladas, dados y contratrabes de concreto f'c=250 kg/cm² (120 kg acero/m³)",
      "Losa de desplante de concreto de 10 cm R.N. f'c=200 kg/cm²",
    ],
    unidad: 'm²',
    costoMateriales: 1507.65,
    costoInstalacion: 723.61,
    indirectosPct: 28,
  },

  // 2.0 ESTRUCTURA
  {
    clave: 'E02-010',
    partidaId: '2.0',
    titulo: 'Estructura de concreto para 1 nivel uso habitacional',
    alcances: [
      'Muro de block de concreto mediano 10x20x40 cm asentado con mortero cemento-arena 1:4',
      "Castillo ahogado y dala de liga 15x15 cm concreto f'c=150 kg/cm²",
      "Trabe de concreto f'c=200 kg/cm² de 15x20 cm reforzada con 130 kg/m³ de acero fy=4200 kg/cm²",
      "Losa plana de concreto de 10 cm cimbra aparente, 60 kg acero/m³, f'c=200 kg/cm²",
    ],
    unidad: 'm²',
    costoMateriales: 836.12,
    costoInstalacion: 531.71,
    indirectosPct: 28,
  },
  {
    clave: 'E02-041',
    partidaId: '2.0',
    titulo: 'Estructura de concreto para 4 niveles uso comercial',
    alcances: [
      'Muro de carga de tabique de barro rojo recocido en 12.5 cm con mortero 1:4',
      "Castillos y dalas de liga 15x15 cm concreto f'c=150 kg/cm²",
      "Columnas de 20x30 cm (180 kg/m³) y trabes de 15x30 cm (130 kg/m³) concreto f'c=200 kg/cm²",
      'Rampa para escalera de concreto armado de 1.50 m de ancho y losa plana de 10 cm',
    ],
    unidad: 'm²',
    costoMateriales: 1088.36,
    costoInstalacion: 648.67,
    indirectosPct: 28,
  },

  // 3.0 FACHADAS Y TECHADOS
  {
    clave: 'E03-050',
    partidaId: '3.0',
    titulo: 'Fachada para oficina de interés medio',
    alcances: [
      '50% cancelería con perfiles de aluminio de 2" esmaltado o anodizado con cristal de 5 mm',
      '50% recubrimiento de pasta de color o aplanado mortero cemento-arena y pintura para exteriores',
    ],
    unidad: 'm²',
    costoMateriales: 746.07,
    costoInstalacion: 485.45,
    indirectosPct: 28,
  },
  {
    clave: 'E03-085',
    partidaId: '3.0',
    titulo: 'Fachada y cubierta exterior para escuela primaria pública',
    alcances: [
      '40% cancelería de aluminio de 3" anodizado o esmaltado con cristal de 6 mm',
      '60% recubrimiento de pasta de color, tabique aparente o aplanado con pintura de buena calidad',
    ],
    unidad: 'm²',
    costoMateriales: 683.51,
    costoInstalacion: 343.02,
    indirectosPct: 28,
  },
  {
    clave: 'E04-067',
    partidaId: '3.0',
    titulo: 'Techado para nave industrial mediana con lámina de acero esmaltado',
    alcances: [
      'Lámina Pintro No. 20 R-101 esmaltada',
      'Incluye cumbrera, canalones y desagües pluviales',
    ],
    unidad: 'm²',
    costoMateriales: 321.64,
    costoInstalacion: 209.3,
    indirectosPct: 28,
  },

  // 4.0 ALBAÑILERÍA Y ACABADOS
  {
    clave: 'E04-011',
    partidaId: '4.0',
    titulo: 'Azotea uso comercial (entortado, enladrillado e impermeabilización)',
    alcances: [
      'Pretil de tabique rojo común en 14 cm asentado con mortero 1:5',
      'Relleno de tezontle, entortado de 3 cm y enladrillado de barro común con chaflán de 10x10 cm',
      'Impermeabilización en azotea con asfalto oxidado y 3 capas de fieltro No. 5',
    ],
    unidad: 'm²',
    costoMateriales: 296.49,
    costoInstalacion: 279.3,
    indirectosPct: 28,
  },
  {
    clave: 'E05-010',
    partidaId: '4.0',
    titulo: 'Construcción interior Tipo (H) Habitacional Clase 3 Media',
    alcances: [
      'Densidad de muros interiores de 0.40 m²/m² con acabados aparentes de yeso y pintura',
      'Pisos con firmes de cemento-arena recubiertos con mosaico o loseta vinílica con zoclos',
      'No incluye baños, cocinas ni instalaciones eléctricas o hidrosanitarias',
    ],
    unidad: 'm²',
    costoMateriales: 480.88,
    costoInstalacion: 436.06,
    indirectosPct: 28,
  },

  // 5.0 OBRAS EXTERIORES
  {
    clave: 'F01-400',
    partidaId: '5.0',
    titulo: 'Preparación de terreno con pendientes suaves hasta del 20%',
    alcances: [
      'Desmonte, despalme, trazo y nivelación de terreno natural',
      'Acarreos de material de escombro producto del desmonte y despalme',
    ],
    unidad: 'm²',
    costoMateriales: 1.51,
    costoInstalacion: 23.7,
    indirectosPct: 28,
  },
  {
    clave: 'F01-410',
    partidaId: '5.0',
    titulo: 'Base de 10 cm y sub-base de 10 cm para calles y caminos planos',
    alcances: [
      'Trazo, nivelación y tendido de tepetate-tezontle',
      'Compactación al 95% PVSM y acarreos de material',
    ],
    unidad: 'm²',
    costoMateriales: 99.52,
    costoInstalacion: 15.2,
    indirectosPct: 28,
  },
  {
    clave: 'E05-400',
    partidaId: '5.0',
    titulo: "Losa para autopista de concreto armado (20 cm, f'c=200 kg/cm²)",
    alcances: [
      'Base compactada al 100% incluyendo material de banco',
      "Losa de concreto armado espesor 20 cm, f'c=200 kg/cm² agregado máximo 1 1/2\"",
    ],
    unidad: 'm²',
    costoMateriales: 493.74,
    costoInstalacion: 47.39,
    indirectosPct: 28,
  },
  {
    clave: 'E05-410',
    partidaId: '5.0',
    titulo: 'Pavimentación de carpeta asfáltica de 7.5 cm (incluye base)',
    alcances: [
      'Base compactada al 100% con material de banco',
      'Riego asfáltico de liga o impregnación con asfalto FM-1',
      'Carpeta de concreto asfáltico tipo PA-5 de 7.5 cm compactos y sello arena-asfalto',
    ],
    unidad: 'm²',
    costoMateriales: 72.0,
    costoInstalacion: 50.01,
    indirectosPct: 28,
  },
  {
    clave: 'E05-420',
    partidaId: '5.0',
    titulo: "Banquetas y guarniciones de concreto f'c=150 kg/cm²",
    alcances: [
      "Guarniciones y banquetas coladas en sitio con concreto f'c=150 kg/cm²",
      'Incluye cimbra de frontera, acabado escobillado y juntas de dilatación',
    ],
    unidad: 'm²',
    costoMateriales: 114.21,
    costoInstalacion: 65.8,
    indirectosPct: 28,
  },

  // 6.0 INST. HIDRÁULICAS Y SANITARIAS
  {
    clave: 'E06-090',
    partidaId: '6.0',
    titulo: 'Instalación hidráulica y sanitaria para oficinas Clase 4 Buena',
    alcances: [
      'Hidráulica: toma domiciliaria a cisterna, bomba 1/2 HP, columna de cobre tipo M y calentador',
      'Sanitaria: bajadas de PVC sanitario, registros y línea de desagüe al drenaje municipal',
      'Gas: tubería y conexiones de cobre tipo L de tanque a muebles',
    ],
    unidad: 'm²',
    costoMateriales: 204.88,
    costoInstalacion: 157.42,
    indirectosPct: 28,
  },

  // 7.0 INSTALACIONES ELÉCTRICAS
  {
    clave: 'E07-070',
    partidaId: '7.0',
    titulo: 'Instalación eléctrica para oficinas Clase 4 Buena (Interés Medio)',
    alcances: [
      'Desde acometida a tablero principal, tablero particular, salidas de iluminación y fuerza',
      'Incluye centros de carga, interruptores, canalización, cableado, apagadores, contactos y luminarias',
    ],
    unidad: 'm²',
    costoMateriales: 287.55,
    costoInstalacion: 374.17,
    indirectosPct: 28,
  },
  {
    clave: 'E07-150',
    partidaId: '7.0',
    titulo: 'Instalación eléctrica para clínica / centro de salud',
    alcances: [
      'Acometida a tablero principal y tableros regulados para áreas clínicas',
      'Canalización, cableado de alimentación, centros de carga, contactos e iluminación especializada',
    ],
    unidad: 'm²',
    costoMateriales: 451.43,
    costoInstalacion: 582.04,
    indirectosPct: 28,
  },

  // 8.0 INSTALACIONES ESPECIALES
  {
    clave: 'E08-010',
    partidaId: '8.0',
    titulo: 'Elevador para 8 pasajeros (560 kg), 4 paradas uso comercial',
    alcances: [
      'Suministro, montaje, pruebas y puesta en marcha de cabina para 8 pasajeros',
      'Incluye maquinaria de tracción, guías, puertas automáticas y sistema de seguridad normativo',
    ],
    unidad: 'pza',
    costoMateriales: 1056857.02,
    costoInstalacion: 135073.97,
    indirectosPct: 28,
  },
];

export const MONTO_CONTRATO_BY_OBRA: Record<string, number> = {
  'OP-2024-001': 25000000,
  'OP-2024-002': 18400000,
  'OP-2024-003': 32000000,
  'OP-2024-004': 14200000,
  'OP-2024-005': 9800000,
};

function createConcepto(params: {
  clave: string;
  partidaId: PartidaId;
  descripcion: string;
  alcances: string[];
  unidad: string;
  cantidadPresupuestada: number;
  cantidadAdicionalAutorizada?: number;
  cantidadEjecutada?: number;
  costoMateriales: number;
  costoInstalacion: number;
  indirectosPct?: number;
  fecha_inicio_programada: string;
  fecha_fin_programada: string;
  tipo?: 'ORDINARIO' | 'EXTRAORDINARIO';
}): CatalogoConcepto {
  const costos = calcularCostosUnitarios(
    params.costoMateriales,
    params.costoInstalacion,
    params.indirectosPct ?? 28
  );

  return {
    clave: params.clave,
    partidaId: params.partidaId,
    descripcion: params.descripcion,
    alcances: params.alcances,
    unidad: params.unidad,
    cantidadPresupuestada: params.cantidadPresupuestada,
    cantidadAdicionalAutorizada: params.cantidadAdicionalAutorizada ?? 0,
    cantidadEjecutada: params.cantidadEjecutada ?? 0,
    ...costos,
    fecha_inicio_programada: params.fecha_inicio_programada,
    fecha_fin_programada: params.fecha_fin_programada,
    tipo: params.tipo ?? 'ORDINARIO',
  };
}

export const INITIAL_CONCEPTOS_BY_OBRA: Record<string, CatalogoConcepto[]> = {
  'OP-2024-001': [
    createConcepto({
      clave: 'E01-041',
      partidaId: '1.0',
      descripcion: 'Cimentación profunda y zapatas en apoyos de puente vehicular',
      alcances: [
        'Limpieza, desenraice, trazo y nivelación para desplante de apoyos',
        'Excavación en cepa, plantilla de concreto f\'c=100 kg/cm² de 5 cm y relleno compactado en capas de 20 cm',
        "Zapatas aisladas, dados y contratrabes de concreto f'c=250 kg/cm² reforzado (120 kg/m³)",
      ],
      unidad: 'm²',
      cantidadPresupuestada: 1200,
      cantidadEjecutada: 980,
      costoMateriales: 1507.65,
      costoInstalacion: 723.61,
      fecha_inicio_programada: '2024-05-06',
      fecha_fin_programada: '2024-08-30',
    }),
    createConcepto({
      clave: 'EST-001',
      partidaId: '2.0',
      descripcion: "Concreto hidráulico f'c=350 kg/cm² en losa de rodamiento",
      alcances: [
        "Suministro, bombeo y vibrado de concreto estructural f'c=350 kg/cm²",
        'Cimbra aparente en tablero central, curado con membrana y descimbra',
      ],
      unidad: 'm³',
      cantidadPresupuestada: 420,
      cantidadEjecutada: 315,
      costoMateriales: 2380.0,
      costoInstalacion: 1135.63,
      fecha_inicio_programada: '2024-08-15',
      fecha_fin_programada: '2024-10-12',
    }),
    createConcepto({
      clave: 'SUP-012',
      partidaId: '2.0',
      descripcion: 'Suministro y montaje de trabe AASHTO tipo IV prefabricada',
      alcances: [
        'Fabricación en planta de trabe presforzada AASHTO tipo IV y flete especializado',
        'Izaje y montaje con doble grúa hidráulica sobre apoyos de neopreno',
      ],
      unidad: 'pza',
      cantidadPresupuestada: 16,
      cantidadEjecutada: 16,
      costoMateriales: 235000.0,
      costoInstalacion: 77500.0,
      fecha_inicio_programada: '2024-07-01',
      fecha_fin_programada: '2024-10-10',
    }),
    createConcepto({
      clave: 'F01-410',
      partidaId: '5.0',
      descripcion: 'Base de 10 cm y sub-base de 10 cm en accesos y rampas',
      alcances: [
        'Trazo, nivelación y tendido de tepetate-tezontle en capas uniformes',
        'Compactación al 95% PVSM con material de banco y acarreos',
      ],
      unidad: 'm²',
      cantidadPresupuestada: 4500,
      cantidadAdicionalAutorizada: 250,
      cantidadEjecutada: 2900,
      costoMateriales: 99.52,
      costoInstalacion: 15.2,
      fecha_inicio_programada: '2024-09-10',
      fecha_fin_programada: '2024-11-20',
    }),
    createConcepto({
      clave: 'E05-400',
      partidaId: '5.0',
      descripcion: "Losa para vialidad de concreto armado (20 cm, f'c=200 kg/cm²)",
      alcances: [
        'Base compactada al 100% incluyendo material de banco',
        "Colado de losa de concreto armado de 20 cm, f'c=200 kg/cm², juntas selladas",
      ],
      unidad: 'm²',
      cantidadPresupuestada: 3600,
      cantidadEjecutada: 2100,
      costoMateriales: 493.74,
      costoInstalacion: 47.39,
      fecha_inicio_programada: '2024-09-20',
      fecha_fin_programada: '2024-12-10',
    }),
    createConcepto({
      clave: 'E05-420',
      partidaId: '5.0',
      descripcion: "Banquetas y guarniciones de concreto f'c=150 kg/cm²",
      alcances: [
        "Guarniciones y banquetas peatonales laterales en concreto f'c=150 kg/cm²",
        'Cimbra metálica, acabado escobillado y rampas de accesibilidad',
      ],
      unidad: 'm²',
      cantidadPresupuestada: 1400,
      cantidadEjecutada: 820,
      costoMateriales: 114.21,
      costoInstalacion: 65.8,
      fecha_inicio_programada: '2024-10-01',
      fecha_fin_programada: '2024-12-20',
    }),
  ],

  'OP-2024-004': [
    createConcepto({
      clave: 'E01-041',
      partidaId: '1.0',
      descripcion: 'Cimentación para edificación de 4 niveles uso comercial / clínico',
      alcances: [
        'Limpieza, desenraice, excavación en cepa y relleno compactado en capas de 20 cm',
        "Zapatas corridas y aisladas f'c=250 kg/cm² y losa de desplante de 10 cm",
      ],
      unidad: 'm²',
      cantidadPresupuestada: 450,
      cantidadEjecutada: 0,
      costoMateriales: 1507.65,
      costoInstalacion: 723.61,
      fecha_inicio_programada: '2025-01-15',
      fecha_fin_programada: '2025-03-15',
    }),
    createConcepto({
      clave: 'E02-041',
      partidaId: '2.0',
      descripcion: 'Estructura de concreto para 4 niveles (Centro de Salud)',
      alcances: [
        "Columnas 20x30 cm y trabes 15x30 cm concreto f'c=200 kg/cm²",
        'Rampa de escalera de concreto armado de 1.50 m y losa plana de 10 cm',
      ],
      unidad: 'm²',
      cantidadPresupuestada: 1200,
      cantidadEjecutada: 0,
      costoMateriales: 1088.36,
      costoInstalacion: 648.67,
      fecha_inicio_programada: '2025-03-16',
      fecha_fin_programada: '2025-06-01',
    }),
    createConcepto({
      clave: 'E06-090',
      partidaId: '6.0',
      descripcion: 'Instalación hidráulica y sanitaria para edificio clínico',
      alcances: [
        'Red hidráulica de cobre tipo M con cisterna y bombeo',
        'Red sanitaria de PVC, registros y conexión a drenaje municipal',
      ],
      unidad: 'm²',
      cantidadPresupuestada: 1200,
      cantidadEjecutada: 0,
      costoMateriales: 204.88,
      costoInstalacion: 157.42,
      fecha_inicio_programada: '2025-05-15',
      fecha_fin_programada: '2025-07-15',
    }),
    createConcepto({
      clave: 'E07-150',
      partidaId: '7.0',
      descripcion: 'Instalación eléctrica para clínica / centro de salud',
      alcances: [
        'Acometida a tablero principal, circuitos regulados, canalización y luminarias',
      ],
      unidad: 'm²',
      cantidadPresupuestada: 1200,
      cantidadEjecutada: 0,
      costoMateriales: 451.43,
      costoInstalacion: 582.04,
      fecha_inicio_programada: '2025-06-01',
      fecha_fin_programada: '2025-08-10',
    }),
  ],
};