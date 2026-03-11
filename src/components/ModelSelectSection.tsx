/**
 * Model select section: file picker and drag-and-drop for Whisper .bin model.
 * User must select a model at runtime; the model is not bundled with the app.
 */

import type { SelectedModel } from "../types";

export interface ModelSelectSectionProps {
  selectedModel: SelectedModel | null;
  onModelSelect: (model: SelectedModel) => void;
  onClearModel: () => void;
  onPickModel: () => void;
  isDragOver?: boolean;
  onDragOver: (over: boolean) => void;
  validationError?: string | null;
}

export function ModelSelectSection({
  selectedModel,
  onModelSelect,
  onClearModel,
  onPickModel,
  isDragOver = false,
  onDragOver,
  validationError = null,
}: ModelSelectSectionProps) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    onModelSelect({
      name: file.name,
      path: (file as File & { path?: string }).path ?? file.name,
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
      <h2 className="mb-3 text-sm font-medium text-gray-700">Modelo Whisper</h2>
      {selectedModel ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {selectedModel.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearModel}
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
            Arraste um ficheiro de modelo ou
          </p>
          <button
            type="button"
            onClick={onPickModel}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Escolher modelo
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Ficheiro .bin (ggml-base, ggml-small, etc.)
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
