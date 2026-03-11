/**
 * Compact control panel: audio selector, model selector, start button, and inline status.
 * Single block to reduce vertical cards and keep controls in one place.
 */

import type { SelectedFile, SelectedModel, TranscriptionStatus } from "../types";

function formatFileSize(bytes: number): string {
  if (bytes == null || bytes < 1024) return bytes != null ? `${bytes} B` : "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const STATUS_LABELS: Record<TranscriptionStatus, string> = {
  idle: "Pronto",
  uploading: "A carregar…",
  transcribing: "A transcrever…",
  success: "Concluído",
  error: "Erro",
};

export interface ControlsSectionProps {
  selectedFile: SelectedFile | null;
  selectedModel: SelectedModel | null;
  status: TranscriptionStatus;
  statusMessage: string;
  statusError?: string;
  validationError: string | null;
  modelValidationError: string | null;
  hasFile: boolean;
  hasModel: boolean;
  isLoading: boolean;
  onPickFile: () => void;
  onClearFile: () => void;
  onPickModel: () => void;
  onClearModel: () => void;
  onFileSelect: (file: SelectedFile) => void;
  onModelSelect: (model: SelectedModel) => void;
  onStartTranscription: () => void;
  isDragOver: boolean;
  isModelDragOver: boolean;
  onDragOver: (over: boolean) => void;
  onModelDragOver: (over: boolean) => void;
}

export function ControlsSection({
  selectedFile,
  selectedModel,
  status,
  statusMessage,
  statusError,
  validationError,
  modelValidationError,
  isLoading,
  onPickFile,
  onClearFile,
  onPickModel,
  onClearModel,
  onFileSelect,
  onModelSelect,
  onStartTranscription,
  isDragOver,
  isModelDragOver,
  onDragOver,
  onModelDragOver,
}: ControlsSectionProps) {
  const canStart = selectedFile != null && selectedModel != null && !isLoading;
  const isBusy = status === "uploading" || status === "transcribing";

  const handleFileDrop = (e: React.DragEvent) => {
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
  const handleModelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onModelDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    onModelSelect({
      name: file.name,
      path: (file as File & { path?: string }).path ?? file.name,
    });
  };

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
      aria-label="Controlos"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Áudio */}
        <div className="min-w-0 flex-1 basis-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">Áudio</label>
          {selectedFile ? (
            <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <span className="min-w-0 truncate text-sm text-gray-900" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              {selectedFile.size != null && (
                <span className="shrink-0 text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </span>
              )}
              <button
                type="button"
                onClick={onClearFile}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              >
                Remover
              </button>
            </div>
          ) : (
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); onDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); onDragOver(false); }}
              className={`rounded border-2 border-dashed px-2 py-1.5 text-center transition-colors ${
                isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
            >
              <button
                type="button"
                onClick={onPickFile}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Escolher áudio
              </button>
              <span className="ml-1 text-xs text-gray-500">MP3, WAV, M4A</span>
            </div>
          )}
          {validationError && (
            <p className="mt-1 text-xs text-red-600" role="alert">{validationError}</p>
          )}
        </div>

        {/* Modelo */}
        <div className="min-w-0 flex-1 basis-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">Modelo</label>
          {selectedModel ? (
            <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <span className="min-w-0 truncate text-sm text-gray-900" title={selectedModel.name}>
                {selectedModel.name}
              </span>
              <button
                type="button"
                onClick={onClearModel}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              >
                Remover
              </button>
            </div>
          ) : (
            <div
              onDrop={handleModelDrop}
              onDragOver={(e) => { e.preventDefault(); onModelDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); onModelDragOver(false); }}
              className={`rounded border-2 border-dashed px-2 py-1.5 text-center transition-colors ${
                isModelDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
            >
              <button
                type="button"
                onClick={onPickModel}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Escolher modelo
              </button>
              <span className="ml-1 text-xs text-gray-500">.bin</span>
            </div>
          )}
          {modelValidationError && (
            <p className="mt-1 text-xs text-red-600" role="alert">{modelValidationError}</p>
          )}
        </div>

        {/* Start */}
        <div className="flex shrink-0 items-end gap-2">
          <button
            type="button"
            onClick={onStartTranscription}
            disabled={!canStart}
            className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-800"
          >
            {isBusy && (
              <span
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
            )}
            {isBusy ? "A transcrever…" : "Iniciar transcrição"}
          </button>
          {/* Inline status */}
          <span
            className="flex items-center gap-1.5 text-xs text-gray-600"
            role="status"
            aria-live="polite"
          >
            {isBusy && (
              <span
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                aria-hidden
              />
            )}
            <span>{STATUS_LABELS[status]}: {statusMessage}</span>
          </span>
        </div>
      </div>
      {statusError && (
        <div
          className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800"
          role="alert"
        >
          {statusError}
        </div>
      )}
    </section>
  );
}
