/**
 * Action section: Start Transcription button with disabled/loading states.
 * Enabled only when both audio file and model file are selected.
 */

export interface ActionSectionProps {
  hasFile: boolean;
  hasModel: boolean;
  isLoading: boolean;
  onStartTranscription: () => void;
}

export function ActionSection({
  hasFile,
  hasModel,
  isLoading,
  onStartTranscription,
}: ActionSectionProps) {
  const canStart = hasFile && hasModel && !isLoading;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">Ação</h2>
      <button
        type="button"
        onClick={onStartTranscription}
        disabled={!canStart}
        className="flex items-center justify-center gap-2 rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-800"
      >
        {isLoading && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden
          />
        )}
        <span>{isLoading ? "A transcrever…" : "Iniciar transcrição"}</span>
      </button>
    </section>
  );
}
