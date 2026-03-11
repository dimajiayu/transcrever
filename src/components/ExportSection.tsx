/**
 * Export section: Export TXT and Export DOCX buttons (disabled when empty).
 * Shows success/error feedback after export.
 */

export interface ExportFeedback {
  message: string;
  success: boolean;
}

export interface ExportSectionProps {
  transcriptEmpty: boolean;
  onExportTxt: () => void;
  onExportDocx: () => void;
  exportFeedback?: { message: string; success: boolean } | null;
}

export function ExportSection({
  transcriptEmpty,
  onExportTxt,
  onExportDocx,
  exportFeedback = null,
}: ExportSectionProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">Exportar</h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExportTxt}
          disabled={transcriptEmpty}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-50"
        >
          Exportar TXT
        </button>
        <button
          type="button"
          onClick={onExportDocx}
          disabled={transcriptEmpty}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-50"
        >
          Exportar DOCX
        </button>
      </div>
      {exportFeedback && (
        <p
          role="status"
          className={`mt-3 text-sm ${exportFeedback.success ? "text-green-700" : "text-red-700"}`}
        >
          {exportFeedback.message}
        </p>
      )}
    </section>
  );
}
