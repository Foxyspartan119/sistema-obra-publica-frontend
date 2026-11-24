import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, AlertTriangle } from 'lucide-react';
import { BUSINESS_CONSTANTS, validarArchivo } from '../../utils/businessRules';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  minFiles?: number;
  accept?: string;
  imagesOnly?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const MAX_BATCH_BYTES = 60 * 1024 * 1024; // 60 MB máximo por carga múltiple (RNF-REN-01)

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onChange,
  maxFiles = 6,
  minFiles = 0,
  accept = '.pdf,.jpg,.jpeg,.png,.xml',
  imagesOnly = false,
  disabled = false,
  helperText,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (incomingList: FileList | null) => {
    if (!incomingList || disabled) return;
    setError(null);

    const incoming = Array.from(incomingList);
    const nextFiles = [...files];

    for (const file of incoming) {
      if (nextFiles.length >= maxFiles) {
        setError(`Límite alcanzado: máximo ${maxFiles} archivos permitidos por solicitud.`);
        break;
      }

      const check = validarArchivo(file);
      if (!check.valido) {
        setError(check.error ?? 'Archivo no permitido.');
        continue;
      }

      if (imagesOnly) {
        const lower = file.name.toLowerCase();
        const isImg =
          lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
        if (!isImg) {
          setError(`"${file.name}" no es una imagen válida. Solo se admiten JPG o PNG.`);
          continue;
        }
      }

      const projectedBytes =
        nextFiles.reduce((acc, f) => acc + f.size, 0) + file.size;
      if (projectedBytes > MAX_BATCH_BYTES) {
        setError('La carga acumulada excede el límite máximo de 60 MB (RNF-REN-01).');
        break;
      }

      nextFiles.push(file);
    }

    onChange(nextFiles);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    setError(null);
    onChange(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const missingMinimum = minFiles > 0 && files.length < minFiles;

  return (
    <div className="space-y-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          processFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
            : dragging
            ? 'border-brand bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer'
            : 'border-slate-300 dark:border-slate-700 hc:border-black hover:border-brand cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 hc:bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={imagesOnly ? '.jpg,.jpeg,.png' : accept}
          disabled={disabled}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
        />

        <Upload className="w-6 h-6 text-brand mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 hc:text-black">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {helperText ??
            `Formatos: ${imagesOnly ? 'JPG, PNG' : 'PDF, JPG, PNG, XML'} · Máx. ${
              BUSINESS_CONSTANTS.MAX_FILE_SIZE_BYTES / (1024 * 1024)
            } MB c/u (hasta ${maxFiles} archivos / 60 MB total)`}
        </p>
      </div>

      {missingMinimum && (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          Faltan {minFiles - files.length} archivo(s) para cumplir el mínimo requerido ({files.length}/
          {minFiles}).
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, idx) => {
            const isImg = /\.(jpg|jpeg|png)$/i.test(file.name);
            return (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hc:border-black text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isImg ? (
                    <ImageIcon className="w-4 h-4 text-brand shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-brand shrink-0" />
                  )}
                  <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatSize(file.size)}
                  </span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Quitar ${file.name}`}
                    onClick={() => handleRemove(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};