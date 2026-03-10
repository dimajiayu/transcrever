/**
 * Audio upload section: drag-and-drop, file picker, selected file info.
 * Supports validation error display and user-friendly messages.
 */

import type { SelectedFile } from "../types";

export interface AudioUploadSectionProps {
  selectedFile: SelectedFile | null;
  onFileSelect: (file: SelectedFile) => void;
  onClearFile: () => void;
  onPickFile: () => void;
  isDragOver?: boolean;
  onDragOver: (over: boolean) => void;
  /** Shown when a file was rejected by validation (e.g. wrong type or too large). */
  validationError?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function AudioUploadSection({
  selectedFile,
  onFileSelect,
  onClearFile,
  onPickFile,
  isDragOver = false,
  onDragOver,
  validationError = null,
}: AudioUploadSectionProps) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    onFileSelect({
      name: file.name,
      path: (file as File & { path?: string }).path ?? file.name,
      size: file.size,
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(false);
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">Áudio</h2>
      {selectedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {selectedFile.name}
            </p>
            {selectedFile.size != null && (
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClearFile}
            className="shrink-0 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          >
            Remover
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 transition-colors ${
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <p className="mb-2 text-sm text-gray-600">
            Arraste um ficheiro de áudio ou
          </p>
          <button
            type="button"
            onClick={onPickFile}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Escolher ficheiro
          </button>
          <p className="mt-2 text-xs text-gray-500">
            MP3, WAV, M4A, MP4
          </p>
          {validationError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {validationError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
