/**
 * Export section: Export TXT and Export DOCX buttons (disabled when empty).
 */

export interface ExportSectionProps {
  transcriptEmpty: boolean;
  onExportTxt: () => void;
  onExportDocx: () => void;
}

export function ExportSection({
  transcriptEmpty,
  onExportTxt,
  onExportDocx,
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
    </section>
  );
}
