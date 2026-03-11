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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <span className="text-xs font-medium text-gray-500">Exportar</span>
      <button
        type="button"
        onClick={onExportTxt}
        disabled={transcriptEmpty}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-50"
      >
        TXT
      </button>
      <button
        type="button"
        onClick={onExportDocx}
        disabled={transcriptEmpty}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gray-50"
      >
        DOCX
      </button>
      {exportFeedback && (
        <span
          role="status"
          className={`text-sm ${exportFeedback.success ? "text-green-700" : "text-red-700"}`}
        >
          {exportFeedback.message}
        </span>
      )}
    </div>
  );
}
