import React, { useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Lock,
  Unlock,
  ShieldAlert,
  FilePlus2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookMarked,
  X,
  FileSpreadsheet,
  Upload,
  Pencil,
  Calendar,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import {
  CATALOGO_PARAMETRICO_PDF,
  PARTIDAS_CONSTRUCTIVAS,
  calcularAvanceProgramadoAFecha,
  calcularAvanceProgramadoConcepto,
  calcularCostosUnitarios,
  type CatalogoConcepto,
  type PartidaId,
} from '../mocks/catalogoParametrico.mock';
import { validarArchivoExcel } from '../utils/businessRules';
import {
  downloadCatalogoTemplateCsv,
  parseCatalogoExcelFile,
} from '../utils/excelImport';
import { FileDropzone } from '../components/common/FileDropzone';
import { ConfirmActionModal } from '../components/common/ConfirmActionModal';

export type { CatalogoConcepto };

const FECHA_CORTE_CATALOGO = '2024-10-14';

const formatMXN = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(amount);

function blockNegativeKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
}

export const CatalogoPage: React.FC = () => {
  const { user } = useAuth();
  const {
    selectedObra,
    selectedObraMontoContrato,
    selectedConceptos: conceptos,
    addConceptoToSelectedObra,
    updateConceptoInSelectedObra,
    importConceptosToSelectedObra,
    autorizarAdicionalConcepto,
  } = useObra();

  const [lineaBaseCongelada, setLineaBaseCongelada] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'ORDINARIO' | 'EXTRAORDINARIO'>('TODOS');
  const [partidaFilter, setPartidaFilter] = useState<string>('TODAS');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal alta / edición ordinaria
  const [showAddOrdModal, setShowAddOrdModal] = useState(false);
  const [editingOriginalClave, setEditingOriginalClave] = useState<string | null>(null);
  const [selectedTemplateClave, setSelectedTemplateClave] = useState('');
  const [ordForm, setOrdForm] = useState({
    partidaId: '1.0' as PartidaId,
    clave: '',
    descripcion: '',
    alcancesTexto: '',
    unidad: 'm²',
    cantidad: '',
    costoMateriales: '',
    costoInstalacion: '',
    indirectosPct: '28',
    fecha_inicio_programada: selectedObra.fechaInicio ?? '2024-05-06',
    fecha_fin_programada: selectedObra.fechaFinIso ?? '2024-12-20',
  });

  // Modal extraordinario (Residente - RF-RES-04)
  const [showAddExtModal, setShowAddExtModal] = useState(false);
  const [extForm, setExtForm] = useState({
    partidaId: '2.0' as PartidaId,
    clave: '',
    descripcion: '',
    alcancesTexto: '',
    unidad: 'm²',
    cantidad: '',
    costoMateriales: '',
    costoInstalacion: '',
    indirectosPct: '28',
    fecha_inicio_programada: '2024-10-15',
    fecha_fin_programada: selectedObra.fechaFinIso ?? '2024-12-20',
  });
  const [apuFiles, setApuFiles] = useState<File[]>([]);
  const [confirmExtSign, setConfirmExtSign] = useState(false);

  // Modal cantidad adicional (Residente - RN-RES-02.1)
  const [adicionalTarget, setAdicionalTarget] = useState<CatalogoConcepto | null>(null);
  const [adicionalDelta, setAdicionalDelta] = useState('');

  // Modal importar Excel (.xlsx)
  const [showImportModal, setShowImportModal] = useState(false);
  const [excelDragging, setExcelDragging] = useState(false);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelParsed, setExcelParsed] = useState<CatalogoConcepto[]>([]);
  const [excelWarnings, setExcelWarnings] = useState<string[]>([]);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelParsing, setExcelParsing] = useState(false);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const isSuperintendente = user?.rol === 'SUPERINTENDENTE';
  const isResidente = user?.rol === 'RESIDENTE';
  const canEditConcept = isResidente || (isSuperintendente && !lineaBaseCongelada);
  const canImportExcel = isResidente || (isSuperintendente && !lineaBaseCongelada);

  const toggleExpand = (clave: string) => {
    setExpandedKeys((prev) =>
      prev.includes(clave) ? prev.filter((k) => k !== clave) : [...prev, clave]
    );
  };

  // Totales financieros del catálogo (Costo Directo vs Precio Unitario)
  const totalesPresupuesto = useMemo(() => {
    let importeOrdinarioPU = 0;
    let totalCD = 0;
    let totalPU = 0;

    for (const c of conceptos) {
      const volTotal = c.cantidadPresupuestada + c.cantidadAdicionalAutorizada;
      totalCD += volTotal * c.costoDirecto;
      totalPU += volTotal * c.precioUnitario;
      if (c.tipo === 'ORDINARIO') {
        importeOrdinarioPU += c.cantidadPresupuestada * c.precioUnitario;
      }
    }

    return { importeOrdinarioPU, totalCD, totalPU };
  }, [conceptos]);

  const avanceProgramadoGlobal = useMemo(
    () => calcularAvanceProgramadoAFecha(conceptos, FECHA_CORTE_CATALOGO),
    [conceptos]
  );

  const porcentajeAsignado = Math.min(
    100,
    (totalesPresupuesto.importeOrdinarioPU / selectedObraMontoContrato) * 100
  );

  // Conceptos filtrados y agrupados por partida
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conceptos.filter((c) => {
      if (tipoFilter !== 'TODOS' && c.tipo !== tipoFilter) return false;
      if (partidaFilter !== 'TODAS' && c.partidaId !== partidaFilter) return false;
      if (!q) return true;
      return (
        c.clave.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q) ||
        c.unidad.toLowerCase().includes(q) ||
        c.fecha_inicio_programada.includes(q) ||
        c.fecha_fin_programada.includes(q) ||
        c.alcances.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [conceptos, search, tipoFilter, partidaFilter]);

  const groupedByPartida = useMemo(() => {
    return PARTIDAS_CONSTRUCTIVAS.map((partida) => {
      const items = filtered.filter((c) => c.partidaId === partida.id);
      const subtotalCD = items.reduce(
        (acc, c) =>
          acc + (c.cantidadPresupuestada + c.cantidadAdicionalAutorizada) * c.costoDirecto,
        0
      );
      const subtotalPU = items.reduce(
        (acc, c) =>
          acc + (c.cantidadPresupuestada + c.cantidadAdicionalAutorizada) * c.precioUnitario,
        0
      );
      const incidenciaPct =
        totalesPresupuesto.totalPU > 0
          ? (subtotalPU / totalesPresupuesto.totalPU) * 100
          : 0;

      return { partida, items, subtotalCD, subtotalPU, incidenciaPct };
    }).filter((group) => group.items.length > 0);
  }, [filtered, totalesPresupuesto.totalPU]);

  // Cálculos en vivo para los modales
  const ordCalc = useMemo(
    () =>
      calcularCostosUnitarios(
        Number(ordForm.costoMateriales || 0),
        Number(ordForm.costoInstalacion || 0),
        Number(ordForm.indirectosPct || 0)
      ),
    [ordForm.costoMateriales, ordForm.costoInstalacion, ordForm.indirectosPct]
  );

  const extCalc = useMemo(
    () =>
      calcularCostosUnitarios(
        Number(extForm.costoMateriales || 0),
        Number(extForm.costoInstalacion || 0),
        Number(extForm.indirectosPct || 0)
      ),
    [extForm.costoMateriales, extForm.costoInstalacion, extForm.indirectosPct]
  );

  const openCreateOrdModal = () => {
    setErrorMsg(null);
    setEditingOriginalClave(null);
    setSelectedTemplateClave('');
    setOrdForm({
      partidaId: '1.0',
      clave: '',
      descripcion: '',
      alcancesTexto: '',
      unidad: 'm²',
      cantidad: '',
      costoMateriales: '',
      costoInstalacion: '',
      indirectosPct: '28',
      fecha_inicio_programada: selectedObra.fechaInicio ?? '2024-05-06',
      fecha_fin_programada: selectedObra.fechaFinIso ?? '2024-12-20',
    });
    setShowAddOrdModal(true);
  };

  const openEditConceptModal = (c: CatalogoConcepto) => {
    setErrorMsg(null);
    setEditingOriginalClave(c.clave);
    setSelectedTemplateClave('');
    setOrdForm({
      partidaId: c.partidaId,
      clave: c.clave,
      descripcion: c.descripcion,
      alcancesTexto: c.alcances.join('\n'),
      unidad: c.unidad,
      cantidad: String(c.cantidadPresupuestada),
      costoMateriales: String(c.costoMateriales),
      costoInstalacion: String(c.costoInstalacion),
      indirectosPct: String(c.indirectosPct),
      fecha_inicio_programada: c.fecha_inicio_programada,
      fecha_fin_programada: c.fecha_fin_programada,
    });
    setShowAddOrdModal(true);
  };

  const handleSelectParametricTemplate = (clave: string) => {
    setSelectedTemplateClave(clave);
    const tpl = CATALOGO_PARAMETRICO_PDF.find((item) => item.clave === clave);
    if (!tpl) return;
    setOrdForm((prev) => ({
      ...prev,
      partidaId: tpl.partidaId,
      clave: tpl.clave,
      descripcion: tpl.titulo,
      alcancesTexto: tpl.alcances.join('\n'),
      unidad: tpl.unidad,
      costoMateriales: String(tpl.costoMateriales),
      costoInstalacion: String(tpl.costoInstalacion),
      indirectosPct: String(tpl.indirectosPct),
    }));
  };

  const handleSaveOrdinario = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const isEditing = editingOriginalClave !== null;

    if (!isEditing && lineaBaseCongelada) {
      setErrorMsg(
        'Catálogo congelado (RN-SUPT-01.3): no se pueden agregar conceptos ordinarios tras la apertura de obra.'
      );
      return;
    }

    const claveNorm = ordForm.clave.trim().toUpperCase();
    const cantidad = Number(ordForm.cantidad);

    if (!claveNorm || !ordForm.descripcion.trim() || cantidad <= 0 || ordCalc.precioUnitario <= 0) {
      setErrorMsg(
        'Completa clave, título, cantidad (> 0) y costos de Materiales / Instalación (> 0).'
      );
      return;
    }

    if (!ordForm.fecha_inicio_programada || !ordForm.fecha_fin_programada) {
      setErrorMsg(
        'Captura las fechas programadas (fecha_inicio_programada y fecha_fin_programada) del concepto.'
      );
      return;
    }

    if (ordForm.fecha_fin_programada < ordForm.fecha_inicio_programada) {
      setErrorMsg(
        'La fecha de fin programada no puede ser anterior a la fecha de inicio programada.'
      );
      return;
    }

    const duplicateExists = conceptos.some(
      (c) =>
        c.clave.toUpperCase() === claveNorm &&
        (!isEditing || c.clave.toUpperCase() !== editingOriginalClave.toUpperCase())
    );
    if (duplicateExists) {
      setErrorMsg(
        `Clave duplicada (RN-SUPT-01.2): el concepto "${claveNorm}" ya existe en esta obra.`
      );
      return;
    }

    const existingConcept = isEditing
      ? conceptos.find((c) => c.clave === editingOriginalClave)
      : undefined;

    const existingImporte =
      existingConcept && existingConcept.tipo === 'ORDINARIO'
        ? existingConcept.cantidadPresupuestada * existingConcept.precioUnitario
        : 0;
    const nuevoImporte =
      totalesPresupuesto.importeOrdinarioPU -
      existingImporte +
      cantidad * ordCalc.precioUnitario;

    if (
      (!existingConcept || existingConcept.tipo === 'ORDINARIO') &&
      nuevoImporte > selectedObraMontoContrato
    ) {
      setErrorMsg(
        `Tope presupuestal excedido (RN-SUPT-01.1): el acumulado (${formatMXN(
          nuevoImporte
        )}) rebasa el monto contratado (${formatMXN(selectedObraMontoContrato)}).`
      );
      return;
    }

    const alcances = ordForm.alcancesTexto
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);

    const conceptoPayload: CatalogoConcepto = {
      clave: claveNorm,
      partidaId: ordForm.partidaId,
      descripcion: ordForm.descripcion.trim(),
      alcances,
      unidad: ordForm.unidad.trim() || 'm²',
      cantidadPresupuestada: cantidad,
      cantidadAdicionalAutorizada: existingConcept?.cantidadAdicionalAutorizada ?? 0,
      cantidadEjecutada: existingConcept?.cantidadEjecutada ?? 0,
      ...ordCalc,
      fecha_inicio_programada: ordForm.fecha_inicio_programada,
      fecha_fin_programada: ordForm.fecha_fin_programada,
      tipo: existingConcept?.tipo ?? 'ORDINARIO',
      autorizadoPorResidente: existingConcept?.autorizadoPorResidente,
      dictamenApuNombre: existingConcept?.dictamenApuNombre,
    };

    if (isEditing && editingOriginalClave) {
      updateConceptoInSelectedObra(editingOriginalClave, conceptoPayload);
      setSuccessMsg(
        `Concepto ${claveNorm} actualizado (${ordForm.fecha_inicio_programada} al ${ordForm.fecha_fin_programada}).`
      );
    } else {
      addConceptoToSelectedObra(conceptoPayload);
      setSuccessMsg(
        `Concepto ordinario ${claveNorm} agregado con P.U. de ${formatMXN(
          ordCalc.precioUnitario
        )} y programa ${ordForm.fecha_inicio_programada} → ${ordForm.fecha_fin_programada}.`
      );
    }

    setEditingOriginalClave(null);
    setSelectedTemplateClave('');
    setShowAddOrdModal(false);
  };

  const handleRequestExtraordinario = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const claveNorm = extForm.clave.trim().toUpperCase();
    const cantidad = Number(extForm.cantidad);

    if (!claveNorm || !extForm.descripcion.trim() || cantidad <= 0 || extCalc.precioUnitario <= 0) {
      setErrorMsg('Completa todos los datos numéricos y descriptivos del concepto extraordinario.');
      return;
    }

    if (!extForm.fecha_inicio_programada || !extForm.fecha_fin_programada) {
      setErrorMsg('Captura las fechas programadas de inicio y fin para el concepto extraordinario.');
      return;
    }

    if (extForm.fecha_fin_programada < extForm.fecha_inicio_programada) {
      setErrorMsg('La fecha fin programada no puede ser anterior a la fecha inicio programada.');
      return;
    }

    if (conceptos.some((c) => c.clave.toUpperCase() === claveNorm)) {
      setErrorMsg(`La clave "${claveNorm}" ya existe en el catálogo (RN-SUPT-01.2).`);
      return;
    }

    if (apuFiles.length === 0 || !apuFiles[0].name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg(
        'Evidencia requerida (RN-RES-04.1): adjunta el dictamen técnico y APU en formato PDF (máx. 10 MB).'
      );
      return;
    }

    setConfirmExtSign(true);
  };

  const handleConfirmExtraordinarioSign = () => {
    const claveNorm = extForm.clave.trim().toUpperCase();
    const alcances = extForm.alcancesTexto
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);

    addConceptoToSelectedObra({
      clave: claveNorm,
      partidaId: extForm.partidaId,
      descripcion: extForm.descripcion.trim(),
      alcances,
      unidad: extForm.unidad.trim() || 'm²',
      cantidadPresupuestada: Number(extForm.cantidad),
      cantidadAdicionalAutorizada: 0,
      cantidadEjecutada: 0,
      ...extCalc,
      fecha_inicio_programada: extForm.fecha_inicio_programada,
      fecha_fin_programada: extForm.fecha_fin_programada,
      tipo: 'EXTRAORDINARIO',
      autorizadoPorResidente: true,
      dictamenApuNombre: apuFiles[0]?.name,
    });

    setConfirmExtSign(false);
    setShowAddExtModal(false);
    setExtForm({
      partidaId: '2.0',
      clave: '',
      descripcion: '',
      alcancesTexto: '',
      unidad: 'm²',
      cantidad: '',
      costoMateriales: '',
      costoInstalacion: '',
      indirectosPct: '28',
      fecha_inicio_programada: '2024-10-15',
      fecha_fin_programada: selectedObra.fechaFinIso ?? '2024-12-20',
    });
    setApuFiles([]);
    setSuccessMsg(
      `Concepto extraordinario ${claveNorm} autorizado con firma electrónica e inyectado en catálogo (RF-RES-04).`
    );
  };

  const handleAutorizarAdicional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adicionalTarget) return;
    const delta = Number(adicionalDelta);
    if (Number.isNaN(delta) || delta <= 0) {
      setErrorMsg('La cantidad adicional autorizada debe ser mayor a 0 (RN-RES-02.1).');
      return;
    }

    autorizarAdicionalConcepto(adicionalTarget.clave, delta);
    setSuccessMsg(
      `Se autorizaron +${delta} ${adicionalTarget.unidad} adicionales en ${adicionalTarget.clave} (RN-RES-02.1).`
    );
    setAdicionalTarget(null);
    setAdicionalDelta('');
  };

  // --- Importación desde Excel (.xlsx / .csv) ---
  const handleExcelFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setExcelError(null);
    setExcelWarnings([]);
    setExcelParsed([]);
    setExcelFileName(file.name);

    const check = validarArchivoExcel(file);
    if (!check.valido) {
      setExcelError(check.error ?? 'Archivo no válido.');
      return;
    }

    setExcelParsing(true);
    try {
      const result = await parseCatalogoExcelFile(file);
      setExcelParsed(result.conceptos);
      setExcelWarnings(result.warnings);
      if (result.conceptos.length === 0) {
        setExcelError(
          'No se encontraron conceptos válidos en el archivo. Verifica encabezados: clave, partida, descripcion, unidad, cantidad, costo_materiales, costo_instalacion, fecha_inicio_programada, fecha_fin_programada.'
        );
      }
    } catch (err) {
      setExcelError(
        err instanceof Error
          ? err.message
          : 'Error al procesar el archivo Excel (.xlsx).'
      );
    } finally {
      setExcelParsing(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleConfirmExcelImport = () => {
    if (excelParsed.length === 0) return;
    const { added, updated } = importConceptosToSelectedObra(excelParsed);
    setSuccessMsg(
      `Importación completada desde "${excelFileName}": ${added} concepto(s) nuevo(s) y ${updated} actualizado(s) con fechas programadas.`
    );
    setShowImportModal(false);
    setExcelParsed([]);
    setExcelWarnings([]);
    setExcelFileName(null);
    setExcelError(null);
  };

  const showActionColumn = isResidente || canEditConcept;
  const totalColumns = showActionColumn ? 11 : 10;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            Contrato {selectedObra.contrato} · Presupuesto por partidas, costos y fechas programadas
          </p>
          <h1 className="text-2xl font-normal text-fg tracking-tight mt-0.5">
            Catálogo de conceptos
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperintendente && (
            <button
              type="button"
              onClick={() => setLineaBaseCongelada((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line-strong bg-surface text-xs font-medium text-fg-soft cursor-pointer"
            >
              {lineaBaseCongelada ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              <span>{lineaBaseCongelada ? 'Línea base congelada' : 'Fase inicial (editable)'}</span>
            </button>
          )}

          {canImportExcel && (
            <button
              type="button"
              onClick={() => {
                setExcelError(null);
                setExcelWarnings([]);
                setExcelParsed([]);
                setExcelFileName(null);
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line-strong bg-surface hover:border-brand text-xs font-semibold text-fg-soft cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-ok-fg" />
              <span>Importar Excel (.xlsx)</span>
            </button>
          )}

          {isSuperintendente && (
            <button
              type="button"
              disabled={lineaBaseCongelada}
              onClick={openCreateOrdModal}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                lineaBaseCongelada
                  ? 'bg-line text-fg-muted cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar concepto base</span>
            </button>
          )}

          {isResidente && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowAddExtModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Inyectar extraordinario (APU)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta de control presupuestal + Avance Programado */}
      <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg">
              Control de tope presupuestal (Catálogo Ordinario a P.U.)
            </span>
            {lineaBaseCongelada && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-subtle text-[10px] font-semibold text-fg-soft">
                <Lock className="w-3 h-3" /> Inmutable tras apertura
              </span>
            )}
          </div>
          <span className="text-fg-soft">
            <strong>{formatMXN(totalesPresupuesto.importeOrdinarioPU)}</strong> de{' '}
            <strong>{formatMXN(selectedObraMontoContrato)}</strong> contratados (
            {porcentajeAsignado.toFixed(1)}%)
          </span>
        </div>

        <div className="h-2 bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full"
            style={{ width: `${porcentajeAsignado}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 text-[11px]">
          <div className="p-2.5 rounded-lg bg-canvas border border-line">
            <span className="text-fg-muted block">Total a Costo Directo (CD)</span>
            <strong className="text-fg text-xs">{formatMXN(totalesPresupuesto.totalCD)}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-line">
            <span className="text-fg-muted block">Indirectos acumulados</span>
            <strong className="text-fg text-xs">
              {formatMXN(totalesPresupuesto.totalPU - totalesPresupuesto.totalCD)}
            </strong>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-line">
            <span className="text-fg-muted block">Total Presupuesto (P.U.)</span>
            <strong className="text-accent text-xs">{formatMXN(totalesPresupuesto.totalPU)}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-line">
            <span className="text-fg-muted block">
              Avance Programado al {FECHA_CORTE_CATALOGO}
            </span>
            <strong className="text-ok-fg text-xs">{avanceProgramadoGlobal}%</strong>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-danger-bg border border-danger-line text-danger-fg text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-ok-bg border border-ok-line text-ok-fg text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Filtros: Búsqueda + Partida + Tipo */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clave, concepto, fecha, alcance o unidad"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-line text-fg focus:border-brand"
          />
        </div>

        <select
          aria-label="Filtrar por partida"
          value={partidaFilter}
          onChange={(e) => setPartidaFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-surface border border-line text-fg-soft cursor-pointer"
        >
          <option value="TODAS">Todas las partidas</option>
          {PARTIDAS_CONSTRUCTIVAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por tipo de concepto"
          value={tipoFilter}
          onChange={(e) =>
            setTipoFilter(e.target.value as 'TODOS' | 'ORDINARIO' | 'EXTRAORDINARIO')
          }
          className="px-3 py-2 text-xs rounded-lg bg-surface border border-line text-fg-soft cursor-pointer"
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="ORDINARIO">Ordinarios</option>
          <option value="EXTRAORDINARIO">Extraordinarios (APU)</option>
        </select>
      </div>

      {/* Tabla agrupada por partidas con fechas programadas */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-260 text-xs">
            <thead>
              <tr className="bg-canvas text-[10px] font-semibold uppercase text-fg-muted border-b border-line">
                <th className="py-3 px-4">Clave</th>
                <th className="py-3 px-3">Descripción del Ensamblado / Concepto</th>
                <th className="py-3 px-2">Programa (Inicio – Fin)</th>
                <th className="py-3 px-2">Uni.</th>
                <th className="py-3 px-2 text-right">Cantidad (+Adic.)</th>
                <th className="py-3 px-2 text-right">Ejecutado</th>
                <th className="py-3 px-2 text-right">Costo Directo</th>
                <th className="py-3 px-2 text-right">P.U. (+Ind.)</th>
                <th className="py-3 px-3 text-right">Importe</th>
                <th className="py-3 px-3 text-right">%</th>
                {showActionColumn && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groupedByPartida.map(({ partida, items, subtotalCD, subtotalPU, incidenciaPct }) => (
                <React.Fragment key={partida.id}>
                  {/* Encabezado de partida */}
                  <tr className="bg-subtle/70">
                    <td
                      colSpan={totalColumns}
                      className="py-2 px-4 text-[11px] font-bold uppercase tracking-wide text-fg"
                    >
                      {partida.nombre}
                    </td>
                  </tr>

                  {/* Filas de conceptos */}
                  {items.map((c) => {
                    const volTotal = c.cantidadPresupuestada + c.cantidadAdicionalAutorizada;
                    const importe = volTotal * c.precioUnitario;
                    const pctConcepto =
                      totalesPresupuesto.totalPU > 0
                        ? (importe / totalesPresupuesto.totalPU) * 100
                        : 0;
                    const pctProgConcepto = calcularAvanceProgramadoConcepto(
                      c.fecha_inicio_programada,
                      c.fecha_fin_programada,
                      FECHA_CORTE_CATALOGO
                    );
                    const pctRealConcepto =
                      volTotal > 0 ? Math.min(100, (c.cantidadEjecutada / volTotal) * 100) : 0;
                    const isExpanded = expandedKeys.includes(c.clave);

                    return (
                      <React.Fragment key={c.clave}>
                        <tr className="hover:bg-subtle/50 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap align-top">
                            <button
                              type="button"
                              onClick={() => toggleExpand(c.clave)}
                              className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>{c.clave}</span>
                            </button>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-fg">{c.descripcion}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  c.tipo === 'EXTRAORDINARIO'
                                    ? 'bg-warn-bg text-warn-fg'
                                    : 'bg-info-bg text-accent'
                                }`}
                              >
                                {c.tipo}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-fg-muted">
                              <button
                                type="button"
                                onClick={() => toggleExpand(c.clave)}
                                className="text-accent hover:underline cursor-pointer"
                              >
                                {isExpanded
                                  ? 'Ocultar alcances y matriz de costos'
                                  : `Ver alcances (${c.alcances.length}) y matriz de costos`}
                              </button>
                              {c.dictamenApuNombre && <span>· APU: {c.dictamenApuNombre}</span>}
                            </div>
                          </td>

                          <td className="py-3 px-2 whitespace-nowrap align-top">
                            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-fg">
                              <Calendar className="w-3 h-3 text-accent shrink-0" />
                              <span>{c.fecha_inicio_programada}</span>
                            </div>
                            <div className="text-[10px] text-fg-muted pl-4">
                              al {c.fecha_fin_programada}
                            </div>
                            <div className="text-[10px] text-fg-muted pl-4 mt-0.5">
                              Prog: <strong>{pctProgConcepto}%</strong> · Real:{' '}
                              <strong className="text-accent">
                                {pctRealConcepto.toFixed(0)}%
                              </strong>
                            </div>
                          </td>

                          <td className="py-3 px-2 text-fg-muted align-top">{c.unidad}</td>

                          <td className="py-3 px-2 text-right whitespace-nowrap align-top">
                            <span>{c.cantidadPresupuestada.toLocaleString('es-MX')}</span>
                            {c.cantidadAdicionalAutorizada > 0 && (
                              <span className="ml-1 text-[10px] font-semibold text-ok-fg">
                                (+{c.cantidadAdicionalAutorizada})
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-right align-top">
                            {c.cantidadEjecutada.toLocaleString('es-MX')}
                          </td>

                          <td className="py-3 px-2 text-right whitespace-nowrap text-fg-muted align-top">
                            {formatMXN(c.costoDirecto)}
                          </td>

                          <td className="py-3 px-2 text-right whitespace-nowrap font-medium text-fg align-top">
                            {formatMXN(c.precioUnitario)}
                          </td>

                          <td className="py-3 px-3 text-right font-semibold whitespace-nowrap align-top">
                            {formatMXN(importe)}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap text-fg-muted align-top">
                            {pctConcepto.toFixed(1)}%
                          </td>

                          {showActionColumn && (
                            <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {canEditConcept && (
                                  <button
                                    type="button"
                                    onClick={() => openEditConceptModal(c)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line-strong hover:border-brand text-[11px] font-medium text-fg-soft cursor-pointer"
                                    title="Editar concepto y fechas programadas"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Editar</span>
                                  </button>
                                )}
                                {isResidente && c.tipo === 'ORDINARIO' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdicionalTarget(c);
                                      setAdicionalDelta('');
                                    }}
                                    className="px-2 py-1 rounded border border-line-strong hover:border-brand text-[11px] font-medium text-fg-soft cursor-pointer"
                                  >
                                    + Adic.
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Panel expandible */}
                        {isExpanded && (
                          <tr className="bg-canvas/70">
                            <td colSpan={totalColumns} className="px-6 py-4 space-y-3">
                              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                                <div className="lg:col-span-3 space-y-1.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                                    Especificaciones / Incluye:
                                  </p>
                                  {c.alcances.length > 0 ? (
                                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-fg-soft">
                                      {c.alcances.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-[11px] text-fg-muted">
                                      Sin especificaciones adicionales registradas.
                                    </p>
                                  )}
                                </div>

                                <div className="lg:col-span-2 p-3 rounded-lg bg-surface border border-line space-y-1.5 text-[11px]">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                                    Integración del Precio Unitario
                                  </p>
                                  <div className="flex justify-between">
                                    <span className="text-fg-muted">Materiales (Herr. y Eq.):</span>
                                    <span>{formatMXN(c.costoMateriales)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-fg-muted">Instalación (M. de Obra):</span>
                                    <span>{formatMXN(c.costoInstalacion)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-line font-medium">
                                    <span>Costo Directo (Ⓒ):</span>
                                    <span>{formatMXN(c.costoDirecto)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-fg-muted">
                                      Indirectos ({c.indirectosPct}% Ⓒ):
                                    </span>
                                    <span>{formatMXN(c.indirectosMonto)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-line font-bold text-accent">
                                    <span>Precio Unitario (Ⓒ):</span>
                                    <span>{formatMXN(c.precioUnitario)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Subtotal por partida */}
                  <tr className="bg-canvas/90 font-semibold text-[11px]">
                    <td colSpan={6} className="py-2.5 px-4 text-right text-fg-soft uppercase">
                      Total de {partida.nombre}:
                    </td>
                    <td className="py-2.5 px-2 text-right text-fg-muted whitespace-nowrap">
                      {formatMXN(subtotalCD)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-fg-muted">—</td>
                    <td className="py-2.5 px-3 text-right text-fg whitespace-nowrap">
                      {formatMXN(subtotalPU)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-accent whitespace-nowrap">
                      {incidenciaPct.toFixed(1)}%
                    </td>
                    {showActionColumn && <td />}
                  </tr>
                </React.Fragment>
              ))}

              {/* Gran Total del Presupuesto */}
              {groupedByPartida.length > 0 && (
                <tr className="bg-info-bg/50 font-bold text-xs border-t-2 border-line">
                  <td colSpan={6} className="py-3 px-4 text-right uppercase text-fg">
                    Total general del catálogo visible:
                  </td>
                  <td className="py-3 px-2 text-right text-fg-soft whitespace-nowrap">
                    {formatMXN(groupedByPartida.reduce((acc, g) => acc + g.subtotalCD, 0))}
                  </td>
                  <td className="py-3 px-2 text-right text-fg-muted">—</td>
                  <td className="py-3 px-3 text-right text-accent whitespace-nowrap">
                    {formatMXN(groupedByPartida.reduce((acc, g) => acc + g.subtotalPU, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-accent whitespace-nowrap">100.0%</td>
                  {showActionColumn && <td />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Alta / Edición de concepto (incluye fecha_inicio_programada y fecha_fin_programada) */}
      {showAddOrdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowAddOrdModal(false)}
        >
          <form
            onSubmit={handleSaveOrdinario}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto text-xs"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-semibold text-fg">
                  {editingOriginalClave
                    ? `Editar concepto · ${editingOriginalClave}`
                    : 'Nuevo concepto del catálogo original'}
                </h3>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Captura los datos técnicos, costos y fechas programadas (base del avance
                  programado).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOrdModal(false)}
                className="p-1 text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingOriginalClave && (
              <div className="p-3 rounded-lg bg-info-bg/40 border border-brand/30 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>Cargar plantilla desde Catálogo Paramétrico (PDF)</span>
                </label>
                <select
                  value={selectedTemplateClave}
                  onChange={(e) => handleSelectParametricTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-surface cursor-pointer"
                >
                  <option value="">— Captura manual o selecciona un ensamblado base —</option>
                  {PARTIDAS_CONSTRUCTIVAS.map((p) => {
                    const items = CATALOGO_PARAMETRICO_PDF.filter((t) => t.partidaId === p.id);
                    if (items.length === 0) return null;
                    return (
                      <optgroup key={p.id} label={p.nombre}>
                        {items.map((tpl) => (
                          <option key={tpl.clave} value={tpl.clave}>
                            {tpl.clave} · {tpl.titulo} ({tpl.unidad})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Partida *</label>
                <select
                  value={ordForm.partidaId}
                  onChange={(e) =>
                    setOrdForm({ ...ordForm, partidaId: e.target.value as PartidaId })
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
                >
                  {PARTIDAS_CONSTRUCTIVAS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Clave *</label>
                <input
                  type="text"
                  placeholder="Ej. E01-010"
                  value={ordForm.clave}
                  onChange={(e) => setOrdForm({ ...ordForm, clave: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Unidad *</label>
                <input
                  type="text"
                  placeholder="m², m³, pza"
                  value={ordForm.unidad}
                  onChange={(e) => setOrdForm({ ...ordForm, unidad: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-fg-muted mb-1">
                Descripción del ensamblado / concepto *
              </label>
              <input
                type="text"
                placeholder="Título principal del concepto"
                value={ordForm.descripcion}
                onChange={(e) => setOrdForm({ ...ordForm, descripcion: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            {/* Fechas programadas del concepto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-info-bg/30 border border-info-line">
              <div>
                <label className="block text-[10px] font-semibold text-fg-soft mb-1">
                  Fecha inicio programada (fecha_inicio_programada) *
                </label>
                <input
                  type="date"
                  value={ordForm.fecha_inicio_programada}
                  onChange={(e) =>
                    setOrdForm({ ...ordForm, fecha_inicio_programada: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-fg-soft mb-1">
                  Fecha fin programada (fecha_fin_programada) *
                </label>
                <input
                  type="date"
                  value={ordForm.fecha_fin_programada}
                  onChange={(e) =>
                    setOrdForm({ ...ordForm, fecha_fin_programada: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-fg-muted mb-1">
                Especificaciones / Alcances (una viñeta por línea)
              </label>
              <textarea
                rows={3}
                placeholder="- Limpieza y trazo&#10;- Excavación en cepa&#10;- Concreto f'c=200 kg/cm²"
                value={ordForm.alcancesTexto}
                onChange={(e) => setOrdForm({ ...ordForm, alcancesTexto: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Cantidad *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={ordForm.cantidad}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => setOrdForm({ ...ordForm, cantidad: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Materiales (Herr./Eq.)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={ordForm.costoMateriales}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => setOrdForm({ ...ordForm, costoMateriales: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Instalación (M. Obra)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={ordForm.costoInstalacion}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => setOrdForm({ ...ordForm, costoInstalacion: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
              <div>
                <label className="block text-[10px] text-fg-muted mb-1">Indirectos (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={ordForm.indirectosPct}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => setOrdForm({ ...ordForm, indirectosPct: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-canvas border border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-fg-muted block">Costo Directo (Ⓒ)</span>
                <strong className="text-fg">{formatMXN(ordCalc.costoDirecto)}</strong>
              </div>
              <div>
                <span className="text-fg-muted block">Indirectos ({ordCalc.indirectosPct}% Ⓒ)</span>
                <strong className="text-fg">{formatMXN(ordCalc.indirectosMonto)}</strong>
              </div>
              <div>
                <span className="text-fg-muted block">Precio Unitario (Ⓒ)</span>
                <strong className="text-accent">{formatMXN(ordCalc.precioUnitario)}</strong>
              </div>
              <div>
                <span className="text-fg-muted block">Importe Total (Ⓒ)</span>
                <strong className="text-ok-fg">
                  {formatMXN(Number(ordForm.cantidad || 0) * ordCalc.precioUnitario)}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowAddOrdModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold cursor-pointer"
              >
                {editingOriginalClave ? 'Guardar cambios' : 'Guardar concepto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Importar catálogo desde Excel (.xlsx) */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowImportModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-3xl w-full p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto text-xs"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-ok-fg shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    Importar Catálogo de Conceptos desde Excel (.xlsx)
                  </h3>
                  <p className="text-[11px] text-fg-muted mt-0.5">
                    Carga masiva de conceptos incluyendo fecha_inicio_programada y
                    fecha_fin_programada.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="Cerrar"
                className="p-1 text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-canvas border border-line text-[11px]">
              <span className="text-fg-soft">
                Columnas esperadas:{' '}
                <code className="font-mono text-[10px]">
                  clave, partida, descripcion, unidad, cantidad, costo_materiales,
                  costo_instalacion, indirectos_pct, fecha_inicio_programada, fecha_fin_programada
                </code>
              </span>
              <button
                type="button"
                onClick={downloadCatalogoTemplateCsv}
                className="inline-flex items-center gap-1 text-accent font-semibold hover:underline cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar plantilla</span>
              </button>
            </div>

            {/* Dropzone Excel (.xlsx / .csv) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setExcelDragging(true);
              }}
              onDragLeave={() => setExcelDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setExcelDragging(false);
                void handleExcelFileSelected(e.dataTransfer.files?.[0]);
              }}
              onClick={() => excelInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                excelDragging
                  ? 'border-brand bg-info-bg/50'
                  : 'border-line-strong hover:border-brand bg-canvas/50'
              }`}
            >
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => void handleExcelFileSelected(e.target.files?.[0])}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-ok-fg mx-auto mb-2" />
              <p className="text-xs font-semibold text-fg">
                {excelParsing
                  ? 'Procesando libro de Excel...'
                  : excelFileName
                  ? `Archivo seleccionado: ${excelFileName}`
                  : 'Arrastra tu archivo Excel (.xlsx) aquí o haz clic para seleccionar'}
              </p>
              <p className="text-[11px] text-fg-muted mt-1">
                Formatos admitidos: Excel (.xlsx) y CSV (.csv) · Máx. 10 MB
              </p>
            </div>

            {excelError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg border border-danger-line text-danger-fg"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{excelError}</span>
              </div>
            )}

            {excelWarnings.length > 0 && (
              <div className="p-3 rounded-lg bg-warn-bg border border-warn-line text-warn-fg space-y-1 text-[11px]">
                <p className="font-semibold">Advertencias de validación ({excelWarnings.length}):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {excelWarnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {excelParsed.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-ok-fg">
                  Vista previa lista para importar: {excelParsed.length} concepto(s) válido(s)
                </p>
                <div className="overflow-x-auto border border-line rounded-lg max-h-56">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-canvas text-[10px] uppercase text-fg-muted border-b border-line">
                        <th className="py-2 px-3">Clave</th>
                        <th className="py-2 px-2">Partida</th>
                        <th className="py-2 px-2">Descripción</th>
                        <th className="py-2 px-2">Programa</th>
                        <th className="py-2 px-2 text-right">Cant.</th>
                        <th className="py-2 px-3 text-right">P.U.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {excelParsed.map((item) => (
                        <tr key={item.clave}>
                          <td className="py-1.5 px-3 font-semibold text-accent">{item.clave}</td>
                          <td className="py-1.5 px-2">{item.partidaId}</td>
                          <td className="py-1.5 px-2 max-w-60 truncate">{item.descripcion}</td>
                          <td className="py-1.5 px-2 whitespace-nowrap font-mono text-[10px]">
                            {item.fecha_inicio_programada} → {item.fecha_fin_programada}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {item.cantidadPresupuestada} {item.unidad}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium">
                            {formatMXN(item.precioUnitario)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excelParsed.length === 0}
                onClick={handleConfirmExcelImport}
                className="px-4 py-1.5 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                Importar {excelParsed.length} concepto(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Inyectar concepto extraordinario (RF-RES-04) */}
      {showAddExtModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowAddExtModal(false)}
        >
          <form
            onSubmit={handleRequestExtraordinario}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-2xl w-full p-5 space-y-3.5 shadow-2xl max-h-[92vh] overflow-y-auto text-xs"
          >
            <h3 className="text-sm font-semibold text-fg">
              Inyectar Concepto Extraordinario (RF-RES-04)
            </h3>
            <p className="text-[11px] text-fg-muted">
              Requiere desglose de costos, fechas programadas, Análisis de Precio Unitario (APU)
              en PDF y firma electrónica.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={extForm.partidaId}
                onChange={(e) =>
                  setExtForm({ ...extForm, partidaId: e.target.value as PartidaId })
                }
                className="px-2.5 py-2 rounded-lg border border-line-strong bg-canvas cursor-pointer"
              >
                {PARTIDAS_CONSTRUCTIVAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Clave (ej. EXT-001)"
                value={extForm.clave}
                onChange={(e) => setExtForm({ ...extForm, clave: e.target.value })}
                className="px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
              <input
                type="text"
                placeholder="Unidad (m², m³, pza)"
                value={extForm.unidad}
                onChange={(e) => setExtForm({ ...extForm, unidad: e.target.value })}
                className="px-3 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <input
              type="text"
              placeholder="Descripción del trabajo no previsto"
              value={extForm.descripcion}
              onChange={(e) => setExtForm({ ...extForm, descripcion: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-info-bg/30 border border-info-line">
              <div>
                <label className="block text-[10px] font-semibold text-fg-soft mb-1">
                  Fecha inicio programada *
                </label>
                <input
                  type="date"
                  value={extForm.fecha_inicio_programada}
                  onChange={(e) =>
                    setExtForm({ ...extForm, fecha_inicio_programada: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-fg-soft mb-1">
                  Fecha fin programada *
                </label>
                <input
                  type="date"
                  value={extForm.fecha_fin_programada}
                  onChange={(e) =>
                    setExtForm({ ...extForm, fecha_fin_programada: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface"
                />
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Alcances técnicos (una línea por especificación)"
              value={extForm.alcancesTexto}
              onChange={(e) => setExtForm({ ...extForm, alcancesTexto: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-line-strong bg-canvas"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cantidad"
                value={extForm.cantidad}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setExtForm({ ...extForm, cantidad: e.target.value })}
                className="px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Materiales"
                value={extForm.costoMateriales}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setExtForm({ ...extForm, costoMateriales: e.target.value })}
                className="px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Instalación"
                value={extForm.costoInstalacion}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setExtForm({ ...extForm, costoInstalacion: e.target.value })}
                className="px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
              />
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                placeholder="Indirectos %"
                value={extForm.indirectosPct}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setExtForm({ ...extForm, indirectosPct: e.target.value })}
                className="px-2.5 py-2 rounded-lg border border-line-strong bg-canvas"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-canvas border border-line flex flex-wrap justify-between gap-2 text-[11px]">
              <span>
                Costo Directo: <strong>{formatMXN(extCalc.costoDirecto)}</strong>
              </span>
              <span>
                P.U. Autorizado:{' '}
                <strong className="text-accent">{formatMXN(extCalc.precioUnitario)}</strong>
              </span>
            </div>

            <FileDropzone
              files={apuFiles}
              onChange={setApuFiles}
              maxFiles={1}
              accept=".pdf"
              helperText="Adjunta el dictamen técnico y APU autorizado (PDF, máx. 10 MB)"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowAddExtModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Continuar a firma
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Autorizar cantidad adicional (RN-RES-02.1) */}
      {adicionalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAdicionalTarget(null)}
        >
          <form
            onSubmit={handleAutorizarAdicional}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-xl max-w-sm w-full p-5 space-y-3 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-fg">
              Autorizar volumen adicional · {adicionalTarget.clave}
            </h3>
            <p className="text-[11px] text-fg-muted">
              Habilita al Superintendente para cobrar excedentes al mismo P.U. (
              {formatMXN(adicionalTarget.precioUnitario)}).
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder={`Cantidad adicional en ${adicionalTarget.unidad}`}
              value={adicionalDelta}
              onKeyDown={blockNegativeKey}
              onChange={(e) => setAdicionalDelta(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-line-strong bg-canvas"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setAdicionalTarget(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-line-strong cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs rounded-lg bg-brand text-white font-semibold cursor-pointer"
              >
                Autorizar volumen
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        open={confirmExtSign}
        title="Firmar inyección de concepto extraordinario"
        description={`Se incorporará ${extForm.clave.toUpperCase()} al catálogo oficial con P.U. de ${formatMXN(
          extCalc.precioUnitario
        )} y dictamen ${apuFiles[0]?.name ?? 'PDF'}.`}
        confirmLabel="Autorizar y firmar"
        requireSignature
        onCancel={() => setConfirmExtSign(false)}
        onConfirm={handleConfirmExtraordinarioSign}
      />
    </div>
  );
};
