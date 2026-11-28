export interface EstimacionExportConcepto {
  clave: string;
  nombre: string;
  unidad: string;
  cantidadContratada: number;
  acumuladoAnterior: number;
  estimado: number;
  acumuladoActual: number;
  saldo: number;
  precioUnitario: number;
  importe: number;
}

export interface EstimacionExportPayload {
  id: string;
  etiqueta: string;
  numero: number;
  tipo: string;
  fechaEstimacion: string;
  periodoInicio: string;
  periodoFin: string;
  noContrato: string;
  razonSocial: string;
  rfc: string;
  noFianzaAnticipo: string;
  montoContrato: number;
  montoAnticipo: number;
  importeEstimado: number;
  acumuladoAnterior: number;
  acumuladoActual: number;
  saldoPorEstimar: number;
  amortizacionEstimacion: number;
  amortizacionAcumuladaAnterior: number;
  amortizacionAcumuladaActual: number;
  saldoPorAmortizar: number;
  iva: number;
  retencionAtraso: number;
  retencionSfp: number;
  montoNeto: number;
  estado: string;
  conceptos: EstimacionExportConcepto[];
}

type CellValue = string | number;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function indexToColLetters(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildWorksheetXml(rows: CellValue[][]): string {
  const rowXml = rows
    .map((cells, rowIdx) => {
      const r = rowIdx + 1;
      const cellsXml = cells
        .map((val, colIdx) => {
          const ref = `${indexToColLetters(colIdx)}${r}`;
          if (typeof val === 'number' && Number.isFinite(val)) {
            return `<c r="${ref}"><v>${val}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(val))}</t></is></c>`;
        })
        .join('');
      return `<row r="${r}">${cellsXml}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${rowXml}</sheetData>` +
    '</worksheet>'
  );
}

// CRC-32 table for valid ZIP container generation (.xlsx)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Builds a standards-compliant uncompressed ZIP archive (.xlsx). */
function buildStoredZip(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);

    const localBuf = new ArrayBuffer(30 + nameBytes.length + dataBytes.length);
    const localView = new DataView(localBuf);
    const localArr = new Uint8Array(localBuf);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true);         // Version needed
    localView.setUint16(6, 0, true);          // Flags
    localView.setUint16(8, 0, true);          // Compression: 0 (store)
    localView.setUint16(10, 0, true);         // Mod time
    localView.setUint16(12, 0, true);         // Mod date
    localView.setUint32(14, checksum, true);  // CRC-32
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);         // Extra length
    localArr.set(nameBytes, 30);
    localArr.set(dataBytes, 30 + nameBytes.length);
    localParts.push(localArr);

    const centralBuf = new ArrayBuffer(46 + nameBytes.length);
    const centralView = new DataView(centralBuf);
    const centralArr = new Uint8Array(centralBuf);

    centralView.setUint32(0, 0x02014b50, true); // Central dir signature
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralArr.set(nameBytes, 46);
    centralParts.push(centralArr);

    offset += localArr.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocdBuf = new ArrayBuffer(22);
  const eocdView = new DataView(eocdBuf);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, new Uint8Array(eocdBuf)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function buildEstimacionXlsxBlob(est: EstimacionExportPayload): Blob {
  const subtotal = Math.max(0, est.importeEstimado - est.amortizacionEstimacion);
  const rows: CellValue[][] = [
    ['CARÁTULA DE ESTIMACIÓN DE OBRA PÚBLICA'],
    ['Estimación', est.etiqueta, 'Estatus', est.estado],
    ['Contrato', est.noContrato, 'Fecha estimación', est.fechaEstimacion],
    ['Contratista', est.razonSocial, 'RFC', est.rfc],
    ['Periodo', `${est.periodoInicio} al ${est.periodoFin}`, 'Fianza anticipo', est.noFianzaAnticipo],
    [],
    ['RESUMEN FINANCIERO (MXN)', 'MONTO', 'AMORTIZACIÓN E IMPUESTOS', 'MONTO'],
    ['Monto del contrato', est.montoContrato, 'Monto de anticipo', est.montoAnticipo],
    ['Importe de esta estimación', est.importeEstimado, 'Amortización esta estimación', est.amortizacionEstimacion],
    ['Acumulado anterior', est.acumuladoAnterior, 'Amortización acumulada anterior', est.amortizacionAcumuladaAnterior],
    ['Acumulado actual', est.acumuladoActual, 'Amortización acumulada actual', est.amortizacionAcumuladaActual],
    ['Saldo por estimar', est.saldoPorEstimar, 'Saldo por amortizar', est.saldoPorAmortizar],
    ['Subtotal (Est. - Amort.)', subtotal, 'IVA (16%)', est.iva],
    ['Retención por atraso', est.retencionAtraso, 'Retención 0.05% SFP', est.retencionSfp],
    ['TOTAL NETO A PAGAR', est.montoNeto],
    [],
    ['DETALLE DE CONCEPTOS DE ESTA ESTIMACIÓN'],
    [
      'Clave',
      'Concepto',
      'Unidad',
      'Contratado',
      'Acum. Anterior',
      'De esta estimación',
      'Acum. Actual',
      'Saldo',
      'Precio Unitario',
      'Importe',
    ],
    ...est.conceptos.map((c) => [
      c.clave,
      c.nombre,
      c.unidad,
      c.cantidadContratada,
      c.acumuladoAnterior,
      c.estimado,
      c.acumuladoActual,
      c.saldo,
      c.precioUnitario,
      c.importe,
    ]),
  ];

  const sheetXml = buildWorksheetXml(rows);

  const contentTypesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '</Types>';

  const relsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Caratula" sheetId="1" r:id="rId1"/></sheets>' +
    '</workbook>';

  const workbookRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '</Relationships>';

  return buildStoredZip([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Conecta con GET /estimaciones/{id_estimacion}/exportar-excel cuando VITE_API_URL
 * está configurado; en modo prototipo frontend genera y descarga el archivo .xlsx localmente.
 */
export async function exportarEstimacionExcel(
  est: EstimacionExportPayload
): Promise<{ mode: 'api' | 'local'; endpoint: string; fileName: string }> {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const endpoint = `/estimaciones/${encodeURIComponent(est.id)}/exportar-excel`;
  const safeTipo = est.tipo.toLowerCase();
  const fileName = `estimacion_${safeTipo}_${est.numero}_${est.id}.xlsx`;

  if (apiBase) {
    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        triggerBlobDownload(blob, fileName);
        return { mode: 'api', endpoint: `${apiBase}${endpoint}`, fileName };
      }
    } catch {
      // Fallback local si el backend aún no está levantado
    }
  }

  const localBlob = buildEstimacionXlsxBlob(est);
  triggerBlobDownload(localBlob, fileName);
  return { mode: 'local', endpoint, fileName };
}
