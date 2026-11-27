import {
  PARTIDAS_CONSTRUCTIVAS,
  calcularCostosUnitarios,
  type CatalogoConcepto,
  type PartidaId,
} from '../mocks/catalogoParametrico.mock';

export interface ParsedCatalogoResult {
  conceptos: CatalogoConcepto[];
  warnings: string[];
}

const VALID_PARTIDA_IDS = new Set<string>(PARTIDAS_CONSTRUCTIVAS.map((p) => p.id));

function normalizePartidaId(raw: string): PartidaId {
  const clean = raw.trim();
  if (VALID_PARTIDA_IDS.has(clean)) return clean as PartidaId;
  const numMatch = clean.match(/^([1-8])(?:\.0)?/);
  if (numMatch) {
    const candidate = `${numMatch[1]}.0`;
    if (VALID_PARTIDA_IDS.has(candidate)) return candidate as PartidaId;
  }
  return '1.0';
}

function excelSerialToIsoDate(serial: number): string {
  // Excel epoch starts 1899-12-30 (accounting for Lotus 1-2-3 leap year bug)
  const utcMillis = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(utcMillis);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function normalizeDateCell(raw: string, fallback: string): string {
  const clean = raw.trim();
  if (!clean) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${month}-${day}`;
  }

  // Excel serial number (e.g. 45418 -> 2024-05-06)
  const asNum = Number(clean);
  if (!Number.isNaN(asNum) && asNum > 20000 && asNum < 90000) {
    const converted = excelSerialToIsoDate(asNum);
    if (converted) return converted;
  }

  return fallback;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function colLettersToIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, '').toUpperCase();
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}

async function inflateRaw(compressed: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([compressed]).stream().pipeThrough(ds);
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Reads ZIP entries from an ArrayBuffer (.xlsx is a standard ZIP archive). */
async function extractZipTextEntries(
  buffer: ArrayBuffer,
  wantedPaths: Set<string>
): Promise<Map<string, string>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  const results = new Map<string, string>();

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error('El archivo .xlsx no tiene una estructura ZIP válida.');
  }

  const centralDirSize = view.getUint32(eocdOffset + 12, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  let ptr = centralDirOffset;
  const endPtr = centralDirOffset + centralDirSize;

  while (ptr + 46 <= endPtr) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (!wantedPaths.has(fileName) && !fileName.startsWith('xl/worksheets/sheet1')) {
      continue;
    }

    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) continue;
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;

    const rawSlice = new Uint8Array(buffer.slice(dataStart, dataEnd));
    let contentBytes: Uint8Array;
    if (compressionMethod === 0) {
      contentBytes = rawSlice;
    } else if (compressionMethod === 8) {
      contentBytes = await inflateRaw(rawSlice);
    } else {
      continue;
    }

    results.set(fileName, decoder.decode(contentBytes));
  }

  return results;
}

function parseXlsxRows(entries: Map<string, string>): string[][] {
  const parser = new DOMParser();

  // Parse sharedStrings.xml if present
  const sharedStrings: string[] = [];
  const sharedXml = entries.get('xl/sharedStrings.xml');
  if (sharedXml) {
    const doc = parser.parseFromString(sharedXml, 'application/xml');
    const siNodes = doc.getElementsByTagName('si');
    for (let i = 0; i < siNodes.length; i++) {
      const tNodes = siNodes[i].getElementsByTagName('t');
      let text = '';
      for (let j = 0; j < tNodes.length; j++) {
        text += tNodes[j].textContent ?? '';
      }
      sharedStrings.push(text);
    }
  }

  // Locate first worksheet XML
  const sheetXml =
    entries.get('xl/worksheets/sheet1.xml') ??
    Array.from(entries.entries()).find(([k]) => k.startsWith('xl/worksheets/'))?.[1];

  if (!sheetXml) {
    throw new Error('No se encontró ninguna hoja de cálculo (sheet1.xml) en el archivo Excel.');
  }

  const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
  const rowNodes = sheetDoc.getElementsByTagName('row');
  const matrix: string[][] = [];

  for (let i = 0; i < rowNodes.length; i++) {
    const cellNodes = rowNodes[i].getElementsByTagName('c');
    const rowValues: string[] = [];
    for (let j = 0; j < cellNodes.length; j++) {
      const cell = cellNodes[j];
      const ref = cell.getAttribute('r') ?? '';
      const colIdx = ref ? colLettersToIndex(ref) : j;
      const type = cell.getAttribute('t');

      let val = '';
      if (type === 's') {
        const vText = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        val = sharedStrings[Number(vText)] ?? '';
      } else if (type === 'inlineStr') {
        val = cell.getElementsByTagName('t')[0]?.textContent ?? '';
      } else {
        val = cell.getElementsByTagName('v')[0]?.textContent ?? '';
      }

      while (rowValues.length < colIdx) rowValues.push('');
      rowValues[colIdx] = val.trim();
    }
    if (rowValues.some((c) => c.trim() !== '')) {
      matrix.push(rowValues);
    }
  }

  return matrix;
}

function parseCsvRows(text: string): string[][] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

function mapRowsToConceptos(rows: string[][]): ParsedCatalogoResult {
  if (rows.length < 2) {
    return {
      conceptos: [],
      warnings: ['El archivo debe incluir una fila de encabezados y al menos un concepto.'],
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const findCol = (...aliases: string[]) =>
    headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

  const idxClave = findCol('clave', 'codigo', 'code');
  const idxPartida = findCol('partida', 'partida_id');
  const idxDesc = findCol('descripcion', 'concepto', 'nombre', 'titulo');
  const idxUnidad = findCol('unidad', 'uni', 'um');
  const idxCant = findCol('cantidad', 'volumen', 'cantidad_presupuestada');
  const idxMat = findCol('costo_materiales', 'materiales');
  const idxInst = findCol('costo_instalacion', 'instalacion', 'mano_obra');
  const idxPU = findCol('precio_unitario', 'pu', 'precio');
  const idxInd = findCol('indirectos', 'indirectos_pct');
  const idxInicio = findCol('fecha_inicio_programada', 'fecha_inicio', 'inicio');
  const idxFin = findCol('fecha_fin_programada', 'fecha_fin', 'fin', 'termino');
  const idxAlcances = findCol('alcances', 'especificaciones');

  const warnings: string[] = [];
  const conceptos: CatalogoConcepto[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const clave = (idxClave >= 0 ? row[idxClave] : row[0] ?? '').trim().toUpperCase();
    const descripcion = (idxDesc >= 0 ? row[idxDesc] : row[2] ?? '').trim();

    if (!clave || !descripcion) {
      warnings.push(`Fila ${r + 1}: omitida por faltar clave o descripción.`);
      continue;
    }

    const partidaId = normalizePartidaId(idxPartida >= 0 ? row[idxPartida] ?? '1.0' : '1.0');
    const unidad = (idxUnidad >= 0 ? row[idxUnidad] : row[3] ?? 'm²').trim() || 'm²';
    const cantidad = Math.max(
      0,
      Number((idxCant >= 0 ? row[idxCant] : row[4] ?? '0').replace(/[$,\s]/g, '')) || 0
    );

    const indirectosPct =
      idxInd >= 0 && row[idxInd]
        ? Number(row[idxInd].replace(/[%,\s]/g, '')) || 28
        : 28;

    let costoMat =
      idxMat >= 0 && row[idxMat]
        ? Number(row[idxMat].replace(/[$,\s]/g, '')) || 0
        : 0;
    let costoInst =
      idxInst >= 0 && row[idxInst]
        ? Number(row[idxInst].replace(/[$,\s]/g, '')) || 0
        : 0;

    // Si solo viene Precio Unitario en el Excel, deriva Materiales/Instalación proporcionalmente
    if (costoMat + costoInst <= 0 && idxPU >= 0 && row[idxPU]) {
      const pu = Number(row[idxPU].replace(/[$,\s]/g, '')) || 0;
      if (pu > 0) {
        const cd = pu / (1 + indirectosPct / 100);
        costoMat = Number((cd * 0.65).toFixed(2));
        costoInst = Number((cd * 0.35).toFixed(2));
      }
    }

    if (cantidad <= 0 || costoMat + costoInst <= 0) {
      warnings.push(
        `Fila ${r + 1} (${clave}): omitida porque cantidad o costos unitarios son menores o iguales a 0.`
      );
      continue;
    }

    const fechaInicio = normalizeDateCell(
      idxInicio >= 0 ? row[idxInicio] ?? '' : '',
      '2024-05-06'
    );
    const fechaFin = normalizeDateCell(
      idxFin >= 0 ? row[idxFin] ?? '' : '',
      '2024-12-20'
    );

    const alcancesRaw = idxAlcances >= 0 ? row[idxAlcances] ?? '' : '';
    const alcances = alcancesRaw
      ? alcancesRaw
          .split(/[|;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const costos = calcularCostosUnitarios(costoMat, costoInst, indirectosPct);

    conceptos.push({
      clave,
      partidaId,
      descripcion,
      alcances,
      unidad,
      cantidadPresupuestada: cantidad,
      cantidadAdicionalAutorizada: 0,
      cantidadEjecutada: 0,
      ...costos,
      fecha_inicio_programada: fechaInicio,
      fecha_fin_programada: fechaFin < fechaInicio ? fechaInicio : fechaFin,
      tipo: 'ORDINARIO',
    });
  }

  return { conceptos, warnings };
}

export async function parseCatalogoExcelFile(file: File): Promise<ParsedCatalogoResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) {
    const text = await file.text();
    const rows = parseCsvRows(text);
    return mapRowsToConceptos(rows);
  }

  const buffer = await file.arrayBuffer();
  const entries = await extractZipTextEntries(
    buffer,
    new Set(['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml'])
  );
  const rows = parseXlsxRows(entries);
  return mapRowsToConceptos(rows);
}

export function downloadCatalogoTemplateCsv(): void {
  const headers = [
    'clave',
    'partida',
    'descripcion',
    'unidad',
    'cantidad',
    'costo_materiales',
    'costo_instalacion',
    'indirectos_pct',
    'fecha_inicio_programada',
    'fecha_fin_programada',
    'alcances',
  ];
  const sampleRows = [
    [
      'E01-099',
      '1.0',
      'Excavación y plantilla de concreto en cimentación',
      'm³',
      '250',
      '420.50',
      '280.00',
      '28',
      '2024-06-01',
      '2024-08-15',
      'Trazo y nivelación|Plantilla f\'c=100 kg/cm²',
    ],
    [
      'E02-105',
      '2.0',
      'Armado y colado de columnas de concreto f\'c=250 kg/cm²',
      'm³',
      '180',
      '1850.00',
      '960.00',
      '28',
      '2024-08-16',
      '2024-11-10',
      'Acero fy=4200 kg/cm²|Cimbra aparente y vibrado',
    ],
  ];

  const csvContent =
    '\uFEFF' +
    [headers.join(','), ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(','))].join(
      '\n'
    );
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_catalogo_conceptos.csv';
  a.click();
  URL.revokeObjectURL(url);
}
