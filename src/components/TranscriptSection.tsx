/**
 * Transcript section: editable, scrollable text area (copy-friendly).
 */

export interface TranscriptSectionProps {
  transcript: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TranscriptSection({
  transcript,
  onChange,
  placeholder = "A transcrição aparecerá aqui…",
}: TranscriptSectionProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <h2 className="shrink-0 border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
        Transcrição
      </h2>
      <div className="min-h-0 flex-1 overflow-hidden">
        <textarea
          value={transcript}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full w-full resize-none overflow-y-auto rounded-b-lg border-0 border-t border-gray-100 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          spellCheck={true}
        />
      </div>
    </div>
  );
}
